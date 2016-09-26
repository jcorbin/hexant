'use strict';

var Coord = require('./coord.js');
var OddQHexTile = require('./hextile.js');
var OddQOffset = Coord.OddQOffset;
var OddQBox = Coord.OddQBox;

module.exports = HexTileTree;

var zoomPerm = [
    3, // 0 --> 3
    2, // 1 --> 2
    1, // 2 --> 1
    0  // 3 --> 0
];

var tileOriginOffset = [
    OddQOffset(0, 0),
    OddQOffset(1, 0),
    OddQOffset(0, 1),
    OddQOffset(1, 1)
];

var nodeOriginOffset = [
    OddQOffset(-1, -1),
    OddQOffset(1, -1),
    OddQOffset(-1, 1),
    OddQOffset(1, 1)
];

function HexTileTree() {
    this.minTileArea = 4;
    this.maxTileArea = 64;
    this.oqo = new OddQOffset(0, 0);
    this.root = null;
    this.tiles = {};
    this.dirtyTiles = [];
    this.tileRemoved = noop;
    this.tileAdded = noop;
}

function HexTileTreeNode(tree, origin, size, replaceme) {
    var self = this;
    this.tree = tree;
    this.origin = new OddQOffset(0, 0);
    this.oqo = new OddQOffset(0, 0);
    this.box = OddQBox(null, null);
    this.size = 0;
    this.tileSize = 0;
    this.tiles = [null, null, null, null];
    this.concrete = 0;
    this._replaceme = replaceme;
    this._replace = [
        function replace0(tile) {self._setTile(0, tile);},
        function replace1(tile) {self._setTile(1, tile);},
        function replace2(tile) {self._setTile(2, tile);},
        function replace3(tile) {self._setTile(3, tile);},
    ];
    if (origin !== null) {
        origin.toOddQOffsetInto(this.origin);
    } else {
        this.origin.q = this.origin.r = 0;
    }
    this._setSize(size);
}

HexTileTreeNode.prototype._setSize =
function _setSize(size) {
    this.size = size;
    this.tileSize = Math.floor(this.size / 2);
    this.box.topLeft.q = this.origin.q - this.tileSize;
    this.box.topLeft.r = this.origin.r - this.tileSize;
    this.box.bottomRight.q = this.origin.q + this.tileSize;
    this.box.bottomRight.r = this.origin.r + this.tileSize;
};

HexTileTree.prototype.getTile =
function getTile(id) {
    return this.tiles[id];
};

HexTileTree.prototype.addTile =
function addTile(tile) {
    this.tiles[tile.id] = tile;
    tile.dirty = true;
    this.dirtyTiles.push(tile);
    this.tileAdded(tile);
};

HexTileTree.prototype.removeTile =
function removeTile(tile) {
    if (tile.dirty) {
        var j = 0, k = 0;
        for (; k < this.dirtyTiles.length; ++j, ++k) {
            if (this.dirtyTiles[j] === tile) {
                ++k;
                break;
            }
        }
        while (k < this.dirtyTiles.length) {
            this.dirtyTiles[j++] = this.dirtyTiles[k++];
        }
        this.dirtyTiles.length = j;
    }
    this.tileRemoved(tile);
    delete this.tiles[tile.id];
};

HexTileTree.prototype.reset =
function reset() {
    this.dirtyTiles.length = 0;
    this.tiles = {};
    this.root = null;
};

HexTileTree.prototype.dump =
function dump() {
    if (this.root !== null) {
        return this.root.dump();
    }
};

HexTileTreeNode.prototype.dump =
function dump() {
    var parts = [
        'TreeNode @' + this.origin.toString(),
        '  box: ' + this.box.toString()
    ];

    for (var i = 0; i < this.tiles.length; i++) {
        var tileparts = ['null'];
        var tile = this.tiles[i];
        if (tile) {
            tileparts = tile.dump().split(/\n/);
        }
        parts.push('[' + i + ']: ' + tileparts[0]);
        for (var j = 1; j < tileparts.length; j++) {
            parts.push('     ' + tileparts[j]);
        }
    }

    return parts.join('\n');
};

OddQHexTile.prototype.dump =
function dump() {
    var parts = ['Tile @' + this.origin.toString()];
    var row = [];
    for (var i = 0; i < this.data.length; i++) {
        if (i && i % this.size === 0) {
            parts.push(row.join(' '));
            row = [];
        }
        row.push(this.data[i].toString());
    }
    parts.push(row.join(' '));
    return parts.join('\n');
};

HexTileTree.prototype.boundingBox =
function boundingBox() {
    if (this.root === null) {
        return null;
    }
    return this.root.boundingBox();
};

HexTileTree.prototype.eachTile =
function eachTile(each) {
    if (this.root !== null) {
        this.root.eachTile(each);
    }
};

HexTileTreeNode.prototype.eachTile =
function eachTile(each) {
    var tile;
    if (this.replaceme && (tile = this._mayCompact())) {
        tile.eachTile(each);
        return;
    }
    if (this.tiles[0]) this.tiles[0].eachTile(each);
    if (this.tiles[1]) this.tiles[1].eachTile(each);
    if (this.tiles[2]) this.tiles[2].eachTile(each);
    if (this.tiles[3]) this.tiles[3].eachTile(each);
};

HexTileTree.prototype.eachTile =
function eachTile(each) {
    if (this.root !== null) {
        this.root.eachTile(each);
    }
};

HexTileTree.prototype.eachDataPoint =
function eachDataPoint(each) {
    if (this.root !== null) {
        this.root.eachDataPoint(each, null, null);
    }
};

HexTileTree.prototype.centerPoint =
function centerPoint() {
    if (this.root === null) {
        return null;
    }
    return this.root.centerPoint();
};

HexTileTree.prototype._ensureRoot =
function _ensureRoot() {
    if (this.root === null) {
        var s = Math.ceil(Math.sqrt(this.minTileArea))*2;
        this.root = new HexTileTreeNode(this, null, s, null);
    }
};

HexTileTree.prototype.update =
function update(point, func) {
    this._ensureRoot();
    point.toOddQOffsetInto(this.oqo);
    while (!this.root.box.contains(this.oqo)) {
        this.root = this.root.expand();
    }
    this.root.oqo.copyFrom(this.oqo);
    var tile = this.root._getOrCreateTile();
    if (tile instanceof OddQHexTile && !tile.dirty) {
        tile.dirty = true;
        this.dirtyTiles.push(tile);
    }
    return tile.update(this.oqo, func);
};

HexTileTree.prototype.get =
function get(point) {
    this._ensureRoot();
    return this.root.get(point);
};

HexTileTree.prototype.set =
function set(point, datum) {
    this._ensureRoot();
    point.toOddQOffsetInto(this.oqo);
    while (!this.root.box.contains(this.oqo)) {
        this.root = this.root.expand();
    }
    this.root.oqo.copyFrom(this.oqo);
    var tile = this.root._getOrCreateTile();
    if (tile instanceof OddQHexTile && !tile.dirty) {
        tile.dirty = true;
        this.dirtyTiles.push(tile);
    }
    return tile.set(this.oqo, datum);
};

HexTileTreeNode.prototype.expand =
function expand() {
    this._setSize(this.size * 2);
    for (var i = 0; i < this.tiles.length; i++) {
        var tile = this.tiles[i];
        if (tile !== null) {
            var tileNode = new HexTileTreeNode(
                this.tree, tile.growthOrigin(i), this.tileSize, this._replace[i]);
            tileNode._setTile(zoomPerm[i], tile);
            this.tiles[i] = tileNode;
        }
    }
    return this;
};

OddQHexTile.prototype.growthOrigin =
function growthOrigin(i) {
    return this.oqo
        .copyFrom(tileOriginOffset[i])
        .scale(this.width)
        .add(this.origin);
};

HexTileTreeNode.prototype.growthOrigin =
function growthOrigin(i) {
    return this.oqo
        .copyFrom(nodeOriginOffset[i])
        .scale(this.tileSize)
        .add(this.origin);
};

HexTileTreeNode.prototype.boundingBox =
function boundingBox() {
    return this.box;
};

HexTileTreeNode.prototype.eachTile =
function eachTile(each) {
    var tile;
    if (this.replaceme && (tile = this._mayCompact())) {
        tile.eachTile(each);
        return;
    }
    if (this.tiles[0]) this.tiles[0].eachTile(each);
    if (this.tiles[1]) this.tiles[1].eachTile(each);
    if (this.tiles[2]) this.tiles[2].eachTile(each);
    if (this.tiles[3]) this.tiles[3].eachTile(each);
};

HexTileTreeNode.prototype.eachDataPoint =
function eachDataPoint(each, fill) {
    var tile;
    if (this._replaceMe && (tile = this._mayCompact())) {
        tile.eachDataPoint(each, fill, null);
        return;
    }
    var self = this;

    if (this.tiles[0]) this.tiles[0].eachDataPoint(each, fill);
    else if (typeof fill === 'number') this._fakeDataPoints(0, each, fill);
    if (this.tiles[1]) this.tiles[1].eachDataPoint(each, fill);
    else if (typeof fill === 'number') this._fakeDataPoints(1, each, fill);
    if (this.tiles[2]) this.tiles[2].eachDataPoint(each, fill);
    else if (typeof fill === 'number') this._fakeDataPoints(2, each, fill);
    if (this.tiles[3]) this.tiles[3].eachDataPoint(each, fill);
    else if (typeof fill === 'number') this._fakeDataPoints(3, each, fill);
};

HexTileTreeNode.prototype._mayCompact =
function _mayCompact(replaceMe) {
    if (this.concrete != 4) {
        return null;
    }

    var tile = this.compact();
    if (tile === null) {
        this.concrete = 5;
        return null;
    }

    this._replaceme(tile);
    for (var i = 0; i < this.tiles.length; ++i) {
        this.tree.removeTile(this.tiles[i]);
    }
    if (tile instanceof OddQHexTile) {
        this.tree.addTile(tile);
    }
    return tile;
};

HexTileTreeNode.prototype.compact =
function compact() {
    if (this.size * this.size > this.tree.maxTileArea) {
        return null;
    }

    var newTile = new OddQHexTile(
        this.box.topLeft, this.size, this.size);
    this.tiles[0].eachDataPoint(eachPoint, null, null);
    this.tiles[1].eachDataPoint(eachPoint, null, null);
    this.tiles[2].eachDataPoint(eachPoint, null, null);
    this.tiles[3].eachDataPoint(eachPoint, null, null);
    return newTile;

    function eachPoint(point, datum) {
        // newTile.data[i++] = datum; TODO: should be able to do something like thing
        newTile.set(point, datum);
    }
};

HexTileTreeNode.prototype._fakeDataPoints =
function _fakeDataPoints(i, each, fill) {
    var tileCol = i & 1;
    var tileRow = i >> 1;

    var loQ = this.origin.q + (tileCol ? 0 : -this.tileSize);
    var loR = this.origin.r + (tileRow ? 0 : -this.tileSize);
    var hiQ = loQ + this.tileSize;
    var hiR = loR + this.tileSize;

    var point = OddQOffset(loQ, loR);
    for (point.r = loR; point.r < hiR; point.r++) {
        for (point.q = loQ; point.q < hiQ; point.q++) {
            each(point, fill);
        }
    }
};

HexTileTreeNode.prototype.centerPoint =
function centerPoint() {
    return this.origin;
};

HexTileTreeNode.prototype.update =
function update(point, func) {
    point.toOddQOffsetInto(this.oqo);
    if (!this.box.contains(this.oqo)) {
        throw new Error('update out of bounds');
    }
    var tile = (this._replaceme && this._mayCompact()) || this._getOrCreateTile();
    if (tile instanceof OddQHexTile && !tile.dirty) {
        tile.dirty = true;
        this.tree.dirtyTiles.push(tile);
    }
    return tile.update(this.oqo, func);
};

HexTileTreeNode.prototype.get =
function get(point) {
    point.toOddQOffsetInto(this.oqo);
    if (!this.box.contains(this.oqo)) {
        return NaN;
    }
    var tile = this._getTile();
    if (tile) {
        return tile.get(this.oqo);
    }
    return 0;
};

HexTileTreeNode.prototype.set =
function set(point, datum) {
    point.toOddQOffsetInto(this.oqo);
    if (!this.box.contains(this.oqo)) {
        throw new Error('set out of bounds');
    }
    var tile = (this._replaceme && this._mayCompact()) || this._getOrCreateTile();
    if (tile instanceof OddQHexTile && !tile.dirty) {
        tile.dirty = true;
        this.tree.dirtyTiles.push(tile);
    }
    return tile.set(this.oqo, datum);
};

HexTileTreeNode.prototype._getTile =
function _getTile() {
    // TODO: bit hack: negated sign-bit of subtraction
    var tileCol = this.oqo.q < this.origin.q ? 0 : 1;
    var tileRow = this.oqo.r < this.origin.r ? 0 : 1;
    var i = tileRow * 2 + tileCol;
    return this.tiles[i];
};

HexTileTreeNode.prototype._getOrCreateTile =
function _getOrCreateTile() {
    var tileCol = this.oqo.q < this.origin.q ? 0 : 1;
    var tileRow = this.oqo.r < this.origin.r ? 0 : 1;
    var i = tileRow * 2 + tileCol;
    var tile = this.tiles[i];
    if (tile) {
        return tile;
    }
    if (this.tileSize * this.tileSize <= this.tree.minTileArea) {
        return this._allocTile(i);
    }
    return this._allocNode(i);
};

HexTileTreeNode.prototype._allocTile =
function _allocTile(i) {
    var origin = this.origin.copy();
    if (this.oqo.q < origin.q) origin.q -= this.tileSize;
    if (this.oqo.r < origin.r) origin.r -= this.tileSize;
    var tile = new OddQHexTile(
        origin, this.tileSize, this.tileSize);
    this._setTile(i, tile);
    this.tree.addTile(tile);
    return tile;
};

HexTileTreeNode.prototype._allocNode =
function _allocNode(i) {
    var origin = this.origin.copy();
    origin.q += this.tileSize / (this.oqo.q < origin.q ? -2 : 2);
    origin.r += this.tileSize / (this.oqo.r < origin.r ? -2 : 2);
    var node = new HexTileTreeNode(
        this.tree, origin, this.tileSize, this._replace[i]);
    this.tiles[i] = node;
    return node;
};

HexTileTreeNode.prototype._setTile =
function _setTile(i, tile) {
    this.tiles[i] = tile;
    if (tile instanceof OddQHexTile) {
        this.concrete++;
    } else if (tile instanceof HexTileTreeNode) {
        tile._replaceme = this._replace[i];
    }
};

function noop() {
}
