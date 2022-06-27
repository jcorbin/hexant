// @ts-check

import { minify } from 'html-minifier-terser';

import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
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
        for (const ent of await readdir('build')) {
          if (!ent.startsWith('.')) {
            const file = join('build', ent);
            console.log(`rm -rf ${file}`);
            await rm(file, { recursive: true, force: true })
          }
        }
      } else {
        console.log('mkdir build');
        await mkdir('build');
      }
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
    async do() {
      // TODO would be nice to use a proper parser for html manipulation some
      // day, but I'm having too much fun with ed() to take on a
      // dependency just yet...

      const [
        template,
        version,
      ] = await Promise.all([
        readFile('index.html', { encoding: 'utf-8' }),
        system('git', 'describe', '--always').then(s => s.trimEnd())
      ])


      // interpolate
      let content = template
        .replace(/\{DEV\}/g, version);

      content = await ed(content, async ({ y, g, x, lines }) => {
        // delete importmap
        await y(/<script.*type="importmap"/i, /<\/script>/i, async (i, j) => {
          while (j < lines.length && !lines[j + 1].trim()) j++;
          lines.splice(i, 1 + j - i);
        });

        // NOTE: this won't properly match a multi-line <link ...> tag
        await g(/<link.*? rel="stylesheet".*?>/i, x(/ href=("[^"]+")/i,
          ([_, hrefAttr], i) => withLocalAsset(unquote(hrefAttr), async contents => {
            lines.splice(i, 1,
              '<style>',
              ...contents.split(/\n/),
              '</style>',
            );
            console.log('inlined', unquote(hrefAttr));
          })));
      });

      // NOTE: this won't properly match a multi-line <script ...> tag
      /** @param {string} html */
      const inlineScripts = html => ed(html, ({ y, x, lines }) =>
        y(/<script/i, /<\/script>/i,
          x(/<script([^<>]*?( src=("[^"]+"))[^<>]*?)\s*>/i,
            ([_, attrs, srcMatch, srcAttr], _i, start, end) => withLocalAsset(unquote(srcAttr), async contents => {
              lines.splice(start, 1 + end - start,
                `<script ${attrs.replace(srcMatch, '').trim()}>`,
                ...contents.split(/\n/),
                '</script>',
              );
              console.log('inlined', unquote(srcAttr));
            }))));

      /** @param {string} script */
      const withEntry = script => content.replace('./index.js', script);

      await Promise.all([
        async () => {
          const content = await inlineScripts(withEntry('index.bundle.js'));
          await writeFile('build/index.dev.html', content, { encoding: 'utf-8' });
          console.log('built index.dev.html from index.html + index.bundle.js ');
        },

        async () => {
          const content = await minify(
            await inlineScripts(withEntry('index.bundle.min.js')), {
            collapseWhitespace: true,
            collapseInlineTagWhitespace: true,
            collapseBooleanAttributes: true,

            minifyCSS: true,

            removeComments: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,

            sortAttributes: true,
            sortClassName: true,

          });
          await writeFile('build/index.min.html', content, { encoding: 'utf-8' });
          console.log('built index.min.html from html-minifier-terser( index.html + index.bundle.min.js )');
        },

        async () => {
          await symlink('index.min.html', 'build/index.html');
          console.log('symlinked index.html => index.min.html');
        },
      ].map(fn => fn()));

    },
  },

];

export default manifest;

/** @param {string} s */
function unquote(s) {
  // TODO simpler
  return JSON.parse(s)
}
