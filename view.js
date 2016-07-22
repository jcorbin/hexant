'use strict';

var HexGrid = require('./hexgrid.js');
var NGonContext = require('./ngoncontext.js');
var World = require('./world.js');

module.exports = View;

function View(world, canvas) {
    if (!(this instanceof View)) {
        return new View(world, canvas);
    }
    this.world = world;
    this.canvas = canvas;

    this.ctx2d = this.canvas.getContext('2d');
    this.ctxHex = new NGonContext(6, this.ctx2d);

    this.labeled = false;
    this.drawUnvisited = false;
    this.drawTrace = false;
    this.entSize = 0.5;

    this.antCellColorGen = null;
    this.emptyCellColorGen = null;
    this.bodyColorGen = null;
    this.headColorGen = null;

    this.cellColors = null;
    this.antCellColors = [];
    this.emptyCellColors = [];
    this.bodyColors = [];
    this.headColors = [];
    this.lastEntPos = [];

    this.hexGrid = new HexGrid(
        this.canvas, this.ctxHex,
        this.world.tile.boundingBox().copy());
    this.updateSize();

    this.needsRedraw = false;

    this.boundDrawEachCell = drawEachCell;
    this.boundMaybeDrawEachCell = maybeDrawEachCell;

    var self = this;

    function drawEachCell(point, data) {
        self.drawCell(point,
                      data & World.MaskColor,
                      self.cellColors);
    }

    function maybeDrawEachCell(point, data) {
        if (data & World.FlagVisited) {
            self.drawCell(point,
                          data & World.MaskColor,
                          self.cellColors);
        }
    }
}

View.prototype.updateSize =
function updateSize() {
    this.hexGrid.updateSize();
    this.featureSize = this.hexGrid.cellSize * this.entSize;
};

View.prototype.setDrawTrace =
function setDrawTrace(dt) {
    this.drawTrace = !!dt;
    this.cellColors = this.drawTrace ? this.emptyCellColors : this.antCellColors;
};

View.prototype.resize =
function resize(width, height) {
    this.hexGrid.resize(width, height);
    this.updateSize();
    this.redraw();
};

View.prototype.redraw =
function redraw() {
    if (this.cellColors === null) {
        return;
    }
    var ents = this.world.ents;
    this.world.tile.eachDataPoint(this.drawUnvisited ? this.boundDrawEachCell : this.boundMaybeDrawEachCell);
    for (var i = 0; i < ents.length; i++) {
        this.drawEnt(i);
    }
    this.needsRedraw = false;
};

View.prototype.updateEnts =
function updateEnts() {
    var i;
    for (i = 0; i < this.world.ents.length; i++) {
        var pos = this.world.getEntPos(i);
        if (i < this.lastEntPos.length) {
            this.lastEntPos[i].copyFrom(pos);
        } else {
            this.lastEntPos.push(pos.copy());
        }
    }
    while (i < this.lastEntPos.length) {
        this.lastEntPos.pop();
    }
    this.updateColors(false);
};

View.prototype.addEnt =
function addEnt(i) {
    this.lastEntPos.push(this.world.getEntPos(i).copy());
    this.updateColors(false);
};

View.prototype.updateEnt =
function updateEnt(i) {
    this.lastEntPos[i].copyFrom(this.world.getEntPos(i));
    this.updateColors(false);
};

View.prototype.removeEnt =
function removeEnt(i) {
    swapout(this.lastEntPos, i);
    this.lastEntPos.pop();
    this.updateColors(false);
};

View.prototype.setColorGen =
function setColorGen(colorGen) {
    this.emptyCellColorGen = colorGen(0);
    this.antCellColorGen = colorGen(1);
    this.bodyColorGen = colorGen(2);
    this.headColorGen = colorGen(3);
    this.updateColors(true);
};

View.prototype.updateColors = function updateColors(regen) {
    var N = this.world.numColors;
    var M = this.world.ents.length;

    if (this.emptyCellColorGen &&
        (regen || this.emptyCellColors.length !== N)
    ) {
        this.emptyCellColors = this.emptyCellColorGen(N);
        while (this.emptyCellColors.length <= World.MaxColor) {
            this.emptyCellColors.push(
                this.emptyCellColors[this.emptyCellColors.length % N]
            );
        }
        if (this.drawTrace) {
            this.cellColors = this.emptyCellColors;
        }
    }

    if (this.antCellColorGen &&
        (regen || this.antCellColors.length !== N)
    ) {
        this.antCellColors = this.antCellColorGen(N);
        while (this.antCellColors.length <= World.MaxColor) {
            this.antCellColors.push(
                this.antCellColors[this.antCellColors.length % N]
            );
        }
        if (!this.drawTrace) {
            this.cellColors = this.antCellColors;
        }
    }

    if (this.bodyColorGen &&
        (regen || this.bodyColors.length !== M)
    ) {
        this.bodyColors = this.bodyColorGen(M);
    }

    if (this.headColorGen &&
        (regen || this.headColors.length !== M)
    ) {
        this.headColors = this.headColorGen(M);
    }
};

View.prototype.setLabeled =
function setLabeled(labeled) {
    this.labeled = labeled;
    if (this.labeled) {
        this.drawCell = this.drawLabeledCell;
    } else {
        this.drawCell = this.drawUnlabeledCell;
    }
};

View.prototype.drawUnlabeledCell =
function drawUnlabeledCell(point, color, colors) {
    this.ctx2d.beginPath();
    var screenPoint = this.hexGrid.cellPath(point);
    this.ctx2d.closePath();
    this.ctx2d.fillStyle = colors[color];
    this.ctx2d.fill();
    return screenPoint;
};

View.prototype.drawLabeledCell =
function drawLabeledCell(point, color, colors) {
    var screenPoint = this.drawUnlabeledCell(point, color, colors);
    this.drawCellLabel(point, screenPoint);
};

View.prototype.drawCellLabel =
function drawCellLabel(point, screenPoint) {
    if (!screenPoint) {
        screenPoint = this.hexGrid.toScreen(point);
    }

    var ctx2d = this.ctx2d;
    ctx2d.lineWidth = 1;
    ctx2d.strokeStyle = '#fff';
    this._writeText(screenPoint, point.toCube().toString(), 0);
    this._writeText(screenPoint, point.toOddQOffset().toString(), 14);
};

View.prototype.drawCell =
View.prototype.drawUnlabeledCell;

View.prototype.step =
function step() {
    var ents = this.world.ents;
    var i;

    var expanded = false;
    for (i = 0; i < ents.length; i++) {
        expanded = this.hexGrid.bounds.expandTo(this.world.getEntPos(i)) || expanded;
    }

    if (expanded) {
        this.needsRedraw = true;
        this.updateSize();
    }

    if (this.needsRedraw) {
        return;
    }

    for (i = 0; i < ents.length; i++) {
        var data = this.world.tile.get(this.lastEntPos[i]);
        this.drawCell(this.lastEntPos[i],
                      data & World.MaskColor,
                      this.antCellColors);
    }

    for (i = 0; i < ents.length; i++) {
        this.drawEnt(i);
    }
};

View.prototype.drawEnt =
function drawEnt(i) {
    var pos = this.world.getEntPos(i);
    var data = this.world.tile.get(pos);
    if (!(data & World.FlagVisited)) {
        data = this.world.tile.set(pos, data | World.FlagVisited);
        this.drawCell(pos,
                      data & World.MaskColor,
                      this.antCellColors);
    }

    var screenPoint = this.hexGrid.toScreen(pos);

    if (this.featureSize <= 5) {
        this.drawSmallEnt(i, screenPoint);
    } else {
        this.drawFullEnt(i, screenPoint);
    }

    if (this.labeled) {
        this.drawCellLabel(pos, screenPoint);
    }

    this.lastEntPos[i].copyFrom(pos);
};

View.prototype.drawFullEnt =
function drawFullEnt(i, screenPoint) {
    var ctxHex = this.hexGrid.ctxHex;
    var ctx2d = ctxHex.ctx2d;

    var dir = this.world.getEntDir(i);

    // head
    ctx2d.fillStyle = this.headColors[i];
    ctx2d.strokeStyle = this.headColors[i];
    ctx2d.lineWidth = this.featureSize / 2;
    ctx2d.beginPath();
    ctxHex.wedge(screenPoint.x, screenPoint.y, this.featureSize, dir, dir + 1, false);
    ctx2d.closePath();
    ctx2d.fill();
    ctx2d.stroke();

    // body
    ctx2d.fillStyle = this.bodyColors[i];
    ctx2d.beginPath();
    ctxHex.wedge(screenPoint.x, screenPoint.y, this.featureSize, dir, dir + 1, true);
    ctx2d.closePath();
    ctx2d.fill();
};

View.prototype.drawSmallEnt =
function drawSmallEnt(i, screenPoint) {
    var ctxHex = this.hexGrid.ctxHex;
    var ctx2d = ctxHex.ctx2d;

    ctx2d.fillStyle = this.headColors[i];
    ctx2d.beginPath();
    ctxHex.full(screenPoint.x, screenPoint.y, this.featureSize);
    ctx2d.closePath();
    ctx2d.fill();
};

View.prototype._writeText =
function _writeText(screenPoint, mess, yoff) {
    var textWidth = this.ctx2d.measureText(mess).width;
    this.ctx2d.strokeText(
        mess,
        screenPoint.x - textWidth / 2,
        screenPoint.y + yoff);
};

function swapout(ar, i) {
    var j = i;
    var old = ar[i];
    for (j = i++; i < ar.length; i++, j++) {
        ar[j] = ar[i];
    }
    ar[j] = old;
    return j;
}
