// @ts-check

'use strict';

/**
 * @template T
 * @param {() => T} cons
 * @param {(t: T) => void} [reset]
 * @returns {{alloc: () => T, free: (t: T) => void}}
 */
export function makePool(cons, reset) {
  /** @type {T[]} */
  const pool = [];
  return {
    alloc() {
      if (pool.length > 0) {
        const inst = pool.shift()
        if (inst !== undefined) {
          return inst;
        }
      }
      return cons();
    },
    free: reset
      ? inst => {
        reset(inst);
        pool.push(inst);
      }
      : inst => {
        pool.push(inst);
      },
  };
}
