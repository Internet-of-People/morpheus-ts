import { Crypto, Layer1, Types } from '../src';
type TransactionId = Types.Sdk.TransactionId;

import { assertStringlyEqual } from './utils';
import { defaultDid, defaultKeyId, keyId2 } from './known-keys';

const assertSignedOperationsEqual = (
  actual: Types.Layer1.ISignedOperationsData,
  expected: Types.Layer1.ISignedOperationsData,
): void => {
  assertStringlyEqual(actual.signerPublicKey, expected.signerPublicKey);
  assertStringlyEqual(actual.signature, expected.signature);
  expect(actual.operation).toBe(expected.operation);
  expect(actual.signables).toHaveLength(expected.signables.length);

  for (let i = 0; i < actual.signables.length; i += 1) {
    // TODO signed operations might need toString on some of their fields, so we might need a visitor
    expect(actual.signables[i]).toStrictEqual(expected.signables[i]);
  }
};

describe('OperationAttemptsBuilder', () => {
  const lastTxId: TransactionId | null = null;

  let builder: Layer1.OperationAttemptsBuilder;
  beforeEach(() => {
    builder = new Layer1.OperationAttemptsBuilder();
  });

  it('can create IBeforeProofData without vault or signing', () => {
    const contentId = 'contentId';
    const attempts = builder.registerBeforeProof(contentId).getAttempts();
    const expectedBeforeProofData: Types.Layer1.IRegisterBeforeProofData = {
      operation: Layer1.OperationType.RegisterBeforeProof,
      contentId,
    };
    expect(attempts).toStrictEqual([expectedBeforeProofData]);
  });

  it('can sign an addKey with a vault', () => {
    const signMock = jest.fn<Crypto.SignedBytes, [Crypto.KeyId, Uint8Array]>();
    const vault: Types.Crypto.IMorpheusSigner = {
      signDidOperations: signMock,
    };
    const expectedAddKeyData: Types.Layer1.IAddKeyData = {
      operation: Layer1.SignableOperationType.AddKey,
      did: defaultDid.toString(),
      lastTxId,
      auth: keyId2.toString(),
      expiresAtHeight: 69,
    };
    const expectedOperationData: Types.Layer1.ISignedOperationsData = {
      operation: Layer1.OperationType.Signed,
      signables: [
        expectedAddKeyData,
      ],
      signerPublicKey: 'pez7aYuvoDPM5i7xedjwjsWaFVzL3qRKPv4sBLv3E3pAGi6',
      signature: 'sez6JdkXYwnz9VD5KECBq7B5jBiWBZiqf1Pzh6D9Rzf9QhmqDXsAvNPhzNGe7TkM3BD2uV6Y2w9MgAsVf2wGwARpNW4',
    };
    signMock.mockImplementationOnce((_, msg) => {
      return new Crypto.SignedBytes(
        new Crypto.PublicKey(expectedOperationData.signerPublicKey),
        msg,
        new Crypto.Signature(expectedOperationData.signature),
      );
    });
    const attempts = builder
      .signWith(vault)
      .on(defaultDid, lastTxId)
      .addKey(keyId2, expectedAddKeyData.expiresAtHeight)
      .sign(defaultKeyId)
      .getAttempts();
    expect(attempts).toHaveLength(1);
    expect(attempts[0].operation).toBe(expectedOperationData.operation);
    assertSignedOperationsEqual(attempts[0] as Types.Layer1.ISignedOperationsData, expectedOperationData);
  });
});
