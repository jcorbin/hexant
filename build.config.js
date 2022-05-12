// @ts-check

import { stat, mkdir, rm } from 'node:fs/promises';
import { ok, system } from './scripts/clikit.js';

/** @type {import('./scripts/build.js').Manifest} */
const manifest = [

  {
    async do() {
      if (await ok(stat('build'))) {
        console.log('rm -rf build');
        await rm('build', { recursive: true, force: true })
      }
      console.log('mkdir build');
      await mkdir('build');
    }
  },

  // TODO run rollup via api instead
  { cmd: ['rollup', '-c'], },

  'CHANGELOG.md',
  'style.css',
  {
    path: 'index.html',
    async transform(content) {
      const version = (await system('git', 'describe', '--always')).trimEnd();

      // interpolate
      content = content
        .replace(/\{DEV\}/g, version);

      content = editLines(({ y, g, s, lines }) => {
        // delete importmap
        y(/<script.*type="importmap"/i, /<\/script>/i, (i, j) => {
          while (j < lines.length && !lines[j + 1].trim()) j++;
          lines.splice(i, 1 + j - i);
        });

        // change main script source
        g(/<script.*\ssrc=".\/index.js"/i,
          s(/\ssrc="[^"]+"/i, `src="./index.bundle.min.js"`));
      });

      // TODO inline stylesheet
      // TODO inline main script

      return content;

      /** @callback LineCommand
       * @param {number} i
       * @returns void
       */

      /** @typedef {object} LineEditor
       * @prop {string[]} lines
       * @prop {(search: RegExp, replace: string) => LineCommand} s -- substitute command
       * @prop {(re: RegExp, then: (i: number) => void) => void} g -- matching operator ala ex/vi
       * @prop {(re1: RegExp, re2: RegExp, then: (i: number, j: number) => void) => void} y -- between match operator ala acme/perl
       */

      /** @param {(ed: LineEditor) => void} fn */
      function editLines(fn) {
        const lines = content.split(/\n/);
        fn({
          lines,
          s(search, replace) {
            return i => lines[i] = lines[i].replace(search, replace);
          },
          g(re, then) {
            let i = 0;
            while (i >= 0) {
              i = lines.findIndex(line => re.test(line), i);
              if (i >= 0) then(i);
            }
          },
          y(re1, re2, then) {
            let i = 0;
            while (i >= 0) {
              i = lines.findIndex(line => re1.test(line));
              if (i >= 0) {
                const j = lines.findIndex(line => re2.test(line), i);
                if (j >= 0) {
                  then(i, j);
                }
              }
            }
          },
        });
        return lines.join('\n');
      }

    },
  },
];

export default manifest;
