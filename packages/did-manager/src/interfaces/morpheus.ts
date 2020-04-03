import Optional from 'optional-js';

import { Crypto, Layer1, Layer2, Types } from '@internet-of-people/sdk';

import { ITransactionIdHeight } from './did-transactions';
import { IState } from './state';

export interface IBlockHeightChange {
  blockHeight: number;
  blockId: string;
}

export interface IStateChange extends IBlockHeightChange {
  asset: Types.Layer1.IMorpheusAsset;
  transactionId: string;
}

export const MORPHEUS_STATE_HANDLER_COMPONENT_NAME = 'morpheus-state-handler';

export interface IMorpheusStateHandler {
  readonly query: IMorpheusQueries;
  dryRun(operationAttempts: Types.Layer1.IOperationData[]): IDryRunOperationError[];
  applyEmptyBlockToState(change: IBlockHeightChange): void;
  applyTransactionToState(stateChange: IStateChange): void;
  revertEmptyBlockFromState(change: IBlockHeightChange): void;
  revertTransactionFromState(stateChange: IStateChange): void;
}

export interface IMorpheusOperations {
  setLastSeenBlockHeight(height: number): void;
  registerOperationAttempt(height: number, transactionId: Types.Sdk.TransactionId, operation: Layer1.Operation): void;

  registerBeforeProof(contentId: Types.Sdk.ContentId, height: number): void;

  addKey(
    height: number,
    signerAuth: Types.Crypto.Authentication,
    did: Crypto.Did,
    lastTxId: Types.Sdk.TransactionId | null,
    newAuth: Types.Crypto.Authentication,
    expiresAtHeight?: number,
  ): void;

  revokeKey(
    height: number,
    signerAuth: Types.Crypto.Authentication,
    did: Crypto.Did,
    lastTxId: Types.Sdk.TransactionId | null,
    revokedAuth: Types.Crypto.Authentication,
  ): void;

  addRight(
    height: number,
    signerAuth: Types.Crypto.Authentication,
    did: Crypto.Did,
    lastTxId: Types.Sdk.TransactionId | null,
    auth: Types.Crypto.Authentication,
    right: Types.Sdk.Right,
  ): void;

  revokeRight(
    height: number,
    signerAuth: Types.Crypto.Authentication,
    did: Crypto.Did,
    lastTxId: Types.Sdk.TransactionId | null,
    auth: Types.Crypto.Authentication,
    right: Types.Sdk.Right,
  ): void;

  tombstoneDid(
    height: number,
    signerAuth: Types.Crypto.Authentication,
    did: Crypto.Did,
    lastTxId: Types.Sdk.TransactionId | null,
  ): void;

  /**
   * Marks a transaction as confirmed, all operations were valid.
   */
  confirmTx(transactionId: Types.Sdk.TransactionId): void;
  rejectTx(transactionId: Types.Sdk.TransactionId): void;
}

export interface IMorpheusQueries {
  lastSeenBlockHeight(): number;
  beforeProofExistsAt(contentId: Types.Sdk.ContentId, height?: number): boolean;
  getBeforeProofHistory(contentId: Types.Sdk.ContentId): Types.Layer2.IBeforeProofHistory;
  isConfirmed(transactionId: Types.Sdk.TransactionId): Optional<boolean>;
  getDidDocumentAt(did: Crypto.Did, height: number): Types.Layer2.IDidDocument;
  getDidTransactionIds(
    did: Crypto.Did,
    includeAttempts: boolean,
    fromHeightIncl: number,
    untilHeightIncl?: number,
  ): ITransactionIdHeight[];
}

export type IMorpheusState = IState<IMorpheusQueries, IMorpheusOperations>;

export const enum MorpheusEvents {
  StateCorrupted = 'morpheus.state.corrupted',
}

export interface IDryRunOperationError {
  invalidOperationAttempt: Types.Layer1.IOperationData | undefined;
  // code: number; TODO: later we need exact error codes
  message: string;
}
