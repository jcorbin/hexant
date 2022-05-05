// @ts-check

'use strict';

import {
  OddQOffset,
  OddQBox,
} from './coord.js';

import { makePool } from './pool.js';

/**
 * @typedef {object} oddQPotent
 * @prop {(oqo: OddQOffset) => void} toOddQOffsetInto
 */

export class OddQHexTile {
  static NextId = 1;

  static {
    const { alloc, free } = makePool(() => new OddQHexTile());
    this.alloc = alloc;
    this.free = free;
    this.prototype.free = function() { free(this) };
  }

  free() { }

  constructor() {
    this.id = OddQHexTile.NextId++;
    this.origin = new OddQOffset();
    this.oqo = new OddQOffset();
    this.width = 0;
    this.height = 0;
    /** @type {null|Uint16Array} */
    this.data = null;
    this.dirty = false;
  }

  /**
   * @param {oddQPotent} origin
   * @param {number} width
   * @param {number} height
   */
  init(origin, width, height) {
    const need = width * height;
    const needBytes = need * Uint16Array.BYTES_PER_ELEMENT;
    origin.toOddQOffsetInto(this.origin);
    this.width = width;
    this.height = height;
    if (this.data === null || this.data.buffer.byteLength < needBytes) {
      this.data = new Uint16Array(need);
    } else {
      if (this.data.length !== need) {
        this.data = new Uint16Array(this.data.buffer, 0, need);
      }
      this.data.fill(0);
    }
    this.dirty = false;
    return this;
  }

  boundingBox() {
    const { origin, width, height } = this;
    return new OddQBox(origin, origin.copy().addTo(width, height));
  }

  centerPoint() {
    const { origin, width, height } = this;
    return new OddQOffset(
      origin.q + Math.floor(width / 2),
      origin.r + Math.floor(height / 2)
    );
  }

  /**
   * @param {oddQPotent} point
   */
  pointToIndex(point) {
    const { oqo, origin, width } = this;
    point.toOddQOffsetInto(oqo);
    return (oqo.r - origin.r) * width +
      (oqo.q - origin.q);
  }

  /**
   * @param {oddQPotent} point
   * @param {(datum: number, point: oddQPotent) => number} func
   * @returns {number}
   */
  update(point, func) {
    const { data } = this;
    if (!data) {
      return NaN;
    }
    const i = this.pointToIndex(point);
    const datum = func(orNaN(data[i]), point);
    data[i] = datum;
    return datum;
  }

  /**
   * @param {oddQPotent} point
   * @returns {number}
   */
  get(point) {
    const { data } = this;
    return data ? orNaN(data[this.pointToIndex(point)]) : NaN;
  }

  /**
   * @param {oddQPotent} point
   * @param {number} datum
   * @returns {number}
   */
  set(point, datum) {
    const { data } = this;
    if (data) {
      data[this.pointToIndex(point)] = datum;
    }
    return datum;
  }

  /** @param {(tile: OddQHexTile) => void} each */
  eachTile(each) {
    each(this);
  }

  /** @param {(point: OddQOffset, datum: number) => void} each */
  eachDataPoint(each) {
    const {
      oqo: point,
      origin: { q: loQ, r: loR },
      width, height, data,
    } = this;
    if (data) {
      const hiQ = loQ + width;
      const hiR = loR + height;
      let i = 0;
      for (point.r = loR; point.r < hiR; point.r++) {
        for (point.q = loQ; point.q < hiQ; point.q++, i++) {
          each(point, orNaN(data[i]));
        }
      }
    }
  }

  /**
   * @param {OddQOffset} tl
   * @param {OddQOffset} br
   */
  expandBoxTo(tl, br) {
    const {
      origin: { q: tlq, r: tlr },
      width, height,
    } = this;
    const brq = tlq + width;
    const brr = tlr + height;
    if (isNaN(tl.q) || isNaN(tl.r) || isNaN(br.q) || isNaN(br.r)) {
      tl.q = tlq;
      tl.r = tlr;
      br.q = brq;
      br.r = brr;
    } else {
      if (tlq < tl.q) tl.q = tlq;
      if (tlr < tl.r) tl.r = tlr;
      if (brq > br.q) br.q = brq;
      if (brr > br.r) br.r = brr;
    }
  }

  /**
   * @param {OddQOffset} tl
   * @param {OddQOffset} br
   * @param {number} mask
   */
  expandBoxToIf(tl, br, mask) {
    const { data, width, origin: { q: oq } } = this;
    let { origin: { q, r } } = this, i = 0;
    if (!data) {
      return;
    }

    // if any part of the box isn't defined, initialize from the first masked
    // point
    if (isNaN(tl.q) || isNaN(tl.r) || isNaN(br.q) || isNaN(br.r)) {
      while (i < data.length) {
        if (orNaN(data[i]) & mask) {
          tl.q = q;
          br.q = q;
          tl.r = r;
          br.r = r;
          break;
        }
        i++;
        q++;
        if (q >= oq + width) {
          q = oq;
          r++;
        }
      }
    }

    // now just expand to each masked point
    while (i < data.length) {
      if (orNaN(data[i]) & mask) {
        if (q < tl.q) {
          tl.q = q;
        } else if (q >= br.q) {
          br.q = q;
        }
        if (r < tl.r) {
          tl.r = r;
        } else if (r >= br.r) {
          br.r = r;
        }
      }
      i++;
      q++;
      if (q >= oq + width) {
        q = oq;
        r++;
      }
    }
  }

  *dump() {
    const {
      origin,
      data,
      width,
    } = this;
    yield 'Tile @' + origin.toString();
    if (data) {
      const row = [];
      for (let i = 0; i < data.length; i++) {
        if (i && i % width === 0) {
          yield row.join(' ');
          row.splice(0);
        }
        row.push(orNaN(data[i]).toString());
      }
      yield row.join(' ');
    }
  }

}

/** @param {number|undefined} un */
function orNaN(un) {
  return un === undefined ? NaN : un;
}
