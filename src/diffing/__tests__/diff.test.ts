import { diffEntity } from "../diff";
import { parse } from "graphql";
import { EntityAggregate } from "../ObjectAggregate";
import { EntityChunk } from "../../indexing/EntityChunk";
import { IndexedFields } from "../../indexing/IndexedFields";

const gql = (x: TemplateStringsArray) => parse(x[0] ?? "");

describe("Single entity chunk", () => {
  it("produces empty diff when there are no changes", () => {
    const base = entityKitchenSink();
    const model = entityKitchenSink();
    const result = diff(base, model);

    expect(result).toEqual({ patches: [], stale: [] });
  });

  describe("diff doesn't mutate objects", () => {
    // TODO (or maybe add an expect to each test case)
  });

  describe("diff scalars", () => {
    it("replaces null with scalar", () => {
      const base = entityKitchenSink({ scalar: null });
      const model = entityKitchenSink({ scalar: "updated" });
      const result = diff(base, model);

      expect(result).toEqual({
        patches: [{ op: "replace", path: ["scalar"], value: "updated" }],
        stale: [],
      });
      expect(result.stale).toEqual([]);
    });

    it("replaces scalars on change", () => {
      const base = entityKitchenSink({ scalar: "value" });
      const model = entityKitchenSink({ scalar: "updated" });
      const result = diff(base, model);

      expect(result).toEqual({
        patches: [{ op: "replace", path: ["scalar"], value: "updated" }],
        stale: [],
      });
      expect(result.stale).toEqual([]);
    });

    it("replaces scalars with null", () => {
      const base = entityKitchenSink({ scalar: "base" });
      const model = entityKitchenSink({ scalar: null });
      const result = diff(base, model);

      expect(result).toEqual({
        patches: [{ op: "replace", path: ["scalar"], value: null }],
        stale: [],
      });
    });
  });

  describe("diff list of scalars", () => {
    it("replaces null with a list", () => {
      const modelList = [null, "foo", null, "bar", null];
      const base = entityKitchenSink({ scalarList: null });
      const model = entityKitchenSink({ scalarList: modelList });

      const result = diff(base, model);

      expect(result).toEqual({
        patches: [{ op: "replace", path: ["scalarList"], value: modelList }],
        stale: [],
      });
    });

    it("replaces a list with different length", () => {
      const modelList = [null, "bar", null, "baz", null];
      const base = entityKitchenSink({ scalarList: [null, "foo"] });
      const model = entityKitchenSink({ scalarList: modelList });

      const result = diff(base, model);

      expect(result).toEqual({
        patches: [{ op: "replace", path: ["scalarList"], value: modelList }],
        stale: [],
      });
    });

    it("replaces a list with a different list of the same length", () => {
      const baseList = [null, "foo", null, "bar", null];
      const modelList = [null, "bar", null, "baz", null];
      const base = entityKitchenSink({ scalarList: baseList });
      const model = entityKitchenSink({ scalarList: modelList });

      const result = diff(base, model);

      expect(result).toEqual({
        patches: [{ op: "replace", path: ["scalarList"], value: modelList }],
        stale: [],
      });
    });

    it("preserves the same list when there are no changes", () => {
      const baseList = [null, "foo", null, "bar", null];
      const modelList = [null, "foo", null, "bar", null];

      const base = entityKitchenSink({ scalarList: baseList });
      const model = entityKitchenSink({ scalarList: modelList });
      const result = diff(base, model);

      expect(result).toEqual({ patches: [], stale: [] });
    });
  });

  describe("diff entities", () => {
    describe("model selectionSet includes base selectionSet", () => {
      it("replaces null with entity", () => {
        const base = entityKitchenSink({ entity: null });
        const model = entityKitchenSink({ entity: entityFoo() });
        const result = diff(base, model);

        expect(result).toEqual({
          patches: [{ op: "replace", path: ["entity"], value: entityFoo() }],
          stale: [],
        });
      });

      it("replaces entity with another entity", () => {
        const baseEntity = entityFoo({ id: "1", foo: "foo" });
        const modelEntity = entityFoo({ id: "2", foo: "foo2" });

        const base = entityKitchenSink({ entity: baseEntity });
        const model = entityKitchenSink({ entity: modelEntity });

        const result = diff(base, model);

        expect(result).toEqual({
          patches: [{ op: "replace", path: ["entity"], value: modelEntity }],
          stale: [],
        });
      });

      it("does not update nested entities", () => {
        // `diffEntity` is scoped to a single entity.
        // It is expected that nested entities are updated via separate diffEntity calls
        // (unless it is a complete entity replacement)
        const baseEntity = entityFoo({ foo: "foo" });
        const modelEntity = entityFoo({ foo: "foo2" });

        const base = entityKitchenSink({ entity: baseEntity });
        const model = entityKitchenSink({ entity: modelEntity });

        const result = diff(base, model);

        expect(result).toEqual({
          patches: [],
          stale: [],
        });
      });
    });
  });

  describe("diff list of entities", () => {
    describe("model selectionSet includes base selectionSet", () => {
      it("replaces null with entity list", () => {
        const modelList = [entityFoo(), null, entityFoo({ id: "2" })];

        const base = entityKitchenSink({ entityList: null });
        const model = entityKitchenSink({ entityList: modelList });
        const result = diff(base, model);

        expect(result).toEqual({
          patches: [{ op: "replace", path: ["entity"], value: modelList }],
          stale: [],
        });
      });
    });
  });

  describe("diff plain objects", () => {
    describe("model selectionSet includes base selectionSet", () => {
      it("replaces null with object", () => {
        const base = entityKitchenSink({ plainObject: null });
        const model = entityKitchenSink({ plainObject: plainObjectFoo() });
        const result = diff(base, model);

        expect(result).toEqual({
          patches: [
            { op: "replace", path: ["plainObject"], value: plainObjectFoo() },
          ],
          stale: [],
        });
      });

      it("updates nested scalar field", () => {
        const baseFoo = plainObjectFoo({ foo: "foo" });
        const modelFoo = plainObjectFoo({ foo: "bar" });

        const base = entityKitchenSink({ plainObject: baseFoo });
        const model = entityKitchenSink({ plainObject: modelFoo });

        const result = diff(base, model);

        expect(result).toEqual({
          patches: [
            { op: "replace", path: ["plainObject", "foo"], value: "bar" },
          ],
          stale: [],
        });
      });
    });
  });

  it.todo(
    "replaces null with an object when model selectionSet fully includes base selectionSet"
  );

  it.todo("does not replace null with an object when query sub-selections");
});

const entityFoo = (overrides?) => ({
  __typename: "EntityFoo",
  id: "1",
  foo: "foo",
  ...overrides,
});

const entityBar = (overrides?) => ({
  __typename: "EntityBar",
  id: "1",
  string: "string",
  ...overrides,
});

const plainObjectFoo = (overrides?) => ({
  __typename: "PlainObjectFoo",
  foo: "foo",
  ...overrides,
});

const plainObjectBar = (overrides?) => ({
  __typename: "PlainObjectBar",
  bar: "bar",
  ...overrides,
});

const entityKitchenSink = (overrides?) => ({
  __typename: "EntityKitchenSink",
  id: "1",
  scalar: "value",
  scalarList: [null, "foo", null, "bar", null],

  plainObject: plainObjectFoo(),
  plainObjectList: [
    null,
    plainObjectFoo(),
    null,
    plainObjectFoo({ foo: "foo2" }),
    null,
  ],

  plainObjectUnion: plainObjectFoo(), // alternatively can be plainObjectBar
  plainObjectUnionList: [null, plainObjectFoo(), null, plainObjectBar(), null],

  plainObjectInterface: plainObjectBar(), // alternatively can be plainObjectFoo
  // TODO: iface lists

  entity: entityFoo(),
  entityList: [null, entityFoo(), null, entityFoo({ id: "2" }), null],

  entityUnion: entityBar(), // alternatively can be entityFoo
  entityInterface: entityFoo(), // alternatively can be entityBar
  entityOrPlainObjectUnion: entityFoo(), // alternatively can be plainObjectFoo

  entityOrPlainObjectInterface: plainObjectBar(), // alternatively can be entityBar

  ...overrides,
});

const kitchenSinkFragment = gql`
  fragment KitchenSinkFragment on EntityKitchenSink {
    __typename
    id
    scalar
    scalarList

    plainObject {
      __typename
      foo
    }
    plainObjectList {
      __typename
      foo
    }
    entity {
      __typename
      id
      foo
    }
    entityList {
      __typename
      id
      foo
    }
  }
`;

function diff(
  baseObj: any,
  modelObj: any,
  baseOperation = { document: kitchenSinkFragment, variables: {} },
  modelOperation = { document: kitchenSinkFragment, variables: {} }
) {
  const baseIndexedFields = IndexedFields.fromOperation(baseOperation);
  const modelIndexedFields = IndexedFields.fromOperation(modelOperation);

  const base = new EntityAggregate(
    "KitchenSink:1",
    [new EntityChunk([], baseObj, baseIndexedFields)]
  );
  const model = new EntityAggregate(
    "KitchenSink:1",
    [new EntityChunk([], modelObj, modelIndexedFields)]
  );

  return diffEntity({ base, model });
}
