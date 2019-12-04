import { Interfaces, MorpheusTransaction } from "@internet-of-people/did-manager";
import { IAppLog } from "./app-log";
import { MorpheusState } from "./state";
import { IMorpheusOperations, IMorpheusQueries, IMorpheusState } from "./state-interfaces";
const { Operations: { fromData } } = MorpheusTransaction;

export interface IStateChange {
  asset: Interfaces.IMorpheusAsset;
  blockHeight: number;
  blockId: string;
  transactionId: string;
}

export const COMPONENT_NAME = "morpheus-state-handler";

export interface IMorpheusStateHandler {
  readonly query: IMorpheusQueries;
  applyTransactionToState(stateChange: IStateChange): void;
  revertTransactionFromState(stateChange: IStateChange): void;
}

export class MorpheusStateHandler implements IMorpheusStateHandler {

  public get query(): IMorpheusQueries {
    if(this.corrupted) {
      throw new Error('Layer2 is corrupted.');
    }
    return this.state.query;
  }
  public static readonly STATE_CORRUPTED_EVENT = "morpheus_state_corrupted";

  private static atHeight(height: number, ops: IMorpheusOperations): Interfaces.IOperationVisitor<void> {
    return {
      registerBeforeProof:(contentId: string): void => {
        ops.registerBeforeProof(contentId, height);
      },
      revokeBeforeProof: (contentId: string): void => {
        ops.revokeBeforeProof(contentId, height);
      }
    };
  }

  private state: IMorpheusState = new MorpheusState();
  private corrupted: boolean = false;

  public constructor(
    private readonly logger: IAppLog,
    private readonly eventEmitter: NodeJS.EventEmitter) {
  }

  public applyTransactionToState(stateChange: IStateChange): void {
    if(this.corrupted) {
      this.logger.error('State is corrupted, not accepting applys anymore');
      return;
    }

    try {
      const newState = this.state.clone();
      const apply = MorpheusStateHandler.atHeight(stateChange.blockHeight, newState.apply);
      for (const operationData of stateChange.asset.operationAttempts) {
        const operation = fromData(operationData);
        operation.accept(apply);
      }
      newState.apply.confirmTx(stateChange.transactionId);
      this.state = newState;
    } catch(e){
      this.logger.info(`Transaction could not be applied. Error: ${e.message}, TX: ${JSON.stringify(stateChange)}`);
      this.state.apply.rejectTx(stateChange.transactionId);
    }
  }

  public revertTransactionFromState(stateChange: IStateChange): void {
    if(this.corrupted) {
      this.logger.error('State is corrupted, not accepting applys anymore');
      return;
    }

    try {
      const confirmed = this.state.query.isConfirmed(stateChange.transactionId);
      if(!confirmed.isPresent()) {
        throw new Error(`Transaction ${stateChange.transactionId} was not confirmed, cannot revert.`);
      }
      if(!confirmed.get()) {
        this.state.revert.rejectTx(stateChange.transactionId);
      }
      else {
        this.state.revert.confirmTx(stateChange.transactionId);

        const revert = MorpheusStateHandler.atHeight(stateChange.blockHeight, this.state.revert);
        for (const operationData of stateChange.asset.operationAttempts) {
          const operation = fromData(operationData);
          operation.accept(revert);
        }
      }
    } catch(e) {
      this.logger.error(`Layer 2 state is corrupt. All incoming transaction will be ignored. Error: ${e.message}`);
      this.corrupted = true;
      this.eventEmitter!.emit(MorpheusStateHandler.STATE_CORRUPTED_EVENT);
    }
  }
}
