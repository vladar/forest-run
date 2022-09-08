import { DocumentNode, FragmentDefinitionNode } from "graphql";
import { ObjectAggregate } from "./diffing/ObjectAggregate";

export type EntityId = string;
export type DataPath = Array<string | number>;
export type ASTPath = Array<string | number>;

export interface EntityPath {
  dataPath: DataPath;
  astPath: ASTPath;
}

export interface EntityDescriptor {
  id: EntityId;
  revision: number;
  paths: EntityPath[]; // single entity may exist at multiple paths in the query
}

export type EntityIndex = {
  entityAggregates: () => ObjectAggregate[];
  entityAggregate(dataId: string): ObjectAggregate | undefined;
};

export interface OperationDescriptor {
  document: DocumentNode;
  variables: any;
}

export type OperationResult = {
  operation: OperationDescriptor;
  data: any;
  errors: any;
  extensions: any;
};

export type IndexedOperationResult = {
  result: OperationResult;
  index: EntityIndex;
};

export type Environment = {
  logger: any;
};

export interface LocalTransform {
  transform: () => any;
}

export type FragmentMap = Map<string, FragmentDefinitionNode>;

interface IndexedSelectionSet {}
