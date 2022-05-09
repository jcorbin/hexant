// @ts-check

'use strict';

import compileGLSL from './src/glsl-compiler.js';

/** @type {import('./scripts/generate.js').Config} */
const config = {
  root: 'src',
  match: [

    singleJSBuilder({
      ext: '.ne',
      cmd: ['nearleyc'],
    }),

    singleJSBuilder({
      ext: ['.vert', '.frag'],
      async build(inFile, outFile, { name: inputName }, { path: outFilePath }) {
        const ext = extname(inputName);
        const name = basename(inputName, ext);
        const type = ext.slice(1);
        const minify = false; // TODO wen
        await compileGLSL(inFile, outFile, {
          name,
          type,
          minify,
          outFilePath,
        });
      },
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
 * @param {string[]} [params.cmd]
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
  if (cmd) {
    if (buildFiles) {
      throw new Error('must specify either cmd or build');
    }
    buildFiles = async (inFile, outFile) => {
      const proc = spawn('npx', cmd, {
        stdio: [inFile.fd, outFile.fd, 'inherit'],
      })
      await new Promise((resolve, reject) => {
        proc.once('error', reject);
        proc.once('close', code => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`${JSON.stringify(cmd)} exited ${code}`));
          }
        });
      });
    };
  }
  if (!buildFiles) {
    throw new Error('must specify either cmd or build');
  }

  if (typeof matchExt == 'string') {
    matchExt = [matchExt];
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
    const chunk = buffer.subarray(offset, bytesRead);
    for (
      let i = 0, j = chunk.indexOf('\n');
      j >= i;
      i = j + 1, j = chunk.indexOf('\n', i)
    ) {
      yield buffer.subarray(i, j).toString(encoding);
    }
  }
  if (offset > 0) {
    yield buffer.subarray(0, offset).toString(encoding);
  }
}
