import {
  ListValueAggregate,
  NullValueAggregate,
  ObjectAggregate,
  ScalarValueAggregate,
  ValueAggregate,
} from "./ObjectAggregate";
import { CanonicalFieldName, SortedFieldMap } from "../indexing/IndexedFields";

type Path = (string | number)[];

export type OperationKind = "add" | "remove" | "replace";

export type Patch = {
  op: OperationKind;
  path: Path;
  value: unknown;
};

type DiffContext = {
  // path: Path;
  fieldStack: FieldToDiff[];
  patches: Patch[];
  partials: Patch[];
  staleFields: Path[];
};

type DiffEntityArgs = {
  base: ObjectAggregate;
  model: ObjectAggregate;
};

type FieldToDiff = {
  fieldName: CanonicalFieldName;
  baseFieldValue: ValueAggregate;
  modelFieldValue: ValueAggregate;
};

type DiffResult = {
  patches: Patch[];
  stale: Path[];
};

export function diffEntity({ base, model }: DiffEntityArgs): DiffResult {
  const context: DiffContext = {
    // path: [],
    // env,
    fieldStack: [],
    staleFields: [],
    partials: [],
    patches: [],
  };
  const commonFields = ObjectAggregate.fieldIntersection(base, model);
  for (const fieldName of commonFields) {
    diffField(context, fieldName, base, model);
  }
  return {
    patches: context.patches,
    stale: context.staleFields,
  };
}

function diffField(
  context: DiffContext,
  fieldName: CanonicalFieldName,
  base: ObjectAggregate,
  model: ObjectAggregate
) {
  const baseValue = base.fieldValue(fieldName);
  const modelValue = model.fieldValue(fieldName);

  if (baseValue.firstValue === modelValue.firstValue) {
    return;
  }
  // Fast track for scalars and lists of scalars:
  if (isNullableScalar(baseValue) && isNullableScalar(modelValue)) {
    // TODO: in practice there are cases when nulls should be ignored
    //  e.g. with path-dependant entity values
    //  (this breaks "entity" abstraction, but having some escape hatches may be necessary for practical reasons)
    return replaceValue(context, baseValue, modelValue.firstValue);
  }
  if (
    modelValue.kind === "List" &&
    (baseValue.kind === "List" || baseValue.kind === "Null")
  ) {
    return diffListValue(context, fieldName, baseValue, modelValue);
  }
  if (
    modelValue.kind === "Object" &&
    (baseValue.kind === "Object" || baseValue.kind === "Null")
  ) {
    return diffObjectValue(
      context,
      fieldName,
      baseValue as ObjectAggregate | NullValueAggregate,
      modelValue as ObjectAggregate
    );
  }
  if (modelValue.kind === "Null") {
    // TODO: make sure that both base and model have no subselection (or both have it)
    return replaceValue(context, baseValue, modelValue.firstValue);
  }
  throw new Error(
    `Incompatible field values for ${fieldName}: ${baseValue.kind} vs. ${modelValue.kind}`
  );
}

function diffListValue(
  context: DiffContext,
  fieldName: CanonicalFieldName,
  baseFieldValue: ListValueAggregate | NullValueAggregate,
  modelFieldValue: ListValueAggregate
) {
  if (!baseFieldValue.hasSelection && !modelFieldValue.hasSelection) {
    // List of scalars:
    const baseValue = baseFieldValue.firstValue || [];
    const modelValue = modelFieldValue.firstValue;
    if (
      baseValue.length !== modelValue.length ||
      modelValue.some((item, index) => item !== baseValue[index])
    ) {
      return replaceValue(context, baseFieldValue, modelFieldValue.firstValue);
    }
    return;
  }
  // Several categories of use-cases:
  // 1. Array of entities
  // 2. Array of plain objects (i.e. without the id)
  // 3. Array of abstract types (only with entities)
  // 4. Array of abstract types (of only plain objects)
  // 5. Array of abstract types (mixed: entities/plain objects)
  // 6. Array os scalars
  // 7. Array of arrays (of any combination above) - recursively with any depth, i.e. [[MyUnion]]
  // For now just merge positionally
  // Special case: strictly equal selection set (===) - likely updating the same query
  // throw new Error("Not implemented");
}

function diffObjectValue(
  context: DiffContext,
  fieldName: CanonicalFieldName,
  baseValue: ObjectAggregate | NullValueAggregate,
  modelValue: ObjectAggregate
) {
  if (
    isEntityChunk(baseValue.firstValue) ||
    isEntityChunk(modelValue.firstValue)
  ) {
    return diffEntityValue(context, fieldName, baseValue, modelValue);
  }
  return diffPlainObjectValue(context, fieldName, baseValue, modelValue);
}

function diffPlainObjectValue(
  context: DiffContext,
  fieldName: CanonicalFieldName,
  baseValue: ObjectAggregate | NullValueAggregate,
  modelValue: ObjectAggregate
) {
  if (baseValue.kind === "Null") {
    // TODO: check subselection
    // Replacing nulls is tricky because it may lead to partial field values
    // (e.g. when model doesn't contain enough data to satisfy base selectionSet)
    return createObjectValue(context, fieldName, baseValue, modelValue);
  }

  // Assuming for now a plain object without any nested entities
  const commonFields = ObjectAggregate.fieldIntersection(baseValue, modelValue);
  for (const fieldName of commonFields) {
    diffField(context, fieldName, baseValue, modelValue);
  }
}

function diffEntityValue(
  context: DiffContext,
  fieldName: CanonicalFieldName,
  baseFieldValue: ObjectAggregate | NullValueAggregate,
  modelFieldValue: ObjectAggregate
) {
  if (baseFieldValue.kind === "Null") {
    // Replacing nulls is tricky because it may lead to partial field values
    // (e.g. when model doesn't contain enough data to satisfy base selectionSet)
    return createEntityValue(
      context,
      fieldName,
      baseFieldValue,
      modelFieldValue
    );
  }

  // TODO:
  //  - entity -> plainObject
  //  - entity -> entity (with different typename: union/iface?)

  const baseDataId = dataId(baseFieldValue.firstValue);
  const modelDataId = dataId(modelFieldValue.firstValue);

  if (baseDataId !== modelDataId) {
    return createEntityValue(
      context,
      fieldName,
      baseFieldValue,
      modelFieldValue
    );
  }
}

function diffArrayOfArrays() {}

function diffArrayOfEntities(context: DiffContext, base: any, model: any) {
  // Use-cases:
  //   - Entity removed from list: supported
  //   - Entity added to the list: supported only if selectionSet of the added entity is fully
}

function diffArrayOfPlainObjects() {}

function diffArrayOfAbstractEntityTypes() {
  // e.g. [Node] or [MyEntity | MyOtherEntity]
}

function diffArrayOfAbstractPlainObjectTypes() {
  // e.g. [TextObject | HtmlObject]
}

function diffArrayOfMixedEntityAndPlainObjectTypes() {}

function diffArrayOfScalars() {}

function replaceValue(
  context: DiffContext,
  field: ValueAggregate,
  value: unknown
) {
  if (field.kind === "Object") {
    for (const chunk of field.chunks) {
      const patch: Patch = {
        op: "replace",
        path: chunk.dataPath,
        value,
      };
      context.patches.push(patch);
    }
    return;
  }

  for (const { parentObjectChunk, fieldName, listPath } of field.chunks) {
    // Presumably in 99.9999% of cases there will be only a single entry
    const field = parentObjectChunk.sortedFields.get(fieldName);

    for (const [dataKey] of field.entries) {
      const patch: Patch = {
        op: "replace",
        path: listPath.length
          ? [...parentObjectChunk.dataPath, dataKey, ...listPath]
          : [...parentObjectChunk.dataPath, dataKey],
        value,
      };
      context.patches.push(patch);
    }
  }
}

function addStaleField(context: DiffContext, field: ValueAggregate) {
  // TODO
  // for (const chunk of field.parentChunks) {
  //   for (const [dataKey] of chunk.sortedFields.get(field.canonicalName)
  //     .entries) {
  //     context.staleFields.push([...chunk.dataPath, dataKey]);
  //   }
  // }
}

function createObjectValue(
  context: DiffContext,
  fieldName1: CanonicalFieldName,
  baseFieldValue: ObjectAggregate | NullValueAggregate,
  modelValue: ObjectAggregate
) {
  const typeName = modelValue.typeName();

  if (baseFieldValue.kind === "Null") {
    for (const {
      parentObjectChunk,
      fieldName,
      listPath,
    } of baseFieldValue.chunks) {
      const fieldInfo = parentObjectChunk.sortedFields.get(fieldName);

      for (const [dataKey, indexedFields] of fieldInfo.entries) {
        const [value, isPartial] = createObjectValueRecursively(
          context,
          indexedFields.fieldsByType(typeName),
          modelValue
        );
        const patch: Patch = {
          op: "replace",
          path: [...parentObjectChunk.dataPath, dataKey, ...listPath],
          value,
        };
        if (isPartial) {
          addStaleField(context, baseFieldValue);
          context.partials.push(patch);
        } else {
          context.patches.push(patch);
        }
      }
    }
  } else {
    for (const { dataPath, indexedFields } of baseFieldValue.chunks) {
      const [value, isPartial] = createObjectValueRecursively(
        context,
        indexedFields.fieldsByType(typeName),
        modelValue
      );
      const patch: Patch = {
        op: "replace",
        path: dataPath,
        value,
      };
      if (isPartial) {
        addStaleField(context, baseFieldValue);
        context.partials.push(patch);
      } else {
        context.patches.push(patch);
      }
    }
  }
  // throw new Error("Not implemented");
}

function createObjectValueRecursively(
  context: DiffContext,
  fields: SortedFieldMap,
  modelObject: ObjectAggregate
): [object, boolean] {
  let isPartial = false;
  const result = {};

  for (const field of fields.values()) {
    const modelFieldValue = modelObject.fieldValue(field.canonicalName);

    if (modelFieldValue.kind === "Null" && !modelFieldValue.chunks.length) {
      isPartial = true;
      continue;
    }

    for (const [dataKey, indexedFields] of field.entries) {
      if (modelFieldValue.kind === "Scalar") {
        // No selectionSet, so has to be scalar
        result[dataKey] = modelFieldValue.firstValue;
      } else if (modelFieldValue.kind === "List") {
        // TODO
        throw new Error("Not implemented");
      } else if (modelFieldValue.kind === "Object") {
        const nextValue = modelFieldValue as ObjectAggregate;
        const [nested, isNestedPartial] = createObjectValueRecursively(
          context,
          indexedFields.fieldsByType(nextValue.typeName()),
          nextValue
        );
        result[dataKey] = nested;

        if (isNestedPartial) {
          isPartial = true;
        }
      }
    }
  }
  return [result, isPartial];
}

function createEntityValue(
  context: DiffContext,
  fieldName: CanonicalFieldName,
  baseFieldValue: ObjectAggregate | NullValueAggregate,
  modelFieldValue: ObjectAggregate
) {
  // TODO: use indexed EntityAggregate instance as modelValue instead of modelField value
  const modelValue = modelFieldValue;
  return createObjectValue(context, fieldName, baseFieldValue, modelValue);
}

function isEntityChunk(value: unknown): boolean {
  return Boolean(value && value["__typename"] && value["id"]);
}

function dataId(value: unknown): string | null {
  const typeName = value && value["__typename"];
  const id = value && value["id"];
  return typeName && id ? `${typeName}:${id}` : null;
}

function isNullableScalar(
  value: ValueAggregate
): value is ScalarValueAggregate | NullValueAggregate {
  return (
    value.kind === "Scalar" || (value.kind === "Null" && !value.hasSelection)
  );
}

function isNullableListOfScalars(
  value: ValueAggregate
): value is ListValueAggregate | NullValueAggregate {
  return (
    (value.kind === "List" && !value.hasSelection) ||
    (value.kind === "Null" && !value.hasSelection)
  );
}

function isNullableObject(
  value: ValueAggregate
): value is ObjectAggregate | NullValueAggregate {
  return (
    value.kind === "Object" || (value.kind === "Null" && value.hasSelection)
  );
}
