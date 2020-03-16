import { Lifecycle, Request, Server as HapiServer } from '@hapi/hapi';
import { notFound } from '@hapi/boom';
import { Utils } from '@internet-of-people/sdk';
import { Interfaces } from '@internet-of-people/did-manager';
import { DidOperationExtractor, ITransactionRepository } from './did-operations';


export const safePathInt = (pathHeightString: string|undefined|null): number|undefined => {
  return Number.isNaN(Number(pathHeightString)) || pathHeightString === '' || pathHeightString === null ?
    /* eslint no-undefined: 0 */
    undefined :
    /* eslint @typescript-eslint/no-non-null-assertion: 0 */
    Number.parseInt(pathHeightString!);
};

export const safePathRange = (fromHeight: string|undefined|null, untilHeight: string|undefined|null):
[number, number|undefined] => {
  const fromHeightInc = safePathInt(fromHeight);
  const untilHeightExc = safePathInt(untilHeight);

  if (fromHeightInc === undefined) {
    throw new Error(`Invalid starting block height: ${fromHeightInc}`);
  }
  return [ fromHeightInc, untilHeightExc ];
};

export class Layer2API {
  private readonly didOperations: DidOperationExtractor;

  public constructor(
    private readonly log: Utils.IAppLog,
    private readonly stateHandler: Interfaces.IMorpheusStateHandler,
    private readonly hapi: HapiServer,
    transactionRepo: ITransactionRepository,
  ) {
    this.didOperations = new DidOperationExtractor(transactionRepo, this.stateHandler);
  }


  public init(): void {
    this.hapi.route([
      {
        method: 'GET',
        path: '/did/{did}/document/{blockHeight?}',
        handler: (request: Request): Lifecycle.ReturnValue => {
          const { params: { did, blockHeight } } = request;
          // Note: StateStore is notified about new blocks so it's impossible to get an undefined back
          const lastSeenBlockHeight: number = this.stateHandler.query.lastSeenBlockHeight();
          const queryAtHeight = safePathInt(blockHeight) || lastSeenBlockHeight;
          this.log.debug(
            `Getting DID document for ${did} at height ${queryAtHeight}, blockchain height is ${lastSeenBlockHeight}`,
          );
          const document = this.stateHandler.query.getDidDocumentAt(did, queryAtHeight);
          return document.toData();
        },
      },
      {
        method: 'GET',
        path: '/did/{did}/transactions/last',
        handler: async(request: Request): Promise<Lifecycle.ReturnValue> => {
          const { params: { did } } = request;
          this.log.debug(`Getting last DID transactions for ${did}`);
          const transactionIds = this.stateHandler.query.getDidTransactionIds(did, false, 0);

          if (!transactionIds.length) {
            throw notFound(`DID ${did} has no transactions yet`);
          }

          return transactionIds[0];
        },
      },
      {
        method: 'GET',
        path: '/did/{did}/transactions/{fromHeight}/{untilHeight?}',
        handler: async(request: Request): Promise<Lifecycle.ReturnValue> => {
          const { params: { did, fromHeight, untilHeight } } = request;
          const [ fromHeightInc, untilHeightExc ] = safePathRange(fromHeight, untilHeight);
          this.log.debug(`Getting DID transactions for ${did} from ${fromHeightInc} to ${untilHeightExc}`);
          return this.stateHandler.query.getDidTransactionIds(did, false, fromHeightInc, untilHeightExc);
        },
      },
      {
        method: 'GET',
        path: '/did/{did}/transaction-attempts/{fromHeight}/{untilHeight?}',
        handler: async(request: Request): Promise<Lifecycle.ReturnValue> => {
          const { params: { did, fromHeight, untilHeight } } = request;
          const [ fromHeightInc, untilHeightExc ] = safePathRange(fromHeight, untilHeight);
          this.log.debug(`Getting DID transaction attempts for ${did} from ${fromHeightInc} to ${untilHeightExc}`);
          return this.stateHandler.query.getDidTransactionIds(did, true, fromHeightInc, untilHeightExc);
        },
      },
      {
        method: 'GET',
        path: '/did/{did}/operations/{fromHeight}/{untilHeight?}',
        handler: async(request: Request): Promise<Lifecycle.ReturnValue> => {
          const { params: { did, fromHeight, untilHeight } } = request;
          const [ fromHeightInc, untilHeightExc ] = safePathRange(fromHeight, untilHeight);
          this.log.debug(`Getting DID operations for ${did} from ${fromHeightInc} to ${untilHeightExc}`);
          return this.didOperations.didOperationsOf(did, false, fromHeightInc, untilHeightExc);
        },
      },
      {
        method: 'GET',
        path: '/did/{did}/operation-attempts/{fromHeight}/{untilHeight?}',
        handler: async(request: Request): Promise<Lifecycle.ReturnValue> => {
          const { params: { did, fromHeight, untilHeight } } = request;
          const [ fromHeightInc, untilHeightExc ] = safePathRange(fromHeight, untilHeight);
          this.log.debug(`Getting DID operation attempts for ${did} from ${fromHeightInc} to ${untilHeightExc}`);
          return this.didOperations.didOperationsOf(did, true, fromHeightInc, untilHeightExc);
        },
      },
      {
        method: 'POST',
        path: '/check-transaction-validity',
        handler: (request: Request): Lifecycle.ReturnValue => {
          const operationAttempts = (request.payload as unknown) as Interfaces.IOperationData[];
          this.log.debug('Checking tx validity');
          return this.stateHandler.dryRun(operationAttempts);
        },
      },
      {
        method: 'GET',
        path: '/before-proof/{contentId}/exists/{blockHeight?}',
        handler: (request: Request): Lifecycle.ReturnValue => {
          const { params: { contentId, blockHeight } } = request;
          this.log.debug(`Checking if before-proof ${contentId} exists at ${blockHeight}`);
          return this.stateHandler.query.beforeProofExistsAt(
            contentId,
            safePathInt(blockHeight),
          );
        },
      },
      {
        method: 'GET',
        path: '/before-proof/{contentId}/history',
        handler: (request: Request): Lifecycle.ReturnValue => {
          const { params: { contentId } } = request;
          this.log.debug(`Getting history of before-proof ${contentId}`);
          return this.stateHandler.query.getBeforeProofHistory(
            contentId,
          );
        },
      },
      {
        method: 'GET',
        path: '/txn-status/{txid}',
        handler: (request: Request): Lifecycle.ReturnValue => {
          const { params: { txid } } = request;
          this.log.debug(`Checking tx status for ${txid}`);
          const status: boolean = this.stateHandler.query.isConfirmed(txid)
            .orElseThrow(() => {
              return notFound(`Transaction ${txid} is not processed by morpheus (yet)`);
            });
          return status;
        },
      },
    ]);
  }
}
