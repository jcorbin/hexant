'use strict';

/* eslint no-inline-comments:0 */

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
}

HexTileTree.prototype.dump = function dump() {
    return this.root.dump();
};

HexTileTreeNode.prototype.dump = function dump() {
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

OddQHexTile.prototype.dump = function dump() {
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

HexTileTree.prototype.boundingBox = function boundingBox() {
    return this.root.boundingBox();
};

HexTileTree.prototype.eachDataPoint = function eachDataPoint(each) {
    this.root.eachDataPoint(each);
};

HexTileTree.prototype.centerPoint = function centerPoint() {
    return this.root.centerPoint();
};

HexTileTree.prototype.get = function get(point) {
    return this.root.get(point);
};

HexTileTree.prototype.set = function set(point, c) {
    var offsetPoint = point.toOddQOffset();

    while (!this.root.box.contains(offsetPoint)) {
        this.root = this.root.expand();
    }

    return this.root._set(offsetPoint, c);
};

function HexTileTreeNode(origin, width, height) {
    this.origin = origin;
    this.width = width;
    this.height = height;
    this.tileWidth = Math.floor(this.width / 2);
    this.tileHeight = Math.floor(this.height / 2);
    this.tiles = [null, null, null, null];
    var topLeft = OddQOffset(this.origin.q - this.tileWidth,
                             this.origin.r - this.tileHeight);
    var bottomRight = OddQOffset(this.origin.q + this.tileWidth,
                                 this.origin.r + this.tileHeight);
    this.box = OddQBox(topLeft, bottomRight);
}

HexTileTreeNode.prototype.expand = function expand() {
    var node = new HexTileTreeNode(
        this.origin.copy(), this.width * 2, this.height * 2);
    for (var i = 0; i < this.tiles.length; i++) {
        node.tiles[i] = this.growTile(i);
    }
    return node;
};

HexTileTreeNode.prototype.growTile = function growTile(i) {
    var tile = this.tiles[i];
    if (!tile) {
        return null;
    }
    return tile.grow(i);
};

OddQHexTile.prototype.grow = function grow(i) {
    var offset = tileOriginOffset[i].copy()
        .mulBy(this.width, this.height);
    var origin = this.origin.copy().add(offset);
    var node = new HexTileTreeNode(
        origin, 2 * this.width, 2 * this.height);
    node.tiles[zoomPerm[i]] = this;
    return node;
};

HexTileTreeNode.prototype.grow = function grow(i) {
    var offset = nodeOriginOffset[i].copy()
        .mulBy(this.tileWidth, this.tileHeight);
    var origin = this.origin.copy().add(offset);
    var node = new HexTileTreeNode(
        origin, 2 * this.width, 2 * this.height);
    node.tiles[zoomPerm[i]] = this;
    return node;
};

HexTileTreeNode.prototype.boundingBox = function boundingBox() {
    return this.box;
};

HexTileTreeNode.prototype.eachDataPoint = function eachDataPoint(each) {
    for (var i = 0; i < this.tiles.length; i++) {
        var tile = this.tiles[i];
        if (tile) {
            tile.eachDataPoint(each);
        } else {
            this._fakeDataPoints(i, each);
        }
    }
};

HexTileTreeNode.prototype._fakeDataPoints = function _fakeDataPoints(i, each) {
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

HexTileTreeNode.prototype.centerPoint = function centerPoint() {
    return this.origin;
};

HexTileTreeNode.prototype.get = function get(point) {
    var offsetPoint = point.toOddQOffset();
    if (!this.box.contains(offsetPoint)) {
        return NaN;
    }

    // TODO: assert
    // - origin.q - tileWidth <= offsetPoint.q <= origin.q + tileWidth
    // - origin.r - tileHeight <= offsetPoint.r <= origin.r + tileHeight

    // TODO: bit hack: negated sign-bit of subtraction
    var tileCol = offsetPoint.q < this.origin.q ? 0 : 1;
    var tileRow = offsetPoint.r < this.origin.r ? 0 : 1;

    var i = tileRow * 2 + tileCol;
    var tile = this.tiles[i];
    if (tile) {
        return tile.get(point);
    }
    return 0;
};

HexTileTreeNode.prototype.set = function set(point, c) {
    var offsetPoint = point.toOddQOffset();
    if (!this.box.contains(offsetPoint)) {
        throw new Error('set out of bounds');
    }
    return this._set(offsetPoint, c);
};

HexTileTreeNode.prototype._set = function _set(point, c) {
    // point known to be in bounds and correct type

    var tileCol = point.q < this.origin.q ? 0 : 1;
    var tileRow = point.r < this.origin.r ? 0 : 1;
    var i = tileRow * 2 + tileCol;

    var tile = this.tiles[i];
    if (!tile) {
        var origin = OddQOffset(this.origin.q, this.origin.r);
        if (point.q < origin.q) {
            origin.q -= this.tileWidth;
        }
        if (point.r < origin.r) {
            origin.r -= this.tileHeight;
        }
        // TODO: assert offset point in range

        // TODO: heuristic for when to create a sparse node instead
        tile = new OddQHexTile(origin, this.tileWidth, this.tileHeight);
        this.tiles[i] = tile;
    }

    return tile.set(point, c);
};
