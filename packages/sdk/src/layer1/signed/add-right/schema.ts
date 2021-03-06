import { SignableOperationType } from '../../operation-type';

export const addRightSchema = (): unknown => {
  return {
    type: 'object',
    required: [ 'operation', 'did', 'lastTxId', 'auth', 'right' ],
    // additionalProperties: false, // TODO: https://github.com/ArkEcosystem/core/issues/3340
    properties: {
      operation: {
        type: 'string',
        const: SignableOperationType.AddRight,
      },
      did: {
        type: 'string',
      },
      lastTxId: {
        type: [ 'string', 'null' ],
      },
      auth: {
        type: 'string',
      },
      right: {
        type: 'string',
      },
    },
  };
};
