import cloneDeep from 'lodash.clonedeep';
import Optional from 'optional-js';

import { Crypto, Layer2, Types } from '@internet-of-people/sdk';
type Did = Crypto.Did;
type DidData = Types.Crypto.DidData;
type TransactionId = Types.Sdk.TransactionId;

export class DidTransactionsState implements Types.Layer2.IDidTransactionsState {
  public readonly query: Types.Layer2.IDidTransactionsQueries = {
    getBetween: (did: Did, fromHeightInc: number, untilHeightExc?: number): Types.Layer2.ITransactionIdHeight[] => {
      const transactions = this.getOrCreateDidTransactionEntries(did);
      const entriesInRange = transactions.filter((entry) => {
        return Layer2.isHeightInRangeInclUntil(
          entry.height,
          Optional.of(fromHeightInc),
          Optional.ofNullable(untilHeightExc),
        );
      });
      return entriesInRange;
    },
  };

  public readonly apply: Types.Layer2.IDidTransactionsOperations = {
    registerOperationAttempt: (height: number, did: Did, transactionId: TransactionId): void => {
      const transactions = this.getOrCreateDidTransactionEntries(did);

      if (transactions.findIndex((entry) => {
        return entry.transactionId === transactionId;
      }) < 0) {
        // TODO keep invariant that transactions are ordered by height
        transactions.unshift({ transactionId, height });
      }
    },
  };

  public readonly revert: Types.Layer2.IDidTransactionsOperations = {
    registerOperationAttempt: (_height: number, did: Did, transactionId: TransactionId): void => {
      const transactions = this.getOrCreateDidTransactionEntries(did);
      const index = transactions.findIndex((entry) => {
        return entry.transactionId === transactionId;
      });

      if (index >= 0) {
        transactions.splice(index, 1);
      } else {
        // NOTE A transaction might include multiple operations related to a single Did.
        //      Reverting the first operation attempt already removed the transactionId
        //      from the array, we are likely processing the next related operation here
      }
    },
  };

  private readonly didTransactions: Map<DidData, Types.Layer2.ITransactionIdHeight[]>;

  public constructor(didTransactions?: Map<DidData, Types.Layer2.ITransactionIdHeight[]>) {
    this.didTransactions = didTransactions ?? new Map();
  }

  public clone(): Types.Layer2.IDidTransactionsState {
    const clonedDidTransactions = new Map<DidData, Types.Layer2.ITransactionIdHeight[]>();

    for (const [ key, value ] of this.didTransactions.entries()) {
      clonedDidTransactions.set(key, cloneDeep(value));
    }
    return new DidTransactionsState(clonedDidTransactions);
  }


  private getOrCreateDidTransactionEntries(did: Did): Types.Layer2.ITransactionIdHeight[] {
    const didData = did.toString();
    let transactionEntries = this.didTransactions.get(didData);

    /* eslint no-undefined: 0 */
    if (transactionEntries === undefined) {
      transactionEntries = [];
      this.didTransactions.set(didData, transactionEntries);
    }
    return transactionEntries;
  }
}
