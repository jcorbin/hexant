'use strict';

var Coord = require('./coord.js');
var ScreenPoint = Coord.ScreenPoint;

// TODO: perhaps this whole module would be better done as a thinner
// NGonContext wrapper.  Essentially an equally-radius'd equally-spaced
// NGonContext.  This would force us to explicate the vertical-orientation
// assumption spread throughout HexGrid and its consumers.

var HexAspect = Math.sqrt(3) / 2;

module.exports = HexGrid;

// TODO: support horizontal orientation

function HexGrid(canvas, ctxHex) {
    this.canvas = canvas;
    this.ctxHex = ctxHex;
    this.cell = ScreenPoint();
    this.hexOrigin = null;
    this.origin = ScreenPoint();
    this.avail = ScreenPoint();
    this.cellSize = 0;
}

HexGrid.prototype.internalize =
function internalize(point) {
    if (this.hexOrigin) {
        point = point.copy();
        point = point.toOddQOffset();
        point.sub(this.hexOrigin);
    }
    return point;
};

HexGrid.prototype.toScreen =
function toScreen(point) {
    return this.internalize(point)
        .toScreen()
        .scale(this.cellSize)
        .add(this.origin);
};

HexGrid.prototype.cellPath =
function offsetCellPath(point) {
    var screenPoint = this.toScreen(point);
    this.ctxHex.full(screenPoint.x, screenPoint.y, this.cellSize);
    return screenPoint;
};

HexGrid.prototype.satisfySize =
function satisfySize(width, height, box) {
    this.avail.x = width;
    this.avail.y = height;

    var view = box.screenCount();
    this.cell.x = this.avail.x / view.x;
    this.cell.y = this.avail.y / view.y;
    var widthSize = this.cell.x / 2;
    var heightSize = this.cell.y / 2 / HexAspect;
    if (widthSize < heightSize) {
        this.cellSize = widthSize;
        this.cell.y = this.cell.x * HexAspect;
    } else {
        this.cellSize = heightSize;
        this.cell.x = 2 * this.cellSize;
    }

    this.canvas.width = this.cell.x * view.x;
    this.canvas.height = this.cell.y * view.y;
    this.canvas.style.width = this.canvas.width + 'px';
    this.canvas.style.height = this.canvas.height + 'px';
};
