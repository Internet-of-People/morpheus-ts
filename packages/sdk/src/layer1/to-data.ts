import {
  IOperationData,
  IOperationVisitor,
  IRegisterBeforeProofData,
  ISignedOperationsData,
} from '../types/layer1';
import { Operation } from './operation';
import { OperationType } from './operation-type';

/**
 * A visitor that extracts specific data objects needed to represent operations.
 */
class ToDataVisitor implements IOperationVisitor<IOperationData> {
  public signed(operations: ISignedOperationsData): IOperationData {
    return operations;
  }

  public registerBeforeProof(contentId: string): IOperationData {
    const result: IRegisterBeforeProofData = {
      operation: OperationType.RegisterBeforeProof,
      contentId,
    };
    return result;
  }
}

/**
 * This converts IOperation implementations into the IOperationData type.
 * If we want to get rid of IOperationData completely, it is possible to do so in the future.
 * @param operation The operation model to convert
 */
export const toData = (operation: Operation): IOperationData => {
  return operation.accept(new ToDataVisitor());
};
