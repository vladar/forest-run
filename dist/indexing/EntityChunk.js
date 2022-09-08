import { __extends } from "tslib";
var ObjectChunk = /** @class */ (function () {
    function ObjectChunk(dataPath, reference, indexedFields) {
        this.dataPath = dataPath;
        this.reference = reference;
        this.indexedFields = indexedFields;
        // Create an alias of sortedFields for this specific reference
        //  (reference type at this dataPath may change, so we need to keep indexedFields around as well)
        this.sortedFields = this.indexedFields.fieldsByType(this.reference.__typename);
    }
    return ObjectChunk;
}());
export { ObjectChunk };
var EntityChunk = /** @class */ (function (_super) {
    __extends(EntityChunk, _super);
    function EntityChunk() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return EntityChunk;
}(ObjectChunk));
export { EntityChunk };
//# sourceMappingURL=EntityChunk.js.map