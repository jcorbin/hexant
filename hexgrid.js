'use strict';

// TODO: perhaps this whole module would be better done as a thinner
// NGonContext wrapper.  Essentially an equally-radius'd equally-spaced
// NGonContext.  This would force us to explicate the vertical-orientation
// assumption spread throughout HexGrid and its consumers.

var HexAspect = Math.sqrt(3) / 2;

module.exports = HexGrid;

function HexGrid(canvas, ctxHex) {
    this.canvas = canvas;
    this.viewWidth = 0;
    this.viewHeight = 0;
    this.ctxHex = ctxHex;
    this.cellSize = 0;
    this.cellWidth = 0;
    this.cellHeight = 0;
    this.hexOrigin = null;
    this.originX = 0;
    this.originY = 0;
    // TODO: support horizontal orientation
}

HexGrid.prototype.toScreen = function offsetCellPath(point) {
    if (this.hexOrigin) {
        point = point.copy().sub(this.hexOrigin.toCube());
    }
    var screenPoint = point.toScreen();
    screenPoint.x *= this.cellSize;
    screenPoint.y *= this.cellSize;
    screenPoint.x += this.originX;
    screenPoint.y += this.originY;
    return screenPoint;
};

HexGrid.prototype.cellPath = function offsetCellPath(point) {
    var screenPoint = this.toScreen(point);
    this.ctxHex.full(screenPoint.x, screenPoint.y, this.cellSize);
    return screenPoint;
};

HexGrid.prototype.satisfySize = function satisfySize(width, height, box) {
    var numCells = box.screenCount();
    this.cellWidth = width / numCells.x;
    this.cellHeight = height / numCells.y;

    var widthSize = this.cellWidth / 2;
    var heightSize = this.cellHeight / 2 / HexAspect;
    if (widthSize < heightSize) {
        this.cellSize = widthSize;
        this.cellHeight = this.cellWidth * HexAspect;
    } else {
        this.cellSize = heightSize;
        this.cellWidth = 2 * this.cellSize;
    }

    this.viewWidth = numCells.x;
    this.viewHeight = numCells.y;

    width = this.cellWidth * this.viewWidth;
    height = this.cellHeight * this.viewHeight;
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
};
