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

function HexTileTree(origin, tileWidth, tileHeight) {
    this.root = new HexTileTreeNode(origin, tileWidth, tileHeight);
    this.oqo = new Coord.OddQOffset(0, 0);
}

HexTileTree.prototype.dump =
function dump() {
    return this.root.dump();
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
        if (i && i % this.width === 0) {
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
    return this.root.boundingBox();
};

HexTileTree.prototype.eachDataPoint =
function eachDataPoint(each) {
    this.root.eachDataPoint(each);
};

HexTileTree.prototype.centerPoint =
function centerPoint() {
    return this.root.centerPoint();
};

HexTileTree.prototype.update =
function update(point, func) {
    point.toOddQOffsetInto(this.oqo);
    while (!this.root.box.contains(this.oqo)) {
        this.root = this.root.expand();
    }
    this.root.oqo.copyFrom(this.oqo);
    return this.root._getOrCreateTile().update(this.oqo, func);
};

HexTileTree.prototype.get =
function get(point) {
    return this.root.get(point);
};

HexTileTree.prototype.set =
function set(point, datum) {
    point.toOddQOffsetInto(this.oqo);
    while (!this.root.box.contains(this.oqo)) {
        this.root = this.root.expand();
    }
    this.root.oqo.copyFrom(this.oqo);
    return this.root._getOrCreateTile().set(this.oqo, datum);
};

function HexTileTreeNode(origin, width, height) {
    this.origin = origin;
    this.width = width;
    this.height = height;
    this.tileWidth = Math.floor(this.width / 2);
    this.tileHeight = Math.floor(this.height / 2);
    this.tiles = [null, null, null, null];
    this.concrete = 0;
    this.oqo = new Coord.OddQOffset(0, 0);
    var topLeft = OddQOffset(this.origin.q - this.tileWidth,
                             this.origin.r - this.tileHeight);
    var bottomRight = OddQOffset(this.origin.q + this.tileWidth,
                                 this.origin.r + this.tileHeight);
    this.box = OddQBox(topLeft, bottomRight);
}

HexTileTreeNode.prototype.expand =
function expand() {
    var node = new HexTileTreeNode(
        this.origin.copy(), this.width * 2, this.height * 2);
    for (var i = 0; i < this.tiles.length; i++) {
        var tile = this.tiles[i];
        if (tile !== null) {
            node.tiles[i] = tile.grow(i);
        }
    }
    return node;
};

OddQHexTile.prototype.grow =
function grow(i) {
    var offset = tileOriginOffset[i].copy()
        .mulBy(this.width, this.height);
    var origin = this.origin.copy().add(offset);
    var node = new HexTileTreeNode(
        origin, 2 * this.width, 2 * this.height);
    node.tiles[zoomPerm[i]] = this;
    node.concrete++;
    return node;
};

HexTileTreeNode.prototype.grow =
function grow(i) {
    var offset = nodeOriginOffset[i].copy()
        .mulBy(this.tileWidth, this.tileHeight);
    var origin = this.origin.copy().add(offset);
    var node = new HexTileTreeNode(
        origin, 2 * this.width, 2 * this.height);
    node.tiles[zoomPerm[i]] = this;
    return node;
};

HexTileTreeNode.prototype.boundingBox =
function boundingBox() {
    return this.box;
};

HexTileTreeNode.prototype.eachDataPoint =
function eachDataPoint(each) {
    for (var i = 0; i < this.tiles.length; i++) {
        var tile = this.tiles[i];
        if (tile) {
            tile.eachDataPoint(each);
        } else {
            this._fakeDataPoints(i, each);
        }
    }
};

HexTileTreeNode.prototype._fakeDataPoints =
function _fakeDataPoints(i, each) {
    var tileCol = i & 1;
    var tileRow = i >> 1;

    var loQ = this.origin.q + (tileCol ? 0 : -this.tileWidth);
    var loR = this.origin.r + (tileRow ? 0 : -this.tileHeight);
    var hiQ = loQ + this.tileWidth;
    var hiR = loR + this.tileHeight;

    var point = OddQOffset(loQ, loR);
    for (point.r = loR; point.r < hiR; point.r++) {
        for (point.q = loQ; point.q < hiQ; point.q++) {
            each(point, 0);
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
    this._getOrCreateTile().update(this.oqo, func);
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
    return this._getOrCreateTile().set(this.oqo, datum);
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
    if (!tile) {
        var origin = OddQOffset(this.origin.q, this.origin.r);
        if (this.oqo.q < origin.q) {
            origin.q -= this.tileWidth;
        }
        if (this.oqo.r < origin.r) {
            origin.r -= this.tileHeight;
        }
        // TODO: assert offset point in range

        // TODO: heuristic for when to create a sparse node instead
        tile = new OddQHexTile(origin, this.tileWidth, this.tileHeight);
        this.tiles[i] = tile;
        this.concrete++;
    }
    return tile;
};
