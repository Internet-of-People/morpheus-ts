/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export function __wbg_signedbytes_free(a: number): void;
export function signedbytes_new(a: number, b: number, c: number, d: number): number;
export function signedbytes_publicKey(a: number): number;
export function signedbytes_content(a: number, b: number): void;
export function signedbytes_signature(a: number): number;
export function signedbytes_validate(a: number): number;
export function __wbg_signedjson_free(a: number): void;
export function signedjson_new(a: number, b: number, c: number): number;
export function signedjson_publicKey(a: number): number;
export function signedjson_content(a: number): number;
export function signedjson_signature(a: number): number;
export function signedjson_validate(a: number): number;
export function signedjson_validateWithKeyId(a: number, b: number): number;
export function signedjson_validateWithDidDoc(a: number, b: number, c: number, d: number, e: number, f: number, g: number): number;
export function __wbg_validationissue_free(a: number): void;
export function validationissue_code(a: number): number;
export function validationissue_severity(a: number, b: number): void;
export function validationissue_reason(a: number, b: number): void;
export function __wbg_validationresult_free(a: number): void;
export function validationresult_status(a: number, b: number): void;
export function validationresult_messages(a: number, b: number): void;
export function __wbg_did_free(a: number): void;
export function did_new(a: number, b: number): number;
export function did_prefix(a: number): void;
export function did_fromKeyId(a: number): number;
export function did_defaultKeyId(a: number): number;
export function did_toString(a: number, b: number): void;
export function __wbg_vault_free(a: number): void;
export function vault_new(a: number, b: number): number;
export function vault_serialize(a: number, b: number): void;
export function vault_deserialize(a: number, b: number): number;
export function vault_keyIds(a: number, b: number): void;
export function vault_dids(a: number, b: number): void;
export function vault_activeDid(a: number): number;
export function vault_createDid(a: number): number;
export function vault_signWitnessRequest(a: number, b: number, c: number): number;
export function vault_signWitnessStatement(a: number, b: number, c: number): number;
export function vault_signClaimPresentation(a: number, b: number, c: number): number;
export function vault_signDidOperations(a: number, b: number, c: number, d: number): number;
export function __wbg_keyid_free(a: number): void;
export function keyid_new(a: number, b: number): number;
export function keyid_prefix(a: number): void;
export function keyid_toString(a: number, b: number): void;
export function publickey_new(a: number, b: number): number;
export function publickey_prefix(a: number): void;
export function publickey_keyId(a: number): number;
export function publickey_validateId(a: number, b: number): number;
export function publickey_toString(a: number, b: number): void;
export function signature_new(a: number, b: number): number;
export function signature_prefix(a: number): void;
export function signature_toString(a: number, b: number): void;
export function __wbg_publickey_free(a: number): void;
export function __wbg_signature_free(a: number): void;
export function __wbindgen_malloc(a: number): number;
export function __wbindgen_realloc(a: number, b: number, c: number): number;
export function __wbindgen_free(a: number, b: number): void;
