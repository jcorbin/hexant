// @ts-check

import {
  OddQOffset,
  OddQBox,
} from './coord.js';

/**
 * @typedef {object} oddQPotent
 * @prop {(oqo: OddQOffset) => void} toOddQOffsetInto
 */

/** @type {OddQHexTile[]} */
const pool = [];

export class OddQHexTile {
  static NextId = 1;

  static alloc() {
    if (pool.length > 0) {
      const tile = pool.shift()
      if (tile !== undefined) {
        return tile;
      }
    }
    return new OddQHexTile();
  }

  /** @param {OddQHexTile} tile */
  static free(tile) {
    pool.push(tile);
  }

  free() {
    OddQHexTile.free(this);
  }


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

  bounds() {
    const {
      origin: { q: tlq, r: tlr },
      width, height,
    } = this;
    const brq = tlq + width;
    const brr = tlr + height;
    return new OddQBox(
      new OddQOffset(tlq, tlr),
      new OddQOffset(brq, brr),
    );
  }

  /** @param {number} mask */
  boundsIf(mask) {
    const bounds = new OddQBox();
    const {
      data,
      width,
      origin: { q: oq }
    } = this;
    let { origin: { q, r } } = this, i = 0;
    if (data)
      while (i < data.length) {
        if (orNaN(data[i]) & mask) {
          bounds.expandTo(new OddQOffset(q, r));
        }
        i++;
        q++;
        if (q >= oq + width) {
          q = oq;
          r++;
        }
      }
    return bounds;
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
