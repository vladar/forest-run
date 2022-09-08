export function* mergeSorted<T, U = T>(
  iteratorA: Iterator<T>,
  iteratorB: Iterator<U>,
  comparator: (a: T | U, b: T | U) => number = defaultComparator
): Generator<T | U> {
  try {
    let a = iteratorA.next();
    let b = iteratorB.next();
    while (!a.done && !b.done) {
      if (comparator(a.value, b.value) <= 0) {
        yield a.value;
        a = iteratorA.next();
      } else {
        yield b.value;
        b = iteratorB.next();
      }
    }
    while (!a.done) {
      yield a.value;
      a = iteratorA.next();
    }
    while (!b.done) {
      yield b.value;
      b = iteratorB.next();
    }
  } finally {
    // If generator is exited early, make sure to close iterators too
    // See https://raganwald.com/2017/07/22/closing-iterables-is-a-leaky-abstraction.html#more-about-closing-iterators-explicitly
    if (typeof iteratorA.return === `function`) iteratorA.return();
    if (typeof iteratorB.return === `function`) iteratorB.return();
  }
}

export function* intersectSorted<T, U = T>(
  iteratorA: Iterator<T>,
  iteratorB: Iterator<U>,
  comparator: (a: T | U, b: T | U) => number = defaultComparator
): Generator<T> {
  try {
    let a = iteratorA.next();
    let b = iteratorB.next();

    while (!a.done && !b.done) {
      const eq = comparator(a.value, b.value);

      if (eq < 0) {
        // a < b
        a = iteratorA.next();
      } else if (eq > 0) {
        // a > b
        b = iteratorB.next();
      } else {
        yield a.value;
        a = iteratorA.next();
      }
    }
  } finally {
    if (typeof iteratorA.return === `function`) iteratorA.return();
    if (typeof iteratorB.return === `function`) iteratorB.return();
  }
}

function defaultComparator<T, U = T>(a: T | U, b: T | U): number {
  if (a === b) {
    return 0;
  }
  return a > b ? 1 : -1;
}
