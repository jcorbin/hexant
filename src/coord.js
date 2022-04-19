// @ts-check

'use strict';

export class ScreenPoint {
  /**
   * @param {number} [x]
   * @param {number} [y]
   */
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  type = 'point.screen'

  copy() {
    return new ScreenPoint(this.x, this.y);
  }

  /** @param {ScreenPoint} other */
  copyFrom(other) {
    this.x = other.x;
    this.y = other.y;
    return this;
  }

  toString() {
    return `ScreenPoint(${this.x}, ${this.y});`
  }

  /** @param {ScreenPoint} screenPoint */
  toScreenInto(screenPoint) {
    screenPoint.x = this.x;
    screenPoint.y = this.y;
    return screenPoint;
  }

  toScreen() {
    return this;
  }

  /** @param {number} n */
  scale(n) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  mulBy(x, y) {
    this.x *= x;
    this.y *= y;
    return this;
  }

  /** @param {ScreenPoint} other */
  add(other) {
    if (other.type !== this.type) {
      other = other.toScreen();
    }
    this.x += other.x;
    this.y += other.y;
    return this;
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  addTo(x, y) {
    this.x += x;
    this.y += y;
    return this;
  }

  /** @param {ScreenPoint} other */
  sub(other) {
    if (other.type !== this.type) {
      other = other.toScreen();
    }
    this.x -= other.x;
    this.y -= other.y;
    return this;
  }
}

export class CubePoint {
  /**
   * @param {number} [x]
   * @param {number} [y]
   * @param {number} [z]
   */
  constructor(x = 0, y = 0, z = 0) {
    if (x + y + z !== 0) {
      throw new Error(`CubePoint invariant violated: ${x} + ${y} + ${z} = ${x + y + z}`);
    }
    this.x = x;
    this.y = y;
    this.z = z;
  }

  type = 'point.cube'

  toString() {
    return `CubePoint(${this.x}, ${this.y}, ${this.z})`;
  }

  copy() {
    return new CubePoint(this.x, this.y, this.z);
  }

  /** @param {CubePoint} other */
  copyFrom(other) {
    if (other.type !== this.type) {
      return other.toCubeInto(this);
    }
    this.x = other.x;
    this.y = other.y;
    this.z = other.z;
    return this;
  }

  /** @param {CubePoint} other */
  add(other) {
    if (other.type !== this.type) {
      other = other.toCube();
    }
    this.x += other.x;
    this.y += other.y;
    this.z += other.z;
    return this;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  addTo(x, y, z) {
    this.x += x;
    this.y += y;
    this.z += z;
    return this;
  }

  /** @param {CubePoint} other */
  sub(other) {
    if (other.type !== this.type) {
      other = other.toCube();
    }
    this.x -= other.x;
    this.y -= other.y;
    this.z -= other.z;
    return this;
  }

  /**
   * @param {number} n
   */
  scale(n) {
    this.x *= n;
    this.y *= n;
    this.z *= n;
    return this;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  mulBy(x, y, z) {
    this.x *= x;
    this.y *= y;
    this.z *= z;
    return this;
  }

  /** @param {ScreenPoint} screenPoint */
  toScreenInto(screenPoint) {
    screenPoint.x = 3 / 2 * this.x;
    screenPoint.y = Math.sqrt(3) * (this.z + this.x / 2);
    return screenPoint;
  }

  toScreen() {
    return this.toScreenInto(new ScreenPoint());
  }

  /** @param {CubePoint} other */
  toCubeInto(other) {
    other.x = this.x;
    other.y = this.y;
    other.z = this.z;
    return other;
  }

  toCube() {
    return this;
  }

  toOddQOffset() {
    const q = this.x;
    const r = this.z + (this.x - (this.x & 1)) / 2;
    return new OddQOffset(q, r);
  }

  /** @param {OddQOffset} oqo */
  toOddQOffsetInto(oqo) {
    oqo.q = this.x;
    oqo.r = this.z + (this.x - (this.x & 1)) / 2;
  }

  static basis = [
    new CubePoint(1, -1, 0), // SE -- 0, 1
    new CubePoint(0, -1, 1), // S  -- 1, 2
    new CubePoint(-1, 0, 1), // SW -- 2, 3
    new CubePoint(-1, 1, 0), // NW -- 3, 4
    new CubePoint(0, 1, -1), // N  -- 4, 5
    new CubePoint(1, 0, -1)  // NE -- 5, 0
  ]
}

/**
 * @typedef {object} oddQPotent
 * @prop {(oqo: OddQOffset) => void} toOddQOffsetInto
 */

/**
 * @typedef {object} oddQToable
 * @prop {() => OddQOffset} toOddQOffset
 */

export class OddQOffset {
  /**
   * @param {number} [q]
   * @param {number} [r]
   */
  constructor(q = 0, r = 0) {
    this.q = q;
    this.r = r;
  }

  type = 'offset.odd-q'

  toString() {
    return `OddQOffset(${this.q}, ${this.r})`;
  }

  copy() {
    return new OddQOffset(this.q, this.r);
  }

  /** @param {oddQPotent} other */
  copyFrom(other) {
    other.toOddQOffsetInto(this);
    return this;
  }

  /** @param {OddQOffset|oddQToable} other */
  add(other) {
    if (other instanceof OddQOffset) {
      const { q, r } = other;
      this.q += q, this.r += r;
    } else {
      const { q, r } = other.toOddQOffset();
      this.q += q, this.r += r;
    }
    return this;
  }

  /**
   * @param {number} q
   * @param {number} r
   */
  addTo(q, r) {
    this.q += q;
    this.r += r;
    return this;
  }

  /** @param {OddQOffset|oddQToable} other */
  sub(other) {
    if (other instanceof OddQOffset) {
      const { q, r } = other;
      this.q -= q, this.r -= r;
    } else {
      const { q, r } = other.toOddQOffset();
      this.q -= q, this.r -= r;
    }
    return this;
  }

  /**
   * @param {number} n
   */
  scale(n) {
    this.q *= n;
    this.r *= n;
    return this;
  }

  /**
   * @param {number} q
   * @param {number} r
   */
  mulBy(q, r) {
    this.q *= q;
    this.r *= r;
    return this;
  }

  /** @param {ScreenPoint} screenPoint */
  toScreenInto(screenPoint) {
    screenPoint.x = 3 / 2 * this.q;
    screenPoint.y = Math.sqrt(3) * (this.r + 0.5 * (this.q & 1));
    return screenPoint;
  }

  toScreen() {
    return this.toScreenInto(new ScreenPoint());
  }

  toOddQOffset() {
    return this;
  }

  /** @param {OddQOffset} oqo */
  toOddQOffsetInto(oqo) {
    oqo.q = this.q;
    oqo.r = this.r;
  }

  /** @param {CubePoint} cubePoint */
  toCubeInto(cubePoint) {
    cubePoint.x = this.q;
    cubePoint.z = this.r - (this.q - (this.q & 1)) / 2;
    cubePoint.y = -cubePoint.x - cubePoint.z;
    return cubePoint;
  }

  toCube() {
    return this.toCubeInto(new CubePoint());
  }
}

/**
 * @typedef {{toOddQOffset: () => OddQOffset}} OddQOffsetIsh
 */

export class OddQBox {
  /**
   * @param {OddQOffsetIsh} [topLeft]
   * @param {OddQOffsetIsh} [bottomRight]
   */
  constructor(topLeft = new OddQOffset(), bottomRight = new OddQOffset()) {
    this.topLeft = topLeft.toOddQOffset();
    this.bottomRight = bottomRight.toOddQOffset();
  }

  copy() {
    return new OddQBox(this.topLeft.copy(), this.bottomRight.copy());
  }

  /** @param {OddQBox} other */
  copyFrom(other) {
    this.topLeft.copyFrom(other.topLeft);
    this.bottomRight.copyFrom(other.bottomRight);
    return this;
  }

  toString() {
    return 'OddQBox(' +
      this.topLeft.toString() + ', ' +
      this.bottomRight.toString() + ')';
  }

  screenCount() {
    return this.screenCountInto(new ScreenPoint());
  }

  /** @param {ScreenPoint} screenPoint */
  screenCountInto(screenPoint) {
    const W = this.bottomRight.q - this.topLeft.q;
    const H = this.bottomRight.r - this.topLeft.r;

    // return the count number of hexes needed in screen x space and screen y
    // space

    // first one is a unit, each successive column backs 1/4 with the last
    // const x = 1 + 3 / 4 * (W - 1);
    screenPoint.x = (3 * W + 1) / 4;

    // height backs directly, but we need an extra half cell except when we
    // have only one column
    screenPoint.y = H + (W > 1 ? 0.5 : 0);

    return screenPoint;
  }

  /** @param {OddQOffsetIsh} pointArg */
  contains(pointArg) {
    const point = pointArg.toOddQOffset();
    return point.q >= this.topLeft.q && point.q < this.bottomRight.q &&
      point.r >= this.topLeft.r && point.r < this.bottomRight.r;
  }

  /** @param {OddQOffsetIsh} pointArg */
  expandTo(pointArg) {
    let expanded = false;
    const point = pointArg.toOddQOffset();

    if (point.q < this.topLeft.q) {
      this.topLeft.q = point.q;
      expanded = true;
    } else if (point.q >= this.bottomRight.q) {
      this.bottomRight.q = point.q + 1;
      expanded = true;
    }

    if (point.r < this.topLeft.r) {
      this.topLeft.r = point.r;
      expanded = true;
    } else if (point.r >= this.bottomRight.r) {
      this.bottomRight.r = point.r + 1;
      expanded = true;
    }

    return expanded;
  }
}
