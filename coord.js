'use strict';

module.exports.ScreenPoint = ScreenPoint;
module.exports.CubePoint = CubePoint;

function ScreenPoint(x, y) {
    if (!(this instanceof ScreenPoint)) {
        return new ScreenPoint(x, y);
    }
    this.x = x;
    this.y = y;
}
ScreenPoint.prototype.type = 'point.screen';
ScreenPoint.prototype.toString = function toString() {
    return 'ScreenPoint(' + this.x + ', ' + this.y + ')';
};
ScreenPoint.prototype.toScreen = function toScreen() {
    return this;
};

function CubePoint(x, y, z) {
    if (!(this instanceof CubePoint)) {
        return new CubePoint(x, y, z);
    }
    if (x + y + z !== 0) {
        throw new Error(
            'CubePoint invariant violated: ' + x + ' + ' + y + ' + ' + z + ' = ' + (x + y + z)
        );
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
CubePoint.prototype.toScreen = function toScreen() {
    var screenX = 3 / 2 * this.x;
    var screenY = Math.sqrt(3) * (this.z + this.x / 2);
    return ScreenPoint(screenX, screenY);
};
CubePoint.prototype.toCube = function toCube() {
    return this;
};
