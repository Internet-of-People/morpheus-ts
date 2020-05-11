export {
  Did,
  digest,
  KeyId,
  mask,
  PublicKey,
  Signature,
  SignedJson,
  SignedBytes,
  ValidationIssue,
  ValidationResult,
  Vault,
} from '@internet-of-people/morpheus-crypto-wasm';

import type * as Types from './types';

export type { Types };

export {
  PersistentVault,
} from './PersistentVault';

export {
  Bip39,
} from './Bip39';

export * from './authentication';
export * from './nonce';
