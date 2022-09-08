import { __read, __spreadArray, __values } from "tslib";
import { ObjectAggregate, } from "./ObjectAggregate";
export function diffEntity(_a) {
    var e_1, _b;
    var base = _a.base, model = _a.model;
    var context = {
        // path: [],
        // env,
        fieldStack: [],
        staleFields: [],
        partials: [],
        patches: []
    };
    var commonFields = ObjectAggregate.fieldIntersection(base, model);
    try {
        for (var commonFields_1 = __values(commonFields), commonFields_1_1 = commonFields_1.next(); !commonFields_1_1.done; commonFields_1_1 = commonFields_1.next()) {
            var fieldName = commonFields_1_1.value;
            diffField(context, fieldName, base, model);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (commonFields_1_1 && !commonFields_1_1.done && (_b = commonFields_1["return"])) _b.call(commonFields_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return {
        patches: context.patches,
        stale: context.staleFields
    };
}
function diffField(context, fieldName, base, model) {
    var baseValue = base.fieldValue(fieldName);
    var modelValue = model.fieldValue(fieldName);
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
    if (modelValue.kind === "List" &&
        (baseValue.kind === "List" || baseValue.kind === "Null")) {
        return diffListValue(context, fieldName, baseValue, modelValue);
    }
    if (modelValue.kind === "Object" &&
        (baseValue.kind === "Object" || baseValue.kind === "Null")) {
        return diffObjectValue(context, fieldName, baseValue, modelValue);
    }
    if (modelValue.kind === "Null") {
        // TODO: make sure that both base and model have no subselection (or both have it)
        return replaceValue(context, baseValue, modelValue.firstValue);
    }
    throw new Error("Incompatible field values for ".concat(fieldName, ": ").concat(baseValue.kind, " vs. ").concat(modelValue.kind));
}
function diffListValue(context, fieldName, baseFieldValue, modelFieldValue) {
    if (!baseFieldValue.hasSelection && !modelFieldValue.hasSelection) {
        // List of scalars:
        var baseValue_1 = baseFieldValue.firstValue || [];
        var modelValue = modelFieldValue.firstValue;
        if (baseValue_1.length !== modelValue.length ||
            modelValue.some(function (item, index) { return item !== baseValue_1[index]; })) {
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
function diffObjectValue(context, fieldName, baseValue, modelValue) {
    if (isEntityChunk(baseValue.firstValue) ||
        isEntityChunk(modelValue.firstValue)) {
        return diffEntityValue(context, fieldName, baseValue, modelValue);
    }
    return diffPlainObjectValue(context, fieldName, baseValue, modelValue);
}
function diffPlainObjectValue(context, fieldName, baseValue, modelValue) {
    var e_2, _a;
    if (baseValue.kind === "Null") {
        // TODO: check subselection
        // Replacing nulls is tricky because it may lead to partial field values
        // (e.g. when model doesn't contain enough data to satisfy base selectionSet)
        return createObjectValue(context, fieldName, baseValue, modelValue);
    }
    // Assuming for now a plain object without any nested entities
    var commonFields = ObjectAggregate.fieldIntersection(baseValue, modelValue);
    try {
        for (var commonFields_2 = __values(commonFields), commonFields_2_1 = commonFields_2.next(); !commonFields_2_1.done; commonFields_2_1 = commonFields_2.next()) {
            var fieldName_1 = commonFields_2_1.value;
            diffField(context, fieldName_1, baseValue, modelValue);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (commonFields_2_1 && !commonFields_2_1.done && (_a = commonFields_2["return"])) _a.call(commonFields_2);
        }
        finally { if (e_2) throw e_2.error; }
    }
}
function diffEntityValue(context, fieldName, baseFieldValue, modelFieldValue) {
    if (baseFieldValue.kind === "Null") {
        // Replacing nulls is tricky because it may lead to partial field values
        // (e.g. when model doesn't contain enough data to satisfy base selectionSet)
        return createEntityValue(context, fieldName, baseFieldValue, modelFieldValue);
    }
    // TODO:
    //  - entity -> plainObject
    //  - entity -> entity (with different typename: union/iface?)
    var baseDataId = dataId(baseFieldValue.firstValue);
    var modelDataId = dataId(modelFieldValue.firstValue);
    if (baseDataId !== modelDataId) {
        return createEntityValue(context, fieldName, baseFieldValue, modelFieldValue);
    }
}
function diffArrayOfArrays() { }
function diffArrayOfEntities(context, base, model) {
    // Use-cases:
    //   - Entity removed from list: supported
    //   - Entity added to the list: supported only if selectionSet of the added entity is fully
}
function diffArrayOfPlainObjects() { }
function diffArrayOfAbstractEntityTypes() {
    // e.g. [Node] or [MyEntity | MyOtherEntity]
}
function diffArrayOfAbstractPlainObjectTypes() {
    // e.g. [TextObject | HtmlObject]
}
function diffArrayOfMixedEntityAndPlainObjectTypes() { }
function diffArrayOfScalars() { }
function replaceValue(context, field, value) {
    var e_3, _a, e_4, _b, e_5, _c;
    if (field.kind === "Object") {
        try {
            for (var _d = __values(field.chunks), _e = _d.next(); !_e.done; _e = _d.next()) {
                var chunk = _e.value;
                var patch = {
                    op: "replace",
                    path: chunk.dataPath,
                    value: value
                };
                context.patches.push(patch);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_a = _d["return"])) _a.call(_d);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return;
    }
    try {
        for (var _f = __values(field.chunks), _g = _f.next(); !_g.done; _g = _f.next()) {
            var _h = _g.value, parentObjectChunk = _h.parentObjectChunk, fieldName = _h.fieldName, listPath = _h.listPath;
            // Presumably in 99.9999% of cases there will be only a single entry
            var field_1 = parentObjectChunk.sortedFields.get(fieldName);
            try {
                for (var _j = (e_5 = void 0, __values(field_1.entries)), _k = _j.next(); !_k.done; _k = _j.next()) {
                    var _l = __read(_k.value, 1), dataKey = _l[0];
                    var patch = {
                        op: "replace",
                        path: listPath.length
                            ? __spreadArray(__spreadArray(__spreadArray([], __read(parentObjectChunk.dataPath), false), [dataKey], false), __read(listPath), false) : __spreadArray(__spreadArray([], __read(parentObjectChunk.dataPath), false), [dataKey], false),
                        value: value
                    };
                    context.patches.push(patch);
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_k && !_k.done && (_c = _j["return"])) _c.call(_j);
                }
                finally { if (e_5) throw e_5.error; }
            }
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (_g && !_g.done && (_b = _f["return"])) _b.call(_f);
        }
        finally { if (e_4) throw e_4.error; }
    }
}
function addStaleField(context, field) {
    // TODO
    // for (const chunk of field.parentChunks) {
    //   for (const [dataKey] of chunk.sortedFields.get(field.canonicalName)
    //     .entries) {
    //     context.staleFields.push([...chunk.dataPath, dataKey]);
    //   }
    // }
}
function createObjectValue(context, fieldName1, baseFieldValue, modelValue) {
    var e_6, _a, e_7, _b, e_8, _c;
    var typeName = modelValue.typeName();
    if (baseFieldValue.kind === "Null") {
        try {
            for (var _d = __values(baseFieldValue.chunks), _e = _d.next(); !_e.done; _e = _d.next()) {
                var _f = _e.value, parentObjectChunk = _f.parentObjectChunk, fieldName = _f.fieldName, listPath = _f.listPath;
                var fieldInfo = parentObjectChunk.sortedFields.get(fieldName);
                try {
                    for (var _g = (e_7 = void 0, __values(fieldInfo.entries)), _h = _g.next(); !_h.done; _h = _g.next()) {
                        var _j = __read(_h.value, 2), dataKey = _j[0], indexedFields = _j[1];
                        var _k = __read(createObjectValueRecursively(context, indexedFields.fieldsByType(typeName), modelValue), 2), value = _k[0], isPartial = _k[1];
                        var patch = {
                            op: "replace",
                            path: __spreadArray(__spreadArray(__spreadArray([], __read(parentObjectChunk.dataPath), false), [dataKey], false), __read(listPath), false),
                            value: value
                        };
                        if (isPartial) {
                            addStaleField(context, baseFieldValue);
                            context.partials.push(patch);
                        }
                        else {
                            context.patches.push(patch);
                        }
                    }
                }
                catch (e_7_1) { e_7 = { error: e_7_1 }; }
                finally {
                    try {
                        if (_h && !_h.done && (_b = _g["return"])) _b.call(_g);
                    }
                    finally { if (e_7) throw e_7.error; }
                }
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_a = _d["return"])) _a.call(_d);
            }
            finally { if (e_6) throw e_6.error; }
        }
    }
    else {
        try {
            for (var _l = __values(baseFieldValue.chunks), _m = _l.next(); !_m.done; _m = _l.next()) {
                var _o = _m.value, dataPath = _o.dataPath, indexedFields = _o.indexedFields;
                var _p = __read(createObjectValueRecursively(context, indexedFields.fieldsByType(typeName), modelValue), 2), value = _p[0], isPartial = _p[1];
                var patch = {
                    op: "replace",
                    path: dataPath,
                    value: value
                };
                if (isPartial) {
                    addStaleField(context, baseFieldValue);
                    context.partials.push(patch);
                }
                else {
                    context.patches.push(patch);
                }
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (_m && !_m.done && (_c = _l["return"])) _c.call(_l);
            }
            finally { if (e_8) throw e_8.error; }
        }
    }
    // throw new Error("Not implemented");
}
function createObjectValueRecursively(context, fields, modelObject) {
    var e_9, _a, e_10, _b;
    var isPartial = false;
    var result = {};
    try {
        for (var _c = __values(fields.values()), _d = _c.next(); !_d.done; _d = _c.next()) {
            var field = _d.value;
            var modelFieldValue = modelObject.fieldValue(field.canonicalName);
            if (modelFieldValue.kind === "Null" && !modelFieldValue.chunks.length) {
                isPartial = true;
                continue;
            }
            try {
                for (var _e = (e_10 = void 0, __values(field.entries)), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var _g = __read(_f.value, 2), dataKey = _g[0], indexedFields = _g[1];
                    if (modelFieldValue.kind === "Scalar") {
                        // No selectionSet, so has to be scalar
                        result[dataKey] = modelFieldValue.firstValue;
                    }
                    else if (modelFieldValue.kind === "List") {
                        // TODO
                        throw new Error("Not implemented");
                    }
                    else if (modelFieldValue.kind === "Object") {
                        var nextValue = modelFieldValue;
                        var _h = __read(createObjectValueRecursively(context, indexedFields.fieldsByType(nextValue.typeName()), nextValue), 2), nested = _h[0], isNestedPartial = _h[1];
                        result[dataKey] = nested;
                        if (isNestedPartial) {
                            isPartial = true;
                        }
                    }
                }
            }
            catch (e_10_1) { e_10 = { error: e_10_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e["return"])) _b.call(_e);
                }
                finally { if (e_10) throw e_10.error; }
            }
        }
    }
    catch (e_9_1) { e_9 = { error: e_9_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c["return"])) _a.call(_c);
        }
        finally { if (e_9) throw e_9.error; }
    }
    return [result, isPartial];
}
function createEntityValue(context, fieldName, baseFieldValue, modelFieldValue) {
    // TODO: use indexed EntityAggregate instance as modelValue instead of modelField value
    var modelValue = modelFieldValue;
    return createObjectValue(context, fieldName, baseFieldValue, modelValue);
}
function isEntityChunk(value) {
    return Boolean(value && value["__typename"] && value["id"]);
}
function dataId(value) {
    var typeName = value && value["__typename"];
    var id = value && value["id"];
    return typeName && id ? "".concat(typeName, ":").concat(id) : null;
}
function isNullableScalar(value) {
    return (value.kind === "Scalar" || (value.kind === "Null" && !value.hasSelection));
}
function isNullableListOfScalars(value) {
    return ((value.kind === "List" && !value.hasSelection) ||
        (value.kind === "Null" && !value.hasSelection));
}
function isNullableObject(value) {
    return (value.kind === "Object" || (value.kind === "Null" && value.hasSelection));
}
//# sourceMappingURL=diff.js.map