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
    this.cellXYs = new Float64Array(12);
}

HexGrid.prototype.toScreen =
function toScreen(point) {
    return point
        .toScreenInto(this.scratchPoint)
        .sub(this.boundTopLeft)
        .scale(this.cellSize)
        .add(this.origin)
        ;
};

HexGrid.prototype.circCellPath =
function circCellPath(point) {
    var screenPoint = this.toScreen(point);
    this.ctxHex.ctx2d.arc(screenPoint.x, screenPoint.y,
                          this.cellSize, 0, 2 * Math.PI);
    return screenPoint;
};

HexGrid.prototype.cellPath =
HexGrid.prototype.hexCellPath =
function hexCellPath(point) {
    var screenPoint = this.toScreen(point);
    this.ctxHex.fullWith(screenPoint.x, screenPoint.y, this.cellXYs);
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

    if (this.cellSize <= 2) {
        this.cellPath = this.circCellPath;
    } else {
        this.cellPath = this.hexCellPath;
        this.ctxHex.buildFor(this.cellSize, this.cellXYs);
    }

    // align top-left
    this.origin.copyFrom(this.cell).scale(0.5);

    this.canvas.width = this.cell.x * this.view.x;
    this.canvas.height = this.cell.y * this.view.y;
    this.canvas.style.width = this.canvas.width + 'px';
    this.canvas.style.height = this.canvas.height + 'px';
};
