'use strict';

var HexGrid = require('./hexgrid.js');
var NGonContext = require('./ngoncontext.js');

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
    this.defaultCellValue = 0;

    this.cellColorGen = null;
    this.bodyColorGen = null;
    this.headColorGen = null;

    this.cellColors = [];
    this.bodyColors = [];
    this.headColors = [];
    this.lastAntPos = [];

    this.hexGrid = new HexGrid(
        this.canvas, this.ctxHex,
        this.world.tile.boundingBox().copy());

    this.needsRedraw = false;
}

View.prototype.resize =
function resize(width, height) {
    this.hexGrid.resize(width, height);
    this.redraw();
};

View.prototype.redraw =
function redraw() {
    var self = this;
    var ants = self.world.ants;

    self.world.tile.eachDataPoint(function each(point, color) {
        color = color || self.defaultCellValue;
        if (color) {
            self.drawCell(point, color);
        }
    });

    for (var i = 0; i < ants.length; i++) {
        self.drawAnt(ants[i]);
        for (i = 0; i < ants.length; i++) {
            this.lastAntPos[i].copyFrom(ants[i].pos);
        }
    }
};

View.prototype.updateAnts =
function updateAnts() {
    var i;
    for (i = 0; i < this.world.ants.length; i++) {
        var ant = this.world.ants[i];
        if (i < this.lastAntPos.length) {
            this.lastAntPos[i].copyFrom(ant.pos);
        } else {
            this.lastAntPos.push(ant.pos.copy());
        }
    }
    while (i < this.lastAntPos.length) {
        this.lastAntPos.pop();
    }
    this.updateColors(false);
};

View.prototype.addAnt =
function addAnt(ant) {
    this.lastAntPos.push(ant.pos.copy());
    this.updateColors(false);
};

View.prototype.updateAnt =
function updateAnt(ant) {
    this.lastAntPos[ant.index].copyFrom(ant.pos);
    this.updateColors(false);
};

View.prototype.removeAnt =
function removeAnt(ant) {
    swapout(this.lastAntPos, ant.index);
    this.lastAntPos.pop();
    this.updateColors(false);
};

View.prototype.setColorGen =
function setColorGen(colorGen) {
    this.cellColorGen = colorGen(1);
    this.bodyColorGen = colorGen(2);
    this.headColorGen = colorGen(3);
    this.updateColors(true);
};

View.prototype.updateColors = function updateColors(regen) {
    var N = this.world.numStates;
    var M = this.world.ants.length;

    if (this.cellColorGen &&
        (regen || this.cellColors.length !== N)
    ) {
        this.cellColors = this.cellColorGen(N);
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
function drawUnlabeledCell(point, color) {
    this.ctx2d.beginPath();
    var screenPoint = this.hexGrid.cellPath(point);
    this.ctx2d.closePath();
    this.ctx2d.fillStyle = this.cellColors[color - 1];
    this.ctx2d.fill();
    return screenPoint;
};

View.prototype.drawLabeledCell =
function drawLabeledCell(point, color) {
    var screenPoint = this.drawUnlabeledCell(point, color);
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
    write(point.toCube().toString(), 0);
    write(point.toOddQOffset().toString(), 14);

    function write(mess, yoff) {
        var textWidth = ctx2d.measureText(mess).width;
        ctx2d.strokeText(
            mess,
            screenPoint.x - textWidth / 2,
            screenPoint.y + yoff);
    }
};

View.prototype.drawCell =
View.prototype.drawUnlabeledCell;

View.prototype.step =
function step() {
    var ants = this.world.ants;
    var i;

    var expanded = false;
    for (i = 0; i < ants.length; i++) {
        expanded = this.hexGrid.bounds.expandTo(ants[i].pos) || expanded;
    }

    if (expanded) {
        this.needsRedraw = true;
        this.hexGrid.updateSize();
    }

    if (this.needsRedraw) {
        return;
    }

    for (i = 0; i < ants.length; i++) {
        var color = this.world.tile.get(this.lastAntPos[i]);
        this.drawCell(this.lastAntPos[i], color);
    }

    for (i = 0; i < ants.length; i++) {
        this.drawAnt(ants[i]);
        this.lastAntPos[i].copyFrom(ants[i].pos);
    }

};

View.prototype.drawAnt =
function drawAnt(ant) {
    var color = this.world.tile.get(ant.pos);
    if (!color) {
        this.world.tile.set(ant.pos, 1);
        this.drawCell(ant.pos, color);
    }

    var screenPoint = this.hexGrid.toScreen(ant.pos);
    var size = this.hexGrid.cellSize * ant.size;

    if (size <= 5) {
        this.drawSmallAnt(ant, screenPoint, size);
    } else {
        this.drawFullAnt(ant, screenPoint, size);
    }

    if (this.labeled) {
        this.drawCellLabel(ant.pos, screenPoint);
    }
};

View.prototype.drawFullAnt =
function drawFullAnt(ant, screenPoint, size) {
    var ctxHex = this.hexGrid.ctxHex;
    var ctx2d = ctxHex.ctx2d;

    var start = ant.dir;
    var end = ant.dir + 1;

    // head
    ctx2d.fillStyle = this.headColors[ant.index];
    ctx2d.strokeStyle = this.headColors[ant.index];
    ctx2d.lineWidth = size / 2;
    ctx2d.beginPath();
    ctxHex.wedge(screenPoint.x, screenPoint.y, size, start, end, false);
    ctx2d.closePath();
    ctx2d.fill();
    ctx2d.stroke();

    // body
    ctx2d.fillStyle = this.bodyColors[ant.index];
    ctx2d.beginPath();
    ctxHex.wedge(screenPoint.x, screenPoint.y, size, start, end, true);
    ctx2d.closePath();
    ctx2d.fill();
};

View.prototype.drawSmallAnt =
function drawSmallAnt(ant, screenPoint, size) {
    var ctxHex = this.hexGrid.ctxHex;
    var ctx2d = ctxHex.ctx2d;

    ctx2d.fillStyle = this.headColors[ant.index];
    ctx2d.beginPath();
    ctxHex.full(screenPoint.x, screenPoint.y, size);
    ctx2d.closePath();
    ctx2d.fill();
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
