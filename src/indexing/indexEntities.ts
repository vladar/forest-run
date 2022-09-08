import { IndexedFields } from "./IndexedFields";
import { EntityChunk, TypedObject } from "./EntityChunk";

export type EntityMap = Map<string, EntityChunk[]>;

export function indexEntities(
  data: TypedObject,
  indexedFields: IndexedFields
): EntityMap {
  const entities: EntityMap = new Map();
  const typedObject = { ...data, __typename: "Query", id: "root" };

  indexObject(entities, typedObject, indexedFields, []);
  return entities;
}

export function indexObject(
  entities: EntityMap,
  object: object,
  indexedFields: IndexedFields,
  dataPath: (string | number)[]
) {
  if (object["__typename"] && object["id"]) {
    const id = `${object["__typename"]}:${object["id"]}`;
    let chunks = entities.get(id);
    if (!chunks) {
      chunks = [];
      entities.set(id, chunks);
    }
    chunks.push(
      new EntityChunk(dataPath, object as TypedObject, indexedFields)
    );
  }

  const fieldsWithSelections = indexedFields.fieldsWithSelectionsByType(
    object["__typename"]
  );
  const sortedFieldsByType = indexedFields.fieldsByType(object["__typename"]);

  for (const fieldName of fieldsWithSelections.values()) {
    const field = sortedFieldsByType.get(fieldName);
    for (const [dataKey, indexedFields] of field.entries) {
      if (!indexedFields) {
        throw new Error("Expected sub-selection");
      }
      const value = object[dataKey];

      if (Array.isArray(value)) {
        indexList(entities, value, indexedFields, dataPath.concat(dataKey));
      } else if (typeof value === "object" && null !== value) {
        indexObject(
          entities,
          value as TypedObject,
          indexedFields,
          dataPath.concat(dataKey)
        );
      }
    }
  }
}

export function indexList(
  entities: EntityMap,
  list: unknown[],
  indexedFields: IndexedFields,
  dataPath: (string | number)[]
) {
  for (const [index, value] of list.entries()) {
    if (typeof value === "object" && value !== null) {
      if (!value["__typename"]) {
        throw new Error("Expecting typed object");
      }
      indexObject(
        entities,
        value as TypedObject,
        indexedFields,
        dataPath.concat(index)
      );
    } else if (Array.isArray(value)) {
      indexList(entities, value, indexedFields, dataPath.concat(index));
    }
  }
}
