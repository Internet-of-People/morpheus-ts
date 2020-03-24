import inquirer from 'inquirer';

import { KeyId, Did } from '@internet-of-people/morpheus-core';
import { IO } from '@internet-of-people/sdk';

import { IAction } from './action';
import { Network, allNetworks } from './network';

export const dumpDids = (dids: Did[]): void => {
  console.log('These are the dids based on your private keys:');

  for (const did of dids) {
    console.log(did.toString());
  }
};

export const dumpKeyIds = (keyIds: KeyId[]): void => {
  console.log('These are the key ids based on your private keys:');

  for (const id of keyIds) {
    console.log(id.toString());
  }
};

export const askDid = async(operation: string): Promise<IO.Did> => {
  const { did }: { did: string; } = await inquirer.prompt([{
    type: 'input',
    name: 'did',
    message: `Type did to ${operation}:`,
  }]);
  return new Did(did);
};

export const askAuth = async(operation: string): Promise<IO.Authentication> => {
  const { auth }: { auth: IO.Authentication; } = await inquirer.prompt([{
    type: 'input',
    name: 'auth',
    message: `Type a public key or key ID to ${operation}:`,
    filter: async(value: string): Promise<IO.Authentication> => {
      return IO.authenticationFromData(value);
    },
  }]);
  return auth;
};

export const askHeight = async(): Promise<number | undefined> => {
  const { height }: { height?: number; } = await inquirer.prompt([{
    type: 'number',
    name: 'height',
    default: 0,
    /* eslint no-undefined: 0 */
    filter: async(value: number): Promise<number | undefined> => {
      return value === 0 ? undefined : value;
    },
  }]);
  return height;
};

export const askSignerKeyId = async(ids: KeyId[]): Promise<KeyId> => {
  const { signerKeyId }: { signerKeyId: KeyId; } = await inquirer.prompt([{
    name: 'signerKeyId',
    message: 'Choose id to sign with:',
    type: 'list',
    choices: ids.map((id) => {
      return { name: id.toString(), value: id };
    }),
  }]);
  return signerKeyId;
};

export const chooseAction = async(actions: IAction[], id?: string): Promise<IAction> => {
  let actionId = id;

  if (!id) {
    const answers = await inquirer.prompt([{
      name: 'action',
      message: 'Choose action:',
      type: 'list',
      choices: actions.map((a) => {
        return a.id;
      }),
    }]);
    actionId = answers.action;
  }

  const action = actions.find((a) => {
    return a.id === actionId;
  });

  if (!action) {
    throw new Error(`Unknown action provided: ${actionId}`);
  }
  return action;
};

export const askForNetwork = async(): Promise<Network> => {
  const { network }: { network: Network; } = await inquirer.prompt([{
    name: 'network',
    message: 'Choose network:',
    type: 'list',
    choices: allNetworks.map((n) => {
      return { name: n.toString(), n };
    }),
  }]);
  return network;
};

export const askForPassphrase = async(sender: string): Promise<string> => {
  const result = await inquirer.prompt([{
    name: 'passphrase',
    message: `Type passphrase for ${sender}:`,
    type: 'password',
  }]);

  if (!result.passphrase) {
    throw new Error('Passphrase must not be empty.');
  }
  return result.passphrase;
};

export const askForAddress = async(recipient: string): Promise<string> => {
  const result: { address?: string; } = await inquirer.prompt([{
    name: 'address',
    message: `Type the address of ${recipient}:`,
  }]);

  if (!result.address) {
    throw new Error('address must not be empty.');
  }
  return result.address;
};
