// @ts-check

'use strict';

/** Builds a canonical RLE string from possibly redundant parts.
 *
 * Exemplars:
 * - "A A A" => "3A"
 * - "3A 2A" => "5A"
 *
 * Except that all tokenization concerns are up to the caller, so this builder
 * takes pre-parsed (count: number, sym: string) pairs, and returns a list
 * containing accumulated terms (not including the current one). The caller
 * shouldn't really care about the return value until after a terminal () call.
 *
 * Usage:
 *   const input = 'A B B 3C 3D D';
 *   const {consume, finish} = RLEBuilder();
 *   for (const token of input.split(/\s+/)) {
 *     consume(token);
 *     // NOTE: caller may parser their own count/sym apart if necessary and call consume(count, sym)
 *   }
 *   const output = finish().join(' ');
 *   // output = "A 2B 3C 4D"
 *
 * NOTE: any empty symbol strings and counts <= 0 are elided
 */
export function RLEBuilder() {
  /** @type {[count: number, sym: string][]} */
  let parts = [];
  let cur = '', curCount = 0;

  return {
    /**
     * NOTE: altho it's the sym agument that is formally optional, one should
     * think of this signature more like consume([count, ]sym):
     * - if a single string argument is given, any numeric prefix is parsed out
     *   and becomes count (default 1)
     * - if a single numeric argument is given, that's a noop (empty symbol)
     * - if two strings are given, any non-numeric suffix in the count string
     *   is ignored
     * - those last two cases are just unfortunate outcomes of javascript's
     *   semimplicit type system, and not really intended use cases
     *
     * @param {string|number} count
     * @param {string} [sym]
     */
    consume(count, sym) {
      if (sym === undefined) {
        if (typeof count != 'string') { return }
        const match = /(\d*)(\w+)/.exec(count);
        if (!match) { return }
        count = match[1], sym = match[2];
      }
      if (typeof count == 'string') {
        count = parseInt(count);
        if (isNaN(count)) {
          count = 1;
        }
      }

      if (cur !== sym) {
        if (cur && curCount) {
          parts.push([curCount, cur]);
        }
        cur = sym, curCount = 0;
      }
      curCount += count;
    },

    finish() {
      if (cur && curCount) {
        parts.push([curCount, cur]);
      }
      const res = parts;
      parts = [], cur = '', curCount = 0;
      return res;
    }
  };
}

/** @param {Iterable<[count: string|number, sym?: string]>} countsyms */
export function from(countsyms) {
  const { consume, finish } = RLEBuilder();
  for (const [count, sym] of countsyms) {
    consume(count, sym);
  }
  return finish();
}
