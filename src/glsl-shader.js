// @ts-check

"use strict";

import * as rezult from './rezult.js';

export default class GLSLShader {

  /**
   * @param {string} name
   * @param {string} type
   * @param {string} source
   * @param {GLSLShader} [nextShader]
   */
  constructor(name, type, source, nextShader) {
    this.name = name;
    this.type = type;
    this.source = source;
    this.nextShader = nextShader;
  }

  /** @param {GLSLShader} nextShader */
  linkWith(nextShader) {
    const { name, type, source, nextShader: myNextShader } = this;
    if (myNextShader) {
      nextShader = myNextShader.linkWith(nextShader);
    }
    return new GLSLShader(name, type, source, nextShader);
  }

  /** @param {WebGLRenderingContext} gl */
  compile(gl) {
    const { name, type, source } = this;

    const typeRes = glShaderType(gl, type);
    if (typeRes.err) {
      return typeRes;
    }

    const shader = gl.createShader(typeRes.value);
    if (!shader) {
      return rezult.error(new Error(`unable to create ${type} shader`));
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) || '';
      const mess = annotateCompileError(source, log);
      return rezult.error(new Error(
        `${name} ${type} shader compile error: ${mess}`));
    }

    return rezult.just(shader);
  }

  /**
   * @param {WebGLRenderingContext} gl
   * @returns {rezult.Result<WebGLProgram>}
   */
  load(gl) {
    const prog = gl.createProgram();
    if (!prog) {
      return rezult.error(new Error('unable to create gl program'));
    }

    for (let shader = /** @type {GLSLShader|undefined} */ (this); shader; shader = shader.nextShader) {
      const res = shader.compile(gl);
      if (res.err) {
        return res;
      }
      gl.attachShader(prog, res.value);
    }

    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(prog);
      return rezult.error(new Error(`shader program link error: ${log}`));
    }

    return rezult.just(prog);
  }
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {string} type
 */
function glShaderType(gl, type) {
  switch (type) {
    case 'frag':
      return rezult.just(gl.FRAGMENT_SHADER);
    case 'vert':
      return rezult.just(gl.VERTEX_SHADER);
    default:
      return rezult.error(new Error('invalid glsl shader type ' + JSON.stringify(type)));
  }
}

/**
 * @param {string} src
 * @param {string} mess
 */
function annotateCompileError(src, mess) {
  var match = /^ERROR: \d+:(\d+):/.exec(mess);
  if (!match) {
    return mess;
  }
  const lineNo = parseInt(match[1] || '');
  const contextCount = 3;

  const lines = src.split(/\n/);
  const numLines = lines.length;
  const w = numLines.toString().length;

  return [...annotateLine(
    numberLines(w, lines),
    lineNo, contextCount,
    `${' '.repeat(w)} ^-- ${mess}`
  )].join('\n');
}

/**
 * @param {number} w
 * @param {Iterable<string>} lines
 */
function* numberLines(w, lines) {
  let n = 0;
  for (const line of lines) {
    n++;
    yield `${n.toString().padStart(w)}: ${line}`;
  }
}

/**
 * @param {Iterable<string>} lines
 * @param {number} lineNo
 * @param {number} contextCount
 * @param {string} mess
 */
function* annotateLine(lines, lineNo, contextCount, mess) {
  let n = 0;
  for (const line of lines) {
    n++;
    if (Math.abs(lineNo - n) <= contextCount) {
      yield line;
    }
    if (n === lineNo) {
      yield mess;
    }
  }
}
