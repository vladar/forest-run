import { __assign, __read, __values } from "tslib";
import { EntityChunk } from "./EntityChunk";
export function indexEntities(data, indexedFields) {
    var entities = new Map();
    var typedObject = __assign(__assign({}, data), { __typename: "Query", id: "root" });
    indexObject(entities, typedObject, indexedFields, []);
    return entities;
}
export function indexObject(entities, object, indexedFields, dataPath) {
    var e_1, _a, e_2, _b;
    if (object["__typename"] && object["id"]) {
        var id = "".concat(object["__typename"], ":").concat(object["id"]);
        var chunks = entities.get(id);
        if (!chunks) {
            chunks = [];
            entities.set(id, chunks);
        }
        chunks.push(new EntityChunk(dataPath, object, indexedFields));
    }
    var fieldsWithSelections = indexedFields.fieldsWithSelectionsByType(object["__typename"]);
    var sortedFieldsByType = indexedFields.fieldsByType(object["__typename"]);
    try {
        for (var _c = __values(fieldsWithSelections.values()), _d = _c.next(); !_d.done; _d = _c.next()) {
            var fieldName = _d.value;
            var field = sortedFieldsByType.get(fieldName);
            try {
                for (var _e = (e_2 = void 0, __values(field.entries)), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var _g = __read(_f.value, 2), dataKey = _g[0], indexedFields_1 = _g[1];
                    if (!indexedFields_1) {
                        throw new Error("Expected sub-selection");
                    }
                    var value = object[dataKey];
                    if (Array.isArray(value)) {
                        indexList(entities, value, indexedFields_1, dataPath.concat(dataKey));
                    }
                    else if (typeof value === "object" && null !== value) {
                        indexObject(entities, value, indexedFields_1, dataPath.concat(dataKey));
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e["return"])) _b.call(_e);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c["return"])) _a.call(_c);
        }
        finally { if (e_1) throw e_1.error; }
    }
}
export function indexList(entities, list, indexedFields, dataPath) {
    var e_3, _a;
    try {
        for (var _b = __values(list.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = __read(_c.value, 2), index = _d[0], value = _d[1];
            if (typeof value === "object" && value !== null) {
                if (!value["__typename"]) {
                    throw new Error("Expecting typed object");
                }
                indexObject(entities, value, indexedFields, dataPath.concat(index));
            }
            else if (Array.isArray(value)) {
                indexList(entities, value, indexedFields, dataPath.concat(index));
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
}
//# sourceMappingURL=indexEntities.js.map