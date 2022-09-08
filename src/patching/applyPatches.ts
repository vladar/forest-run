import { Patch } from "../diffing/diff";

export function applyPatches(obj: object, patches: Patch[]) {
  // Brute-force O(N*M) (where N is the number of patches and M is an average path length)
  // TODO: N*log(N*M) - sort patches and traverse more efficiently
  if (!patches.length) {
    return obj;
  }
  const copy = { ...obj };

  for (const patch of patches) {
    const path = patch.path;
    if (!path.length) {
      throw new Error(`Patch patch cannot be empty`);
    }
    if (patch.op !== "replace") {
      throw new Error(`Unsupported patch op: ${patch.op}`);
    }
    let source = obj;
    let draft = copy;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      const nextKey = path[i + 1];
      if (i !== path.length && source[key] === draft[key]) {
        draft[key] =
          typeof nextKey === "number" ? [...source[key]] : { ...source[key] };
      }
      source = source[key];
      draft = draft[key];
    }
    const lastKey = path[path.length - 1];
    draft[lastKey] = patch.value;
  }
  return copy;
}
