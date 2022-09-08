import { intersectSorted, mergeSorted } from "./iterators";
import { TypedObject, ObjectChunk } from "../indexing/EntityChunk";
import { CanonicalFieldName, IndexedFields } from "../indexing/IndexedFields";

// Example:
//  given parentObjectChunk is { foo: [["first"], ["second"]] }
//  and fieldName is "foo"
//  and listPath is [1, 0]
//  the referenced value is "second"
export type FieldValueChunk = {
  parentObjectChunk: ObjectChunk;
  fieldName: CanonicalFieldName;
  listPath: number[];
};

export type ScalarValueAggregate = {
  kind: "Scalar";
  firstValue: string | number | boolean | null;
  chunks: FieldValueChunk[];
};

export type ListValueAggregate = {
  kind: "List";
  firstValue: unknown[];
  // itemKind: ValueKind; // TODO: do we care?
  chunks: FieldValueChunk[];
  hasSelection: boolean;
};

export type NullValueAggregate = {
  kind: "Null";
  firstValue: null;
  chunks: FieldValueChunk[];
  hasSelection: boolean;
};

export type ObjectValueAggregate = {
  kind: "Object";
  firstValue: TypedObject;
  chunks: ObjectChunk[];
};

export type ValueAggregate =
  | ScalarValueAggregate
  | ListValueAggregate
  | NullValueAggregate
  | ObjectValueAggregate;

export class ObjectAggregate implements ObjectValueAggregate {
  public kind: "Object" = "Object";

  public constructor(
    public chunks: ObjectChunk[],
    public firstValue: TypedObject
  ) {}

  public sortedCanonicalFieldNames(): Iterator<CanonicalFieldName> {
    let acc;
    for (const chunk of this.chunks) {
      acc = acc
        ? mergeSorted(acc, chunk.sortedFields.keys())
        : chunk.sortedFields.keys();
    }
    return acc;
  }

  public typeName(): string {
    return this.firstValue.__typename;
  }

  public fieldValue(fieldName: CanonicalFieldName): ValueAggregate {
    let firstValue = null;
    let hasSelection = null;
    const fieldValueChunks: FieldValueChunk[] = [];

    for (const parentObjectChunk of this.chunks) {
      const fieldInfo = parentObjectChunk.sortedFields.get(fieldName);
      if (!fieldInfo) {
        continue;
      }

      // Taking into account the following case
      //   (first "foo" value is null because of error bubbling, but the second is actually OK)
      // ```graphql
      // {
      //     a: foo { bar }
      //     b: foo { baz }
      // }
      // ```
      //
      // ```js
      // const data = {
      //     "a": null,
      //     "b": [{ baz: "baz" }]
      // }
      // ```
      // Note: In 99+% of cases this will do a single iteration (i.e. first entry of first chunk)
      for (const [dataKey, indexedFields] of fieldInfo.entries) {
        const value = parentObjectChunk.reference[dataKey];
        if (firstValue === null) {
          firstValue = value;
        }
        hasSelection = hasSelection || Boolean(indexedFields);
      }
      fieldValueChunks.push({
        parentObjectChunk,
        fieldName: fieldInfo.canonicalName,
        listPath: [],
      });
    }
    if (firstValue === null) {
      // The actual value can be an object, list, list of lists. No guessing here.
      return {
        kind: "Null",
        firstValue,
        chunks: fieldValueChunks,
        hasSelection,
      };
    }
    if (Array.isArray(firstValue)) {
      return {
        kind: "List",
        firstValue,
        chunks: fieldValueChunks,
        hasSelection,
      };
    }
    if (!hasSelection) {
      return {
        kind: "Scalar",
        firstValue,
        chunks: fieldValueChunks,
      };
    }
    return new ObjectAggregate(
      resolveObjectChunks(fieldValueChunks),
      firstValue
    );
  }

  public static fieldIntersection(
    base: ObjectAggregate,
    model: ObjectAggregate
  ): Iterable<CanonicalFieldName> {
    return intersectSorted(
      base.sortedCanonicalFieldNames(),
      model.sortedCanonicalFieldNames()
    );
  }
}

export class EntityAggregate extends ObjectAggregate {
  public constructor(public entityId: string, chunks: ObjectChunk[]) {
    super(chunks, chunks[0].reference);
  }
}

function isTypedObject(reference: unknown): reference is TypedObject {
  return reference && Boolean(reference["__typename"]);
}

/**
 * Example:
 *   parent object chunk: { foo: [[{ bar: "1" }], [{ baz: "2" }]]}
 *   fieldName: "foo"
 *   listPath: [1, 0]
 *
 * Transformed to object chunk:
 *   { reference: { baz: "2" }, dataPath: ["foo", 1, 0] }
 */
function resolveObjectChunks(fieldChunk: FieldValueChunk[]): ObjectChunk[] {
  const objectChunks = [];
  for (const { parentObjectChunk, fieldName, listPath } of fieldChunk) {
    const fieldInfo = parentObjectChunk.sortedFields.get(fieldName);

    if (!fieldInfo) {
      const path = parentObjectChunk.dataPath.join(".");
      throw new Error(
        `Field ${fieldName} doesn't exist on object chunk at ${path}`
      );
    }

    for (const [dataKey, indexedFields] of fieldInfo.entries) {
      const dataPath = [...parentObjectChunk.dataPath, dataKey, ...listPath];
      let reference = parentObjectChunk.reference[dataKey];

      // TODO: some chunks may have reference === null, others may refer to actual objects
      //   this can happen e.g. because of error bubbling

      for (const index of listPath) {
        reference = reference[index];
      }

      if (!isTypedObject(reference)) {
        const pid = this.parentEntityId;
        const path = dataPath.join(".");
        const x = JSON.stringify(reference);
        throw new Error(
          `Field at path ${pid}.${path} is expected to be an object containing "__typename" field, got: ${x}`
        );
      }

      objectChunks.push(new ObjectChunk(dataPath, reference, indexedFields));
    }
  }
  return objectChunks;
}
