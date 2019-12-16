import { Interfaces, KeyId } from '@internet-of-people/keyvault';
import { Authentication, Did, ISignedOperationsData, OperationType, Right, SignableOperation } from '../../interfaces';
import { toBytes } from '../serde';
import { AddKey, AddRight } from './did-document';
import { OperationAttemptsBuilder } from './operation-attempts-builder';
import { toSignableData } from './to-signable-data';

export class SignedOperationAttemptsBuilder {
  private readonly signableOperations: SignableOperation[] = [];

  public constructor(
    private readonly finish: (operation: ISignedOperationsData) => OperationAttemptsBuilder,
    private readonly vault: Interfaces.IVault,
  ) {
  }

  public sign(keyId: KeyId): OperationAttemptsBuilder {
    const signableOperationDatas = this.signableOperations.map(toSignableData);
    const opBytes = toBytes(signableOperationDatas);
    const signedMessage = this.vault.sign(opBytes, keyId);
    const signedOperationData: ISignedOperationsData = {
      operation: OperationType.Signed,
      signables: signableOperationDatas,
      signerPublicKey: signedMessage.publicKey.toString(),
      signature: signedMessage.signature.toString(),
    };
    return this.finish(signedOperationData);
  }

  public addKey(did: Did, auth: Authentication, expiresAtHeight?: number): SignedOperationAttemptsBuilder {
    this.signableOperations.push(new AddKey(did, auth, expiresAtHeight));
    return this;
  }

  public addRight(did: Did, auth: Authentication, right: Right): SignedOperationAttemptsBuilder {
    this.signableOperations.push(new AddRight(did, auth, right));
    return this;
  }
}