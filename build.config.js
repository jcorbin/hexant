// @ts-check

import { stat, mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ok, system } from './scripts/clikit.js';
import ed from './scripts/ed.js';

const srcDir = process.cwd();
const buildDir = join(srcDir, 'build');

/**
 * @param {string} uri
 * @param {(contents: string) => Promise<void>} fn
 */
async function withLocalAsset(uri, fn) {
  for (const dir of [srcDir, buildDir]) {
    const base = pathToFileURL(dir + '/');

    const u = new URL(uri, base);
    if (u.protocol !== 'file:') {
      continue;
    }

    const path = fileURLToPath(u);
    if (!path.startsWith(dir)) {
      continue;
    }

    let contents = '';
    try {
      contents = await readFile(path, { encoding: 'utf-8' });
    } catch (err) {
      continue;
    }

    return fn(contents);
  }
}

/** @type {import('./scripts/build.js').Manifest} */
const manifest = [

  // start out with an empty build directory; just nuke any prior
  {
    async do() {
      if (await ok(stat('build'))) {
        console.log('rm -rf build');
        await rm('build', { recursive: true, force: true })
      }
      console.log('mkdir build');
      await mkdir('build');
    },
  },

  // TODO run rollup via api instead

  {
    cmd: ['rollup',
      '--plugin', '@rollup/plugin-node-resolve',
      '--plugin', '@rollup/plugin-commonjs',
      '--format', 'esm',
      '--sourcemap',
      '-i', 'index.js',
      '-o', 'build/index.bundle.js',
    ],
  },

  {
    cmd: ['rollup',
      '--plugin', './scripts/rollup-alt.js',
      '--plugin', '@rollup/plugin-node-resolve',
      '--plugin', '@rollup/plugin-commonjs',
      '--plugin', 'rollup-plugin-terser',
      '--format', 'esm',
      '--sourcemap',
      '-i', 'index.js',
      '-o', 'build/index.bundle.min.js',
    ],
  },

  'CHANGELOG.md',
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

      return await ed(content, async ({ y, g, s, x, lines }) => {
        // delete importmap
        await y(/<script.*type="importmap"/i, /<\/script>/i, async (i, j) => {
          while (j < lines.length && !lines[j + 1].trim()) j++;
          lines.splice(i, 1 + j - i);
        });

        // change main script source
        await g(/<script.*\ssrc=".\/index.js"/i,
          s(/\ssrc="[^"]+"/i, ` src="./index.bundle.js"`)); // TODO .min wen

        // NOTE: this won't properly match a multi-line <link ...> tag
        await g(/<link.*? rel="stylesheet".*?>/i, x(/ href=("[^"]+")/i,
          ([_, hrefAttr], i) => withLocalAsset(unquote(hrefAttr), async contents => {
            lines.splice(i, 1,
              '<style>',
              ...contents.split(/\n/), // TODO wen min(contents)
              '</style>',
            );
            console.log('inlined', unquote(hrefAttr));
          })));

        // NOTE: this won't properly match a multi-line <script ...> tag
        await y(/<script/i, /<\/script>/i,
          x(/<script([^<>]*?( src=("[^"]+"))[^<>]*?)\s*>/i,
            ([_, attrs, srcMatch, srcAttr], _i, start, end) => withLocalAsset(unquote(srcAttr), async contents => {
              lines.splice(start, 1 + end - start,
                `<script ${attrs.replace(srcMatch, '').trim()}>`,
                ...contents.split(/\n/),
                '</script>',
              );
              console.log('inlined', unquote(srcAttr));
            })));

      });
    },
  },
];

export default manifest;

/** @param {string} s */
function unquote(s) {
  // TODO simpler
  return JSON.parse(s)
}
