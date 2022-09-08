import { __generator } from "tslib";
export function mergeSorted(iteratorA, iteratorB, comparator) {
    var a, b;
    if (comparator === void 0) { comparator = defaultComparator; }
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, , 11, 12]);
                a = iteratorA.next();
                b = iteratorB.next();
                _a.label = 1;
            case 1:
                if (!(!a.done && !b.done)) return [3 /*break*/, 6];
                if (!(comparator(a.value, b.value) <= 0)) return [3 /*break*/, 3];
                return [4 /*yield*/, a.value];
            case 2:
                _a.sent();
                a = iteratorA.next();
                return [3 /*break*/, 5];
            case 3: return [4 /*yield*/, b.value];
            case 4:
                _a.sent();
                b = iteratorB.next();
                _a.label = 5;
            case 5: return [3 /*break*/, 1];
            case 6:
                if (!!a.done) return [3 /*break*/, 8];
                return [4 /*yield*/, a.value];
            case 7:
                _a.sent();
                a = iteratorA.next();
                return [3 /*break*/, 6];
            case 8:
                if (!!b.done) return [3 /*break*/, 10];
                return [4 /*yield*/, b.value];
            case 9:
                _a.sent();
                b = iteratorB.next();
                return [3 /*break*/, 8];
            case 10: return [3 /*break*/, 12];
            case 11:
                // If generator is exited early, make sure to close iterators too
                // See https://raganwald.com/2017/07/22/closing-iterables-is-a-leaky-abstraction.html#more-about-closing-iterators-explicitly
                if (typeof iteratorA["return"] === "function")
                    iteratorA["return"]();
                if (typeof iteratorB["return"] === "function")
                    iteratorB["return"]();
                return [7 /*endfinally*/];
            case 12: return [2 /*return*/];
        }
    });
}
export function intersectSorted(iteratorA, iteratorB, comparator) {
    var a, b, eq;
    if (comparator === void 0) { comparator = defaultComparator; }
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, , 7, 8]);
                a = iteratorA.next();
                b = iteratorB.next();
                _a.label = 1;
            case 1:
                if (!(!a.done && !b.done)) return [3 /*break*/, 6];
                eq = comparator(a.value, b.value);
                if (!(eq < 0)) return [3 /*break*/, 2];
                // a < b
                a = iteratorA.next();
                return [3 /*break*/, 5];
            case 2:
                if (!(eq > 0)) return [3 /*break*/, 3];
                // a > b
                b = iteratorB.next();
                return [3 /*break*/, 5];
            case 3: return [4 /*yield*/, a.value];
            case 4:
                _a.sent();
                a = iteratorA.next();
                _a.label = 5;
            case 5: return [3 /*break*/, 1];
            case 6: return [3 /*break*/, 8];
            case 7:
                if (typeof iteratorA["return"] === "function")
                    iteratorA["return"]();
                if (typeof iteratorB["return"] === "function")
                    iteratorB["return"]();
                return [7 /*endfinally*/];
            case 8: return [2 /*return*/];
        }
    });
}
function defaultComparator(a, b) {
    if (a === b) {
        return 0;
    }
    return a > b ? 1 : -1;
}
//# sourceMappingURL=iterators.js.map