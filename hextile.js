'use strict';

var Coord = require('./coord.js');
var OddQOffset = Coord.OddQOffset;
var OddQBox = Coord.OddQBox;

module.exports = OddQHexTile;

function OddQHexTile(origin, width, height) {
    this.origin = origin.toOddQOffset();
    this.oqo = new Coord.OddQOffset(0, 0);
    this.width = width;
    this.height = height;
    this.data = new Uint16Array(this.width * this.height);
}

OddQHexTile.prototype.boundingBox =
function boundingBox() {
    return OddQBox(this.origin, this.origin.copy().addTo(this.width, this.height));
};

OddQHexTile.prototype.centerPoint =
function centerPoint() {
    return OddQOffset(
        this.origin.q + Math.floor(this.width / 2),
        this.origin.r + Math.floor(this.height / 2)
    );
};

OddQHexTile.prototype.pointToIndex =
function pointToIndex(point) {
    point.toOddQOffsetInto(this.oqo);
    return (this.oqo.r - this.origin.r) * this.width +
           (this.oqo.q - this.origin.q);
};

OddQHexTile.prototype.update =
function update(point, func) {
    var i = this.pointToIndex(point);
    this.data[i] = func(this.data[i], point);
};

OddQHexTile.prototype.get =
function get(point) {
    return this.data[this.pointToIndex(point)];
};

OddQHexTile.prototype.set =
function set(point, datum) {
    this.data[this.pointToIndex(point)] = datum;
    return datum;
};

OddQHexTile.prototype.eachDataPoint =
function eachDataPoint(each) {
    var loQ = this.origin.q;
    var loR = this.origin.r;
    var hiQ = loQ + this.width;
    var hiR = loR + this.height;
    var point = OddQOffset(loQ, loR);
    var i;
    for (i = 0, point.r = loR; point.r < hiR; point.r++) {
        for (point.q = loQ; point.q < hiQ; point.q++, i++) {
            each(point, this.data[i]);
        }
    }
};
