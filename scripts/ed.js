// @ts-check


/** @callback LineCommand
 * @param {number} index
 * @returns {Promise<void>}
 */

/** @callback RangeCommand
 * @param {number} start
 * @param {number} end -- inclusive!
 * @returns {Promise<void>}
 */

/** @typedef {RegExp|((line: string) => boolean)} LineMatcher */

/** @typedef {object} LineEditor
 * @prop {string[]} lines
 *
 * @prop {(cmd: LineCommand) => RangeCommand} eachLine - command wrapper
 * @prop {(where: LineMatcher, i?: number) => number} findLine
 *
 * @prop {(search: RegExp, replace: string) => RangeCommand} s -- substitute command
 * @prop {(pat: RegExp, then: (args: string[], i: number, start: number, end: number) => Promise<void>) => RangeCommand} x -- extraction command
 *
 * @prop {(where: LineMatcher, then: RangeCommand) => Promise<void>} g -- matching operator ala ex/vi
 * @prop {(start: LineMatcher, end: LineMatcher, then: RangeCommand) => Promise<void>} y -- between match operator ala acme/perl
 */


/**
 * @param {string} content
 * @param {(ed: LineEditor) => Promise<void>} fn
 * @returns {Promise<string>}
 */
export default async function ed(content, fn) {
  const lines = content.split(/\n/);

  /** @type {LineEditor} */
  const ed = {
    lines,

    eachLine(cmd) {
      return async (start, end) => {
        for (let i = start; i <= end; i++) {
          await cmd(i);
        }
      };
    },

    findLine(where, i = 0) {
      if (where instanceof RegExp) {
        const pat = where;
        where = line => pat.test(line);
      }
      for (; i < lines.length; i++) {
        if (where(lines[i])) {
          return i;
        }
      }
      return -1;
    },

    s(search, replace) {
      return ed.eachLine(async i => {
        lines[i] = lines[i].replace(search, replace);
      });
    },

    async g(where, then) {
      for (let i = 0; ; i++) {
        i = ed.findLine(where, i);
        if (i < 0) {
          break;
        }
        await then(i, i);
      }
    },

    async y(start, end, then) {
      for (let i = 0; ; i++) {
        i = ed.findLine(start, i);
        if (i < 0) {
          break;
        }
        const j = ed.findLine(end, i);
        if (j < 0) {
          break;
        }
        await then(i, j);
        i = j;
      }
    },

    x(pat, then) {
      return async (start, end) => {
        for (let i = start; i <= end; i++) {
          const match = pat.exec(lines[i]);
          if (match) {
            await then(match, i, start, end);
            break;
          }
        }
      };
    },
  };

  await fn(ed);

  return lines.join('\n');
}
