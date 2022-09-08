import { __assign, __read, __spreadArray } from "tslib";
import { visit, } from "graphql";
var TYPENAME_FIELD = {
    kind: "Field",
    name: {
        kind: "Name",
        value: "__typename"
    }
};
export function isField(selection) {
    return selection.kind === "Field";
}
export var addTypenameToDocument = Object.assign(function (doc) {
    return visit(doc, {
        SelectionSet: {
            enter: function (node, _key, parent) {
                // Don't add __typename to OperationDefinitions.
                if (parent &&
                    parent.kind === "OperationDefinition") {
                    return;
                }
                // No changes if no selections.
                var selections = node.selections;
                if (!selections) {
                    return;
                }
                // If selections already have a __typename, or are part of an
                // introspection query, do nothing.
                var skip = selections.some(function (selection) {
                    return (isField(selection) &&
                        (selection.name.value === "__typename" ||
                            selection.name.value.lastIndexOf("__", 0) === 0));
                });
                if (skip) {
                    return;
                }
                // If this SelectionSet is @export-ed as an input variable, it should
                // not have a __typename field (see issue #4691).
                var field = parent;
                if (isField(field) &&
                    field.directives &&
                    field.directives.some(function (d) { return d.name.value === "export"; })) {
                    return;
                }
                // Create and return a new SelectionSet with a __typename Field.
                return __assign(__assign({}, node), { selections: __spreadArray(__spreadArray([], __read(selections), false), [TYPENAME_FIELD], false) });
            }
        }
    });
}, {
    added: function (field) {
        return field === TYPENAME_FIELD;
    }
});
//# sourceMappingURL=addTypenameToDocument.js.map