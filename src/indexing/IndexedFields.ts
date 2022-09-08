import {
  FieldNode,
  OperationDefinitionNode,
  SelectionSetNode,
  DocumentNode,
} from "graphql";

// Q1:
// {
//   a: foo(id: 2)
//   foo(id: $value)
//   b: foo
// }
//
// Q2
// {
//   b: foo(id: 1)
// }
// $value = 0
// $value = 1
// $value = 3
// ???
//
// Q1:
// foo
// foo(id: 2)
// foo(id: $value)

// Fields may be defined in the main selectionSet OR in a fragment with type condition (i.e. for abstract types)
// {
//    foo {
//       bar
//       ... on MyType {
//         baz
//       }
//    }
// }
// Valid paths:
//   ["foo", "bar"]
//   ["foo", ["MyType", "baz"]]
// Not a valid path:
//   ["foo", "baz"]

export interface OperationDescriptor {
  document: DocumentNode;
  variables: any;
}

// a: foo(bar:$bar) -> foo(bar:"something")
// TODO: CanonicalFieldVariant or FieldId?
export type CanonicalFieldName = string & { __brand: "canonicalFieldName" };

type DataKey = string; // i.e. alias ?? name

export type ASTFieldInfo = {
  canonicalName: CanonicalFieldName;
  entries: [DataKey, IndexedFields | undefined][]; // e.g. { a: foo { bar }, { b: foo { baz } } -> same canonical name `foo` leads to multiple entries: `a { bar }` and `b { baz }`
};

export type SortedFieldMap = Map<CanonicalFieldName, ASTFieldInfo>;

// TODO: generate and memoize intermediate result for a [Document].
//   Then the final result for [Document, variables]  can be created faster fromDocument(doc).withVariables(variables)
export class IndexedFields {
  // Fields sorted by canonicalName
  private sortedFields: SortedFieldMap = new Map();

  // Fields selected on specific types (i.e. in fragments or inline fragments)
  // Note: sortedFields are included in every value of sortedFieldsByType (for perf reasons)
  // TODO: typeCondition on interface type?
  private sortedFieldsByType = new Map<string, SortedFieldMap>();

  private fieldsWithSelectionsSet = new Set<CanonicalFieldName>();
  private fieldsWithSelectionsByTypeSet = new Map<
    string,
    Set<CanonicalFieldName>
  >();

  public fieldsByType(typename): SortedFieldMap {
    return this.sortedFieldsByType.get(typename) ?? this.sortedFields;
  }

  public fieldsWithSelectionsByType(typename): Set<CanonicalFieldName> {
    return (
      this.fieldsWithSelectionsByTypeSet.get(typename) ??
      this.fieldsWithSelectionsSet
    );
  }

  public static fromOperation(op: OperationDescriptor): IndexedFields {
    const def = op.document.definitions[0] as OperationDefinitionNode;
    const variableDefinitions = def.variableDefinitions ?? [];

    const variables = variableDefinitions.reduce((acc, vd) => {
      const variableName = vd.variable.name.value;
      acc[variableName] = op.variables[variableName] ?? vd.defaultValue;
      return acc;
    }, Object.create(null));

    return IndexedFields.fromSelectionSet(def.selectionSet);
  }

  private static fromSelectionSet(
    selectionSet: SelectionSetNode
  ): IndexedFields {
    const fields = [];
    const fieldsWithSelections = new Set<CanonicalFieldName>();
    for (const tmp of selectionSet.selections) {
      const field = tmp as FieldNode;
      const fieldName = field.name.value;
      const indexedSelections = field.selectionSet
        ? IndexedFields.fromSelectionSet(field.selectionSet)
        : undefined;
      const fieldInfo = {
        canonicalName: fieldName,
        entries: [[fieldName, indexedSelections]],
      };
      fields.push([field.name.value, fieldInfo]);

      if (indexedSelections) {
        fieldsWithSelections.add(fieldName as CanonicalFieldName);
      }
    }

    fields.sort((a, b) => {
      return a === b ? 0 : a > b ? 1 : -1;
    });

    const result = new IndexedFields();
    result.sortedFields = new Map(fields);
    result.fieldsWithSelectionsSet = fieldsWithSelections;

    return result;
  }

  public static contains(
    container: IndexedFields,
    maybeContained: IndexedFields
  ): boolean {
    if (
      maybeContained.sortedFieldsByType.size > container.sortedFieldsByType.size
    ) {
      return false;
    }
    if (maybeContained.sortedFields.size > container.sortedFields.size) {
      return false;
    }
    // sortedFieldByType always contain sortedFields, so checking sortedFields only when sortedFieldByType exist
    if (!container.sortedFieldsByType.size) {
      return contains(container.sortedFields, maybeContained.sortedFields);
    }
    for (const type of maybeContained.sortedFieldsByType.keys()) {
      if (
        !contains(
          container.sortedFieldsByType.get(type),
          maybeContained.sortedFieldsByType.get(type)
        )
      ) {
        return false;
      }
    }
    return true;
  }
}

function contains(container: SortedFieldMap, maybeContained: SortedFieldMap) {
  if (maybeContained.size > container.size) {
    return false;
  }
  for (const maybeContainedField of maybeContained.values()) {
    const containerFieldInfo = container.get(maybeContainedField.canonicalName);
    if (!containerFieldInfo) {
      return false;
    }
    // Almost 100% of cases will contain 1 item for both container and contained
    // More items is a pretty uncommon edge-case
    if (maybeContainedField.entries.length !== containerFieldInfo.entries.length) {
      return false;
    }
    for (let i = 0; i < maybeContainedField.entries.length - 1; i++) {
      if (
        containerFieldInfo.entries[i][0] !== maybeContainedField.entries[i][0] ||
        !IndexedFields.contains(
          containerFieldInfo.entries[i][1],
          maybeContainedField.entries[i][1]
        )
      ) {
        return false;
      }
    }
  }
  return true;
}
