'use strict';

var Coord = require('./coord.js');
var OddQOffset = Coord.OddQOffset;
var OddQBox = Coord.OddQBox;
var installPool = require('./pool.js');

module.exports = OddQHexTile;

function OddQHexTile() {
    this.id = OddQHexTile.NextId++;
    this.origin = new Coord.OddQOffset(0, 0);
    this.oqo = new Coord.OddQOffset(0, 0);
    this.width = 0;
    this.height = 0;
    this.data = null;
    this.dirty = false;
}

OddQHexTile.NextId = 0;

OddQHexTile.prototype.init =
function init(origin, width, height) {
    origin.toOddQOffsetInto(this.origin);
    this.width = width;
    this.height = height;
    this.data = new Uint16Array(this.width * this.height);
    this.dirty = false;
    return this;
};

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

OddQHexTile.prototype.eachTile =
function eachTile(each) {
    each(this);
};

OddQHexTile.prototype.eachDataPoint =
function eachDataPoint(each, fill, replace) {
    var point = this.oqo;
    var loQ = this.origin.q;
    var loR = this.origin.r;
    var hiQ = loQ + this.width;
    var hiR = loR + this.height;
    var i = 0;
    for (point.r = loR; point.r < hiR; point.r++) {
        for (point.q = loQ; point.q < hiQ; point.q++, i++) {
            each(point, this.data[i]);
        }
    }
};

OddQHexTile.prototype.expandBoxTo =
function expandBoxTo(tl, br, mask) {
    var tlq = this.origin.q;
    var tlr = this.origin.r;
    var brq = tlq + this.width;
    var brr = tlr + this.height;
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
};

OddQHexTile.prototype.expandBoxToIf =
function expandBoxToIf(tl, br, mask) {
    var q = this.origin.q, r = this.origin.r, i = 0;

    // if any part of the box isn't defined, initialize from the first masked
    // point
    if (isNaN(tl.q) || isNaN(tl.r) || isNaN(br.q) || isNaN(br.r)) {
        while (i < this.data.length) {
            if (this.data[i] & mask) {
                tl.q = q;
                br.q = q;
                tl.r = r;
                br.r = r;
                break;
            }
            i++;
            q++;
            if (q >= this.origin.q + this.width) {
                q = this.origin.q;
                r++;
            }
        }
    }

    // now just expand to each masked point
    while (i < this.data.length) {
        if (this.data[i] & mask) {
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
        if (q >= this.origin.q + this.width) {
            q = this.origin.q;
            r++;
        }
    }
};

installPool(OddQHexTile);
