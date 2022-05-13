// @ts-check

import { stat, mkdir, rm } from 'node:fs/promises';
import { ok, system } from './scripts/clikit.js';
import ed from './scripts/ed.js';

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

      // TODO would be nice to use a proper parser for html manipulation some
      // day, but I'm having too much fun with ed() to take on a
      // dependency just yet...

      return await ed(content, async ({ y, g, s, lines }) => {
        // delete importmap
        await y(/<script.*type="importmap"/i, /<\/script>/i, async (i, j) => {
          while (j < lines.length && !lines[j + 1].trim()) j++;
          lines.splice(i, 1 + j - i);
        });

        // change main script source
        await g(/<script.*\ssrc=".\/index.js"/i,
          s(/\ssrc="[^"]+"/i, ` src="./index.bundle.js"`)); // TODO .min wen

        // TODO inline stylesheet
        // TODO inline main script

      });
    },
  },
];

export default manifest;
