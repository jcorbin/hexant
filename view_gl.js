'use strict';

var World = require('./world.js');
var Coord = require('./coord.js');
var vec3 = require('gl-matrix').vec3;
var mat4 = require('gl-matrix').mat4;

var GLProgram = require('./glprogram.js');
var oddqDXYShader = require('./oddq_dxy.vert');
var passFragShader = require('./pass.frag');
var rangeListAdd = require('./rangelist.js').add;
var collectTombstone = require('./tileglbuffer.js').collectTombstone;
var placeTile = require('./tileglbuffer.js').placeTile;

module.exports = ViewGL;

// TODO:
// - in redraw lazily only draw dirty tiles, expand permitting
// - draw ents
// - switch to uint32 elements array if supported by extension
// - switch to uint32 for q,r, use a highp in the shader
// - can we get away with int16, or even int8 for dx,dy?
// - separate the tile mapping, building, etc from any one view
// - LoD scaling (points at large scale should give ~6x data reduction)
// - bonus if we can do point verts without any explicit dx,dy data

/* eslint-disable max-statements */

/* For our canonical hex:
 *
 *           2     1
 *
 *            q , r
 *     3                 0
 *            color
 *
 *           4     5
 *
 * We generate the triangle strip:
 *     1, 2, 0, 3, 5, 4
 * So that means these triangles:
 *     1 2 0
 *     0 2 3
 *     0 3 5
 *     5 3 4
 *
 * TODO: share vertices between adjacent hexes, color allowing
 */

function ViewGL(world, canvas) {
    this.world = world;
    this.canvas = canvas;
    this.topLeftQ = new Coord.OddQOffset();
    this.bottomRightQ = new Coord.OddQOffset();
    this.topLeft = new Coord.ScreenPoint();
    this.bottomRight = new Coord.ScreenPoint();

    // max uint16 value for elements:
    // TODO: may be able to use uint32 extension
    // TODO: platform may define max in that case? (i.e. it would seem unlikely
    // that we can actually use a full 4Gi vert attribute, let alone that we
    // really don't want to allocate the 224GiB vert + color arrays that it
    // would imply
    this.maxElement = 0xffff;

    this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl') || null;
    if (!this.gl) {
        throw new Error('no webgl support');
    }

    this.perspectiveMatrix = mat4.identity(new Float32Array(16));
    this.hexShader = new GLProgram(this.gl,
        oddqDXYShader.linkWith(passFragShader),
        ['uPMatrix', 'uVP', 'uRadius'],
        ['vert', 'color']
    );

    this.tileWriter = new TileWriter(this.maxElement + 1);
    this.tileBufferer = new TileBufferer(this.gl, this.world, this.tileWriter);
    this.maxCellsPerTile = Math.floor((this.maxElement + 1) / this.tileWriter.cellSize);

    this.cellColors = null;
    this.needsRedraw = false;

    this.colorGen = null;
    this.antCellColorGen = null;
    this.emptyCellColorGen = null;
    this.bodyColorGen = null;
    this.headColorGen = null;

    this.antCellColors = [];
    this.emptyCellColors = [];
    this.bodyColors = [];
    this.headColors = [];

    this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
    this.hexShader.use();

    this.updateSize();
}

ViewGL.prototype.reset =
function reset() {
    var self = this;

    this.tileBufferer.reset();

    this.topLeftQ.q = 0;
    this.topLeftQ.r = 0;
    this.bottomRightQ.q = 0;
    this.bottomRightQ.r = 0;
    this.world.tile.eachTile(this.tileBufferer.drawUnvisited ? eachExpandTo : eachExpandToIf);

    this.updateSize();

    function eachExpandTo(tile) {
        tile.expandBoxTo(self.topLeftQ, self.bottomRightQ);
    }

    function eachExpandToIf(tile) {
        tile.expandBoxToIf(self.topLeftQ, self.bottomRightQ, World.FlagVisited);
    }
};

ViewGL.prototype.expandTo =
function expandTo(pointArg) {
    var expanded = false;
    var point = pointArg.toOddQOffset();

    if (point.q < this.topLeftQ.q) {
        this.topLeftQ.q = point.q;
        expanded = true;
    } else if (point.q >= this.bottomRightQ.q) {
        this.bottomRightQ.q = point.q;
        expanded = true;
    }

    if (point.r < this.topLeftQ.r) {
        this.topLeftQ.r = point.r;
        expanded = true;
    } else if (point.r >= this.bottomRightQ.r) {
        this.bottomRightQ.r = point.r;
        expanded = true;
    }

    return expanded;
};

ViewGL.prototype.updateSize =
function updateSize() {
    this.qrToScreen();
    fixAspectRatio(
        this.gl.drawingBufferWidth / this.gl.drawingBufferHeight,
        this.topLeft, this.bottomRight);
    mat4.ortho(this.perspectiveMatrix,
        this.topLeft.x, this.bottomRight.x,
        this.bottomRight.y, this.topLeft.y,
        -1, 1);
    this.gl.uniformMatrix4fv(this.hexShader.uniform.uPMatrix, false, this.perspectiveMatrix);
};

ViewGL.prototype.qrToScreen =
function qrToScreen() {
    this.topLeftQ.toScreenInto(this.topLeft);
    this.bottomRightQ.toScreenInto(this.bottomRight);

    var w = this.tileWriter.cellHalfWidth;
    var h = this.tileWriter.cellHalfHeight;

    this.topLeft.x -= w;
    this.topLeft.y -= h;
    this.bottomRight.x += w;
    this.bottomRight.y += h;

    // TODO: sometimes over tweaks, but only noticable at small scale
    var oddEnough = (this.bottomRightQ.q - this.topLeftQ.q) > 0;
    if (this.topLeftQ.q & 1) {
        this.topLeft.y -= h;
    }
    if (this.bottomRightQ.q & 1 || oddEnough) {
        this.bottomRight.y += h;
    }
};

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

ViewGL.prototype.setColors =
function setColors(colors) {
    this.cellColors = colors;
    this.tileWriter.setColors(colors);
};

ViewGL.prototype.setDrawTrace =
function setDrawTrace(dt) {
    this.drawTrace = !!dt;
    this.updateColors();
};

ViewGL.prototype.resize =
function resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);

    this.updateSize();
    this.redraw();
};

ViewGL.prototype.redraw =
function redraw() {
    // TODO: partial redraws in the non-expanded case

    this.tileBufferer.flush();

    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.hexShader.enable();

    // tiles
    this.gl.uniform1f(this.hexShader.uniform.uRadius, 1.0);
    for (var i = 0; i < this.tileBufferer.tileBuffers.length; ++i) {
        var tileBuffer = this.tileBufferer.tileBuffers[i];
        if (!tileBuffer.tiles.length) {
            continue;
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, tileBuffer.verts.buf);
        this.gl.vertexAttribPointer(this.hexShader.attr.vert, tileBuffer.verts.width, this.gl.FLOAT, false, 0, 0);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, tileBuffer.colors.buf);
        this.gl.vertexAttribPointer(this.hexShader.attr.color, tileBuffer.colors.width, this.gl.UNSIGNED_BYTE, true, 0, 0);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, tileBuffer.elements.buf);
        this.gl.drawElements(this.gl.TRIANGLE_STRIP, tileBuffer.usedElements, this.gl.UNSIGNED_SHORT, 0);
    }

    this.hexShader.disable();
    this.gl.finish();

    this.needsRedraw = false;
};

ViewGL.prototype.updateEnts =
function updateEnts() {
    this.updateColors();
};

ViewGL.prototype.addEnt =
function addEnt(i) {
    this.updateColors();
};

ViewGL.prototype.updateEnt =
function updateEnt(i) {
    this.updateColors();
};

ViewGL.prototype.removeEnt =
function removeEnt(i) {
    this.updateColors();
};

ViewGL.prototype.setColorGen =
function setColorGen(colorGen) {
    this.colorGen = colorGen;
    this.emptyCellColorGen = extendColorGen(colorGen(0), World.MaxColor);
    this.antCellColorGen = extendColorGen(colorGen(1), World.MaxColor);
    this.bodyColorGen = colorGen(2);
    this.headColorGen = colorGen(3);
    this.updateColors();
};

ViewGL.prototype.updateColors =
function updateColors() {
    if (this.colorGen == null) return;
    this.emptyCellColors = this.emptyCellColorGen(this.world.numColors);
    this.antCellColors = this.antCellColorGen(this.world.numColors);
    this.setColors(this.drawTrace ? this.emptyCellColors : this.antCellColors);
    this.bodyColors = this.bodyColorGen(this.world.ents.length);
    this.headColors = this.headColorGen(this.world.ents.length);
};

ViewGL.prototype.setLabeled =
function setLabeled(labeled) {
    // noop
};

ViewGL.prototype.setDrawUnvisited =
function setDrawUnvisited(drawUnvisited) {
    this.tileBufferer.drawUnvisited = drawUnvisited;
};

ViewGL.prototype.drawEnt =
function drawEnt(i) {
    // TODO
};

// TODO: smaller LOD draw{Cell,Ent} variants

ViewGL.prototype.step =
function step() {
    var expanded = false;
    for (var i = 0; i < this.world.ents.length; i++) {
        expanded = this.expandTo(this.world.getEntPos(i)) || expanded;
    }
    if (expanded) {
        this.updateSize();
    }
    this.needsRedraw = true;

    // TODO: consider restoring partial updates
};

function TileWriter(bufferSize) {
    this.bufferSize = bufferSize;
    this.vertSize = 4;
    this.colorSize = 3;
    this.cellSize = 6;
    this.maxCells = Math.floor(this.bufferSize / this.cellSize);
    if (this.maxCells < 1) {
        throw new Error("can't fit any tiles in that bufferSize");
    }
    this.elementsSize = this.cellSize * this.maxCells + 2 * (this.maxCells - 1);
    this.colors = null;
    this.colorValues = null;

    /* The vertex order in cellXYs is:
     *       2 1
     *     3     0
     *       4 5
     * So that means:
     * - the n-th x coord is at 2*n
     * - the n-th y coord is at 2*n+1
     */
    this.cellXYs = new Float32Array(12);
    for (var r = 0, i = 0, j = 0; i < 6; i++) {
        this.cellXYs[j++] = Math.cos(r);
        this.cellXYs[j++] = Math.sin(r);
        r += 2 * Math.PI / 6;
    }
    this.cellWidth  = this.cellXYs[2*0]   - this.cellXYs[2*3];
    this.cellHeight = this.cellXYs[2*1+1] - this.cellXYs[2*5+1];
    this.cellHalfWidth = this.cellWidth / 2;
    this.cellHalfHeight = this.cellHeight / 2;
}

TileWriter.prototype.setColors =
function setColors(colors) {
    this.colors = colors;
    this.colorValues = new Uint8Array(3 * colors.length);
    for (var i = 0, j = 0; i < colors.length; ++i) {
        var color = colors[i];
        this.colorValues[j++] = Math.round(255 * color[0]);
        this.colorValues[j++] = Math.round(255 * color[1]);
        this.colorValues[j++] = Math.round(255 * color[2]);
    }
};

TileWriter.prototype.newTileBuffer =
function newTileBuffer(id, gl) {
    var tileBuffer = new TileGLBuffer(id, this);
    tileBuffer.verts = new LazyGLBuffer(gl, gl.ARRAY_BUFFER, this.vertSize, new Float32Array(this.bufferSize * this.vertSize));
    tileBuffer.colors = new LazyGLBuffer(gl, gl.ARRAY_BUFFER, this.colorSize, new Uint8Array(this.bufferSize * this.colorSize));
    tileBuffer.elements = new GLBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, 1, new Uint16Array(this.elementsSize));
    tileBuffer.reset();
    return tileBuffer;
};

TileWriter.prototype.writeTileVerts =
function writeTileVerts(tile, tileBuffer, start) {
    // TODO: maybe use set/copyWithin to stamp out cellXYs
    var glData = tileBuffer.verts.data;
    var loQ = tile.origin.q;
    var loR = tile.origin.r;
    var hiQ = loQ + tile.width;
    var hiR = loR + tile.height;
    var vi = start * this.vertSize;
    var end = start;
    for (var r = loR; r < hiR; r++) {
        for (var q = loQ; q < hiQ; q++) {
            for (var xyi = 0; xyi < this.cellXYs.length;) {
                glData[vi++] = q;
                glData[vi++] = r;
                glData[vi++] = this.cellXYs[xyi++];
                glData[vi++] = this.cellXYs[xyi++];
                end++;
            }
        }
    }
    tileBuffer.verts.invalidate(start, end);
    return end;
};

TileWriter.prototype.writeTileColors =
function writeTileColors(tile, tileBuffer, start) {
    var glData = tileBuffer.colors.data;
    var ci = start * this.colorSize;
    var end = start;
    var c = new Uint8Array(3);
    for (var i = 0; i < tile.data.length; ++i) {
        var color = this.colors[tile.data[i] & World.MaskColor];
        c[0] = Math.round(255 * color[0]);
        c[1] = Math.round(255 * color[1]);
        c[2] = Math.round(255 * color[2]);
        for (var j = 0; j < this.cellSize; j++) {
            glData[ci++] = c[0];
            glData[ci++] = c[1];
            glData[ci++] = c[2];
            end++;
        }
    }
    tileBuffer.colors.invalidate(start, end);
    return end;
};

TileWriter.prototype.writeTileElements =
function writeTileElements(tileBuffer, tile, offset) {
    var glData = tileBuffer.elements.data;
    var ei = tileBuffer.usedElements;
    var prior = ei > 0 ? glData[ei-1] : 0;
    for (var i = 0; i < tile.data.length; ++i) {
        if (this.drawUnvisited || tile.data[i] & World.FlagVisited) {
            if (prior > 0) {
                glData[ei++] = prior;
                glData[ei++] = offset + 1;
            }
            glData[ei++] = offset + 1;
            glData[ei++] = offset + 2;
            glData[ei++] = offset;
            glData[ei++] = offset + 3;
            glData[ei++] = offset + 5;
            glData[ei++] = offset + 4;
            prior = offset + 4;
        }
        offset += 6;
    }
    tileBuffer.usedElements = ei;
};

function TileBufferer(gl, world, tileWriter) {
    var self = this;

    this.gl = gl;
    this.world = world;
    this.tileWriter = tileWriter;
    this.drawUnvisited = false;

    this.tileBuffers = [];
    this.bufferForTileId = {};
    this.dirtyTileBuffers = [];

    this.world.tile.tileRemoved = function onWorldTileRemoved(tile) {
        self.onWorldTileRemoved(tile);
    };
}

TileBufferer.prototype.reset =
function reset() {
    this.bufferForTileId = {};
    this.dirtyTileBuffers.length = 0;
    for (var i = 0; i < this.tileBuffers.length; ++i) {
        var tileBuffer = this.tileBuffers[i];
        tileBuffer.reset();
    }
};

TileBufferer.prototype.onWorldTileRemoved =
function onWorldTileRemoved(tile) {
    var bufferId = this.bufferForTileId[tile.id];
    if (bufferId !== undefined) {
        var tileBuffer = this.tileBuffers[bufferId];
        if (!tileBuffer) {
            throw new Error('got tileRemoved for an unknown tile');
        }
        tileBuffer.removeTile(tile.id);
        delete this.bufferForTileId[tile.id];
    }
};

TileBufferer.prototype.flush =
function flush() {
    for (var i = 0; i < this.world.tile.dirtyTiles.length; ++i) {
        var tile = this.world.tile.dirtyTiles[i];
        this.flushTile(tile);
    }
    this.world.tile.dirtyTiles.length = 0;
    for (var i = 0; i < this.dirtyTileBuffers.length; ++i) {
        var tileBuffer = this.dirtyTileBuffers[i];
        this.flushTileBuffer(tileBuffer);
    }
    this.dirtyTileBuffers.length = 0;
};

TileBufferer.prototype.flushTile =
function flushTile(tile) {
    var offset = -1;
    var tileBuffer = null;
    var bufferId = this.bufferForTileId[tile.id];
    if (bufferId !== undefined) {
        tileBuffer = this.tileBuffers[bufferId];
    }
    if (!tileBuffer) {
        for (var i = 0; i < this.tileBuffers.length; ++i) {
            tileBuffer = this.tileBuffers[i];
            offset = tileBuffer.addTile(tile.id, tile.data.length * this.tileWriter.cellSize);
            if (offset >= 0) {
                break;
            }
            tileBuffer = null;
        }
        if (!tileBuffer) {
            tileBuffer = this.tileWriter.newTileBuffer(this.tileBuffers.length, this.gl);
            this.tileBuffers.push(tileBuffer);
            offset = tileBuffer.addTile(tile.id, tile.data.length * this.tileWriter.cellSize);
            if (offset < 0) {
                throw new Error('unable to add tile to new tileBuffer');
            }
        }
        this.bufferForTileId[tile.id] = tileBuffer.id;

        this.tileWriter.writeTileVerts(tile, tileBuffer, offset);
    } else {
        offset = tileBuffer.tileOffset(tile.id);
        if (offset < 0) {
            throw new Error('dissociated tileBuffer.tiles -> tile');
        }
    }
    this.tileWriter.writeTileColors(tile, tileBuffer, offset);
    if (!tileBuffer.dirty) {
        tileBuffer.dirty = true;
        this.dirtyTileBuffers.push(tileBuffer);
    }
    tile.dirty = false;
};

TileBufferer.prototype.flushTileBuffer =
function flushTileBuffer(tileBuffer) {
    tileBuffer.verts.flush();
    tileBuffer.colors.flush();

    tileBuffer.usedElements = 0;
    for (var i = 0; i < tileBuffer.tiles.length; i+=2) {
        var tileId = tileBuffer.tiles[i];
        var tileLength = tileBuffer.tiles[i+1];
        if (tileId !== null) {
            var tile = this.world.tile.getTile(tileId);
            if (!tile) {
                throw new Error('missing tile');
            }
            this.tileWriter.writeTileElements(tileBuffer, tile, tileBuffer.tileOffset(tile.id));
        }
    }

    tileBuffer.elements.ship(0, tileBuffer.usedElements);
    tileBuffer.dirty = false;
};

function TileGLBuffer(id, tileWriter) {
    this.id = id;
    this.tileWriter = tileWriter;
    this.tiles = [];
    this.tileRanges = {};
    this.dirty = false;
    this.verts = null;
    this.colors = null;
    this.elements = null;
    this.usedElements = 0;
    this.capacity = 0;
}

TileGLBuffer.prototype.reset =
function reset() {
    this.tiles.length = 0;
    this.tileRanges = {};
    this.dirty = false;
    this.usedElements = 0;
    this.capacity = this.verts.data.length / this.verts.width;
};

TileGLBuffer.prototype.addTile =
function addTile(id, length) {
    var place = placeTile(this.tiles, this.capacity, length);
    var i = place[0], j = place[1]; // w = place[2]
    if (i < 0) {
        return -1;
    }
    if (i < this.tiles.length) {
        collectTombstone(this.tiles, i, length);
        this.tiles[i] = id;
    } else {
        this.tiles.push(id, length);
    }
    this.tileRanges[id] = [j, j + length];
    return j;
};

TileGLBuffer.prototype.removeTile =
function removeTile(id) {
    delete this.tileRanges[id];
    var i = 0, end = 0;
    for (; i < this.tiles.length; i += 2) {
        end += this.tiles[i+1];
        if (this.tiles[i] === id) {
            // set tombstone...
            this.tiles[i] = null;
            // ...prune trailing tombstones
            while (this.tiles[this.tiles.length - 2] === null) {
                this.tiles.length -= 2;
            }
            break;
        }
    }
};

TileGLBuffer.prototype.tileOffset =
function tileOffset(id) {
    var range = this.tileRanges[id];
    return range ? range[0] : -1;
};

function GLBuffer(gl, type, width, data) {
    this.gl = gl;
    this.type = type;
    this.width = width;
    this.data = data;
    this.buf = this.gl.createBuffer();
    this.gl.bindBuffer(this.type, this.buf);
    this.gl.bufferData(this.type, this.data.byteLength, this.gl.STATIC_DRAW);
}

GLBuffer.prototype.ship =
function ship(lo, hi) {
    var bytesOffset = this.data.BYTES_PER_ELEMENT * lo * this.width;
    var byteLength = (hi - lo) * this.width;
    var subData = new this.data.constructor(this.data.buffer, bytesOffset, byteLength);
    this.gl.bindBuffer(this.type, this.buf);
    this.gl.bufferSubData(this.type, bytesOffset, subData);
};

function LazyGLBuffer(gl, type, width, data) {
    this.inval = [];
    GLBuffer.call(this, gl, type, width, data);
}

LazyGLBuffer.prototype.invalidate =
function invalidate(lo, hi) {
    rangeListAdd(this.inval, lo, hi);
};

LazyGLBuffer.prototype.flush =
function flush() {
    if (!this.inval.length) {
        return;
    }
    this.gl.bindBuffer(this.type, this.buf);
    var i = 0;
    while (i < this.inval.length) {
        var lo = this.inval[i++] * this.width;
        var hi = this.inval[i++] * this.width;
        var bytesOffset = this.data.BYTES_PER_ELEMENT * lo;
        var subData = new this.data.constructor(this.data.buffer, bytesOffset, hi - lo);
        this.gl.bufferSubData(this.type, bytesOffset, subData);
    }
    this.inval.length = 0;
};

function extendColorGen(gen, n) {
    return function extendedColorGen(m) {
        var ar = gen(m);
        m = ar.length;
        if (!m) return ar;
        while (ar.length <= n) ar.push(ar[ar.length % m]);
        return ar;
    };
}
