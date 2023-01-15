// @ts-check

import { mat4 } from 'gl-matrix';

import { OddQBox } from './coord.js';
import { GLProgram } from './glprogram.js';
import { GLPalette } from './glpalette.js';
import * as rezult from './rezult.js';
import {
  GLBuffer,
  LazyGLBuffer,
  TileGLBuffer,
} from './tileglbuffer.js';
import { World } from './world.js';

// TODO how to get these resolved for type checking?
// @ts-ignore
import oddqPointShader from './oddq_point.js';
// @ts-ignore
import hexFragShader from './hex.js';

/** @typedef {import('./colorgen.js').ColorGenMaker} ColorGenMaker */
/** @typedef {import('./colorgen.js').ColorGen} ColorGen */
/** @typedef {import('./hextile.js').OddQHexTile} OddQHexTile */

// TODO:
// - in redraw lazily only draw dirty tiles, expand permitting
// - switch to uint32 elements array if supported by extension
// - switch to uint32 for q,r, use a highp in the shader

const tau = 2 * Math.PI;
const hexAngStep = tau / 6;
const float2 = 2 * Float32Array.BYTES_PER_ELEMENT;

export class ViewGL {

  /**
   * @param {World} world
   * @param {HTMLCanvasElement} $canvas
   */
  constructor(world, $canvas) {
    // TODO can we get away with not getting/retaining a world reference, and
    // just do with what get passed in through the world -> view surface?
    // i.e. move from `world -> view(world) + view -> world` to `world -(components)> view`

    this.world = world;
    this.$canvas = $canvas;

    this.bounds = new OddQBox();

    // max uint16 value for elements:
    // TODO: may be able to use uint32 extension
    // TODO: platform may define max in that case? (i.e. it would seem unlikely
    // that we can actually use a full 4Gi vert attribute, let alone that we
    // really don't want to allocate the 224GiB vert + color arrays that it
    // would imply
    this.maxElement = 0xffff;

    this.gl = this.$canvas.getContext('webgl') || null;
    if (!this.gl) {
      throw new Error('no webgl support');
    }

    this.perspectiveMatrix = mat4.identity(new Float32Array(16));

    // TODO refactor GLProgram to just take a variadic list of shaders, and own
    // the linking, rather than the shader linked-list deal it is currently

    // TODO refactor GLSLShader so that each shader carries data about its
    // uniforms and attributes; provide that data by analyzing source in the
    // loader

    // TODO @type only needed because import is not resolvable by typescript above
    const shader = oddqPointShader.linkWith(hexFragShader);
    const prog = rezult.toValue(shader.load(this.gl));

    this.hexShader = new GLProgram(this.gl,
      prog,
      ['uPMatrix', 'uVP', 'uRadius'],
      ['vert', 'ang', 'color']
    );
    this.uSampler = this.gl.getUniformLocation(this.hexShader.prog, 'uSampler'); // TODO: GLProgram borg
    if (!this.uSampler) {
      throw new Error('missing uSampler uniform');
    }

    this.tileWriter = new TileWriter(this.maxElement + 1);
    // TODO tileBufferer should only need access to the tile storage system, not the entire world
    this.tileBufferer = new TileBufferer(this.gl, this.world, this.tileWriter);
    this.entBuffer = new EntGLBuffer(this.gl);
    this.maxCellsPerTile = Math.floor((this.maxElement + 1) / this.tileWriter.cellSize);

    this.cellPallete = new GLPalette(this.gl, { unit: 0 });
    this.bodyPallete = new GLPalette(this.gl, { unit: 1 });
    this.headPallete = new GLPalette(this.gl, { unit: 2 });

    /** @type {ColorGen|null} */
    this.antCellColorGen = null;
    /** @type {ColorGen|null} */
    this.emptyCellColorGen = null;
    /** @type {ColorGen|null} */
    this.bodyColorGen = null;
    /** @type {ColorGen|null} */
    this.headColorGen = null;

    this.needsRedraw = false;

    this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
    this.hexShader.use();

    this.gl.uniform1f(this.hexShader.uniform.uRadius, 1);

    this.updateSize(); // XXX: drop?
  }

  reset() {
    const {
      tileBufferer,
      bounds,
      world,
    } = this;
    tileBufferer.reset();
    bounds.topLeft.q = 0, bounds.topLeft.r = 0;
    bounds.bottomRight.q = 0, bounds.bottomRight.r = 0;
    bounds.expandToBox(world.visitedBounds);
    world.tile.eachTile(tileBufferer.drawUnvisited
      ? tile => bounds.expandToBox(tile.bounds())
      : tile => bounds.expandToBox(tile.boundsIf(World.FlagVisited)));
    this.updateSize();
  }

  updateSize() {
    const {
      gl,
      hexShader: {
        uniform: { uVP, uPMatrix },
      },
      perspectiveMatrix,
      $canvas: { width, height },
      tileWriter: {
        cellHalfWidth: rx,
        cellHalfHeight: ry,
      },
      bounds,
    } = this;

    gl.viewport(0, 0, width, height);
    gl.uniform2f(uVP, width, height);

    let { x: topX, y: topY } = bounds.topLeft.toScreen();
    let { x: botX, y: botY } = bounds.bottomRight.toScreen();
    topX -= rx, topY -= ry;
    botX += rx, botY += ry;

    // TODO: sometimes over tweaks, but only noticable at small scale
    const oddEnough = (bounds.bottomRight.q - bounds.topLeft.q) > 0;
    if (bounds.topLeft.q & 1) {
      topY -= ry;
    }
    if (bounds.bottomRight.q & 1 || oddEnough) {
      botY += ry;
    }

    // fixAspectRatio
    const aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    const gridWidth = botX - topX;
    const gridHeight = botY - topY;
    const ratio = gridWidth / gridHeight;
    if (ratio < aspectRatio) {
      const dx = gridHeight * aspectRatio / 2 - gridWidth / 2;
      topX -= dx, botX += dx;
    } else if (ratio > aspectRatio) {
      const dy = gridWidth / aspectRatio / 2 - gridHeight / 2;
      topY -= dy, botY += dy;
    }

    mat4.ortho(perspectiveMatrix, topX, botX, botY, topY, -1, 1);
    gl.uniformMatrix4fv(uPMatrix, false, perspectiveMatrix);
  }

  /** @param {boolean} should */
  setDrawTrace(should) {
    this.drawTrace = should;
    this.updateColors();
  }

  /**
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    const { $canvas } = this;
    $canvas.width = width;
    $canvas.height = height;
    this.updateSize();
    this.redraw();
  }

  redraw() {
    if (this.bounds.expandToBox(this.world.visitedBounds))
      this.updateSize();

    const { gl, hexShader } = this;
    gl.clear(gl.COLOR_BUFFER_BIT);

    hexShader.enable();
    this.drawTiles();
    this.drawEntities();
    hexShader.disable();

    gl.finish();
    this.needsRedraw = false;
  }

  drawTiles() {
    const {
      gl,
      hexShader: {
        attr: {
          ang: angAttr,
          vert: vertAttr,
          color: colorAttr,
        },
        uniform: { uRadius },
      },
      uSampler,
      cellPallete,
      tileBufferer,
    } = this;

    // flush changed tile data to buffers
    tileBufferer.flush();

    gl.uniform1f(uRadius, 1.0);

    // tiles are full hexes without an ang attribute
    gl.disableVertexAttribArray(angAttr);

    cellPallete.use(uSampler);

    // draw all tiles
    for (const { index, verts, colors, elements, usedElements } of tileBufferer.tileBuffers) {
      if (index.length) {
        gl.bindBuffer(gl.ARRAY_BUFFER, verts.buf);
        gl.vertexAttribPointer(vertAttr, verts.width, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, colors.buf);
        gl.vertexAttribPointer(colorAttr, colors.width, gl.UNSIGNED_BYTE, true, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elements.buf);
        gl.drawElements(gl.POINTS, usedElements, gl.UNSIGNED_SHORT, 0);
      }
    }
  }

  drawEntities() {
    const {
      gl,
      hexShader: {
        attr: {
          ang: angAttr,
          vert: vertAttr,
          color: colorAttr,
        },
        uniform: { uRadius },
      },
      uSampler,
      bodyPallete, headPallete,
      entBuffer,
      world: { ents },
    } = this;

    if (!ents.length) {
      return;
    }

    // extract world entity data
    const poss = ents.map(({ pos }) => pos);
    const dirs = ents.map(({ dir }) => dir);
    entBuffer.ensureLen(ents.length);

    // head and body are partial hexes with an ang attribute
    gl.enableVertexAttribArray(angAttr);

    // lay down entity color palette indices
    setNumbers(entBuffer.colors, function*() {
      // TODO ent color scheme beyond monotonic
      for (let i = 0; i < poss.length; i++) {
        yield i;
      }
    }());

    // lay down entity positions and body arcs
    setNumbers(entBuffer.verts, function*() {
      for (const [{ q, r }, dir] of zip(poss, dirs)) {
        yield q; yield r;
        const ang = dir * hexAngStep;
        yield ang + hexAngStep; yield ang;
      }
    }());

    // draw entity bodies
    bodyPallete.use(uSampler);
    gl.uniform1f(uRadius, 0.5);
    gl.bindBuffer(gl.ARRAY_BUFFER, entBuffer.bodyVertsBuf);
    gl.bufferData(gl.ARRAY_BUFFER, entBuffer.verts, gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertAttr, 2, gl.FLOAT, false, float2, 0);
    gl.vertexAttribPointer(angAttr, 2, gl.FLOAT, false, float2, float2);
    gl.bindBuffer(gl.ARRAY_BUFFER, entBuffer.bodyColorsBuf);
    gl.bufferData(gl.ARRAY_BUFFER, entBuffer.colors, gl.STATIC_DRAW);
    gl.vertexAttribPointer(colorAttr, 1, gl.UNSIGNED_BYTE, true, 0, 0);
    gl.drawArrays(gl.POINTS, 0, entBuffer.len);

    // lay down entity head co-arcs
    setStridedNumbers(entBuffer.verts, 2, 4, function*() {
      for (const dir of dirs) {
        const ang = dir * hexAngStep;
        yield ang; yield ang + hexAngStep;
      }
    }());

    // draw entity heads
    headPallete.use(uSampler);
    gl.uniform1f(uRadius, 0.75);
    gl.bindBuffer(gl.ARRAY_BUFFER, entBuffer.headVertsBuf);
    gl.bufferData(gl.ARRAY_BUFFER, entBuffer.verts, gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertAttr, 2, gl.FLOAT, false, float2, 0);
    gl.vertexAttribPointer(angAttr, 2, gl.FLOAT, false, float2, float2);
    gl.bindBuffer(gl.ARRAY_BUFFER, entBuffer.headColorsBuf);
    gl.bufferData(gl.ARRAY_BUFFER, entBuffer.colors, gl.STATIC_DRAW);
    gl.vertexAttribPointer(colorAttr, 1, gl.UNSIGNED_BYTE, true, 0, 0);
    gl.drawArrays(gl.POINTS, 0, entBuffer.len);
  }

  updateEnts() { this.updateColors(); }

  /** @param {ColorGenMaker} colorGenMaker */
  setColorGen(colorGenMaker) {
    const { makeColorGen } = colorGenMaker;
    this.emptyCellColorGen = extendColorGen(makeColorGen(0), World.MaxColor);
    this.antCellColorGen = extendColorGen(makeColorGen(1), World.MaxColor);
    this.bodyColorGen = makeColorGen(2);
    this.headColorGen = makeColorGen(3);
    this.updateColors();
  }

  updateColors() {
    const {
      drawTrace,
      world: { ents, numColors },
      cellPallete, emptyCellColorGen, antCellColorGen,
      bodyPallete, bodyColorGen,
      headPallete, headColorGen,
    } = this;
    const cellGen = drawTrace ? emptyCellColorGen : antCellColorGen;
    if (cellGen) {
      cellPallete.setColorsRGB(cellGen(numColors));
    }
    if (bodyColorGen) {
      bodyPallete.setColorsRGB(bodyColorGen(ents.length));
    }
    if (headColorGen) {
      headPallete.setColorsRGB(headColorGen(ents.length));
    }
  }

  get drawUnvisited() {
    return this.tileBufferer.drawUnvisited;
  }
  set drawUnvisited(drawUnvisited) {
    this.tileBufferer.drawUnvisited = drawUnvisited;
  }

  step() {
    this.needsRedraw = true;
  }
}

class EntGLBuffer {
  /** @param {WebGLRenderingContext} gl */
  constructor(gl) {
    this.gl = gl;
    this.len = 0;
    this.cap = 0;

    /** @type {Float32Array|null} */
    this.verts = null;
    /** @type {Uint8Array|null} */
    this.colors = null;

    /** @type {WebGLBuffer|null} */
    this.bodyVertsBuf = null;
    /** @type {WebGLBuffer|null} */
    this.bodyColorsBuf = null;

    /** @type {WebGLBuffer|null} */
    this.headVertsBuf = null;
    /** @type {WebGLBuffer|null} */
    this.headColorsBuf = null;
  }

  free() {
    const { gl } = this;
    this.verts = null;
    this.colors = null;
    gl.deleteBuffer(this.bodyVertsBuf);
    gl.deleteBuffer(this.bodyColorsBuf);
    gl.deleteBuffer(this.headVertsBuf);
    gl.deleteBuffer(this.headColorsBuf);
  }

  /** @param {number} cap */
  alloc(cap) {
    this.cap = cap;
    this.verts = new Float32Array(this.cap * 4);
    this.colors = new Uint8Array(this.cap * 1);
    this.bodyVertsBuf = this.gl.createBuffer();
    this.bodyColorsBuf = this.gl.createBuffer();
    this.headVertsBuf = this.gl.createBuffer();
    this.headColorsBuf = this.gl.createBuffer();
  }

  /** @param {number} len */
  ensureLen(len) {
    if (len > this.cap) {
      if (this.cap > 0) {
        this.free();
      }
      this.alloc(len < 1024
        ? 2 * len
        : len + Math.floor(len / 4));
    }
    this.len = len;
  }
}

class TileWriter {
  /** @param {number} bufferSize */
  constructor(bufferSize) {
    this.bufferSize = bufferSize;
    this.vertSize = 2;
    this.colorSize = 1;
    this.cellSize = 1;
    this.maxCells = Math.floor(this.bufferSize / this.cellSize);
    if (this.maxCells < 1) {
      throw new Error("can't fit any tiles in that bufferSize");
    }
    this.elementsSize = this.cellSize * this.maxCells + 2 * (this.maxCells - 1);
    this.colors = null;

    // Flat-topped vertices indexed by 2 * Math.PI * i / 6:
    //     2 1
    //   3     0
    //     4 5
    this.cellWidth = Math.cos(0) - Math.cos(Math.PI);
    this.cellHeight =
      Math.sin(2 * Math.PI / 6) -
      Math.sin(2 * Math.PI * 5 / 6);
    this.cellHalfWidth = this.cellWidth / 2;
    this.cellHalfHeight = this.cellHeight / 2;
  }

  /**
   * @param {number} id
   * @param {WebGLRenderingContext} gl
   */
  newTileBuffer(id, gl) {
    const { elementsSize, bufferSize, vertSize, colorSize } = this;
    return new TileGLBuffer(id,
      new GLBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, 1, new Uint16Array(elementsSize)),
      new LazyGLBuffer(gl, gl.ARRAY_BUFFER, vertSize, new Float32Array(bufferSize * vertSize)),
      new LazyGLBuffer(gl, gl.ARRAY_BUFFER, colorSize, new Uint8Array(bufferSize * colorSize)),
    );
  }

  /**
   * @param {OddQHexTile} tile
   * @param {TileGLBuffer} tileBuffer
   * @param {number} start
   */
  writeTileVerts({ data, origin, width, height }, { verts }, start) {
    if (!data) { return }
    setNumbers(verts.data.subarray(start * this.vertSize), function*() {
      const { q: loQ, r: loR } = origin;
      const hiQ = loQ + width;
      const hiR = loR + height;
      for (let r = loR; r < hiR; r++) {
        for (let q = loQ; q < hiQ; q++) {
          yield q;
          yield r;
        }
      }
    }());
    const end = start + width * height;
    verts.invalidate(start, end);
    return end;
  }

  /**
   * @param {OddQHexTile} tile
   * @param {TileGLBuffer} tileBuffer
   * @param {number} start
   */
  writeTileColors({ data }, { colors }, start) {
    if (!data) { return }
    setNumbers(colors.data.subarray(start * this.colorSize), function*() {
      for (const datum of data) {
        yield datum & World.MaskColor;
      }
    }());
    const end = start + data.length;
    colors.invalidate(start, end);
    return end;
  }
}

class TileBufferer {
  /**
   * @param {WebGLRenderingContext} gl
   * @param {World} world
   * @param {TileWriter} tileWriter
   */
  constructor(gl, world, tileWriter) {
    this.gl = gl;
    this.world = world;
    this.tileWriter = tileWriter;
    this.drawUnvisited = false;

    /** @type {TileGLBuffer[]} */
    this.tileBuffers = [];

    /** @type {Map<number, number>} */
    this.bufferForTileId = new Map();

    /** @type {Set<number>} */
    this.dirtyTileBuffers = new Set();

    // TODO this is a singular callback... that'll never work for more than one view...
    this.world.tile.tileRemoved = tile => this.onWorldTileRemoved(tile);
  }

  reset() {
    const {
      bufferForTileId,
      dirtyTileBuffers,
      tileBuffers,
    } = this;
    bufferForTileId.clear();
    dirtyTileBuffers.clear();
    for (const tileBuffer of tileBuffers) {
      tileBuffer.reset();
    }
  }

  /** @param {OddQHexTile} tile */
  onWorldTileRemoved(tile) {
    const {
      bufferForTileId,
      tileBuffers,
    } = this;
    const bufferId = bufferForTileId.get(tile.id);
    if (bufferId !== undefined) {
      const tileBuffer = tileBuffers[bufferId];
      if (!tileBuffer) {
        throw new Error('got tileRemoved for an unknown tile');
      }
      tileBuffer.removeTile(tile.id);
      bufferForTileId.delete(tile.id);
    }
  }

  flush() {
    const {
      world: { tile: { dirtyTiles } },
      dirtyTileBuffers,
      tileBuffers,
    } = this;
    for (const tile of dirtyTiles) {
      this.flushTile(tile);
    }
    dirtyTiles.length = 0;

    for (const id of dirtyTileBuffers) {
      const tileBuffer = tileBuffers[id];
      this.flushTileBuffer(tileBuffer);
    }
    dirtyTileBuffers.clear();
  }

  /** @param {OddQHexTile} tile */
  flushTile(tile) {
    const {
      dirtyTileBuffers,
      tileWriter,
    } = this;
    const { tileBuffer, offset } = this.bufferFor(tile);
    tileWriter.writeTileVerts(tile, tileBuffer, offset);
    tileWriter.writeTileColors(tile, tileBuffer, offset);
    dirtyTileBuffers.add(tileBuffer.id);
    tile.dirty = false;
  }

  /**
   * @param {OddQHexTile} tile
   * @returns {{tileBuffer: TileGLBuffer, offset: number}}
   */
  bufferFor(tile) {
    if (!tile.data) {
      throw new Error('unallocated tile will not be assigned a buffer');
    }

    const {
      gl,
      bufferForTileId,
      tileWriter,
      tileBuffers,
    } = this;

    const bufferId = bufferForTileId.get(tile.id);
    if (bufferId !== undefined) {
      const tileBuffer = tileBuffers[bufferId];
      const offset = tileBuffer.tileOffset(tile.id);
      if (offset < 0) {
        throw new Error('dissociated tileBuffer.tiles -> tile');
      }
      return { tileBuffer, offset };
    }

    for (const tileBuffer of tileBuffers) {
      const offset = tileBuffer.addTile(tile.id, tile.data.length * tileWriter.cellSize);
      if (offset >= 0) {
        bufferForTileId.set(tile.id, tileBuffer.id);
        return { tileBuffer, offset };
      }
    }

    const tileBuffer = tileWriter.newTileBuffer(tileBuffers.length, gl);
    tileBuffers.push(tileBuffer);
    const offset = tileBuffer.addTile(tile.id, tile.data.length * tileWriter.cellSize);
    if (offset < 0) {
      throw new Error('unable to add tile to new tileBuffer');
    }
    bufferForTileId.set(tile.id, tileBuffer.id);
    return { tileBuffer, offset };
  }

  /** @param {TileGLBuffer} tileBuffer */
  flushTileBuffer(tileBuffer) {
    const { world, drawUnvisited } = this;
    tileBuffer.usedElements = 0;
    for (const tileId of tileBuffer.tileRanges.keys()) {
      const tile = world.tile.getTile(tileId);
      if (!tile) {
        throw new Error(`tile #${tileId} missing in buffer #${tileBuffer.id}`);
      }
      if (!tile.data) {
        throw new Error(`tile #${tileId} has no data for buffer #${tileBuffer.id}`);
      }
      let offset = tileBuffer.tileOffset(tile.id);
      for (const datum of tile.data) {
        if (drawUnvisited || datum & World.FlagVisited) {
          tileBuffer.addElement(offset);
        }
        offset++;
      }
    }
    tileBuffer.flush();
  }
}

/**
 * @param {ColorGen} gen
 * @param {number} n
 * @returns {ColorGen}
 */
function extendColorGen(gen, n) {
  return function*(m) {
    const ar = [...gen(m)];
    m = ar.length;
    if (!m) return;
    yield* ar;
    for (let i = ar.length; i < n; i++) {
      yield ar[i % ar.length];
    }
  };
}

/** @template A, B
 * @param {ArrayLike<A>} a
 * @param {ArrayLike<B>} b
 */
function* zip(a, b) {
  for (let i = 0; i < a.length && i < b.length; i++) {
    yield /** @type {[A, B]} */([a[i], b[i]]);
  }
}

/**
 * @param {{readonly length: number, [index: number]: number}|null} ar
 * @param {Iterable<number>} ns
 */
function setNumbers(ar, ns) {
  const length = ar?.length;
  if (!length) {
    return;
  }
  let i = 0;
  for (const n of ns) {
    ar[i] = n;
    if (++i >= length) { return; }
  }
}

/**
 * @param {{readonly length: number, [index: number]: number}|null} ar
 * @param {number} offset
 * @param {number} stride
 * @param {Iterable<number>} ns
 */
function setStridedNumbers(ar, offset, stride, ns) {
  const length = ar?.length;
  if (!length) {
    return;
  }
  let i = offset;
  for (const n of ns) {
    ar[i] = n;
    if (++i >= length) { return; }
    if (i % stride == 0) {
      i += offset;
    }
  }
}
