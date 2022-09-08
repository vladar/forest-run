import { __extends, __read, __spreadArray, __values } from "tslib";
import { intersectSorted, mergeSorted } from "./iterators";
import { ObjectChunk } from "../indexing/EntityChunk";
var ObjectAggregate = /** @class */ (function () {
    function ObjectAggregate(chunks, firstValue) {
        this.chunks = chunks;
        this.firstValue = firstValue;
        this.kind = "Object";
    }
    ObjectAggregate.prototype.sortedCanonicalFieldNames = function () {
        var e_1, _a;
        var acc;
        try {
            for (var _b = __values(this.chunks), _c = _b.next(); !_c.done; _c = _b.next()) {
                var chunk = _c.value;
                acc = acc
                    ? mergeSorted(acc, chunk.sortedFields.keys())
                    : chunk.sortedFields.keys();
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return acc;
    };
    ObjectAggregate.prototype.typeName = function () {
        return this.firstValue.__typename;
    };
    ObjectAggregate.prototype.fieldValue = function (fieldName) {
        var e_2, _a, e_3, _b;
        var firstValue = null;
        var hasSelection = null;
        var fieldValueChunks = [];
        try {
            for (var _c = __values(this.chunks), _d = _c.next(); !_d.done; _d = _c.next()) {
                var parentObjectChunk = _d.value;
                var fieldInfo = parentObjectChunk.sortedFields.get(fieldName);
                if (!fieldInfo) {
                    continue;
                }
                try {
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
                    for (var _e = (e_3 = void 0, __values(fieldInfo.entries)), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var _g = __read(_f.value, 2), dataKey = _g[0], indexedFields = _g[1];
                        var value = parentObjectChunk.reference[dataKey];
                        if (firstValue === null) {
                            firstValue = value;
                        }
                        hasSelection = hasSelection || Boolean(indexedFields);
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_b = _e["return"])) _b.call(_e);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
                fieldValueChunks.push({
                    parentObjectChunk: parentObjectChunk,
                    fieldName: fieldInfo.canonicalName,
                    listPath: []
                });
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c["return"])) _a.call(_c);
            }
            finally { if (e_2) throw e_2.error; }
        }
        if (firstValue === null) {
            // The actual value can be an object, list, list of lists. No guessing here.
            return {
                kind: "Null",
                firstValue: firstValue,
                chunks: fieldValueChunks,
                hasSelection: hasSelection
            };
        }
        if (Array.isArray(firstValue)) {
            return {
                kind: "List",
                firstValue: firstValue,
                chunks: fieldValueChunks,
                hasSelection: hasSelection
            };
        }
        if (!hasSelection) {
            return {
                kind: "Scalar",
                firstValue: firstValue,
                chunks: fieldValueChunks
            };
        }
        return new ObjectAggregate(resolveObjectChunks(fieldValueChunks), firstValue);
    };
    ObjectAggregate.fieldIntersection = function (base, model) {
        return intersectSorted(base.sortedCanonicalFieldNames(), model.sortedCanonicalFieldNames());
    };
    return ObjectAggregate;
}());
export { ObjectAggregate };
var EntityAggregate = /** @class */ (function (_super) {
    __extends(EntityAggregate, _super);
    function EntityAggregate(entityId, chunks) {
        var _this = _super.call(this, chunks, chunks[0].reference) || this;
        _this.entityId = entityId;
        return _this;
    }
    return EntityAggregate;
}(ObjectAggregate));
export { EntityAggregate };
function isTypedObject(reference) {
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
function resolveObjectChunks(fieldChunk) {
    var e_4, _a, e_5, _b, e_6, _c;
    var objectChunks = [];
    try {
        for (var fieldChunk_1 = __values(fieldChunk), fieldChunk_1_1 = fieldChunk_1.next(); !fieldChunk_1_1.done; fieldChunk_1_1 = fieldChunk_1.next()) {
            var _d = fieldChunk_1_1.value, parentObjectChunk = _d.parentObjectChunk, fieldName = _d.fieldName, listPath = _d.listPath;
            var fieldInfo = parentObjectChunk.sortedFields.get(fieldName);
            if (!fieldInfo) {
                var path = parentObjectChunk.dataPath.join(".");
                throw new Error("Field ".concat(fieldName, " doesn't exist on object chunk at ").concat(path));
            }
            try {
                for (var _e = (e_5 = void 0, __values(fieldInfo.entries)), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var _g = __read(_f.value, 2), dataKey = _g[0], indexedFields = _g[1];
                    var dataPath = __spreadArray(__spreadArray(__spreadArray([], __read(parentObjectChunk.dataPath), false), [dataKey], false), __read(listPath), false);
                    var reference = parentObjectChunk.reference[dataKey];
                    try {
                        // TODO: some chunks may have reference === null, others may refer to actual objects
                        //   this can happen e.g. because of error bubbling
                        for (var listPath_1 = (e_6 = void 0, __values(listPath)), listPath_1_1 = listPath_1.next(); !listPath_1_1.done; listPath_1_1 = listPath_1.next()) {
                            var index = listPath_1_1.value;
                            reference = reference[index];
                        }
                    }
                    catch (e_6_1) { e_6 = { error: e_6_1 }; }
                    finally {
                        try {
                            if (listPath_1_1 && !listPath_1_1.done && (_c = listPath_1["return"])) _c.call(listPath_1);
                        }
                        finally { if (e_6) throw e_6.error; }
                    }
                    if (!isTypedObject(reference)) {
                        var pid = this.parentEntityId;
                        var path = dataPath.join(".");
                        var x = JSON.stringify(reference);
                        throw new Error("Field at path ".concat(pid, ".").concat(path, " is expected to be an object containing \"__typename\" field, got: ").concat(x));
                    }
                    objectChunks.push(new ObjectChunk(dataPath, reference, indexedFields));
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e["return"])) _b.call(_e);
                }
                finally { if (e_5) throw e_5.error; }
            }
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (fieldChunk_1_1 && !fieldChunk_1_1.done && (_a = fieldChunk_1["return"])) _a.call(fieldChunk_1);
        }
        finally { if (e_4) throw e_4.error; }
    }
    return objectChunks;
}
//# sourceMappingURL=ObjectAggregate.js.map