import { __assign, __read, __spreadArray, __values } from "tslib";
export function applyPatches(obj, patches) {
    var e_1, _a;
    // Brute-force O(N*M) (where N is the number of patches and M is an average path length)
    // TODO: N*log(N*M) - sort patches and traverse more efficiently
    if (!patches.length) {
        return obj;
    }
    var copy = __assign({}, obj);
    try {
        for (var patches_1 = __values(patches), patches_1_1 = patches_1.next(); !patches_1_1.done; patches_1_1 = patches_1.next()) {
            var patch = patches_1_1.value;
            var path = patch.path;
            if (!path.length) {
                throw new Error("Patch patch cannot be empty");
            }
            if (patch.op !== "replace") {
                throw new Error("Unsupported patch op: ".concat(patch.op));
            }
            var source = obj;
            var draft = copy;
            for (var i = 0; i < path.length - 1; i++) {
                var key = path[i];
                var nextKey = path[i + 1];
                if (i !== path.length && source[key] === draft[key]) {
                    draft[key] =
                        typeof nextKey === "number" ? __spreadArray([], __read(source[key]), false) : __assign({}, source[key]);
                }
                source = source[key];
                draft = draft[key];
            }
            var lastKey = path[path.length - 1];
            draft[lastKey] = patch.value;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (patches_1_1 && !patches_1_1.done && (_a = patches_1["return"])) _a.call(patches_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return copy;
}
//# sourceMappingURL=applyPatches.js.map