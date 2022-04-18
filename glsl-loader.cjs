// @ts-check

"use strict";

const { basename, extname, relative } = require('path');
const { open, readFile } = require('fs').promises;

const GLSLTokenStream = require('glsl-tokenizer/stream');
const GLSLParseStream = require('glsl-parser/stream');
const GLSLDeparser = require('glsl-deparser');
const GLSLMinify = require('glsl-min-stream');

/** @typedef {import('stream').Readable} Readable */

/** @typedef {object} Options
 * @prop {boolean} [minify]
 */

/** @type {import("snowpack").SnowpackPluginFactory<Options> } */
module.exports = (
  { root },
  { minify: shouldMinify = true } = {}
) => {
  return {
    name: 'my-glsl-loader',
    resolve: {
      input: ['.frag', '.vert'],
      output: ['.js'],
    },

    async load({ filePath, isDev }) {
      const minify = !isDev && shouldMinify;

      const code = await (async function() {
        if (!minify) {
          return readFile(filePath, { encoding: 'utf-8' });
        }
        const file = await open(filePath, 'r');
        const whitespaceEnabled = false;
        return await streamToString(
          file.createReadStream({ encoding: 'utf-8' })
            .pipe(GLSLTokenStream())
            .pipe(GLSLParseStream())
            .pipe(GLSLMinify())
            .pipe(GLSLDeparser(whitespaceEnabled)));
      })();

      const finalNL = !minify;
      let codeLines = trimBlankTrailingLine(code.split('\n'));
      codeLines = addNLs(codeLines, finalNL);
      codeLines = quoteLines(codeLines);
      codeLines = multiLineCodeString(codeLines, minify ? '' : '  ');
      codeLines = addNLs(codeLines, finalNL);

      let output =
        `// @generated from ${relative(root, filePath)}\n\n` +
        '"use strict";\n\n' +
        'import GLSLShader from \'glslshader\';\n\n' +
        `export default `;
      const ext = extname(filePath);
      const name = basename(filePath, ext);
      const type = ext.slice(1);
      output += `new GLSLShader(${JSON.stringify(name)}, ${JSON.stringify(type)},${minify ? ' ' : '\n'}`;
      for await (const codeLine of codeLines) {
        output += codeLine;
      }
      output += ');\n';

      return output;
    },
  };
};

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
