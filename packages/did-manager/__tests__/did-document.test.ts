import { Layer2, Types } from '@internet-of-people/sdk';
import { Operations } from '../src/morpheus-transaction';
import { defaultDid, defaultKeyId, keyId2 } from './known-keys';

const { RightRegistry } = Operations;

describe('DidDocument', () => {
  const keys: Types.Layer2.IKeyData[] = [{
    index: 0,
    auth: defaultKeyId.toString(),
    validFromHeight: null,
    validUntilHeight: null,
    valid: true,
  }];
  const rights = {} as Types.Layer2.IRightsMap<Types.Layer2.IKeyRightHistory[]>;
  rights[RightRegistry.systemRights.impersonate] = [
    { keyLink: '#0', history: [{ height: null, valid: true }], valid: true },
  ];
  rights[RightRegistry.systemRights.update] = [
    { keyLink: '#0', history: [{ height: null, valid: true }], valid: true },
  ];
  const queriedAtHeight = 1;

  it('hasRight trivial', () => {
    const doc1 = new Layer2.DidDocument(
      {
        did: defaultDid.toString(),
        keys,
        rights,
        queriedAtHeight,
        tombstonedAtHeight: null,
        tombstoned: false,
      },
    );

    expect(doc1.hasRightAt(defaultKeyId, RightRegistry.systemRights.impersonate, 1)).toBeTruthy();
    expect(doc1.hasRightAt(defaultKeyId, RightRegistry.systemRights.update, 1)).toBeTruthy();
    expect(doc1.hasRightAt(keyId2, RightRegistry.systemRights.impersonate, 1)).toBeFalsy();
    expect(doc1.hasRightAt(keyId2, RightRegistry.systemRights.update, 1)).toBeFalsy();
  });

  it('hasRight complex', () => {
    const keys2: Types.Layer2.IKeyData[] = [
      {
        index: 0,
        auth: defaultKeyId.toString(),
        validFromHeight: null,
        validUntilHeight: 6,
        valid: false,
      },
      {
        index: 1,
        auth: keyId2.toString(),
        validFromHeight: 2,
        validUntilHeight: null,
        valid: true,
      },
    ];
    const rights2 = {} as Types.Layer2.IRightsMap<Types.Layer2.IKeyRightHistory[]>;
    rights2[RightRegistry.systemRights.impersonate] = [
      {
        keyLink: '#0',
        history: [
          { height: null, valid: true },
          { height: 3, valid: false },
        ],
        valid: false,
      },
      {
        keyLink: '#1',
        history: [
          { height: null, valid: false },
          { height: 2, valid: true },
        ],
        valid: true,
      },
    ];
    rights2[RightRegistry.systemRights.update] = [
      {
        keyLink: '#0',
        history: [
          { height: null, valid: true },
        ],
        valid: false,
      },
      {
        keyLink: '#1',
        history: [
          { height: null, valid: false },
          { height: 3, valid: true },
        ],
        valid: true,
      },
    ];
    const doc10 = new Layer2.DidDocument({
      did: defaultDid.toString(),
      keys: keys2,
      rights: rights2,
      queriedAtHeight: 10,
      tombstonedAtHeight: null,
      tombstoned: false,
    });

    expect(doc10.hasRightAt(defaultKeyId, RightRegistry.systemRights.impersonate, 1)).toBeTruthy();
    expect(doc10.hasRightAt(defaultKeyId, RightRegistry.systemRights.impersonate, 3)).toBeFalsy();
    expect(doc10.hasRightAt(defaultKeyId, RightRegistry.systemRights.impersonate, 10)).toBeFalsy();
    expect(doc10.hasRightAt(keyId2, RightRegistry.systemRights.impersonate, 1)).toBeFalsy();
    expect(doc10.hasRightAt(keyId2, RightRegistry.systemRights.impersonate, 2)).toBeTruthy();
    expect(doc10.hasRightAt(keyId2, RightRegistry.systemRights.impersonate, 10)).toBeTruthy();
    expect(doc10.hasRightAt(defaultKeyId, RightRegistry.systemRights.update, 1)).toBeTruthy();
    expect(doc10.hasRightAt(defaultKeyId, RightRegistry.systemRights.update, 6)).toBeFalsy();
    expect(doc10.hasRightAt(defaultKeyId, RightRegistry.systemRights.update, 10)).toBeFalsy();
    expect(doc10.hasRightAt(keyId2, RightRegistry.systemRights.update, 1)).toBeFalsy();
    expect(doc10.hasRightAt(keyId2, RightRegistry.systemRights.update, 2)).toBeFalsy();
    expect(doc10.hasRightAt(keyId2, RightRegistry.systemRights.update, 3)).toBeTruthy();
    expect(doc10.hasRightAt(keyId2, RightRegistry.systemRights.update, 10)).toBeTruthy();
  });

  it('fromData restores data correctly', () => {
    const doc = new Layer2.DidDocument({
      did: defaultDid.toString(),
      keys: [],
      rights: {} as Types.Layer2.IRightsMap<Types.Layer2.IKeyRightHistory[]>,
      queriedAtHeight,
      tombstonedAtHeight: null,
      tombstoned: false,
    });
    expect(doc.toData().keys).toHaveLength(0);
    expect(doc.toData().did).toBe(defaultDid.toString());
    expect(doc.toData().queriedAtHeight).toBe(1);
    expect(Object.keys(doc.toData().rights).length).toBe(0);

    doc.fromData({
      did: defaultDid.toString(),
      keys,
      rights,
      queriedAtHeight,
      tombstonedAtHeight: null,
      tombstoned: false,
    });

    expect(doc.toData().did).toBe(defaultDid.toString());
    expect(doc.toData().keys).toHaveLength(1);
    expect(doc.toData().keys[0].auth).toBe(defaultKeyId.toString());
    expect(doc.toData().keys[0].validFromHeight).toBe(null);
    expect(doc.toData().keys[0].validUntilHeight).toBe(null);
    expect(doc.toData().keys[0].valid).toBeTruthy();
    expect(Object.keys(doc.toData().rights).length).toBe(2);
    expect(doc.toData().rights[RightRegistry.systemRights.impersonate]).toHaveLength(1);
    expect(doc.toData().rights[RightRegistry.systemRights.impersonate][0]).toStrictEqual(
      { keyLink: '#0', history: [{ height: null, valid: true }], valid: true },
    );
    expect(doc.toData().rights[RightRegistry.systemRights.update]).toHaveLength(1);
    expect(doc.toData().rights[RightRegistry.systemRights.update][0]).toStrictEqual(
      { keyLink: '#0', history: [{ height: null, valid: true }], valid: true },
    );
    expect(doc.toData().queriedAtHeight).toBe(1);
    expect(doc.toData().tombstonedAtHeight).toBe(null);
    expect(doc.toData().tombstoned).toBeFalsy();
  });

  it('did can be tombstoned', () => {
    const doc = new Layer2.DidDocument(
      { did: defaultDid.toString(), keys, rights, queriedAtHeight: 3, tombstonedAtHeight: 2, tombstoned: true },
    );

    expect(doc.isTombstonedAt(1)).toBeFalsy();
    expect(doc.isTombstonedAt(2)).toBeTruthy();
    expect(doc.toData().queriedAtHeight).toBe(3);
    expect(doc.toData().tombstonedAtHeight).toBe(2);
    expect(doc.toData().tombstoned).toBeTruthy();
  });

  it('throws if rights or tombstone state is queried ', () => {
    const doc = new Layer2.DidDocument(
      { did: defaultDid.toString(), keys, rights, queriedAtHeight: 3, tombstonedAtHeight: null, tombstoned: false },
    );

    expect(() => {
      return doc.hasRightAt(defaultKeyId, RightRegistry.systemRights.impersonate, 10);
    }).toThrowError(
      'Cannot query at 10, latest block seen was 3',
    );
    expect(() => {
      return doc.isTombstonedAt(10);
    }).toThrowError('Cannot query at 10, latest block seen was 3');
  });
});
