"use strict";

var Result = require('rezult');

module.exports = GLSLShader;

function GLSLShader(name, type, source) {
    this.name = name;
    this.type = type;
    this.source = source;
    this.nextShader = null;
}

GLSLShader.prototype.linkWith =
function linkWith(nextShader) {
    var self = new GLSLShader(this.name, this.type, this.source);
    if (this.nextShader === null) {
        self.nextShader = nextShader;
    } else {
        self.nextShader = this.nextShader.linkWith(nextShader);
    }
    return self;
};

GLSLShader.prototype.compile =
function compile(gl) {
    var shader = null;
    switch (this.type) {
    case 'frag':
        shader = gl.createShader(gl.FRAGMENT_SHADER);
        break;
    case 'vert':
        shader = gl.createShader(gl.VERTEX_SHADER);
        break;
    default:
        throw new Error('invalid glsl shader type ' + JSON.stringify(this.type));
    }
    gl.shaderSource(shader, this.source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        var mess = gl.getShaderInfoLog(shader);
        mess = annotateCompileError(this.source, mess);
        mess = this.name + ' ' + this.type + ' shader compile error: ' + mess;
        return Result.error(new Error(mess));
    }

    return Result.just(shader);
};

GLSLShader.prototype.load =
function load(gl) {
    var prog = gl.createProgram();

    for (var shader = this; shader !== null; shader = shader.nextShader) {
        var res = shader.compile(gl);
        if (res.err) {
            return res;
        }
        gl.attachShader(prog, res.value);
    }

    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        var mess = gl.getProgramInfoLog(prog);
        mess = 'shader program link error: ' + mess;
        return Result.error(new Error(mess));
    }

    return Result.just(prog);
};

function annotateCompileError(src, mess) {
    var match = /^ERROR: \d+:(\d+):/.exec(mess);
    if (!match) {
        return mess;
    }
    var lines = src.split(/\n/);
    lines = numberLines(lines);
    var n = parseInt(match[1]);
    var w = lines.length.toString().length + 1;
    lines = annotateLine(
        lines, n, 3,
        rep(' ', w) + '^-- ' + mess);
    return lines.join('')
}

function annotateLine(lines, n, c, mess) {
    var out = [];
    for (var i = 0; i < lines.length; ++i) {
        var m = i + 1;
        if (Math.abs(n - m) <= c) {
            out.push(lines[i]);
        }
        if (m === n) {
            out.push(mess);
        }
    }
    return out;
}

function numberLines(lines) {
    var w = lines.length.toString().length;
    return lines.map(function(line, i) {
        var n = i + 1;
        return pad(n.toString(), w) + ':' + line + '\n';
    });
}

function pad(str, n) {
    return rep(' ', n - str.length) + str;
}

function rep(str, n) {
    var s = '';
    for (var i = 0; i < n; ++i) {
        s += str;
    }
    return s;
}
