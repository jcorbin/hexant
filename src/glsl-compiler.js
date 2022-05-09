// @ts-check

// NOTE: this must be next to glsl-shader.js
const libPath = fileURLToPath(import.meta.url);
import './glsl-shader.js';

"use strict";

import GLSLTokenStream from 'glsl-tokenizer/stream.js';
import GLSLParseStream from 'glsl-parser/stream.js';
import GLSLDeparser from 'glsl-deparser';
import GLSLMinify from 'glsl-min-stream';

import {
  fileURLToPath,
} from 'node:url';

import {
  dirname,
  relative,
} from 'node:path';

/** @typedef {import('fs/promises').FileHandle} FileHandle */
/** @typedef {import('stream').Readable} Readable */

/**
 * @param {FileHandle} inFile
 * @param {FileHandle} outFile
 * @param {object} options
 * @param {string} options.outFilePath
 * @param {boolean} [options.minify]
 * @param {string} [options.name]
 * @param {string} [options.type]
 */
export default async function compile(inFile, outFile, {
  outFilePath,
  minify = false,
  name = 'unnamed',
  type = 'vert',
}) {
  const encoding = 'utf-8';

  /** @type {Readable} */
  let fileStream = inFile.createReadStream({ encoding });
  if (minify) {
    fileStream = fileStream
      .pipe(GLSLTokenStream())
      .pipe(GLSLParseStream())
      .pipe(GLSLMinify())
      .pipe(GLSLDeparser(/* whitespaceEnabled */false));
  }
  const code = await streamToString(fileStream);

  const finalNL = !minify;
  let codeLines = trimBlankTrailingLine(code.split('\n'));
  codeLines = addNLs(codeLines, finalNL);
  codeLines = quoteLines(codeLines);
  codeLines = multiLineCodeString(codeLines, minify ? '' : '  ');
  codeLines = addNLs(codeLines, finalNL);

  await outFile.write(
    '"use strict";\n\n' +
    `import GLSLShader from './${dirname(relative(dirname(outFilePath), libPath))}/glsl-shader.js';\n\n` +
    `export default new GLSLShader(${JSON.stringify(name)}, ${JSON.stringify(type)},${minify ? ' ' : '\n'}`
  );

  for await (const codeLine of codeLines) {
    await outFile.write(codeLine);
  }

  await outFile.write(');\n');
}

/**
 * @param {Readable} stream
 * @param {BufferEncoding} [encoding]
 * @return {Promise<string>}
 */
function streamToString(stream, encoding = 'utf-8') {
  /** @type {Buffer[]} */
  const chunks = [];
  return new Promise((resolve, reject) => stream
    .on('data', chunk => chunks.push(Buffer.from(chunk)))
    .on('error', reject)
    .on('end', () => resolve(Buffer.concat(chunks).toString(encoding))));
}

/** @param {Iterable<string>} lines */
function* trimBlankTrailingLine(lines) {
  /** @type {null|string} */
  let last = null;
  for (const line of lines) {
    if (last != null) {
      yield last;
    }
    last = line;
  }
  if (last /* not null and not empty */) {
    yield last;
  }
}

/** @param {Iterable<string>} quotedLines */
function* multiLineCodeString(quotedLines, prefix = '', final = '') {
  let last = null;
  for (const line of quotedLines) {
    if (last != null) {
      yield `${prefix}${last} +`;
    }
    last = line;
  }
  if (last != null) {
    yield `${prefix}${last}${final}`;
  }
}

/** @param {Iterable<string>} lines */
function* quoteLines(lines) {
  for (const line of lines) {
    yield JSON.stringify(line);
  }
}

/** @param {Iterable<string>} lines */
function* addNLs(lines, final = true) {
  /** @type {null|string} */
  let last = null;
  for (const line of lines) {
    if (last != null) {
      yield `${last}\n`;
    }
    last = line;
  }
  if (last != null) {
    yield `${last}${final ? '\n' : ''}`;
  }
}
