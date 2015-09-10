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
    this.antBodyColorGen = null;
    this.antHeadColorGen = null;

    this.cellColors = [];
    this.antBodyColors = [];
    this.antHeadColors = [];
    this.lastAntPos = [];

    this.hexGrid = new HexGrid(
        this.canvas, this.ctxHex,
        this.world.tile.boundingBox().copy());
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

    self.world.tile.eachDataPoint(function each(point, c) {
        c = c || self.defaultCellValue;
        if (c) {
            self.drawCell(point, c);
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
    this.antBodyColorGen = colorGen(2);
    this.antHeadColorGen = colorGen(3);
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

    if (this.antBodyColorGen &&
        (regen || this.antBodyColors.length !== M)
    ) {
        this.antBodyColors = this.antBodyColorGen(M);
    }

    if (this.antHeadColorGen &&
        (regen || this.antHeadColors.length !== M)
    ) {
        this.antHeadColors = this.antHeadColorGen(M);
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
function drawUnlabeledCell(point, c) {
    this.ctx2d.beginPath();
    var screenPoint = this.hexGrid.cellPath(point);
    this.ctx2d.closePath();
    this.ctx2d.fillStyle = this.cellColors[c - 1];
    this.ctx2d.fill();
    return screenPoint;
};

View.prototype.drawLabeledCell =
function drawLabeledCell(point, c) {
    var screenPoint = this.drawUnlabeledCell(point, c);
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
        this.hexGrid.updateSize();
        this.redraw();

        return;
    }

    for (i = 0; i < ants.length; i++) {
        var c = this.world.tile.get(this.lastAntPos[i]);
        this.drawCell(this.lastAntPos[i], c);
    }

    for (i = 0; i < ants.length; i++) {
        this.drawAnt(ants[i]);
        this.lastAntPos[i].copyFrom(ants[i].pos);
    }

};

View.prototype.drawAnt =
function drawAnt(ant) {
    var c = this.world.tile.get(ant.pos);
    if (!c) {
        this.world.tile.set(ant.pos, 1);
        this.drawCell(ant.pos, c);
    }

    var ctxHex = this.hexGrid.ctxHex;
    var ctx2d = ctxHex.ctx2d;

    var start = ant.dir;
    var end = ant.dir + 1;
    var screenPoint = this.hexGrid.toScreen(ant.pos);
    var size = this.hexGrid.cellSize * ant.size;

    // head
    ctx2d.fillStyle = this.antHeadColors[ant.index];
    ctx2d.strokeStyle = this.antHeadColors[ant.index];
    ctx2d.lineWidth = size / 2;
    ctx2d.beginPath();
    ctxHex.wedge(screenPoint.x, screenPoint.y, size, start, end, false);
    ctx2d.closePath();
    ctx2d.fill();
    ctx2d.stroke();

    // body
    ctx2d.fillStyle = this.antBodyColors[ant.index];
    ctx2d.beginPath();
    ctxHex.wedge(screenPoint.x, screenPoint.y, size, start, end, true);
    ctx2d.closePath();
    ctx2d.fill();

    if (this.labeled) {
        this.drawCellLabel(ant.pos, screenPoint);
    }
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
