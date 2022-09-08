import { __values } from "tslib";
// TODO: generate and memoize intermediate result for a [Document].
//   Then the final result for [Document, variables]  can be created faster fromDocument(doc).withVariables(variables)
var IndexedFields = /** @class */ (function () {
    function IndexedFields() {
        // Fields sorted by canonicalName
        this.sortedFields = new Map();
        // Fields selected on specific types (i.e. in fragments or inline fragments)
        // Note: sortedFields are included in every value of sortedFieldsByType (for perf reasons)
        // TODO: typeCondition on interface type?
        this.sortedFieldsByType = new Map();
        this.fieldsWithSelectionsSet = new Set();
        this.fieldsWithSelectionsByTypeSet = new Map();
    }
    IndexedFields.prototype.fieldsByType = function (typename) {
        var _a;
        return (_a = this.sortedFieldsByType.get(typename)) !== null && _a !== void 0 ? _a : this.sortedFields;
    };
    IndexedFields.prototype.fieldsWithSelectionsByType = function (typename) {
        var _a;
        return ((_a = this.fieldsWithSelectionsByTypeSet.get(typename)) !== null && _a !== void 0 ? _a : this.fieldsWithSelectionsSet);
    };
    IndexedFields.fromOperation = function (op) {
        var _a;
        var def = op.document.definitions[0];
        var variableDefinitions = (_a = def.variableDefinitions) !== null && _a !== void 0 ? _a : [];
        var variables = variableDefinitions.reduce(function (acc, vd) {
            var _a;
            var variableName = vd.variable.name.value;
            acc[variableName] = (_a = op.variables[variableName]) !== null && _a !== void 0 ? _a : vd.defaultValue;
            return acc;
        }, Object.create(null));
        return IndexedFields.fromSelectionSet(def.selectionSet);
    };
    IndexedFields.fromSelectionSet = function (selectionSet) {
        var e_1, _a;
        var fields = [];
        var fieldsWithSelections = new Set();
        try {
            for (var _b = __values(selectionSet.selections), _c = _b.next(); !_c.done; _c = _b.next()) {
                var tmp = _c.value;
                var field = tmp;
                var fieldName = field.name.value;
                var indexedSelections = field.selectionSet
                    ? IndexedFields.fromSelectionSet(field.selectionSet)
                    : undefined;
                var fieldInfo = {
                    canonicalName: fieldName,
                    entries: [[fieldName, indexedSelections]]
                };
                fields.push([field.name.value, fieldInfo]);
                if (indexedSelections) {
                    fieldsWithSelections.add(fieldName);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        fields.sort(function (a, b) {
            return a === b ? 0 : a > b ? 1 : -1;
        });
        var result = new IndexedFields();
        result.sortedFields = new Map(fields);
        result.fieldsWithSelectionsSet = fieldsWithSelections;
        return result;
    };
    IndexedFields.contains = function (container, maybeContained) {
        var e_2, _a;
        if (maybeContained.sortedFieldsByType.size > container.sortedFieldsByType.size) {
            return false;
        }
        if (maybeContained.sortedFields.size > container.sortedFields.size) {
            return false;
        }
        // sortedFieldByType always contain sortedFields, so checking sortedFields only when sortedFieldByType exist
        if (!container.sortedFieldsByType.size) {
            return contains(container.sortedFields, maybeContained.sortedFields);
        }
        try {
            for (var _b = __values(maybeContained.sortedFieldsByType.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var type = _c.value;
                if (!contains(container.sortedFieldsByType.get(type), maybeContained.sortedFieldsByType.get(type))) {
                    return false;
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return true;
    };
    return IndexedFields;
}());
export { IndexedFields };
function contains(container, maybeContained) {
    var e_3, _a;
    if (maybeContained.size > container.size) {
        return false;
    }
    try {
        for (var _b = __values(maybeContained.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
            var maybeContainedField = _c.value;
            var containerFieldInfo = container.get(maybeContainedField.canonicalName);
            if (!containerFieldInfo) {
                return false;
            }
            // Almost 100% of cases will contain 1 item for both container and contained
            // More items is a pretty uncommon edge-case
            if (maybeContainedField.entries.length !== containerFieldInfo.entries.length) {
                return false;
            }
            for (var i = 0; i < maybeContainedField.entries.length - 1; i++) {
                if (containerFieldInfo.entries[i][0] !== maybeContainedField.entries[i][0] ||
                    !IndexedFields.contains(containerFieldInfo.entries[i][1], maybeContainedField.entries[i][1])) {
                    return false;
                }
            }
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
        }
        finally { if (e_3) throw e_3.error; }
    }
    return true;
}
//# sourceMappingURL=IndexedFields.js.map