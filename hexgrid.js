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
    this.cellWidth = 0;
    this.cellHeight = 0;
    this.hexOrigin = null;
    this.origin = ScreenPoint();
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
    var view = box.screenCount();
    this.cellWidth = width / view.x;
    this.cellHeight = height / view.y;

    var widthSize = this.cellWidth / 2;
    var heightSize = this.cellHeight / 2 / HexAspect;
    if (widthSize < heightSize) {
        this.cellSize = widthSize;
        this.cellHeight = this.cellWidth * HexAspect;
    } else {
        this.cellSize = heightSize;
        this.cellWidth = 2 * this.cellSize;
    }

    this.canvas.width = this.cellWidth * view.x;
    this.canvas.height = this.cellHeight * view.y;
    this.canvas.style.width = this.canvas.width + 'px';
    this.canvas.style.height = this.canvas.height + 'px';
};
