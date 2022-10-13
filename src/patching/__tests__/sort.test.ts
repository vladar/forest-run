import { Patch } from "../../diffing/diff";
import { compareByPath } from "../sort";
import { splitPath } from "./utils";

describe("compareByPath", () => {
  it.each([
    [-1, "name", "parent.name"],
    [1, "parent.name", "name"],
    [-1, "parent.name", "value"],
    [0, "name", "name"],
    [1, "parent.name", "parent.id"],
    [-1, "parent.id", "parent.name"]
  ])("should return %s for a=%s and b=%s", (expectedResult: number, aPath: string, bPath: string) => {
    const a = createPatch(aPath);
    const b = createPatch(bPath);
    const result = compareByPath(a, b);

    expect(result).toEqual(expectedResult);
  });
});

describe("sort", () => {
  it("should be done correctly using the patch-by-path comparer", () => {
    const unsortedPaths = [
      "value",
      "parent.categories.0.parent.tag",
      "parent.categories.1.name",
      "name",
      "parent.categories.0.name",
      "id",
      "parent.name",
      "items.3.tag",
      "items.3.name",
      "parent.categories.1",
    ];
    const sortedPaths = [
      "id",
      "items.3.name",
      "items.3.tag",
      "name",
      "parent.categories.0.name",
      "parent.categories.0.parent.tag",
      "parent.categories.1",
      "parent.categories.1.name",
      "parent.name",
      "value",
    ];
    const patches = unsortedPaths.map(path => createPatch(path));

    patches.sort(compareByPath);

    expect(patches.map(p => p.path.join("."))).toEqual(sortedPaths);
  });
});

function createPatch(path: string): Patch {
  return {
    path: splitPath(path),
    op: "replace",
    value: "some value",
  };
}
