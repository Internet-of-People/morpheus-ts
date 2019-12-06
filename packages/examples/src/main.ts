import { Managers, Transactions, Utils } from "@arkecosystem/crypto";
import { MorpheusTransaction } from "@internet-of-people/did-manager";
import { Api } from "./api";
import { BeforeProofExample } from "./before-proof";
import {TransactionSender} from "./transaction-sender";
import { askForNetwork, askForPassphrase, askForAddress } from "./utils";

const { Transaction } = MorpheusTransaction;

if(!process.argv[2]) {
  throw new Error('No example ID provided. Which one would you like to run?');
}

const asynRun = async (): Promise<void> => {
  const network = await askForNetwork();
  Api.create(network);
  Managers.configManager.setConfig(await Api.get().getNodeCryptoConfig());
  Transactions.TransactionRegistry.registerTransactionType(Transaction.MorpheusTransaction);

  switch (process.argv[2]) {
    case 'transfer':
      await TransactionSender.sendTransfer(
        await askForPassphrase(), // genesis
        await askForAddress(),
        Utils.BigNumber.make(1000 * 1e8),
      );
      break;
    case BeforeProofExample.ID:
      await new BeforeProofExample().run();
      break;
    default:
      throw new Error(`Unknown example provided: ${process.argv[2]}`);
  }
};

const _ = Promise.resolve().then(asynRun);