import { Patch } from "../diffing/diff";

export function compareByPath(a: Patch, b: Patch): number {
  for (let i = 0; i < a.path.length; i++) {
    // ... `parent.category.name` > `parent.category`
    if (b.path[i] === undefined) {
      return 1;
    }
    // ... `value` > `name`
    if (a.path[i] > b.path[i]) {
      return 1;
    } else
    // ... `name` < `value`
    if (a.path[i] < b.path[i]) {
      return -1;
    }
  }

  // ... `parent.category` < `parent.category.name`
  if (a.path.length < b.path.length) {
    return -1;
  }
 
  return 0;
}
