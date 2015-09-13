'use strict';

var Coord = require('./coord.js');
var OddQBox = Coord.OddQBox;
var ScreenPoint = Coord.ScreenPoint;

// TODO: perhaps this whole module would be better done as a thinner
// NGonContext wrapper.  Essentially an equally-radius'd equally-spaced
// NGonContext.  This would force us to explicate the vertical-orientation
// assumption spread throughout HexGrid and its consumers.

var HexAspect = Math.sqrt(3) / 2;

module.exports = HexGrid;

// TODO: support horizontal orientation

function HexGrid(canvas, ctxHex, bounds) {
    this.canvas = canvas;
    this.ctxHex = ctxHex;
    this.bounds = bounds || OddQBox();
    this.view = ScreenPoint();
    this.cell = ScreenPoint();
    this.origin = ScreenPoint();
    this.avail = ScreenPoint();
    this.cellSize = 0;
    this.scratchPoint = ScreenPoint();
    this.boundTopLeft = ScreenPoint();
}

HexGrid.prototype.internalize =
function internalize(point) {
    // TODO: hack, better compromise than the broken-ness of doing the sub in
    // odd-q space
    return point
        .toScreenInto(this.scratchPoint)
        // .copy()
        // .toOddQOffset()
        .sub(this.boundTopLeft)
        ;
};

HexGrid.prototype.toScreen =
function toScreen(point) {
    return this.internalize(point)
        .scale(this.cellSize)
        .add(this.origin)
        ;
};

HexGrid.prototype.cellPath =
function cellPath(point) {
    var screenPoint = this.toScreen(point);
    this.ctxHex.full(screenPoint.x, screenPoint.y, this.cellSize);
    return screenPoint;
};

HexGrid.prototype.resize =
function resize(width, height) {
    this.avail.x = width;
    this.avail.y = height;
    this.updateSize();
};

// TODO: need this?
// this.canvas.width = this.avail.x;
// this.canvas.height = this.avail.y;

HexGrid.prototype.updateSize =
function updateSize() {
    this.bounds.topLeft.toScreenInto(this.boundTopLeft);
    this.bounds.screenCountInto(this.view);
    this.cell.x = this.avail.x / this.view.x;
    this.cell.y = this.avail.y / this.view.y;
    var widthSize = this.cell.x / 2;
    var heightSize = this.cell.y / 2 / HexAspect;
    if (widthSize < heightSize) {
        this.cellSize = widthSize;
        this.cell.y = this.cell.x * HexAspect;
    } else {
        this.cellSize = heightSize;
        this.cell.x = 2 * this.cellSize;
    }

    // align top-left
    this.origin.copyFrom(this.cell).scale(0.5);

    this.canvas.width = this.cell.x * this.view.x;
    this.canvas.height = this.cell.y * this.view.y;
    this.canvas.style.width = this.canvas.width + 'px';
    this.canvas.style.height = this.canvas.height + 'px';
};
