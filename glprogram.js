'use strict';

module.exports = GLProgram;

// TODO:
// - detect uniform and attr names by static analysis
// - pursue tighter integration with GLSLShader

function GLProgram(gl, shaderLoader, uniformNames, attrNames) {
    this.gl = gl;
    this.prog = shaderLoader.load(this.gl).toValue();
    this.attrs = [];
    this.uniform = {};
    this.attr = {};
    for (var i = 0; i < uniformNames.length; ++i) {
        var name = uniformNames[i];
        this.uniform[name] = this.gl.getUniformLocation(this.prog, name);
    }
    for (var i = 0; i < attrNames.length; ++i) {
        var name = attrNames[i];
        var attr = this.gl.getAttribLocation(this.prog, name);
        this.attr[name] = attr;
        this.attrs.push(attr);
    }
}

GLProgram.prototype.use =
function use() {
    this.gl.useProgram(this.prog);
};

GLProgram.prototype.enable =
function enable() {
    this.use();
    for (var i = 0; i < this.attrs.length; ++i) {
        this.gl.enableVertexAttribArray(this.attrs[i]);
    }
};

GLProgram.prototype.disable =
function disable() {
    for (var i = 0; i < this.attrs.length; ++i) {
        this.gl.disableVertexAttribArray(this.attrs[i]);
    }
};
