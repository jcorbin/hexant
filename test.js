'use strict';

var domready = require('domready');

var GLProgram = require('./glprogram.js');
var OddQOffset = require('./coord.js').OddQOffset;
var ScreenPoint = require('./coord.js').ScreenPoint;
var vec3 = require('gl-matrix').vec3;
var mat4 = require('gl-matrix').mat4;

var oddqPointShader = require('./oddq_point.vert');
var hexFragShader = require('./hex.frag');

domready(setup);

/* eslint-disable max-statements */

function setup() {
    var window = this;
    var document = window.document;

    var canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    window.addEventListener('resize', onResize);

    var gl = canvas.getContext('webgl');
    var extSRGB = gl.getExtension("EXT_sRGB");
    window.gl = gl;
    if (!gl) {
        throw new Error('no webgl support');
    }

    // single tile of world data:
    // - color index is stored in the low byte (mask 0x00ff)
    // - high byte is flags (mask 0xff00)
    //   - the visited flag is 0x0100
    var origin = new OddQOffset(0, 0);
    var tileWidth = 4;
    var tileHeight = 4;
    var data = new Uint16Array([
        0x0000, 0x0000, 0x0000, 0x0000,
        0x0000, 0x0102, 0x0000, 0x0000,
        0x0101, 0x0100, 0x0101, 0x0000,
        0x0102, 0x0101, 0x0102, 0x0000
    ]);

    // world bounding box
    var topLeftQ = new OddQOffset(NaN, NaN);
    var bottomRightQ = new OddQOffset(NaN, NaN);
    expandBoxToTileIf(topLeftQ, bottomRightQ, data, origin, tileWidth, 0x0100);

    // screen bounding box
    var topLeft = new ScreenPoint(0, 0);
    var bottomRight = new ScreenPoint(0, 0);

    // build "1d" texture palette (a 256x1 2d texture)
    var cellTexData = new Uint8Array(256 * 4);
    for (var i = 0; i < cellTexData.length;) {
        // i % 3 == 0 -> red
        cellTexData[i++] = 255;
        cellTexData[i++] = 0;
        cellTexData[i++] = 0;
        if (i >= cellTexData.length) break;
        // i % 3 == 1 -> green
        cellTexData[i++] = 0;
        cellTexData[i++] = 255;
        cellTexData[i++] = 0;
        if (i >= cellTexData.length) break;
        // i % 3 == 2 -> blue
        cellTexData[i++] = 0;
        cellTexData[i++] = 0;
        cellTexData[i++] = 255;
    }

    // build vert, color, and element data
    var verts = new Float32Array(0x20000);
    var colors = new Uint8Array(0x10000);
    var elts = new Uint16Array(0x2fffe);
    var vi = 0, ci = 0, ei = 0;
    for (var r = origin.r, i = 0; r < origin.r + tileHeight; r++) {
        for (var q = origin.q; i < data.length && q < origin.q + tileWidth; i++, q++) {
            if (data[i] & 0x0100) {
                elts[ei++] = ci;
            }
            verts[vi++] = q;
            verts[vi++] = r;
            colors[ci++] = data[i] & 0x00ff;
        }
    }

    // gl setup
    var perspectiveMatrix = mat4.identity(new Float32Array(16));
    var hexShader = new GLProgram(gl,
        oddqPointShader.linkWith(hexFragShader),
        ['uPMatrix', 'uVP', 'uRadius'],
        ['vert', 'ang', 'color']
    );
    var uSampler = gl.getUniformLocation(hexShader.prog, 'uSampler'); // TODO: GLProgram borg

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    hexShader.enable();
    gl.disableVertexAttribArray(hexShader.attr.ang);

    // bind texture
    var cellTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, cellTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, extSRGB.SRGB_EXT,
        256, 1, 0,
        extSRGB.SRGB_EXT, gl.UNSIGNED_BYTE, cellTexData);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, cellTex);
    gl.uniform1i(uSampler, 0);

    // bind vert data
    var vertsBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertsBuf);
    gl.bufferData(gl.ARRAY_BUFFER, verts.byteLength, gl.STATIC_DRAW);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new verts.constructor(verts.buffer, 0, vi));
    gl.bindBuffer(gl.ARRAY_BUFFER, vertsBuf);
    gl.vertexAttribPointer(hexShader.attr.vert, 2, gl.FLOAT, false, 0, 0);

    // bind color data
    var colorsBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuf);
    gl.bufferData(gl.ARRAY_BUFFER, colors.byteLength, gl.STATIC_DRAW);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new colors.constructor(colors.buffer, 0, vi));
    gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuf);
    gl.vertexAttribPointer(hexShader.attr.color, 1, gl.UNSIGNED_BYTE, true, 0, 0);

    // bind element data
    var eltsBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, eltsBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elts.byteLength, gl.STATIC_DRAW);
    gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, new elts.constructor(elts.buffer, 0, ei));

    onResize();

    function onResize() {
        var width = Math.max(
            document.documentElement.clientWidth,
            window.innerWidth || 0);
        var height = Math.max(
            document.documentElement.clientHeight,
            window.innerHeight || 0);

        qrToScreenBox(topLeftQ, bottomRightQ, topLeft, bottomRight);
        fixAspectRatio(width / height, topLeft, bottomRight);
        mat4.ortho(perspectiveMatrix,
            topLeft.x, bottomRight.x,
            bottomRight.y, topLeft.y,
            -1, 1);

        canvas.width = width;
        canvas.height = height;

        gl.viewport(0, 0, width, height);
        gl.uniform2f(hexShader.uniform.uVP, width, height);
        gl.uniformMatrix4fv(hexShader.uniform.uPMatrix, false, perspectiveMatrix);

        redraw();
    }

    function redraw() {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(hexShader.uniform.uRadius, 1);
        gl.drawElements(gl.POINTS, ei, gl.UNSIGNED_SHORT, 0);
        gl.finish();
    }
}

function expandBoxToTileIf(topLeftQ, bottomRightQ, data, origin, tileWidth, mask) {
    var q = origin.q, r = origin.r, i = 0;
    while (i < data.length) {
        if (data[i] & mask) {
            topLeftQ.q = q;
            bottomRightQ.q = q;
            topLeftQ.r = r;
            bottomRightQ.r = r;
            break;
        }
        i++;
        q++;
        if (q >= origin.q + tileWidth) {
            q = origin.q;
            r++;
        }
    }
    while (i < data.length) {
        if (data[i] & mask) {
            if (q < topLeftQ.q) {
                topLeftQ.q = q;
            } else if (q >= bottomRightQ.q) {
                bottomRightQ.q = q;
            }
            if (r < topLeftQ.r) {
                topLeftQ.r = r;
            } else if (r >= bottomRightQ.r) {
                bottomRightQ.r = r;
            }
        }
        i++;
        q++;
        if (q >= origin.q + tileWidth) {
            q = origin.q;
            r++;
        }
    }
}

function qrToScreenBox(topLeftQ, bottomRightQ, topLeft, bottomRight) {
    var rx = 0.5;
    var ry = Math.sqrt(3)/2;

    topLeftQ.toScreenInto(topLeft);
    bottomRightQ.toScreenInto(bottomRight);

    // TODO: fix this hacky fudging
    topLeft.x -= rx;
    topLeft.y -= ry;
    bottomRight.x += rx;
    bottomRight.y += ry;
    var oddEnough = (bottomRightQ.q - topLeftQ.q) > 0;
    if (topLeftQ.q & 1) {
        topLeft.y -= ry;
    }
    if (bottomRightQ.q & 1 || oddEnough) {
        bottomRight.y += ry;
    }
}

function fixAspectRatio(aspectRatio, topLeft, bottomRight) {
    var gridWidth = bottomRight.x - topLeft.x;
    var gridHeight = bottomRight.y - topLeft.y;
    var ratio = gridWidth / gridHeight;
    if (ratio < aspectRatio) {
        var dx = gridHeight * aspectRatio / 2 - gridWidth / 2;
        topLeft.x -= dx;
        bottomRight.x += dx;
    } else if (ratio > aspectRatio) {
        var dy = gridWidth / aspectRatio / 2 - gridHeight / 2;
        topLeft.y -= dy;
        bottomRight.y += dy;
    }
}
