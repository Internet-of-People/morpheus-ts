import { Interfaces, Utils } from '@arkecosystem/crypto';
import Optional from 'optional-js';
import { IOperationData } from './operation-data';

export interface IClient {
  sendTx(tx: Interfaces.ITransactionJson): Promise<string>;
  getWallet(address: string): Promise<Optional<IWalletResponse>>;
  getWalletNonce(address: string): Promise<Utils.BigNumber>;
  getWalletBalance(address: string): Promise<Utils.BigNumber>;
  getNodeCryptoConfig(): Promise<Interfaces.INetworkConfig>;
  getCurrentHeight(): Promise<number>;
}

export interface IApi {
  readonly client: IClient;
  sendTransferTx(
    fromPassphrase: string,
    toAddress: string,
    amountFlake: Utils.BigNumber,
    nonce?: Utils.BigNumber): Promise<string>;
  sendMorpheusTx(
    attempts: IOperationData[],
    passphrase: string,
    nonce?: Utils.BigNumber): Promise<string>;
}

export interface IWalletResponse {
  address: string;
  publicKey: string;
  nonce: string;
  balance: string;
  attributes: unknown;
  isDelegate: boolean;
  isResigned: boolean;
}
