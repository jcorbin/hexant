'use strict';

module.exports.ScreenPoint = ScreenPoint;

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
