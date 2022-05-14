// @ts-check

import { spawn } from 'node:child_process';

import {
  open,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';

import {
  basename,
  dirname,
  extname,
  join,
} from 'node:path';

import { ok } from './scripts/clikit.js';
import ed from './scripts/ed.js';

/** @param {any} pkg */
function* resolveDeps(pkg) {
  if (typeof pkg !== 'object') { return }
  const deps = pkg['dependencies'];
  if (typeof deps !== 'object') { return }
  for (const [name, version] of Object.entries(deps)) {
    if (typeof version !== 'string') { continue }
    yield resolveDep(name);
  }
}

/** @param {string} name */
async function resolveDep(name) {
  const pkgDir = join('node_modules/', name);
  const pkgRaw = await readFile(join(pkgDir, 'package.json'), { encoding: 'utf-8' });
  const pkg = JSON.parse(pkgRaw);

  if (pkg.type === 'module') {
    const main = typeof pkg.main === 'string' ? pkg.main : 'index.js';
    const target = join(pkgDir, main);
    return { name, target };
  }

  if (typeof pkg.module === 'string') {
    const target = join(pkgDir, pkg.module);
    return { name, target };
  }

  const target = join('vendor', `${name}.js`);
  if (
    await ok(stat(target)) ||
    await ok(stat(join('vendor', `${name}.cjs`)))
  ) { return { name, target } }

  return { name, target: '' };
}

/** @typedef {import('./scripts/generate.js').Builder} Builder */

import compileGLSL from './src/glsl-compiler.js';

/**
 * @param {import( './src/glsl-compiler.js').Options} opts
 * @returns {Builder}
 */
function glslBuilder(opts) {
  return (id, input, output) =>
    buildAtomicFile(input, output, async (inFile, outFile) => {
      await outFile.write(`// @generated from id:${id}\n\n`);
      await compileGLSL(inFile, outFile, opts);
    });
}

/** @type {import('./scripts/generate.js').Config} */
const config = {
  root: ['vendor', 'src'],
  build: [

    {
      input: 'package.json',
      output: 'importmap.json',

      async build(id, { path: inFilePath }, { path: outFilePath }) {
        const inRaw = await readFile(inFilePath, { encoding: 'utf-8' });
        const pkg = JSON.parse(inRaw);
        const importmap = {
          id,
          /** @type {{[name: string]: string}} */
          imports: {},
        };

        for (const { name, target } of await Promise.all([...resolveDeps(pkg)])) {
          if (target) {
            console.log(`importmap.json resolved ${JSON.stringify(name)} => ${JSON.stringify(target)} `);
            importmap.imports[name] = `./${target}`;
          } else {
            console.log(`WARN: unable to resolve dependency ${JSON.stringify(name)}; add a vendor / ${name}.cjs adaptor ? `);
          }
        }

        const outRaw = JSON.stringify(importmap, null, 2);
        await writeFile(outFilePath, outRaw, { encoding: 'utf-8' });
      },

      async lastBuilt({ path }) {
        const raw = await readFile(path, { encoding: 'utf-8' });
        const importmap = JSON.parse(raw);
        if (typeof importmap !== 'object') { return '' }
        const { id } = importmap;
        return typeof id === 'string' ? id : '';
      },

    },

    {
      input: 'importmap.json',
      output: 'index.html',

      async build(id, { path: inFilePath }, { path: outFilePath }) {
        let content = await readFile(outFilePath, { encoding: 'utf-8' });
        content = await ed(content, async ({ y, x, lines }) => {

          await y(/<script/i, /<\/script>/i, x(/(\s*)(<(script).*?type="importmap".*?>)/i,
            async ([_, indent, tag, name], _i, start, end) => {
              const importmap = await readFile(inFilePath, { encoding: 'utf-8' });
              const newLines = importmap.split(/\n/);
              newLines.unshift(`${tag.replace(/ src=".*?"/, '')}${newLines.shift() || ''}`);
              newLines.push(`${newLines.pop() || ''}</${name}>`);
              lines.splice(start, 1 + end - start,
                ...newLines.map(line => `${indent}${line}`));
            }));

          // TODO would rather use g, but ed doesn't intercept splice to keep
          // indices sane when removing lines
          lines
            .map((line, i) => /<!-- @generated id:.* -->/.test(line) ? i : -1)
            .filter(i => i >= 0)
            .forEach((i, n) => lines.splice(i - n, 1));
          lines.push(`<!-- @generated id:${id} -->`);

        });
        await writeFile(outFilePath, content, { encoding: 'utf-8' });
      },

      lastBuilt: buildIDMatcher(/<!-- @generated id:([^\s]+) -->/),
    },

  ],
  match: [

    cmdBuilder({
      ext: '.ne',
      cmd: ['npx', 'nearleyc'],
    }),

    // TODO: a tighter / in-process integration should be possible thru the
    // rollup API, which might even let us get the full/proper hash of (all)
    // input files; note: this would also require that we change
    // scripts/generate.js to allow Builder to determine a better input id
    cmdBuilder({
      ext: '.cjs',
      cmd: (input, output) => [
        'npx', 'rollup',
        '--plugin', '@rollup/plugin-node-resolve',
        '--plugin', '@rollup/plugin-commonjs',
        '--format', 'esm',
        '--sourcemap',
        '--i', input.path,
        '--o', output.path,
      ],
    }),

    function*({ name: inputName, path: inFilePath }) {
      const ext = extname(inputName);
      if (ext !== '.glsl') {
        return;
      }

      const baseName = basename(inputName, '.glsl');
      const typeExt = extname(baseName);
      if (!typeExt) {
        throw 'has no additional type extension; rename it something like .vert.glsl or .frag.glsl';
      }
      const type = typeExt.slice(1);

      const dir = dirname(inFilePath);
      const name = basename(baseName, typeExt);
      const opts = { outDir: dir, name, type };

      const lastBuilt = buildIDMatcher(/^\/\/ @generated from id:([^\s]+)/);

      yield [join(dir, `${name}.js`), {
        build: glslBuilder({ ...opts, minify: false }),
        lastBuilt
      }];

      yield [join(dir, `${name}.min.js`), {
        build: glslBuilder({ ...opts, minify: true }),
        lastBuilt
      }];

    },

  ],
};

export default config;

/// library routines to split out

/** @typedef {import('./scripts/generate.js').FileEntry} FileEntry */
/** @typedef {import('./scripts/generate.js').BuildIdentifier} BuildIdentifier */
/** @typedef {import('./scripts/generate.js').Matcher} Matcher */

/** @typedef {import('fs/promises').FileHandle} FileHandle */

/** @param {object} params
 * @param {string|string[]} params.ext
 * @param {string[]|((input: FileEntry, output: FileEntry) => string[])} params.cmd
 * @param {string} [params.comment]
 * @returns {Matcher}
 */
function cmdBuilder({
  ext: matchExt,
  cmd,
  comment = '// ',
}) {
  if (typeof matchExt == 'string') {
    matchExt = [matchExt];
  }

  return function*({ name, path }) {
    const ext = extname(name);
    if (!matchExt.includes(ext)) {
      return;
    }
    const base = basename(name, ext);
    const outPath = join(dirname(path), `${base}.js`);

    // dynamic command that operates dynamically on input/output file paths
    if (typeof cmd === 'function') {
      // NOTE: we expect the command to do its own atomic output writing
      // concerns, which is a normative assumption between programs; also if we
      // tried to indirect through our own managed tmp file here, as below,
      // then things like rollup sourcemap generation would not work correctly,
      // as they'd be named after the tmp file without further integration

      // NOTE: build id embedding not supported here, since this is likely a
      // much larger scoped command like rollup cjs => esm, whose input set is
      // broader than just the input file, so our notion of build ID is
      // insufficient; in the cmd case below where it's a stdin/stdout locked
      // command, it's a reasonable/useful enough stretch to expect the config
      // to limit those uses to simples functions of input alone, but not here.

      yield [outPath, {
        async build(_id, input, output) {
          const [exec, ...args] = cmd(input, output)
          const proc = spawn(exec, args, {
            stdio: ['ignore', 'ignore', 'inherit'],
          });
          await new Promise((resolve, reject) => {
            proc.once('error', reject);
            proc.once('close', code => {
              if (code === 0) {
                resolve();
              } else {
                reject(new Error(`${JSON.stringify([exec, ...args])} exited ${code}`));
              }
            });
          });
        },
        noHash: true,
        async lastBuilt() { return '' },
      }];
    }

    // static command that operates on managed stdin/stdout filehandles
    else {
      yield [outPath, {
        build(id, input, output) {
          return buildAtomicFile(input, output, async (inFile, outFile) => {
            await outFile.write(`${comment}@generated from id:${id}\n\n`);

            const [exec, ...args] = cmd;
            const proc = spawn(exec, args, {
              stdio: [inFile.fd, outFile.fd, 'inherit'],
            });

            await new Promise((resolve, reject) => {
              proc.once('error', reject);
              proc.once('close', code => {
                if (code === 0) {
                  resolve();
                } else {
                  reject(new Error(`${JSON.stringify([exec, ...args])} exited ${code}`));
                }
              });
            });
          });
        },
        lastBuilt: buildIDMatcher(/^\/\/ @generated from id:([^\s]+)/),
      }];
    }

  };
}

/**
 * @param {RegExp|((line: string) => string)} pat
 * @returns {BuildIdentifier}
 */
function buildIDMatcher(pat) {
  const match = typeof pat === 'function'
    ? pat
    : /** @param {string} line */ line => {
      const match = pat.exec(line);
      return match && match[1] || '';
    };
  return async (prior) => {
    const file = await open(prior.path, 'r');
    try {
      for await (const line of scanLines(file)) {
        const id = match(line);
        if (id) { return id }
      }
      return '';
    } finally {
      await file.close();
    }
  };
}

/**
 * @param {FileEntry} input
 * @param {FileEntry} output
 * @param {(inFile: FileHandle, outFile: FileHandle) => Promise<void>} creator
 */
async function buildAtomicFile({ path: inPath }, { path: outPath }, creator) {
  const inFile = await open(inPath, 'r');

  // TODO random()ness for $security $reasons
  const tmpName = join(
    dirname(outPath),
    `.${basename(outPath)}.tmp`
  );
  const outFile = await open(tmpName, 'w');

  let done = false;

  const finish = async () => {
    if (!done) {
      await rename(tmpName, outPath);
      done = true;
    }
  };

  const cleanup = async () => {
    if (!done) {
      await unlink(tmpName);
      done = true;
    }
  };

  try {
    await creator(inFile, outFile);
    await finish();
  } finally {
    await Promise.all([
      inFile.close(),
      outFile.close(),
      cleanup(),
    ]);
  }
}

/**
 * @param {FileHandle} file
 * @param {BufferEncoding} [encoding]
 */
async function* scanLines(file, encoding = 'utf-8') {
  let buffer = Buffer.alloc(16384);
  let offset = 0;
  while (true) {
    const { bytesRead } = await file.read({ buffer, offset });
    if (!bytesRead) { break }
    const end = offset + bytesRead;
    const chunk = buffer.subarray(0, end);
    let i = 0;
    for (
      let j = chunk.indexOf('\n');
      j >= i;
      i = j + 1, j = chunk.indexOf('\n', i)
    ) {
      yield buffer.subarray(i, j).toString(encoding);
    }
    if (i > 0 && i < chunk.length) {
      buffer.copyWithin(0, i);
      offset = chunk.length - i;
    }
  }
  if (offset > 0) {
    yield buffer.subarray(0, offset).toString(encoding);
  }
}
