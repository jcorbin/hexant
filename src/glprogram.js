// @ts-check

// TODO:
// - detect uniform and attr names by static analysis
// - pursue tighter integration with GLSLShader

export class GLProgram {

  /**
   * @param {WebGLRenderingContext} gl
   * @param {WebGLProgram} prog
   * @param {Iterable<string>} uniformNames
   * @param {Iterable<string>} attrNames
   */
  constructor(gl, prog, uniformNames, attrNames) {

    /** @type {{[name: string]: WebGLUniformLocation}} */
    const uniform = {};

    /** @type {{[name: string]: number}} */
    const attr = {};

    for (const name of uniformNames) {
      const loc = gl.getUniformLocation(prog, name);
      if (!loc) {
        throw new Error(`unable to find uniform ${name}`);
      }
      uniform[name] = loc;
    }

    for (const name of attrNames) {
      const loc = gl.getAttribLocation(prog, name);
      if (loc < 0) {
        throw new Error(`unable to find attrib ${name}`);
      }
      attr[name] = loc;
    }

    this.gl = gl;
    this.prog = prog;
    this.uniform = uniform;
    this.attr = attr;
  }

  use() {
    const { gl, prog } = this;
    gl.useProgram(prog);
  }

  enable() {
    const { gl, attr } = this;
    this.use();
    for (const attrLoc of Object.values(attr)) {
      gl.enableVertexAttribArray(attrLoc);
    }
  }

  disable() {
    const { gl, attr } = this;
    for (const attrLoc of Object.values(attr)) {
      gl.disableVertexAttribArray(attrLoc);
    }
  }

}
