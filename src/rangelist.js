// @ts-check

/** RangeList is a stride-2 array of numbers.
 * Each pair of numbers is a [begin, end] inclusive range interval.
 * The ranges are mutually disjoint and kept in ascending order.
 *
 * @typedef {number[]} RangeList
 */

/**
 * @param {RangeList} rl
 * @param {number} begin
 * @param {number} end
 */
export function add(rl, begin, end) {
  if (end < begin) {
    throw new Error("invalid range");
  }

  // won't add degenerate ranges
  if (end === begin) {
    return;
  }

  // find begin
  // TODO: use binary search
  let found = false;
  let i = 0;
  for (; i < rl.length; i += 2) {
    if (begin <= rl[i] - 1) {
      // ... @i:[begin <= a-1 < b] ...
      rl[i] = begin;
      found = true;
      break;
    }
    if (begin <= rl[i + 1] + 1) {
      // ... @i:[a < begin <= b+1] ...
      found = true;
      break;
    }
  }
  // ... < [end < begin]
  if (!found) {
    rl.push(begin, end);
    return;
  }

  // seek end
  let j = i;
  found = false;
  for (; j < rl.length; j += 2) {
    if (end < rl[j] - 1) {
      // ... @i:[a <= begin <= b] ... @j:[end < c-1 < d] ...
      if (j === i) {
        throw new Error("degenerate range detected"); // should not be possible
      }
      found = true;
      break;
    }
    if (end <= rl[j + 1] + 1) {
      // ... @i:[a <= begin <= b] ... @j:[c < end <= d+1] ...
      if (j === i) {
        // ... @i:[a <= begin < end <= b] ...
        return;
      }
      end = rl[j + 1] + (end === rl[j + 1] + 1 ? 1 : 0);
      j += 2;
      found = true;
      break;
    }
  }
  // ... @i:[a-1 <= begin < b] ...coalesced... < end
  if (!found) {
    rl[i + 1] = end;
    rl.length = i + 2;
    return;
  }

  // coalesce
  // ... @i:[a-1 <= begin < end] ...coalesced... @j ...tail...
  rl[i + 1] = end;
  i += 2;
  if (i == j) {
    return;
  }
  // TODO: rl.copyWithin
  while (j < rl.length) {
    rl[i++] = rl[j++];
    rl[i++] = rl[j++];
  }
  rl.length = i;
  return;
}

/** @param {RangeList} rl */
export function* each(rl) {
  for (let i = 0; i < rl.length;) {
    const begin = /** @type {number} */ (rl[i++]);
    const end = /** @type {number} */ (rl[i++]);
    yield { begin, end };
  }
}
