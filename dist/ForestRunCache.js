import { __extends, __read, __spreadArray, __values } from "tslib";
import { ApolloCache } from "@apollo/client";
import { addTypenameToDocument } from "./addTypenameToDocument";
import { IndexedFields } from "./indexing/IndexedFields";
import { indexEntities } from "./indexing/indexEntities";
import { diffEntity } from "./diffing/diff";
import { EntityAggregate } from "./diffing/ObjectAggregate";
import { applyPatches } from "./patching/applyPatches";
/**
 * Not-even-a-proof-of-concept version of Apollo cache
 */
var OneBigHack = /** @class */ (function (_super) {
    __extends(OneBigHack, _super);
    function OneBigHack() {
        var _this = _super.call(this) || this;
        _this.typenameDocumentCache = new Map();
        _this.indexedFieldsCache = new Map();
        _this.entityIndexes = new Map();
        _this.docResults = new Map();
        _this.dirtyDocs = new Map(); // lastDiff
        _this.watches = new Set();
        return _this;
    }
    OneBigHack.prototype.write = function (options) {
        var e_1, _a, e_2, _b, e_3, _c;
        var _this = this;
        if (options.dataId && options.dataId !== "ROOT_QUERY") {
            throw new Error("Not implemented");
        }
        var document = options.query;
        var indexedFields = this.indexedFieldsCache.get(document);
        if (!indexedFields) {
            indexedFields = IndexedFields.fromOperation({ document: document, variables: {} });
            this.indexedFieldsCache.set(document, indexedFields);
        }
        var entities = indexEntities(options.result, indexedFields);
        var docUpdated = false;
        var docPatchesMap = new Map();
        var hasIndexedEntity = function (doc, id) { var _a; return Boolean((_a = _this.entityIndexes.get(doc)) === null || _a === void 0 ? void 0 : _a.has(id)); };
        var diffDocEntity = function (doc, model) {
            var chunks = _this.entityIndexes.get(doc).get(model.entityId);
            if (!chunks) {
                throw new Error("No entity ".concat(model.entityId, " for this doc"));
            }
            var base = new EntityAggregate(model.entityId, chunks);
            var patches = diffEntity({ base: base, model: model }).patches;
            if (!patches.length) {
                return false;
            }
            var docPatches = docPatchesMap.get(doc);
            if (!docPatches) {
                docPatches = [];
                docPatchesMap.set(doc, docPatches);
            }
            docPatches.push.apply(docPatches, __spreadArray([], __read(patches), false));
            return true;
        };
        try {
            for (var _d = __values(entities.entries()), _e = _d.next(); !_e.done; _e = _d.next()) {
                var _f = __read(_e.value, 2), id = _f[0], chunks = _f[1];
                var model = new EntityAggregate(id, chunks);
                // First, compare with the same doc: if there are no changes - no need to compare with others
                // Because all "unstale" docs are up-to-date
                if (hasIndexedEntity(document, id)) {
                    if (!diffDocEntity(document, model)) {
                        continue;
                    }
                }
                try {
                    for (var _g = (e_2 = void 0, __values(this.watches)), _h = _g.next(); !_h.done; _h = _g.next()) {
                        var query = _h.value.query;
                        if (query !== document && hasIndexedEntity(query, id)) {
                            diffDocEntity(query, model);
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_h && !_h.done && (_b = _g["return"])) _b.call(_g);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_a = _d["return"])) _a.call(_d);
            }
            finally { if (e_1) throw e_1.error; }
        }
        try {
            for (var _j = __values(docPatchesMap.entries()), _k = _j.next(); !_k.done; _k = _j.next()) {
                var _l = __read(_k.value, 2), doc = _l[0], patches = _l[1];
                var currentResult = this.docResults.get(doc);
                var nextResult = applyPatches(currentResult, patches);
                if (currentResult !== nextResult) {
                    this.docResults.set(doc, nextResult);
                    this.dirtyDocs.set(doc, currentResult);
                    if (doc === document) {
                        docUpdated = true;
                    }
                    // TOOD: update indexes with patches too
                    // this.entityIndexes.set(
                    //   doc,
                    //   indexEntities(nextResult as any, this.indexedFieldsCache.get(doc))
                    // );
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_k && !_k.done && (_c = _j["return"])) _c.call(_j);
            }
            finally { if (e_3) throw e_3.error; }
        }
        this.entityIndexes.set(document, entities);
        if (!docUpdated && !this.docResults.has(document)) {
            this.docResults.set(document, options.result);
        }
        this.broadcastWatches(document, this.docResults.get(document));
        //
        // try {
        //     ++this.txCount;
        //     return this.storeWriter.writeToStore(this.data, options);
        // } finally {
        //     if (!--this.txCount && options.broadcast !== false) {
        //         this.broadcastWatches();
        //     }
        // }
        return undefined;
    };
    OneBigHack.prototype.broadcastWatches = function (document, result) {
        var e_4, _a;
        try {
            // Temp hack: additionally execute and write all empty watch queries
            for (var _b = __values(this.watches), _c = _b.next(); !_c.done; _c = _b.next()) {
                var watch = _c.value;
                var doc = watch.query;
                if (document === doc) {
                    watch.callback({ result: result }, { result: this.docResults.get(doc) });
                    continue;
                }
                if (!this.docResults.has(doc)) {
                    var indexedFields = this.indexedFieldsCache.get(doc);
                    var watchQueryResult = filterResult(indexedFields, result);
                    // const entities = indexEntities(
                    //   watchQueryResult,
                    //   indexedFields
                    // );
                    // this.entityIndexes.set(doc, entities);
                    // this.docResults.set(doc, watchQueryResult);
                    // this.dirtyDocs.set(doc, watchQueryResult);
                    watch.callback({ result: watchQueryResult });
                    continue;
                }
                if (this.dirtyDocs.has(doc)) {
                    var lastResult = this.dirtyDocs.get(doc);
                    var currentResult = this.docResults.get(doc);
                    if (currentResult) {
                        watch.callback({ result: currentResult }, { result: lastResult });
                    }
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_4) throw e_4.error; }
        }
        this.dirtyDocs.clear();
    };
    OneBigHack.prototype.read = function (options) {
        return this.diff(options).result;
    };
    OneBigHack.prototype.diff = function (options) {
        var e_5, _a;
        if (options.rootId && options.rootId !== "ROOT_QUERY") {
            throw new Error("Not implemented");
        }
        var document = options.query;
        var result = this.docResults.get(document);
        if (result) {
            return { result: result, complete: true };
        }
        if (!this.docResults.size) {
            return { result: null };
        }
        // Try to satisfy the read from another query result
        var indexedFields = this.indexedFieldsCache.get(document);
        if (!indexedFields) {
            indexedFields = IndexedFields.fromOperation({
                document: options.query,
                variables: {}
            });
            this.indexedFieldsCache.set(document, indexedFields);
        }
        try {
            // Find the first query that "includes" this query
            for (var _b = __values(this.docResults.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var otherDoc = _c.value;
                if (otherDoc === document) {
                    continue;
                }
                var otherIndexedFields = this.indexedFieldsCache.get(otherDoc);
                if (IndexedFields.contains(otherIndexedFields, indexedFields)) {
                    var result_1 = filterResult(indexedFields, this.docResults.get(otherDoc));
                    // const entities = indexEntities(result, indexedFields);
                    // this.docResults.set(document, result);
                    // this.entityIndexes.set(document, entities);
                    return { result: result_1, complete: true };
                }
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_5) throw e_5.error; }
        }
        return { result: null };
    };
    OneBigHack.prototype.watch = function (watch) {
        // this.diff({ query: watch.query, optimistic: false });
        var _this = this;
        var indexedFields = this.indexedFieldsCache.get(watch.query);
        if (!indexedFields) {
            indexedFields = IndexedFields.fromOperation({
                document: watch.query,
                variables: {}
            });
            this.indexedFieldsCache.set(watch.query, indexedFields);
        }
        if (!this.docResults.has(watch.query) && this.docResults.size) {
            // TODO: instead run against aggregated Query:root Entity
            var doc = watch.query;
            var _a = __read(this.docResults.values(), 1), sourceData = _a[0];
            var watchQueryResult = filterResult(indexedFields, sourceData);
            var entities = indexEntities(watchQueryResult, indexedFields);
            this.entityIndexes.set(doc, entities);
            this.docResults.set(doc, watchQueryResult);
            this.dirtyDocs.set(doc, watchQueryResult);
        }
        this.watches.add(watch);
        return function () {
            _this.watches["delete"](watch);
        };
    };
    OneBigHack.prototype.restore = function (contents) {
        var e_6, _a;
        if (!Array.isArray(contents)) {
            return this;
        }
        try {
            for (var contents_1 = __values(contents), contents_1_1 = contents_1.next(); !contents_1_1.done; contents_1_1 = contents_1.next()) {
                var _b = contents_1_1.value, query = _b.query, data = _b.data;
                this.write({
                    query: query,
                    result: data
                });
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (contents_1_1 && !contents_1_1.done && (_a = contents_1["return"])) _a.call(contents_1);
            }
            finally { if (e_6) throw e_6.error; }
        }
        return this;
    };
    OneBigHack.prototype.extract = function (optimistic) {
        var e_7, _a;
        var _b, _c, _d, _e;
        if (optimistic === void 0) { optimistic = false; }
        var result = {};
        try {
            for (var _f = __values(this.docResults.entries()), _g = _f.next(); !_g.done; _g = _f.next()) {
                var _h = __read(_g.value, 2), doc = _h[0], docResult = _h[1];
                if (doc.definitions[0].kind === "OperationDefinition") {
                    var value = (_c = (_b = doc.definitions[0]) === null || _b === void 0 ? void 0 : _b.name) === null || _c === void 0 ? void 0 : _c.value;
                    if (value) {
                        result[(_e = (_d = doc.definitions[0]) === null || _d === void 0 ? void 0 : _d.name) === null || _e === void 0 ? void 0 : _e.value] = docResult;
                    }
                }
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (_g && !_g.done && (_a = _f["return"])) _a.call(_f);
            }
            finally { if (e_7) throw e_7.error; }
        }
        return result;
    };
    OneBigHack.prototype.evict = function (options) {
        throw new Error("Not implemented");
    };
    OneBigHack.prototype.reset = function (options) {
        throw new Error("Not implemented");
    };
    OneBigHack.prototype.removeOptimistic = function (idToRemove) {
        throw new Error("Not implemented");
    };
    OneBigHack.prototype.performTransaction = function (update, optimisticId) {
        return update(this);
        // const perform = (layer?: EntityStore): TUpdateResult => {
        //   const { data, optimisticData } = this;
        //   ++this.txCount;
        //   if (layer) {
        //     this.data = this.optimisticData = layer;
        //   }
        //   try {
        //     return updateResult = update(this);
        //   } finally {
        //     --this.txCount;
        //     this.data = data;
        //     this.optimisticData = optimisticData;
        //   }
        // };
        // perform()
    };
    OneBigHack.prototype.transformDocument = function (document) {
        var result = this.typenameDocumentCache.get(document);
        if (!result) {
            result = addTypenameToDocument(document);
            this.typenameDocumentCache.set(document, result);
            // If someone calls transformDocument and then mistakenly passes the
            // result back into an API that also calls transformDocument, make sure
            // we don't keep creating new query documents.
            this.typenameDocumentCache.set(result, result);
        }
        return result;
    };
    return OneBigHack;
}(ApolloCache));
export { OneBigHack };
function filterResult(fields, data) {
    var e_8, _a, e_9, _b;
    var _c;
    if (data === null) {
        return null;
    }
    var result = {};
    try {
        for (var _d = __values(fields.fieldsByType((_c = data["__typename"]) !== null && _c !== void 0 ? _c : "Query").values()), _e = _d.next(); !_e.done; _e = _d.next()) {
            var fieldInfo = _e.value;
            var _loop_1 = function (dataKey, indexedFields) {
                var value = data[dataKey];
                if (!indexedFields) {
                    // Leaf
                    result[dataKey] = value;
                    return "continue";
                }
                if (Array.isArray(value)) {
                    result[dataKey] = value.map(function (item) { return filterResult(indexedFields, item); });
                }
                else {
                    result[dataKey] = filterResult(indexedFields, value);
                }
            };
            try {
                for (var _f = (e_9 = void 0, __values(fieldInfo.entries)), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var _h = __read(_g.value, 2), dataKey = _h[0], indexedFields = _h[1];
                    _loop_1(dataKey, indexedFields);
                }
            }
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (_g && !_g.done && (_b = _f["return"])) _b.call(_f);
                }
                finally { if (e_9) throw e_9.error; }
            }
        }
    }
    catch (e_8_1) { e_8 = { error: e_8_1 }; }
    finally {
        try {
            if (_e && !_e.done && (_a = _d["return"])) _a.call(_d);
        }
        finally { if (e_8) throw e_8.error; }
    }
    return result;
}
//# sourceMappingURL=ForestRunCache.js.map