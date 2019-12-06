import cloneDeep from "lodash.clonedeep";
import {
  Authentication,
  Did,
  IDidDocument,
  IDidDocumentOperations,
  IDidDocumentQueries,
  IDidDocumentState,
  IKeyData
} from "../../../interfaces";
import { DidDocument } from "./document";

export const MORPHEUS_DID_PREFIX = "did:morpheus:";
export const MULTICIPHER_KEYID_PREFIX = "i";

// TODO these might needed to be moved somewhere else
export enum AuthenticationKind {
  PublicKey = "PublicKey",
  KeyId = "KeyId",
}

export enum CipherSuite {
  Ed25519Key = "Ed25519",
  Secp256k1Key = "Secp256k1",
}

interface IAuthenticationEntry {
  // TODO probably should be
  // kind: AuthenticationKind;
  // cipherSuite: CipherSuite,
  auth: Authentication;
  validFromHeight?: number;
  validUntilHeight?: number;
}

export const didToAuth = (did: Did): Authentication => {
  return did.replace(new RegExp(`^${MORPHEUS_DID_PREFIX}`), MULTICIPHER_KEYID_PREFIX);
};

const authEntryIsValidAt = (entry: IAuthenticationEntry, height: number): boolean => {
  return !entry.validUntilHeight || entry.validUntilHeight > height;
}

const authEntryToData = (entry: IAuthenticationEntry, height: number): IKeyData => {
  return {
    auth: entry.auth,
    expired: !authEntryIsValidAt(entry, height),
    expiresAtHeight: entry.validUntilHeight,
  };
}

export class DidDocumentState implements IDidDocumentState {

  public readonly query: IDidDocumentQueries = {
    getAt: (height: number): IDidDocument => {
      const reversedKeys = this.keys.slice(0).reverse();
      const keyDatas = reversedKeys.map(key => authEntryToData(key, height));
      return new DidDocument({keys: keyDatas});
    }
  };

  public readonly apply: IDidDocumentOperations = {
    addKey: (auth: Authentication, expiresAtHeight: number | undefined, height: number): void => {
      const lastEntryWithAuth = this.keys.find(entry => entry.auth === auth);
      if (lastEntryWithAuth && authEntryIsValidAt(lastEntryWithAuth, height) ) {
        throw new Error(`DID ${this.did} already has a still valid key ${auth}`);
      }
      this.keys.unshift( {auth, validFromHeight: height, validUntilHeight: expiresAtHeight});
    }
  };

  public readonly revert: IDidDocumentOperations = {
    addKey: (auth: Authentication, expiresAtHeight: number | undefined, height: number): void => {
      if (!this.keys.length) {
        throw new Error(`Cannot revert addKey in DID ${this.did}, because there are no keys`);
      }
      const lastKey = this.keys[0];
      if (lastKey.auth !== auth) {
        throw new Error(`Cannot revert addKey in DID ${this.did}, because the key does not match the last added one.`)
      }
      if (lastKey.validFromHeight !== height) {
        throw new Error(`Cannot revert addKey in DID ${this.did}, because it was not added at the specified height.`)
      }
      if (lastKey.validUntilHeight !== expiresAtHeight) {
        throw new Error(`Cannot revert addKey in DID ${this.did}, because it was not added with the same expiration.`)
      }
      this.keys.shift();
    }
  };

  /**
   * All keys added to the DID. Latest addition first. When a key is removed, the entry is
   * invalidated, but not deleted, so the index of the entry never expires in other data fields.
   * When a removed key is added again, a new entry is added with a new index.
   */
  private keys: IAuthenticationEntry[] = [];

  public constructor(public readonly did: Did) {
    this.keys.unshift( {auth: didToAuth(did)} );
  }

  public clone(): IDidDocumentState {
    const result = new DidDocumentState(this.did);
    result.keys = cloneDeep(this.keys);
    return result;
  }
}