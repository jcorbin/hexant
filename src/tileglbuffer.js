// @ts-check

import {
  add as rangeListAdd,
  each as rangeListEach,
} from './rangelist.js';
/** @typedef {import('./rangelist.js').RangeList} RangeList */

/**
 * @typedef {Int8Array|Uint8Array|Uint8ClampedArray|Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array|Float64Array} someTypedArray
 */

// TODO would be nice to generalize this beyond the fixed verts/colors attributes

export class TileGLBuffer {
  /**
   * @param {number} id
   * @param {GLBuffer} elements
   * @param {LazyGLBuffer} verts
   * @param {LazyGLBuffer} colors
   */
  constructor(id, elements, verts, colors) {
    this.id = id;
    /** @type {BufferIndex} */
    this.index = [];
    /** @type {Map<number, [begin: number, end: number]>} */
    this.tileRanges = new Map();
    this.usedElements = 0;
    this.elements = elements;
    this.verts = verts;
    this.colors = colors;
  }

  get capacity() {
    return Math.min(
      this.verts.capacity,
      this.colors.capacity,
    );
  }

  reset() {
    this.index.length = 0;
    this.tileRanges.clear();
    this.usedElements = 0;
  }

  /** @param {number} offset */
  addElement(offset) {
    this.elements.data[this.usedElements++] = offset;
  }

  flush() {
    this.verts.flush();
    this.colors.flush();
    this.shipElements();
  }

  shipElements() {
    this.elements.ship(0, this.usedElements);
  }

  /**
   * @param {number} id
   * @param {number} length
   */
  addTile(id, length) {
    const { index, tileRanges, capacity } = this;
    const [i, j/*,  w */] = placeTile(index, capacity, length);
    if (i < 0) {
      return -1;
    }

    if (i < index.length) {
      scavengeTombstone(index, i, length);
      index[i] = id;
    } else {
      index.push(id, length);
    }
    tileRanges.set(id, [j, j + length]);
    return j;
  }

  /** @param {number} id */
  removeTile(id) {
    const { index, tileRanges } = this;
    tileRanges.delete(id);
    for (let i = 0; i < index.length; i += 2) {
      if (index[i] === id) {
        // set tombstone...
        index[i] = 0;
        // ...prune trailing tombstones
        while (index[index.length - 2] === 0) {
          index.length -= 2;
        }
        break;
      }
    }
  }

  /** @param {number} id */
  tileOffset(id) {
    const range = this.tileRanges.get(id);
    return range ? range[0] : -1;
  }
}

export class GLBuffer {
  /**
   * @param {WebGLRenderingContext} gl
   * @param {number} target
   * @param {number} width
   * @param {someTypedArray} data
   */
  constructor(gl, target, width, data) {
    this.gl = gl;
    this.target = target;
    this.width = width;
    this.data = data;
    this.buf = this.gl.createBuffer();
    this.gl.bindBuffer(this.target, this.buf);
    this.gl.bufferData(this.target, this.data, gl.STATIC_DRAW);
  }

  get capacity() {
    return this.data.length / this.width;
  }

  /**
   * @param {number} lo
   * @param {number} hi
   */
  ship(lo, hi) {
    const { gl, target, buf, data, width } = this;
    const begin = lo * width, end = hi * width;
    gl.bindBuffer(target, buf);
    gl.bufferSubData(target,
      begin * data.BYTES_PER_ELEMENT,
      data.subarray(begin, end));
  }
}

export class LazyGLBuffer extends GLBuffer {
  /**
   * @param {WebGLRenderingContext} gl
   * @param {number} target
   * @param {number} width
   * @param {someTypedArray} data
   */
  constructor(gl, target, width, data) {
    super(gl, target, width, data);
    /** @type {RangeList} */
    this.inval = [];
  }

  /**
   * @param {number} lo
   * @param {number} hi
   */
  invalidate(lo, hi) {
    rangeListAdd(this.inval, lo, hi);
  }

  flush() {
    const { gl, inval, target, buf, data, width } = this;
    if (!inval.length) {
      return;
    }
    gl.bindBuffer(target, buf);
    for (const { begin, end } of rangeListEach(inval)) {
      const i = begin * width;
      const j = end * width;
      gl.bufferSubData(target, data.BYTES_PER_ELEMENT * i, data.subarray(i, j));
    }
    inval.length = 0;
  }
}

// TODO: unexport placeTile and scavengeTombstone once we can expand the test horizon past them

/** BufferIndex is a stride-2 array of [tileId, length] pairs, used to allot gl
 * buffer space to tiles of varying sizes.
 *
 * @typedef {number[]} BufferIndex
 */

/** placeTile returns the best place for a tile of length elements within the
 * an indexed buffer. Attempts to re-use any tombstoned prior allotments before
 * alloting at the end of buffer, but only if doing so would waste less buffer
 * space.
 *
 * @param {BufferIndex} index
 * @param {number} capacity - of the underlying buffer
 * @param {number} length - of the tile to place
 * @returns {[i: number, offset: number, waste: number]} - i in index, offset
 * in the underlying buffer, waste is a minmized fragmentation metric
 */
export function placeTile(index, capacity, length) {
  let bestIndex = -1, bestOffset = -1, best = -1;
  let offset = 0;

  let freeIndex = -1, freeOffset = -1, freeLength = 0;
  for (let i = 0; i < index.length; i += 2) {
    const tileId = index[i];
    const tileLength = index[i + 1];
    if (!tileId) {
      if (freeLength === 0) {
        freeIndex = i;
        freeOffset = offset;
      }
      freeLength += tileLength;
      if (length <= freeLength) {
        const waste = freeLength - length;
        if (best < 0 || waste < best) {
          bestIndex = freeIndex;
          bestOffset = freeOffset;
          best = waste;
        }
      }
    } else if (freeLength !== 0) {
      freeIndex = -1;
      freeOffset = -1;
      freeLength = 0;
    }
    offset += tileLength;
  }

  const free = capacity - offset;
  if (length <= free) {
    const waste = free - length;
    if (best < 0 || waste < best) {
      bestIndex = index.length;
      bestOffset = offset;
      best = waste;
    }
  }

  return [bestIndex, bestOffset, best];
}

/** scavenge space from a prior allotment that has been tombstoned.
 * Any remnant space is placed in a new sucessor tombstone for future allotment.
 *
 * @param {BufferIndex} index
 * @param {number} i
 * @param {number} length
 */
export function scavengeTombstone(index, i, length) {
  if (index[i]) {
    throw new Error('not a tombstone');
  }

  let tileLength = index[i + 1];
  index[i + 1] = length;

  // coalesce range; we assume that we've been told an index of a usable set
  // of tombstones, and so don't range check here
  let j = i + 2, k;
  let spare = 0;
  for (; tileLength < length; j += 2) {
    tileLength += index[j + 1];
    spare += 2;
  }

  // truncate (finish any coalesce)
  if (spare > 0) {
    k = i + 2;
    while (j < index.length) {
      index[k++] = index[j++];
    }
    j = i + 2;
  }

  // distribute leftover
  if (length < tileLength) {
    const remain = tileLength - length;
    if (!index[j]) {
      // easy, give it to the next tombstone
      index[j + 1] += remain;
    } else {
      // split into new tombstone
      let n = index.length - j;
      if (spare >= 2) {
        spare -= 2;
      } else {
        index.push(0, 0);
      }
      k = index.length - 1;
      for (; n-- > 0; k--) index[k] = index[k - 2];
      index[j] = 0;
      index[j + 1] = remain;
    }
  }

  index.length -= spare;
}
