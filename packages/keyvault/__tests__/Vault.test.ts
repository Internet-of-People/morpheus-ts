import { Vault } from '../pkg/vault';
import {DidVault} from "../src/DidVault";

describe('Vault', () => {
  it('can be serialized/deserialized', () => {
    const vault = new Vault(DidVault.DEMO_PHRASE);
    expect(vault.profiles()).toHaveLength(0);

    vault.create_id();
    expect(vault.profiles()).toHaveLength(1);

    vault.create_id();
    expect(vault.profiles()).toHaveLength(2);
    expect(vault.profiles()).toStrictEqual(
      ["IezbeWGSY2dqcUBqT8K7R14xr", "Iez25N5WZ1Q6TQpgpyYgiu9gTX"]);

    const vaultSerStr = vault.serialize();
    const vaultDeser = Vault.deserialize(vaultSerStr);

    expect(vaultDeser.profiles()).toStrictEqual(vault.profiles()  );
  });

  it('can validate signatures', () => {
    const vault = new Vault(DidVault.DEMO_PHRASE);
    const id = vault.create_id();

    const message = new Uint8Array([1,2,3,4,5]);
    const signedMessage = vault.sign(id, message);
    expect(signedMessage).toBeTruthy();
    expect( vault.validate_signature(id, signedMessage) ).toBe(true);
    expect( vault.validate_signature(undefined, signedMessage) ).toBe(true);

    signedMessage.message[0] -= 1;
    expect( vault.validate_signature(id, signedMessage) ).toBe(false);
  });
});
