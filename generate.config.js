// @ts-check

import compileGLSL from './src/glsl-compiler.js';

/** @type {import('./scripts/generate.js').Config} */
const config = {
  root: ['vendor', 'src'],
  match: [

    singleJSBuilder({
      ext: '.ne',
      cmd: ['nearleyc'],
    }),

    singleJSBuilder({
      ext: '.glsl',
      outName: base => `${basename(base, extname(base))}.js`,
      async build(inFile, outFile, { name: inputName }, { path: outFilePath }) {
        const minify = false; // TODO wen
        const baseName = basename(inputName, '.glsl');
        const typeExt = extname(baseName);
        if (!typeExt) {
          throw 'has no additional type extension; rename it something like .vert.glsl or .frag.glsl';
        }
        const name = basename(baseName, typeExt);
        const type = typeExt.slice(1);
        await compileGLSL(inFile, outFile, {
          name,
          type,
          minify,
          outFilePath,
        });
      },
    }),

    // TODO: a tighter / in-process integration should be possible thru the
    // rollup API, which might even let us get the full/proper hash of (all)
    // input files; note: this would also require that we change
    // scripts/generate.js to allow Builder to determine a better input id
    singleJSBuilder({
      ext: '.cjs',
      cmd: (input, output) => [
        'rollup',
        '--plugin', '@rollup/plugin-node-resolve',
        '--plugin', '@rollup/plugin-commonjs',
        '--format', 'esm',
        '--sourcemap',
        '--i', input.path,
        '--o', output.path,
      ],
    }),

  ],
};

export default config;

/// library routines to split out

import { spawn } from 'node:child_process';

import {
  open,
  rename,
  unlink,
} from 'node:fs/promises';

import {
  basename,
  dirname,
  extname,
  join,
} from 'node:path';

/** @typedef {import('./scripts/generate.js').FileEntry} FileEntry */
/** @typedef {import('./scripts/generate.js').Builder} Builder */
/** @typedef {import('./scripts/generate.js').BuildIdentifier} BuildIdentifier */
/** @typedef {import('./scripts/generate.js').Matcher} Matcher */

/** @typedef {import('fs/promises').FileHandle} FileHandle */

/** @param {object} params
 * @param {string|string[]} params.ext
 * @param {string[]|((input: FileEntry, output: FileEntry) => string[])} [params.cmd]
 * @param {(inFile: FileHandle, outFile: FileHandle, input: FileEntry, output: FileEntry) => Promise<void>} [params.build]
 * @param {string} [params.comment]
 * @param {(base: string, ext: string) => string} [params.outName]
 * @returns {Matcher}
 */
function singleJSBuilder({
  ext: matchExt,
  cmd,
  build: buildFiles,
  comment = '// ',
  outName = base => `${base}.js`,
}) {
  if (typeof matchExt == 'string') {
    matchExt = [matchExt];
  }

  if (typeof cmd === 'function') {
    return function*({ name, path }) {
      const ext = extname(name);
      if (matchExt.includes(ext)) {
        const outPath = join(dirname(path), outName(basename(name, ext), ext));
        yield [outPath, {
          // NOTE: build id embedding not supported here, since this is likely
          // a much larger scoped command like rollup cjs => esm, whose input
          // set is broader than just the input file, so our notion of build ID
          // is insufficient; in the cmd case below where it's a stdin/stdout
          // locked command, it's a reasonable/useful enough stretch to expect
          // the config to limit those uses to simples functions of input
          // alone, but not here.

          // NOTE: we expect the command to do its own atomic output writing
          // concerns, which is a normative assumption between programs; also
          // if we tried to indirect through our own managed tmp file here, as
          // below, then things like rollup sourcemap generation would not work
          // correctly, as they'd be named after the tmp file without further
          // integration

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
          async lastBuilt() { return '' }
        }];
      }
    };
  }

  if (cmd) {
    if (buildFiles) {
      throw new Error('must specify either cmd or build');
    }
    buildFiles = async (inFile, outFile) => {
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
    };
  }
  if (!buildFiles) {
    throw new Error('must specify either cmd or build');
  }

  /** @type {Builder} */
  async function build(id, input, output) {
    // TODO random()ness for $security $reasons
    const tmpName = join(
      dirname(output.path),
      `.${basename(output.path)}.tmp`
    );

    const inFile = await open(input.path, 'r');
    const outFile = await open(tmpName, 'w');
    try {
      await outFile.write(`${comment}@generated from id:${id}\n\n`);
      await buildFiles(inFile, outFile, input, output);
      await rename(tmpName, output.path);
    } catch (err) {
      await unlink(tmpName);
      throw err;
    } finally {
      await Promise.all([inFile.close(), outFile.close()]);
    }
  }


  /** @type {BuildIdentifier} */
  async function lastBuilt(prior) {
    const file = await open(prior.path, 'r');
    try {
      for await (const line of scanLines(file)) {
        const match = /^\/\/ @generated from id:([^\s]+)/.exec(line);
        if (match) {
          return match[1];
        }
      }
      return '';
    } finally {
      await file.close();
    }
  }

  return function*({ name, path }) {
    const ext = extname(name);
    if (matchExt.includes(ext)) {
      const outPath = join(dirname(path), outName(basename(name, ext), ext));
      yield [outPath, { build, lastBuilt }];
    }
  };
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
