// @ts-check

import { OddQOffset, OddQBox } from './coord.js';
import { OddQHexTile } from './hextile.js';

/**
 * @typedef {object} oddQPotent
 * @prop {(oqo: OddQOffset) => void} toOddQOffsetInto
 */

/** @typedef {(tile: OddQHexTile) => void} tileCallback */
/** @typedef {OddQHexTile|HexTileTreeNode} tileOrNode */
/** @typedef {tileOrNode|null} tileOrNodeOrNull */

export class HexTileTree {
  constructor() {
    this.minTileArea = 4;
    this.maxTileArea = 64;
    this.oqo = new OddQOffset(0, 0);

    /** @type {null|HexTileTreeNode} */
    this.root = null;

    // TODO Map
    /** @type {Map<number, OddQHexTile>} */
    this.tiles = new Map();

    /** @type {OddQHexTile[]} */
    this.dirtyTiles = [];

    /** @type {tileCallback} */
    this.tileRemoved = noop;

    /** @type {tileCallback} */
    this.tileAdded = noop;
  }

  /**
   * @param {number} id
   * @returns {null|OddQHexTile}
   */
  getTile(id) {
    return this.tiles.get(id) || null;
  }

  /** @param {OddQHexTile} tile */
  addTile(tile) {
    this.tiles.set(tile.id, tile);
    tile.dirty = true;
    this.dirtyTiles.push(tile);
    this.tileAdded(tile);
  }

  /** @param {OddQHexTile[]} tiles */
  removeTiles(...tiles) {
    const { dirtyTiles } = this;
    if (tiles.some(tile => tile.dirty)) {
      const goneIDs = new Set(tiles.map(({ id }) => id));
      let j = 0;
      for (let k = 0; k < dirtyTiles.length; ++k) {
        const dirtyTile = dirtyTiles[k];
        if (dirtyTile) {
          const { id } = dirtyTile;
          if (!goneIDs.has(id)) {
            if (j != k) {
              dirtyTiles[j] = dirtyTile;
            }
            ++j;
          }
        }
      }
      dirtyTiles.length = j;
    }

    for (const tile of tiles) {
      this.tileRemoved(tile);
    }

    for (const { id } of tiles) {
      this.tiles.delete(id);
    }

    for (const tile of tiles) {
      tile.free();
    }
  }

  reset() {
    this.dirtyTiles.length = 0;
    this.tiles.clear();
    this.root = null;
  }

  dump() {
    const { root } = this;
    return root ? [...root.dump()].join('\n') : '';
  }

  boundingBox() {
    const { root } = this;
    return root ? root.boundingBox() : null;
  }

  /** @param {(tile: OddQHexTile) => void} each */
  eachTile(each) {
    const { root } = this;
    if (root !== null) {
      root.eachTile(each);
    }
  }

  /** @param {(point: OddQOffset, datum: number) => void} each */
  eachDataPoint(each) {
    const { root } = this;
    if (root !== null) {
      root.eachDataPoint(each, null);
    }
  }

  centerPoint() {
    const { root } = this;
    return root ? root.centerPoint() : null;
  }

  /** @returns {HexTileTreeNode} */
  _ensureRoot() {
    let { root } = this;
    if (!root) {
      const s = Math.ceil(Math.sqrt(this.minTileArea)) * 2;
      root = HexTileTreeNode.alloc ? HexTileTreeNode.alloc() : new HexTileTreeNode()
      root.init(this, null, s);
    }
    return root;
  }

  /** @param {oddQPotent} point */
  _ensureTile(point) {
    const { oqo } = this;
    let root = this._ensureRoot();
    point.toOddQOffsetInto(oqo);
    while (!root.box.contains(oqo)) {
      const expanded = root.expand();
      if (!expanded) {
        return null;
      }
      root = expanded;
    }
    if (root !== this.root) {
      this.root = root;
    }
    root.oqo.copyFrom(oqo);
    return root._getOrCreateTile(); // FIXME implicit oqo pass from copy in last line
    // FIXME implicit side return in this.oqo
  }

  /**
   * @param {oddQPotent} point
   * @param {(datum: number, point: oddQPotent) => number} func
   * @returns {number}
   */
  update(point, func) {
    const { oqo, dirtyTiles } = this;
    const tile = this._ensureTile(point); // NOTE: implicit return into shared oqo
    if (!tile) { return NaN }
    if (tile instanceof OddQHexTile && !tile.dirty) {
      tile.dirty = true;
      dirtyTiles.push(tile);
    }
    return tile.update(oqo, func);
  }

  /**
   * @param {oddQPotent} point
   * @returns {number}
   */
  get(point) {
    return this._ensureRoot().get(point);
  }

  /**
   * @param {oddQPotent} point
   * @param {number} datum
   * @returns {number}
   */
  set(point, datum) {
    const { oqo, dirtyTiles } = this;
    const tile = this._ensureTile(point); // NOTE: implicit return into shared oqo
    if (!tile) { return NaN }
    if (tile instanceof OddQHexTile && !tile.dirty) {
      tile.dirty = true;
      dirtyTiles.push(tile);
    }
    return tile.set(oqo, datum);
  }

}

const zoomPerm = [
  3, // 0 --> 3
  2, // 1 --> 2
  1, // 2 --> 1
  0  // 3 --> 0
];

const tileOriginOffset = [
  new OddQOffset(0, 0),
  new OddQOffset(1, 0),
  new OddQOffset(0, 1),
  new OddQOffset(1, 1)
];

const nodeOriginOffset = [
  new OddQOffset(-1, -1),
  new OddQOffset(1, -1),
  new OddQOffset(-1, 1),
  new OddQOffset(1, 1)
];

/** TODO this exists as a dubious testing surface, refactor it away someday
 *
 * @param {HexTileTree|null} tree
 * @param {OddQHexTile|HexTileTreeNode} tile
 * @param {number} i
 */
export function growTile(tree, tile, i) {
  const originOffset = tile instanceof OddQHexTile ? tileOriginOffset[i] : nodeOriginOffset[i];
  const zoom = zoomPerm[i];

  const tileSize = tile instanceof OddQHexTile ? tile.width : tile.tileSize;
  const growthOrigin = tile.oqo
    .copyFrom(originOffset)
    .scale(tileSize)
    .add(tile.origin);
  const growthSize = 2 * (tile instanceof OddQHexTile ? tile.width : tile.size);
  const tileNode = HexTileTreeNode.alloc ? HexTileTreeNode.alloc() : new HexTileTreeNode();
  tileNode.init(tree, growthOrigin, growthSize);
  tileNode._setTile(zoom, tile);
  return tileNode;
}

/** @type {HexTileTreeNode[]} */
const pool = [];

export class HexTileTreeNode {
  static alloc() {
    if (pool.length > 0) {
      const node = pool.shift()
      if (node !== undefined) {
        return node;
      }
    }
    return new HexTileTreeNode();
  }

  /** @param {HexTileTreeNode} node */
  static free(node) {
    node.reset();
    pool.push(node);
  }

  free() {
    HexTileTreeNode.free(this);
  }

  constructor() {
    /** @type {HexTileTree|null} */
    this.tree = null;

    this.origin = new OddQOffset(0, 0);
    this.oqo = new OddQOffset(0, 0);
    this.box = new OddQBox();
    this.size = 0;
    this.tileSize = 0;
    this.concrete = 0;

    /** @type {[tileOrNodeOrNull, tileOrNodeOrNull, tileOrNodeOrNull, tileOrNodeOrNull]} */
    this.tiles = [null, null, null, null];

    /** @type {tileCallback|null} */
    this._replaceme = null;
  }

  /**
   * @param {HexTileTree|null} tree
   * @param {oddQPotent?} origin
   * @param {number} size
   * @param {tileCallback} [replaceme]
   */
  init(tree, origin, size, replaceme) {
    this.tree = tree;
    this.concrete = 0;
    this._replaceme = replaceme || null;
    if (origin !== null) {
      origin.toOddQOffsetInto(this.origin);
    } else {
      this.origin.q = this.origin.r = 0;
    }
    this._setSize(size);
    return this;
  }

  reset() {
    const { tiles } = this;
    const [a, b, c, d] = tiles;
    if (a) {
      a.free();
      tiles[0] = null;
    }
    if (b) {
      b.free();
      tiles[1] = null;
    }
    if (c) {
      c.free();
      tiles[2] = null;
    }
    if (d) {
      d.free();
      tiles[3] = null;
    }
  }

  /** @param {number} size */
  _setSize(size) {
    const { origin: { q, r }, box: { topLeft, bottomRight } } = this;
    const tileSize = Math.floor(size / 2);
    this.size = size;
    this.tileSize = tileSize;
    topLeft.q = q - tileSize;
    topLeft.r = r - tileSize;
    bottomRight.q = q + tileSize;
    bottomRight.r = r + tileSize;
  }

  /** @returns {Generator<string>} */
  *dump() {
    const { origin, box, tiles } = this;
    yield `TreeNode @${origin}`;
    yield `  box: ${box}`;
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const [first, ...tileparts] = tile ? [...tile.dump()] : ['null'];
      yield `[${i}]: ${first}`;
      for (const tilepart of tileparts) {
        yield `     ${tilepart}`;
      }
    }
  }

  /** @param {(tile: OddQHexTile) => void} each */
  eachTile(each) {
    const tile = this._mayCompact();
    if (tile) {
      tile.eachTile(each);
      return;
    }

    const { tiles: [a, b, c, d] } = this;
    if (a) a.eachTile(each);
    if (b) b.eachTile(each);
    if (c) c.eachTile(each);
    if (d) d.eachTile(each);
  }

  expand() {
    const { tree, tiles } = this;
    if (!tree) { return null }
    this._setSize(this.size * 2);
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const tileNode = tile ? growTile(tree, tile, i) : null;
      if (tileNode) {
        this._setTile(i, tileNode);
      }
    }
    return this;
  }

  boundingBox() {
    return this.box;
  }

  /**
   * @param {(point: OddQOffset, datum: number) => void} each
   * @param {null|number} [fill]
   */
  eachDataPoint(each, fill = null) {
    const tile = this._mayCompact();
    if (tile) {
      tile.eachDataPoint(each);
      return;
    }

    const {
      tileSize,
      origin: { q: oq, r: or },
      oqo: point,
      tiles: [a, b, c, d],
    } = this

    if (a) a.eachDataPoint(each, fill); else doFill(0);
    if (b) b.eachDataPoint(each, fill); else doFill(1);
    if (c) c.eachDataPoint(each, fill); else doFill(2);
    if (d) d.eachDataPoint(each, fill); else doFill(3);

    /** @param {number} i */
    function doFill(i) {
      if (typeof fill !== 'number') {
        return;
      }
      const tileCol = i & 1;
      const tileRow = i >> 1;
      const loQ = oq + (tileCol ? 0 : -tileSize);
      const loR = or + (tileRow ? 0 : -tileSize);
      const hiQ = loQ + tileSize;
      const hiR = loR + tileSize;
      point.q = loQ, point.r = loR;
      for (point.r = loR; point.r < hiR; point.r++) {
        for (point.q = loQ; point.q < hiQ; point.q++) {
          each(point, fill);
        }
      }
    }
  }

  _mayCompact() {
    if (!this.tree || !this._replaceme) {
      return null;
    }

    if (this.concrete != 4) {
      return null;
    }

    const tile = this.compact();
    if (tile === null) {
      // setting concrete to 5 caches the negative result of "won't compact" so
      // that we don't try again in the future
      this.concrete = 5;
      return null;
    }

    /** @type {OddQHexTile[]} */
    const subTiles = [];
    for (const tile of this.tiles) {
      if (tile && tile instanceof OddQHexTile) {
        subTiles.push(tile);
      }
    }

    this._replaceme(tile);

    this.tree.removeTiles(...subTiles);

    this.tree.addTile(tile);
    return tile;
  }

  compact() {
    if (!this.tree) { return null }
    const { size, tree: { maxTileArea } } = this;
    if (size * size > maxTileArea) {
      return null;
    }

    // TODO should be able to do region copies from each subTile into newTile,
    // rather than all the overhead of each => set

    const { box: { topLeft }, tiles } = this;
    const newTile = OddQHexTile.alloc ? OddQHexTile.alloc() : new OddQHexTile();
    newTile.init(topLeft, size, size);
    for (const subTile of tiles) {
      if (subTile) subTile.eachDataPoint(
        (point, datum) => newTile.set(point, datum),
        null);
    }
    return newTile;
  }

  centerPoint() {
    return this.origin;
  }

  /**
   * @param {oddQPotent} point
   * @param {(datum: number, point: oddQPotent) => number} func
   * @returns {number}
   */
  update(point, func) {
    const { oqo, box, tree } = this;
    if (!tree) { return NaN }
    const { dirtyTiles } = tree;
    point.toOddQOffsetInto(oqo);
    if (!box.contains(oqo)) {
      throw new Error('update out of bounds');
    }
    const tile = this._mayCompact() || this._getOrCreateTile(); // FIXME implicit oqo pass
    if (!tile) { return NaN }
    if (tile instanceof OddQHexTile && !tile.dirty) {
      tile.dirty = true;
      dirtyTiles.push(tile);
    }
    return tile.update(oqo, func);
  }

  /**
   * @param {oddQPotent} point
   * @returns {number}
   */
  get(point) {
    const { oqo, box } = this;
    point.toOddQOffsetInto(oqo);
    if (!box.contains(oqo)) {
      return NaN;
    }
    const tile = this._getTile(); // FIXME implicit oqo pass
    if (tile) {
      return tile.get(oqo);
    }
    return 0;
  }

  /**
   * @param {oddQPotent} point
   * @param {number} datum
   * @returns {number}
   */
  set(point, datum) {
    const { oqo, box, tree } = this;
    if (!tree) { return NaN }
    const { dirtyTiles } = tree;
    point.toOddQOffsetInto(oqo);
    if (!box.contains(oqo)) {
      throw new Error('set out of bounds');
    }

    const tile = this._mayCompact() || this._getOrCreateTile(); // FIXME implicit oqo pass
    if (!tile) { return NaN }
    if (tile instanceof OddQHexTile && !tile.dirty) {
      tile.dirty = true;
      dirtyTiles.push(tile);
    }
    return tile.set(this.oqo, datum);
  }

  _index() {
    // FIXME implicit oqo arg
    const { oqo: { q, r }, origin: { q: oq, r: or } } = this;

    // TODO: bit hack: negated sign-bit of subtraction would make this branchless
    const tileCol = q < oq ? 0 : 1;
    const tileRow = r < or ? 0 : 1;
    return tileRow * 2 + tileCol;
  }

  _getTile() {
    const i = this._index(); // FIXME implicit operation on oqo passed thru
    return this.tiles[i];
  }

  _getOrCreateTile() {
    const { tree, tiles, tileSize } = this;
    if (!tree) { return null }
    const i = this._index(); // FIXME implicit operation on oqo passed thru
    const tile = tiles[i];
    if (tile) {
      return tile;
    }
    if (tileSize * tileSize <= tree.minTileArea) {
      return this._allocTile(i);
    }
    return this._allocNode(i);
  }

  /** @param {number} i */
  _allocTile(i) {

    // FIXME implicit oqo arg
    const { tree, oqo: { q, r }, tileSize } = this;
    if (!tree) { return null }
    const origin = this.origin.copy();
    if (q < origin.q) origin.q -= tileSize;
    if (r < origin.r) origin.r -= tileSize;

    const tile = OddQHexTile.alloc ? OddQHexTile.alloc() : new OddQHexTile();
    tile.init(origin, tileSize, tileSize);
    this._setTile(i, tile);
    tree.addTile(tile);
    return tile;
  }

  /** @param {number} i */
  _allocNode(i) {

    // FIXME implicit oqo arg
    const { tree, oqo: { q, r }, tileSize } = this;
    if (!tree) { return null }
    const origin = this.origin.copy();
    origin.q += tileSize / (q < origin.q ? -2 : 2);
    origin.r += tileSize / (r < origin.r ? -2 : 2);

    const node = HexTileTreeNode.alloc ? HexTileTreeNode.alloc() : new HexTileTreeNode();
    node.init(tree, origin, tileSize);
    this._setTile(i, node);
    return node;
  }

  /**
   * @param {number} i
   * @param {tileOrNode} tile
   */
  _setTile(i, tile) {
    const prior = this.tiles[i];
    if (prior && prior instanceof HexTileTreeNode) {
      prior._replaceme = null;
    }
    this.tiles[i] = tile;
    if (tile instanceof OddQHexTile) {
      this.concrete++;
    } else if (tile instanceof HexTileTreeNode) {
      tile._replaceme = tile => this._setTile(i, tile);
    }
  }

}

function noop() {
}
