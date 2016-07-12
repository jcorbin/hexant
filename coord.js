'use strict';

module.exports.ScreenPoint = ScreenPoint;
module.exports.CubePoint = CubePoint;
module.exports.OddQOffset = OddQOffset;
module.exports.OddQBox = OddQBox;

function ScreenPoint(x, y) {
    if (!(this instanceof ScreenPoint)) {
        return new ScreenPoint(x, y);
    }
    this.x = x;
    this.y = y;
}
ScreenPoint.prototype.type = 'point.screen';
ScreenPoint.prototype.copy = function copy() {
    return ScreenPoint(this.x, this.y);
};
ScreenPoint.prototype.copyFrom = function copyFrom(other) {
    this.x = other.x;
    this.y = other.y;
    return this;
};
ScreenPoint.prototype.toString = function toString() {
    return 'ScreenPoint(' + this.x + ', ' + this.y + ')';
};
ScreenPoint.prototype.toScreenInto = function toScreenInto(screenPoint) {
    screenPoint.x = this.x;
    screenPoint.y = this.y;
    return screenPoint;
};
ScreenPoint.prototype.toScreen = function toScreen() {
    return this;
};
ScreenPoint.prototype.scale = function scale(n) {
    this.x *= n;
    this.y *= n;
    return this;
};
ScreenPoint.prototype.mulBy = function mulBy(x, y) {
    this.x *= x;
    this.y *= y;
    return this;
};
ScreenPoint.prototype.add = function add(other) {
    if (other.type !== this.type) {
        other = other.toScreen();
    }
    this.x += other.x;
    this.y += other.y;
    return this;
};
ScreenPoint.prototype.sub = function sub(other) {
    if (other.type !== this.type) {
        other = other.toScreen();
    }
    this.x -= other.x;
    this.y -= other.y;
    return this;
};

function CubePoint(x, y, z) {
    if (!(this instanceof CubePoint)) {
        return new CubePoint(x, y, z);
    }
    if (x + y + z !== 0) {
        throw new Error(
            'CubePoint invariant violated: ' +
            x + ' + ' +
            y + ' + ' +
            z + ' = ' +
            (x + y + z));
    }
    this.x = x;
    this.y = y;
    this.z = z;
}
CubePoint.basis = [
    CubePoint(1, -1, 0), // SE -- 0, 1
    CubePoint(0, -1, 1), // S  -- 1, 2
    CubePoint(-1, 0, 1), // SW -- 2, 3
    CubePoint(-1, 1, 0), // NW -- 3, 4
    CubePoint(0, 1, -1), // N  -- 4, 5
    CubePoint(1, 0, -1)  // NE -- 5, 0
];
CubePoint.prototype.type = 'point.cube';
CubePoint.prototype.toString = function toString() {
    return 'CubePoint(' + this.x + ', ' + this.y + ', ' + this.z + ')';
};
CubePoint.prototype.copy = function copy() {
    return CubePoint(this.x, this.y, this.z);
};
CubePoint.prototype.copyFrom = function copyFrom(other) {
    if (other.type !== this.type) {
        return other.toCubeInto(this);
    }
    this.x = other.x;
    this.y = other.y;
    this.z = other.z;
    return this;
};
CubePoint.prototype.add = function add(other) {
    if (other.type !== this.type) {
        other = other.toCube();
    }
    this.x += other.x;
    this.y += other.y;
    this.z += other.z;
    return this;
};
CubePoint.prototype.sub = function sub(other) {
    if (other.type !== this.type) {
        other = other.toCube();
    }
    this.x -= other.x;
    this.y -= other.y;
    this.z -= other.z;
    return this;
};
CubePoint.prototype.toScreenInto = function toScreenInto(screenPoint) {
    screenPoint.x = 3 / 2 * this.x;
    screenPoint.y = Math.sqrt(3) * (this.z + this.x / 2);
    return screenPoint;
};
CubePoint.prototype.toScreen = function toScreen() {
    return this.toScreenInto(ScreenPoint());
};
CubePoint.prototype.toCubeInto = function toCubeInto(other) {
    other.x = this.x;
    other.y = this.y;
    other.z = this.z;
    return other;
};
CubePoint.prototype.toCube = function toCube() {
    return this;
};
CubePoint.prototype.toOddQOffset = function toOddQOffset() {
    var q = this.x;
    var r = this.z + (this.x - (this.x & 1)) / 2;
    return OddQOffset(q, r);
};
CubePoint.prototype.toOddQOffsetInto = function toOddQOffsetInto(oqo) {
    oqo.q = this.x;
    oqo.r = this.z + (this.x - (this.x & 1)) / 2;
};

function OddQOffset(q, r) {
    if (!(this instanceof OddQOffset)) {
        return new OddQOffset(q, r);
    }
    this.q = q;
    this.r = r;
}
OddQOffset.prototype.type = 'offset.odd-q';
OddQOffset.prototype.toString = function toString() {
    return 'OddQOffset(' + this.q + ', ' + this.r + ')';
};
OddQOffset.prototype.copy = function copy() {
    return OddQOffset(this.q, this.r);
};
OddQOffset.prototype.copyFrom = function copyFrom(other) {
    if (other.type !== this.type) {
        return this.copyFrom(other.toOddQOffset());
    }
    this.q = other.q;
    this.r = other.r;
    return this;
};
OddQOffset.prototype.add = function add(other) {
    if (other.type !== this.type) {
        other = other.toOddQOffset();
    }
    this.q += other.q;
    this.r += other.r;
    return this;
};
OddQOffset.prototype.sub = function sub(other) {
    if (other.type !== this.type) {
        other = other.toOddQOffset();
    }
    this.q -= other.q;
    this.r -= other.r;
    return this;
};
OddQOffset.prototype.mulBy = function mulBy(q, r) {
    this.q *= q;
    this.r *= r;
    return this;
};
OddQOffset.prototype.toScreenInto = function toScreenInto(screenPoint) {
    screenPoint.x = 3 / 2 * this.q;
    screenPoint.y = Math.sqrt(3) * (this.r + 0.5 * (this.q & 1));
    return screenPoint;
};
OddQOffset.prototype.toScreen = function toScreen() {
    return this.toScreenInto(ScreenPoint());
};
OddQOffset.prototype.toOddQOffset = function toOddQOffset() {
    return this;
};
OddQOffset.prototype.toOddQOffsetInto = function toOddQOffsetInto(oqo) {
    oqo.q = this.q;
    oqo.r = this.r;
};
OddQOffset.prototype.toCubeInto = function toCubeInto(other) {
    other.x = this.q;
    other.z = this.r - (this.q - (this.q & 1)) / 2;
    other.y = -other.x - other.z;
    return other;
};
OddQOffset.prototype.toCube = function toCube() {
    return this.toCubeInto(CubePoint());
};

function OddQBox(topLeft, bottomRight) {
    if (!(this instanceof OddQBox)) {
        return new OddQBox(topLeft, bottomRight);
    }
    this.topLeft = topLeft ? topLeft.toOddQOffset() : OddQOffset();
    this.bottomRight = bottomRight ? bottomRight.toOddQOffset() : OddQOffset();
}
OddQBox.prototype.copy = function copy() {
    return new OddQBox(this.topLeft.copy(), this.bottomRight.copy());
};
OddQBox.prototype.copyFrom = function copyFrom(other) {
    this.topLeft.copy(other.topLeft);
    this.bottomRight.copy(other.bottomRight);
    return this;
};
OddQBox.prototype.toString = function toString() {
    return 'OddQBox(' +
        this.topLeft.toString() + ', ' +
        this.bottomRight.toString() + ')';
};
OddQBox.prototype.screenCount = function screenCount(screenPoint) {
    return this.screenCountInto(ScreenPoint());
};
OddQBox.prototype.screenCountInto = function screenCountInto(screenPoint) {
    var W = this.bottomRight.q - this.topLeft.q;
    var H = this.bottomRight.r - this.topLeft.r;

    // return the count number of hexes needed in screen x space and screen y
    // space

    // first one is a unit, each successive column backs 1/4 with the last
    // var x = 1 + 3 / 4 * (W - 1);
    screenPoint.x = (3 * W + 1) / 4;

    // height backs directly, but we need an extra half cell except when we
    // have only one column
    screenPoint.y = H + (W > 1 ? 0.5 : 0);

    return screenPoint;
};
OddQBox.prototype.contains = function contains(pointArg) {
    var point = pointArg.toOddQOffset();
    return point.q >= this.topLeft.q && point.q < this.bottomRight.q &&
           point.r >= this.topLeft.r && point.r < this.bottomRight.r;
};
OddQBox.prototype.expandTo = function expandTo(pointArg) {
    var expanded = false;
    var point = pointArg.toOddQOffset();

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
};
