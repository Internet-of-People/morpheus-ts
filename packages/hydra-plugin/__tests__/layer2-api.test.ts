/* eslint no-undefined: 0 */
import { Server as HapiServer } from '@hapi/hapi';
import { Interfaces, MorpheusTransaction } from '@internet-of-people/did-manager';
import { IAppLog } from '@internet-of-people/logger';
import { createServer } from '@arkecosystem/core-http-utils';
import Optional from 'optional-js';
import {
  Interfaces as KvInterfaces,
  KeyId,
  PersistentVault,
  SignedMessage,
  Vault,
} from '@internet-of-people/keyvault';
import { EventEmitter } from 'events';
import { safePathInt, Layer2API } from '../src/layer2-api';
import { DidDocument } from '@internet-of-people/did-manager/dist/morpheus-transaction/operations';
import { Right } from '@internet-of-people/did-manager/dist/interfaces';

const {
  Operations: { OperationAttemptsBuilder },
  MorpheusStateHandler: { MorpheusStateHandler },
} = MorpheusTransaction;

const did = 'did:morpheus:ezbeWGSY2dqcUBqT8K7R14xr';
const defaultKeyId = new KeyId('iezbeWGSY2dqcUBqT8K7R14xr');
const keyId1 = new KeyId('iez25N5WZ1Q6TQpgpyYgiu9gTX');
const keyId2 = new KeyId('iezkXs7Xd8SDWLaGKUAjEf53W');

const contentId = 'myFavoriteContentId';
const transactionId = 'myFavoriteTxid';
const blockId = 'myFavoriteBlockId';
const blockHeight = 5;

const rustVault = new Vault(PersistentVault.DEMO_PHRASE);
rustVault.createId();
rustVault.createId();
rustVault.createId();

const vault: KvInterfaces.IVault = {
  sign: (message: Uint8Array, keyId: KeyId): SignedMessage => {
    return rustVault.sign(keyId, message);
  },
};

class Fixture {
  public emitter: NodeJS.EventEmitter = new EventEmitter();

  public logMock = {
    appName: 'hot-wallet-tests',
    debug: jest.fn<void, [string]>(),
    info: jest.fn<void, [string]>(),
    warn: jest.fn<void, [string]>(),
    error: jest.fn<void, [string]>(),
  };
  public log = this.logMock as IAppLog;

  public stateHandler = new MorpheusStateHandler(this.log, this.emitter);
}

let hapiServer: HapiServer;
let fixture: Fixture;

describe('Layer2API', () => {
  const addKey = (
    key: Interfaces.Authentication,
    height: number,
    txId: string,
    signer: Interfaces.Authentication,
  ): void => {
    fixture.stateHandler.applyTransactionToState({
      asset: { operationAttempts: new OperationAttemptsBuilder()
        .withVault(vault)
        .addKey(did, key)
        .sign(signer)
        .getAttempts(),
      },
      blockHeight: height,
      blockId,
      transactionId: txId,
    });
  };

  const revokeKey = (
    key: Interfaces.Authentication,
    height: number,
    txId: string,
    signer: Interfaces.Authentication,
  ): void => {
    fixture.stateHandler.applyTransactionToState({
      asset: { operationAttempts: new OperationAttemptsBuilder()
        .withVault(vault)
        .revokeKey(did, key)
        .sign(signer)
        .getAttempts(),
      },
      blockHeight: height,
      blockId,
      transactionId: txId,
    });
  };

  const addRight = (
    key: Interfaces.Authentication,
    height: number,
    txId: string,
    signer: Interfaces.Authentication,
  ): void => {
    fixture.stateHandler.applyTransactionToState({
      asset: { operationAttempts: new OperationAttemptsBuilder()
        .withVault(vault)
        .addRight(did, key, Interfaces.Right.Update)
        .sign(signer)
        .getAttempts(),
      },
      blockHeight: height,
      blockId,
      transactionId: txId,
    });
  };

  const revokeRight = (
    key: Interfaces.Authentication,
    height: number,
    txId: string,
    signer: Interfaces.Authentication,
  ): void => {
    fixture.stateHandler.applyTransactionToState({
      asset: { operationAttempts: new OperationAttemptsBuilder()
        .withVault(vault)
        .revokeRight(did, key, Interfaces.Right.Update)
        .sign(signer)
        .getAttempts(),
      },
      blockHeight: height,
      blockId,
      transactionId: txId,
    });
  };

  const tombstoneDid = (height: number, txId: string, signer: Interfaces.Authentication): void => {
    fixture.stateHandler.applyTransactionToState({
      asset: { operationAttempts: new OperationAttemptsBuilder()
        .withVault(vault)
        .tombstoneDid(did)
        .sign(signer)
        .getAttempts(),
      },
      blockHeight: height,
      blockId,
      transactionId: txId,
    });
  };

  beforeEach(async() => {
    fixture = new Fixture();
    hapiServer = await createServer({ host: '0.0.0.0', port: '4703' });
    const morpheusServer = new Layer2API(fixture.log, fixture.stateHandler, hapiServer);
    morpheusServer.init();
  });

  afterEach(async() => {
    await hapiServer.stop();
  });

  it('unregistered content does not exist', async() => {
    const res = await hapiServer.inject({
      method: 'get',
      url: '/before-proof/invalid_content_id/exists',
    });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toBe(JSON.stringify(false));
  });

  it('registered content exists only from its height', async() => {
    const registrationAttempt = new OperationAttemptsBuilder()
      .registerBeforeProof(contentId)
      .getAttempts();
    fixture.stateHandler.applyTransactionToState({
      asset: { operationAttempts: registrationAttempt },
      blockHeight,
      blockId,
      transactionId,
    });

    const res5 = await hapiServer.inject({
      method: 'get',
      url: `/before-proof/${contentId}/exists/${blockHeight}`,
    });
    expect(res5.statusCode).toBe(200);
    expect(res5.payload).toBe(JSON.stringify(true));

    const resLatest = await hapiServer.inject({
      method: 'get',
      url: `/before-proof/${contentId}/exists`,
    });
    expect(resLatest.statusCode).toBe(200);
    expect(resLatest.payload).toBe(JSON.stringify(true));

    const res4 = await hapiServer.inject({
      method: 'get',
      url: `/before-proof/${contentId}/exists/${blockHeight - 1}`,
    });
    expect(res4.statusCode).toBe(200);
    expect(res4.payload).toBe(JSON.stringify(false));
  });

  it('can query implicit did', async() => {
    const res = await hapiServer.inject({ method: 'get', url: `/did/${did}/document` });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.payload) as Interfaces.IDidDocumentData;
    const doc = new DidDocument.DidDocument(data);

    expect(data.keys).toHaveLength(1);
    expect(data.keys[0].auth).toStrictEqual(defaultKeyId.toString());
    expect(doc.height).toBe(0);
    expect(doc.did).toBe(did);
    expect(doc.hasRightAt(defaultKeyId, Right.Impersonate, 0)).toBeTruthy();
    expect(doc.hasRightAt(defaultKeyId, Right.Update, 0)).toBeTruthy();
    expect(doc.isTombstonedAt(0)).toBeFalsy();
  });

  it('can add key to did', async() => {
    addKey(keyId1, 10, transactionId, defaultKeyId);
    expect(fixture.stateHandler.query.isConfirmed(transactionId)).toStrictEqual(Optional.of(true));

    const res = await hapiServer.inject({ method: 'get', url: `/did/${did}/document/${10}` });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.payload) as Interfaces.IDidDocumentData;
    const doc = new DidDocument.DidDocument(data);

    expect(data.keys).toHaveLength(2);
    expect(data.keys[0].auth).toStrictEqual(defaultKeyId.toString());
    expect(data.keys[1].auth).toStrictEqual(keyId1.toString());
    expect(data.keys[0].valid).toBeTruthy();
    expect(data.keys[1].valid).toBeTruthy();
    expect(doc.did).toBe(did);
    expect(doc.height).toBe(10);
    expect(doc.hasRightAt(defaultKeyId, Right.Impersonate, 10)).toBeTruthy();
    expect(doc.hasRightAt(defaultKeyId, Right.Update, 10)).toBeTruthy();
    expect(doc.isTombstonedAt(10)).toBeFalsy();
  });

  it('can revoke key from did', async() => {
    addKey(keyId1, 10, 'tx1', defaultKeyId);
    expect(fixture.stateHandler.query.isConfirmed('tx1')).toStrictEqual(Optional.of(true));

    revokeKey(keyId1, 15, 'tx2', defaultKeyId);
    expect(fixture.stateHandler.query.isConfirmed('tx2')).toStrictEqual(Optional.of(true));

    const res10 = await hapiServer.inject({ method: 'get', url: `/did/${did}/document/${10}` });
    expect(res10.statusCode).toBe(200);
    const doc10 = JSON.parse(res10.payload) as Interfaces.IDidDocumentData;
    expect(doc10.atHeight).toBe(10);
    expect(doc10.keys).toHaveLength(2);
    expect(doc10.keys[0].auth.toString()).toStrictEqual(defaultKeyId.toString());
    expect(doc10.keys[1].auth.toString()).toStrictEqual(keyId1.toString());
    expect(doc10.keys[0].valid).toBeTruthy();
    expect(doc10.keys[1].valid).toBeTruthy();

    const res15 = await hapiServer.inject({ method: 'get', url: `/did/${did}/document/${15}` });
    expect(res15.statusCode).toBe(200);
    const doc15 = JSON.parse(res15.payload) as Interfaces.IDidDocumentData;
    expect(doc15.atHeight).toBe(15);
    expect(doc15.keys).toHaveLength(2);
    expect(doc15.keys[0].auth.toString()).toStrictEqual(defaultKeyId.toString());
    expect(doc15.keys[1].auth.toString()).toStrictEqual(keyId1.toString());
    expect(doc15.keys[0].valid).toBeTruthy();
    expect(doc15.keys[1].valid).toBeFalsy();
  });

  it('can add right to a key', async() => {
    addKey(keyId1, 10, 'tx1', defaultKeyId);
    expect(fixture.stateHandler.query.isConfirmed('tx1')).toStrictEqual(Optional.of(true));

    addRight(keyId1, 15, 'tx2', defaultKeyId);
    expect(fixture.stateHandler.query.isConfirmed('tx2')).toStrictEqual(Optional.of(true));

    const res15 = await hapiServer.inject({ method: 'get', url: `/did/${did}/document/${15}` });
    expect(res15.statusCode).toBe(200);
    const data15 = JSON.parse(res15.payload) as Interfaces.IDidDocumentData;
    const doc15 = new DidDocument.DidDocument(data15);
    expect(data15.keys).toHaveLength(2);
    expect(data15.keys[0].auth.toString()).toStrictEqual(defaultKeyId.toString());
    expect(data15.keys[1].auth.toString()).toStrictEqual(keyId1.toString());
    expect(data15.keys[0].valid).toBeTruthy();
    expect(data15.keys[1].valid).toBeTruthy();
    expect(doc15.height).toBe(15);
    expect(doc15.hasRightAt(defaultKeyId, Right.Impersonate, 15)).toBeTruthy();
    expect(doc15.hasRightAt(defaultKeyId, Right.Update, 15)).toBeTruthy();
    expect(doc15.hasRightAt(keyId1, Right.Impersonate, 15)).toBeFalsy();
    expect(doc15.hasRightAt(keyId1, Right.Update, 15)).toBeTruthy();
  });

  it('cannot add right to a non-existent key', async() => {
    addRight(keyId1, 15, transactionId, defaultKeyId);
    expect(fixture.stateHandler.query.isConfirmed(transactionId)).toStrictEqual(Optional.of(false));

    const res15 = await hapiServer.inject({ method: 'get', url: `/did/${did}/document/${15}` });
    expect(res15.statusCode).toBe(200);
    const data15 = JSON.parse(res15.payload) as Interfaces.IDidDocumentData;
    const doc15 = new DidDocument.DidDocument(data15);
    expect(data15.keys).toHaveLength(1);
    expect(data15.keys[0].auth.toString()).toStrictEqual(defaultKeyId.toString());
    expect(data15.keys[0].valid).toBeTruthy();
    expect(doc15.height).toBe(15);
    expect(doc15.hasRightAt(keyId1, Right.Impersonate, 15)).toBeFalsy();
  });

  it('can revoke right from a key', async() => {
    addKey(keyId1, 10, 'tx1', defaultKeyId);
    expect(fixture.stateHandler.query.isConfirmed('tx1')).toStrictEqual(Optional.of(true));

    addRight(keyId1, 15, 'tx2', defaultKeyId);
    expect(fixture.stateHandler.query.isConfirmed('tx2')).toStrictEqual(Optional.of(true));

    revokeRight(keyId1, 20, 'tx3', defaultKeyId);
    expect(fixture.stateHandler.query.isConfirmed('tx3')).toStrictEqual(Optional.of(true));

    const res15 = await hapiServer.inject({ method: 'get', url: `/did/${did}/document/${15}` });
    expect(res15.statusCode).toBe(200);
    const data15 = JSON.parse(res15.payload) as Interfaces.IDidDocumentData;
    const doc15 = new DidDocument.DidDocument(data15);
    expect(data15.keys).toHaveLength(2);
    expect(data15.keys[0].auth.toString()).toStrictEqual(defaultKeyId.toString());
    expect(data15.keys[1].auth.toString()).toStrictEqual(keyId1.toString());
    expect(data15.keys[0].valid).toBeTruthy();
    expect(data15.keys[1].valid).toBeTruthy();
    expect(doc15.height).toBe(15);
    expect(doc15.hasRightAt(defaultKeyId, Right.Impersonate, 15)).toBeTruthy();
    expect(doc15.hasRightAt(defaultKeyId, Right.Update, 15)).toBeTruthy();
    expect(doc15.hasRightAt(keyId1, Right.Impersonate, 15)).toBeFalsy();
    expect(doc15.hasRightAt(keyId1, Right.Update, 15)).toBeTruthy();

    const res20 = await hapiServer.inject({ method: 'get', url: `/did/${did}/document/${20}` });
    expect(res20.statusCode).toBe(200);
    const data20 = JSON.parse(res20.payload) as Interfaces.IDidDocumentData;
    const doc20 = new DidDocument.DidDocument(data20);
    expect(data20.keys).toHaveLength(2);
    expect(data20.keys[0].auth.toString()).toStrictEqual(defaultKeyId.toString());
    expect(data20.keys[1].auth.toString()).toStrictEqual(keyId1.toString());
    expect(data20.keys[0].valid).toBeTruthy();
    expect(data20.keys[1].valid).toBeTruthy();
    expect(doc20.hasRightAt(defaultKeyId, Right.Impersonate, 20)).toBeTruthy();
    expect(doc20.hasRightAt(defaultKeyId, Right.Update, 20)).toBeTruthy();
    expect(doc20.hasRightAt(keyId1, Right.Impersonate, 20)).toBeFalsy();
    expect(doc20.hasRightAt(keyId1, Right.Update, 20)).toBeFalsy();
  });

  it('cannot revoke right from a non-existent key', async() => {
    addRight(keyId1, 15, 'tx2', defaultKeyId);
    expect(fixture.stateHandler.query.isConfirmed('tx2')).toStrictEqual(Optional.of(false));

    revokeRight(keyId1, 20, 'tx3', defaultKeyId);
    expect(fixture.stateHandler.query.isConfirmed('tx3')).toStrictEqual(Optional.of(false));

    const res20 = await hapiServer.inject({ method: 'get', url: `/did/${did}/document/${20}` });
    expect(res20.statusCode).toBe(200);
    const data20 = JSON.parse(res20.payload) as Interfaces.IDidDocumentData;
    const doc20 = new DidDocument.DidDocument(data20);
    expect(data20.keys).toHaveLength(1);
    expect(data20.keys[0].auth.toString()).toStrictEqual(defaultKeyId.toString());
    expect(data20.keys[0].valid).toBeTruthy();
    expect(doc20.hasRightAt(defaultKeyId, Right.Impersonate, 20)).toBeTruthy();
    expect(doc20.hasRightAt(defaultKeyId, Right.Update, 20)).toBeTruthy();
    expect(doc20.hasRightAt(keyId1, Right.Impersonate, 20)).toBeFalsy();
    expect(doc20.hasRightAt(keyId1, Right.Update, 20)).toBeFalsy();
  });

  it('cannot update did if has no update right', async() => {
    addKey(keyId1, 10, 'tx1', defaultKeyId);
    addKey(keyId2, 10, 'tx2', defaultKeyId);
    expect(fixture.stateHandler.query.isConfirmed('tx1')).toStrictEqual(Optional.of(true));
    expect(fixture.stateHandler.query.isConfirmed('tx2')).toStrictEqual(Optional.of(true));

    addRight(keyId2, 15, 'tx3', keyId1);
    expect(fixture.stateHandler.query.isConfirmed('tx3')).toStrictEqual(Optional.of(false));

    const res15 = await hapiServer.inject({ method: 'get', url: `/did/${did}/document/${15}` });
    expect(res15.statusCode).toBe(200);
    const data15 = JSON.parse(res15.payload) as Interfaces.IDidDocumentData;
    const doc15 = new DidDocument.DidDocument(data15);
    expect(data15.keys).toHaveLength(3);
    expect(data15.keys[0].auth.toString()).toStrictEqual(defaultKeyId.toString());
    expect(data15.keys[1].auth.toString()).toStrictEqual(keyId1.toString());
    expect(data15.keys[2].auth.toString()).toStrictEqual(keyId2.toString());
    expect(data15.keys[0].valid).toBeTruthy();
    expect(data15.keys[1].valid).toBeTruthy();
    expect(data15.keys[2].valid).toBeTruthy();
    expect(doc15.height).toBe(15);
    expect(doc15.hasRightAt(defaultKeyId, Right.Impersonate, 15)).toBeTruthy();
    expect(doc15.hasRightAt(defaultKeyId, Right.Update, 15)).toBeTruthy();
    expect(doc15.hasRightAt(keyId1, Right.Impersonate, 15)).toBeFalsy();
    expect(doc15.hasRightAt(keyId1, Right.Update, 15)).toBeFalsy();
  });

  it('can tombstone did', async() => {
    tombstoneDid(15, transactionId, defaultKeyId);
    expect(fixture.stateHandler.query.isConfirmed(transactionId)).toStrictEqual(Optional.of(true));

    const res14 = await hapiServer.inject({ method: 'get', url: `/did/${did}/document/${14}` });
    expect(res14.statusCode).toBe(200);
    const data14 = JSON.parse(res14.payload) as Interfaces.IDidDocumentData;
    const doc14 = new DidDocument.DidDocument(data14);
    expect(data14.keys).toHaveLength(1);
    expect(data14.keys[0].auth.toString()).toStrictEqual(defaultKeyId.toString());
    expect(data14.keys[0].valid).toBeTruthy();
    expect(doc14.isTombstonedAt(14)).toBeFalsy();
    expect(doc14.hasRightAt(defaultKeyId, Right.Impersonate, 14)).toBeTruthy();
    expect(doc14.hasRightAt(defaultKeyId, Right.Update, 14)).toBeTruthy();
    expect(doc14.hasRightAt(keyId1, Right.Impersonate, 14)).toBeFalsy();
    expect(doc14.hasRightAt(keyId1, Right.Update, 14)).toBeFalsy();

    const res15 = await hapiServer.inject({ method: 'get', url: `/did/${did}/document/${15}` });
    expect(res15.statusCode).toBe(200);
    const data15 = JSON.parse(res15.payload) as Interfaces.IDidDocumentData;
    const doc15 = new DidDocument.DidDocument(data15);
    expect(data15.keys).toHaveLength(1);
    expect(data15.keys[0].auth.toString()).toStrictEqual(defaultKeyId.toString());
    expect(data15.keys[0].valid).toBeFalsy();
    expect(doc15.isTombstonedAt(15)).toBeTruthy();
    expect(doc15.hasRightAt(defaultKeyId, Right.Impersonate, 15)).toBeFalsy();
    expect(doc15.hasRightAt(defaultKeyId, Right.Update, 15)).toBeFalsy();
    expect(doc15.hasRightAt(keyId1, Right.Impersonate, 15)).toBeFalsy();
    expect(doc15.hasRightAt(keyId1, Right.Update, 15)).toBeFalsy();
  });

  it.todo('can query operations');

  it.todo('can query operation-attempts');

  it('can check transaction validity', async() => {
    const attempts = new OperationAttemptsBuilder()
      .withVault(vault)
      .addRight(did, keyId1, Interfaces.Right.Update) // key is not yet added
      .sign(defaultKeyId)
      .getAttempts();
    const res = await hapiServer.inject({ method: 'post', url: `/check-transaction-validity`, payload: attempts });
    const errors = JSON.parse(res.payload) as Interfaces.IDryRunOperationError[];
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe(`DID ${did} has no valid key matching ${keyId1} at height 0`);
    expect(errors[0].invalidOperationAttempt).toStrictEqual(attempts[0]);
  });

  it('transaction status gives 404 for tx not seen by morpheus', async() => {
    const txid = 'c18894aa5ffe6f819dc98770d1eb9c4357c4d1ef73221fd5937cc360a54dd77f';
    expect(fixture.stateHandler.query.isConfirmed(txid)).toStrictEqual(Optional.empty());
    const res = await hapiServer.inject({ method: 'get', url: `/txn-status/${txid}` });
    expect(res.statusCode).toBe(404);
    expect(res.payload).toMatch(txid);
    expect(res.payload).toMatch('not processed');
  });

  it('confirmed transaction status gives true', async() => {
    addKey(keyId1, 10, transactionId, defaultKeyId);
    expect(fixture.stateHandler.query.isConfirmed(transactionId)).toStrictEqual(Optional.of(true));

    const res = await hapiServer.inject({ method: 'get', url: `/txn-status/${transactionId}` });

    expect(res.statusCode).toBe(200);
    expect(res.payload).toBe('true');
  });

  it('rejected transaction status gives false', async() => {
    addRight(keyId1, 10, transactionId, defaultKeyId); // key not added yet
    expect(fixture.stateHandler.query.isConfirmed(transactionId)).toStrictEqual(Optional.of(false));

    const res = await hapiServer.inject({ method: 'get', url: `/txn-status/${transactionId}` });

    expect(res.statusCode).toBe(200);
    expect(res.payload).toBe('false');
  });
});

describe('safePathInt', () => {
  it('handles undefined', () => {
    expect(safePathInt(undefined)).toBe(undefined);
  });

  it('handles int as string', () => {
    expect(safePathInt('5')).toBe(5);
  });

  it('handles float as string', () => {
    expect(safePathInt('4.2')).toBe(4);
  });

  it('handles number with string concatenated', () => {
    expect(safePathInt('99balloons')).toBe(undefined);
    expect(safePathInt('balloons99')).toBe(undefined);
  });

  it('handles string', () => {
    expect(safePathInt('nowayitsanumber')).toBe(undefined);
  });

  it('handles null', () => {
    expect(safePathInt(null)).toBe(undefined);
  });

  it('handles string undefined', () => {
    expect(safePathInt('undefined')).toBe(undefined);
  });

  it('handles string null', () => {
    expect(safePathInt('null')).toBe(undefined);
  });

  it('handles empty array', () => {
    expect(safePathInt('[]')).toBe(undefined);
  });

  it('handles object', () => {
    expect(safePathInt('{}')).toBe(undefined);
  });
});
