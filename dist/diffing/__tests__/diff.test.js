import { __assign, __makeTemplateObject } from "tslib";
import { diffEntity } from "../diff";
import { parse } from "graphql";
import { EntityAggregate } from "../ObjectAggregate";
import { EntityChunk } from "../../indexing/EntityChunk";
import { IndexedFields } from "../../indexing/IndexedFields";
var gql = function (x) { var _a; return parse((_a = x[0]) !== null && _a !== void 0 ? _a : ""); };
describe("Single entity chunk", function () {
    it("produces empty diff when there are no changes", function () {
        var base = entityKitchenSink();
        var model = entityKitchenSink();
        var result = diff(base, model);
        expect(result).toEqual({ patches: [], stale: [] });
    });
    describe("diff doesn't mutate objects", function () {
        // TODO (or maybe add an expect to each test case)
    });
    describe("diff scalars", function () {
        it("replaces null with scalar", function () {
            var base = entityKitchenSink({ scalar: null });
            var model = entityKitchenSink({ scalar: "updated" });
            var result = diff(base, model);
            expect(result).toEqual({
                patches: [{ op: "replace", path: ["scalar"], value: "updated" }],
                stale: []
            });
            expect(result.stale).toEqual([]);
        });
        it("replaces scalars on change", function () {
            var base = entityKitchenSink({ scalar: "value" });
            var model = entityKitchenSink({ scalar: "updated" });
            var result = diff(base, model);
            expect(result).toEqual({
                patches: [{ op: "replace", path: ["scalar"], value: "updated" }],
                stale: []
            });
            expect(result.stale).toEqual([]);
        });
        it("replaces scalars with null", function () {
            var base = entityKitchenSink({ scalar: "base" });
            var model = entityKitchenSink({ scalar: null });
            var result = diff(base, model);
            expect(result).toEqual({
                patches: [{ op: "replace", path: ["scalar"], value: null }],
                stale: []
            });
        });
    });
    describe("diff list of scalars", function () {
        it("replaces null with a list", function () {
            var modelList = [null, "foo", null, "bar", null];
            var base = entityKitchenSink({ scalarList: null });
            var model = entityKitchenSink({ scalarList: modelList });
            var result = diff(base, model);
            expect(result).toEqual({
                patches: [{ op: "replace", path: ["scalarList"], value: modelList }],
                stale: []
            });
        });
        it("replaces a list with different length", function () {
            var modelList = [null, "bar", null, "baz", null];
            var base = entityKitchenSink({ scalarList: [null, "foo"] });
            var model = entityKitchenSink({ scalarList: modelList });
            var result = diff(base, model);
            expect(result).toEqual({
                patches: [{ op: "replace", path: ["scalarList"], value: modelList }],
                stale: []
            });
        });
        it("replaces a list with a different list of the same length", function () {
            var baseList = [null, "foo", null, "bar", null];
            var modelList = [null, "bar", null, "baz", null];
            var base = entityKitchenSink({ scalarList: baseList });
            var model = entityKitchenSink({ scalarList: modelList });
            var result = diff(base, model);
            expect(result).toEqual({
                patches: [{ op: "replace", path: ["scalarList"], value: modelList }],
                stale: []
            });
        });
        it("preserves the same list when there are no changes", function () {
            var baseList = [null, "foo", null, "bar", null];
            var modelList = [null, "foo", null, "bar", null];
            var base = entityKitchenSink({ scalarList: baseList });
            var model = entityKitchenSink({ scalarList: modelList });
            var result = diff(base, model);
            expect(result).toEqual({ patches: [], stale: [] });
        });
    });
    describe("diff entities", function () {
        describe("model selectionSet includes base selectionSet", function () {
            it("replaces null with entity", function () {
                var base = entityKitchenSink({ entity: null });
                var model = entityKitchenSink({ entity: entityFoo() });
                var result = diff(base, model);
                expect(result).toEqual({
                    patches: [{ op: "replace", path: ["entity"], value: entityFoo() }],
                    stale: []
                });
            });
            it("replaces entity with another entity", function () {
                var baseEntity = entityFoo({ id: "1", foo: "foo" });
                var modelEntity = entityFoo({ id: "2", foo: "foo2" });
                var base = entityKitchenSink({ entity: baseEntity });
                var model = entityKitchenSink({ entity: modelEntity });
                var result = diff(base, model);
                expect(result).toEqual({
                    patches: [{ op: "replace", path: ["entity"], value: modelEntity }],
                    stale: []
                });
            });
            it("does not update nested entities", function () {
                // `diffEntity` is scoped to a single entity.
                // It is expected that nested entities are updated via separate diffEntity calls
                // (unless it is a complete entity replacement)
                var baseEntity = entityFoo({ foo: "foo" });
                var modelEntity = entityFoo({ foo: "foo2" });
                var base = entityKitchenSink({ entity: baseEntity });
                var model = entityKitchenSink({ entity: modelEntity });
                var result = diff(base, model);
                expect(result).toEqual({
                    patches: [],
                    stale: []
                });
            });
        });
    });
    describe("diff list of entities", function () {
        describe("model selectionSet includes base selectionSet", function () {
            it("replaces null with entity list", function () {
                var modelList = [entityFoo(), null, entityFoo({ id: "2" })];
                var base = entityKitchenSink({ entityList: null });
                var model = entityKitchenSink({ entityList: modelList });
                var result = diff(base, model);
                expect(result).toEqual({
                    patches: [{ op: "replace", path: ["entity"], value: modelList }],
                    stale: []
                });
            });
        });
    });
    describe("diff plain objects", function () {
        describe("model selectionSet includes base selectionSet", function () {
            it("replaces null with object", function () {
                var base = entityKitchenSink({ plainObject: null });
                var model = entityKitchenSink({ plainObject: plainObjectFoo() });
                var result = diff(base, model);
                expect(result).toEqual({
                    patches: [
                        { op: "replace", path: ["plainObject"], value: plainObjectFoo() },
                    ],
                    stale: []
                });
            });
            it("updates nested scalar field", function () {
                var baseFoo = plainObjectFoo({ foo: "foo" });
                var modelFoo = plainObjectFoo({ foo: "bar" });
                var base = entityKitchenSink({ plainObject: baseFoo });
                var model = entityKitchenSink({ plainObject: modelFoo });
                var result = diff(base, model);
                expect(result).toEqual({
                    patches: [
                        { op: "replace", path: ["plainObject", "foo"], value: "bar" },
                    ],
                    stale: []
                });
            });
        });
    });
    it.todo("replaces null with an object when model selectionSet fully includes base selectionSet");
    it.todo("does not replace null with an object when query sub-selections");
});
var entityFoo = function (overrides) { return (__assign({ __typename: "EntityFoo", id: "1", foo: "foo" }, overrides)); };
var entityBar = function (overrides) { return (__assign({ __typename: "EntityBar", id: "1", string: "string" }, overrides)); };
var plainObjectFoo = function (overrides) { return (__assign({ __typename: "PlainObjectFoo", foo: "foo" }, overrides)); };
var plainObjectBar = function (overrides) { return (__assign({ __typename: "PlainObjectBar", bar: "bar" }, overrides)); };
var entityKitchenSink = function (overrides) { return (__assign({ __typename: "EntityKitchenSink", id: "1", scalar: "value", scalarList: [null, "foo", null, "bar", null], plainObject: plainObjectFoo(), plainObjectList: [
        null,
        plainObjectFoo(),
        null,
        plainObjectFoo({ foo: "foo2" }),
        null,
    ], plainObjectUnion: plainObjectFoo(), plainObjectUnionList: [null, plainObjectFoo(), null, plainObjectBar(), null], plainObjectInterface: plainObjectBar(), 
    // TODO: iface lists
    entity: entityFoo(), entityList: [null, entityFoo(), null, entityFoo({ id: "2" }), null], entityUnion: entityBar(), entityInterface: entityFoo(), entityOrPlainObjectUnion: entityFoo(), entityOrPlainObjectInterface: plainObjectBar() }, overrides)); };
var kitchenSinkFragment = gql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n  fragment KitchenSinkFragment on EntityKitchenSink {\n    __typename\n    id\n    scalar\n    scalarList\n\n    plainObject {\n      __typename\n      foo\n    }\n    plainObjectList {\n      __typename\n      foo\n    }\n    entity {\n      __typename\n      id\n      foo\n    }\n    entityList {\n      __typename\n      id\n      foo\n    }\n  }\n"], ["\n  fragment KitchenSinkFragment on EntityKitchenSink {\n    __typename\n    id\n    scalar\n    scalarList\n\n    plainObject {\n      __typename\n      foo\n    }\n    plainObjectList {\n      __typename\n      foo\n    }\n    entity {\n      __typename\n      id\n      foo\n    }\n    entityList {\n      __typename\n      id\n      foo\n    }\n  }\n"])));
function diff(baseObj, modelObj, baseOperation, modelOperation) {
    if (baseOperation === void 0) { baseOperation = { document: kitchenSinkFragment, variables: {} }; }
    if (modelOperation === void 0) { modelOperation = { document: kitchenSinkFragment, variables: {} }; }
    var baseIndexedFields = IndexedFields.fromOperation(baseOperation);
    var modelIndexedFields = IndexedFields.fromOperation(modelOperation);
    var base = new EntityAggregate("KitchenSink:1", [new EntityChunk([], baseObj, baseIndexedFields)]);
    var model = new EntityAggregate("KitchenSink:1", [new EntityChunk([], modelObj, modelIndexedFields)]);
    return diffEntity({ base: base, model: model });
}
var templateObject_1;
//# sourceMappingURL=diff.test.js.map