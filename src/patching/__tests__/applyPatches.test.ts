import { Patch } from "../../diffing/diff";
import { applyPatches, applyPatchesSorted } from "../applyPatches";
import { splitPath } from "./utils";
import * as _ from "lodash";

describe.each([
  ["applyPatches", applyPatches],
  ["applyPatchesSorted", applyPatchesSorted],
])("%s", (_name, applyPatchesFn) => {
  let objectToPatch: object;
  beforeEach(() => {
    objectToPatch = {
      id: 1,
      name: "some name",
      tags: ["a", "b", "c"],
      parent: {
        name: "parent name",
        tags: ["d", "e"],
      },
      items: [
        {
          id: 2,
          name: "child2",
        },
        {
          id: 3,
          name: "child3",
        }
      ],
    };
  });

  it.each([
    [null],
    [undefined],
    [[]],
  ])("should return original object if patches is %s", (patches: Patch[]) => {
    const patchedObject = applyPatchesFn(objectToPatch, patches);

    expect(patchedObject).toBe(objectToPatch);
  });

  it.each([
    [null],
    [undefined],
  ])("should throw if patch is %s", patch => {
    expect(() => applyPatchesFn(objectToPatch, [patch])).toThrow();
  });

  it.each([
    [null],
    [undefined],
    [[]],
  ])("should throw if patch path is %s", path => {
    const patches: Patch[] = [
      createPatch(path, "some value")
    ];

    expect(() => applyPatchesFn(objectToPatch, patches)).toThrow();
  });

  it.each([
    ["invalidField"],
    ["invalidSubobject.invalidField"],
    ["items[10].name"],
    ["items[0].invalidField"],
    ["items[0][1]"],
    ["items.invalidField"],
  ])("should throw if patch path does not exist: %s", path => {
    const patches: Patch[] = [
      createPatch(path, "some value")
    ];

    expect(() => applyPatchesFn(objectToPatch, patches)).toThrow();
  });

  it.each([
    ["name", "new value"],
    ["tags[2]", "d"],
    ["parent.name", "new parent name"],
    ["parent.tags[0]", "f"],
    ["items[1].name", "new child name"],
  ])("should replace value for path: %s", (path, newValue) => {
    const patches: Patch[] = [
      createPatch(path, newValue)
    ];
    const reference = _.cloneDeep(objectToPatch);
    _.set(reference, path, newValue);

    const patchedObject = applyPatchesFn(objectToPatch, patches);

    expect(patchedObject).toStrictEqual(reference);
  });

  it("should clone objects for modified path only", () => {
    const patches: Patch[] = [
      createPatch("items[0].name", "some new value")
    ];

    const patchedObject = applyPatchesFn(objectToPatch, patches);

    // all objects from modified path should be different from original ones (along with root)
    expect(patchedObject).not.toBe(objectToPatch);
    expect(patchedObject["items"]).not.toBe(objectToPatch["items"]);
    expect(patchedObject["items"][0]).not.toBe(objectToPatch["items"][0]);
    // objects from unmodified path should be the same
    expect(patchedObject["items"][1]).toBe(objectToPatch["items"][1]);
    expect(patchedObject["parent"]).toBe(objectToPatch["parent"]);
  });

  it("should apply multiple patches", () => {
    const patches = [
      createPatch("items[1].name", "new child 1 name"),
      createPatch("parent.tags[0]", "tag0"),
    ];

    const reference = _.cloneDeep(objectToPatch);
    _.set(reference, "items[1].name", "new child 1 name");
    _.set(reference, "parent.tags[0]", "tag0");

    const patchedObject = applyPatchesFn(objectToPatch, patches);

    expect(patchedObject).toStrictEqual(reference);    
  });
});

function createPatch(path: string | any[], value: string): Patch {
  return {
    path: typeof path === "string" ? splitPath(path) : path,
    op: "replace",
    value: value,
  };
}
