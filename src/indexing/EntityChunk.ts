import { SortedFieldMap, IndexedFields } from "./IndexedFields";

export type TypedObject = { __typename: string; [name: string]: unknown };

export class ObjectChunk {
  public sortedFields: SortedFieldMap;

  public constructor(
    public dataPath: (string | number)[],
    public reference: TypedObject,
    public indexedFields: IndexedFields
  ) {
    // Create an alias of sortedFields for this specific reference
    //  (reference type at this dataPath may change, so we need to keep indexedFields around as well)
    this.sortedFields = this.indexedFields.fieldsByType(
      this.reference.__typename
    );
  }
}

export class EntityChunk extends ObjectChunk {}
