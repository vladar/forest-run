import { Patch } from "../diffing/diff";
import { compareByPath } from "./sort";

export function applyPatches(obj: object, patches: Patch[]) {
  // Brute-force O(N*M) (where N is the number of patches and M is an average path length)
  if (!patches?.length) {
    return obj;
  }
  const copy = { ...obj };

  for (const patch of patches) {
    if (!patch) {
      throw new Error("Patch cannot be null or undefined");
    }
    const path = patch.path;
    if (!path?.length) {
      throw new Error(`Patch path cannot be empty`);
    }
    if (patch.op !== "replace") {
      throw new Error(`Unsupported patch operation: ${patch.op}`);
    }
    let source = obj;
    let draft = copy;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      assertObjectHasKey(source, key);
      if (source[key] === draft[key]) {
        draft[key] = Array.isArray(source[key])
          ? [...source[key]]
          : { ...source[key] };
      }
      source = source[key];
      draft = draft[key];
    }
    const lastKey = path[path.length - 1];
    assertObjectHasKey(draft, lastKey);
    draft[lastKey] = patch.value;
  }
  return copy;
}

export function applyPatchesSorted(obj: object, patches: Patch[]) {
  // sort patches by path and use pointer to keep current path position
  // in order to not traverse object from the root for each patch
  if (!patches?.length) {
    return obj;
  }
  patches.sort(compareByPath);
  const copy = { ...obj };
  let stack = [];
  let current = {
    path: [],
    draft: copy,
    source: obj,
  };

  for (const patch of patches) {
    if (!patch) {
      throw new Error("Patch cannot be null or undefined");
    }
    const path = patch.path;
    if (!path?.length) {
      throw new Error(`Patch path cannot be empty`);
    }
    if (patch.op !== "replace") {
      throw new Error(`Unsupported patch operation: ${patch.op}`);
    }
    const lastKey = patch.path[patch.path.length - 1];
    const objPath = patch.path.slice(0, patch.path.length - 1);
    if (!arraysAreEqual(objPath, current.path)) {
      while (stack.length > 0 && !arrayStartsWith(objPath, current.path)) {
        current = stack.pop();
      }
      for (let i = 0; i < objPath.length; i++) {
        const key = objPath[i];
        if (key === current.path[i]) {
          continue;
        }
        assertObjectHasKey(current.source, key);
        stack.push(current);
        if (current.draft[key] === current.source[key]) {
          current.draft[key] = Array.isArray(current.source[key])
            ? [...current.source[key]]
            : { ...current.source[key] };
        }
        current = {
          path: [...current.path, key],
          draft: current.draft[key],
          source: current.source[key],
        };
      }
    }

    assertObjectHasKey(current.draft, lastKey);
    current.draft[lastKey] = patch.value;
  }

  return copy;
}

function assertObjectHasKey(obj: object, key: string | number) {
  if ((Array.isArray(obj) && (typeof key !== "number" || key < 0 || key > obj.length - 1))
    || !(key in obj)) {
    throw new Error(`Object does not have key: ${key}`);
  }
}

function arrayStartsWith(array1: any[], array2: any[]): boolean {
  for (let i = 0; i < array2.length; i++) {
    if (array2[i] !== array1[i]) {
      return false;
    }
  }
  return true;
}

function arraysAreEqual(array1: any[], array2: any[]): boolean {
  if (array1.length !== array2.length) {
    return false;
  }
  for (let i = 0; i < array1.length - 1; i++) {
    if (array1[i] !== array2[i]) {
      return false;
    }
  }
  return true;
}
