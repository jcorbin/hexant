'use strict';

var Coord = require('./coord.js');
var HexGrid = require('./hexgrid.js');
var Ant = require('./ant.js');
var colorGen = require('./colorgen.js');
var HexTileTree = require('./hextiletree.js');
var NGonContext = require('./ngoncontext.js');

var OddQOffset = Coord.OddQOffset;

module.exports = HexAntWorld;

function HexAntWorld(canvas) {
    this.canvas = canvas;
    this.ctx2d = this.canvas.getContext('2d');
    this.ctxHex = new NGonContext(6, this.ctx2d);

    this.cellColorGen = colorGen(0.75, 0.4);
    this.antBodyColorGen = colorGen(0.85, 0.5);
    this.antHeadColorGen = colorGen(0.95, 0.6);

    this.cellColors = [];
    this.antBodyColors = [];
    this.antHeadColors = [];

    this.tile = new HexTileTree(OddQOffset(0, 0), 2, 2);

    this.hexGrid = new HexGrid(
        this.canvas, this.ctxHex,
        this.tile.boundingBox().copy());
    this.ants = [];

    this.labeled = false;

    this.defaultCellValue = 0;
}

HexAntWorld.prototype.setLabeled = function setLabeled(labeled) {
    this.labeled = labeled;
    if (this.labeled) {
        this.drawCell = this.drawLabeledCell;
    } else {
        this.drawCell = this.drawUnlabeledCell;
    }
};

HexAntWorld.prototype.step = function step() {
    for (var i = 0; i < this.ants.length; i++) {
        var ant = this.ants[i];
        ant.step();
    }
};

HexAntWorld.prototype.stepDraw = function stepDraw() {
    for (var i = 0; i < this.ants.length; i++) {
        var ant = this.ants[i];
        ant.stepDraw();
    }
    if (this.tile.resized) {
        this.tile.resized = false;
        this.hexGrid.bounds.copyFrom(this.tile.boundingBox());
        this.hexGrid.updateSize();
        this.redraw();
    }
};

HexAntWorld.prototype.resize = function resize(width, height) {
    this.hexGrid.resize(width, height);
    this.redraw();
};

HexAntWorld.prototype.redraw = function redraw() {
    var self = this;

    self.tile.eachDataPoint(function each(point, c) {
        c = c || self.defaultCellValue;
        if (c) {
            self.drawCell(point, c);
        }
    });

    for (var i = 0; i < self.ants.length; i++) {
        self.ants[i].redraw();
    }
};

HexAntWorld.prototype.drawUnlabeledCell = function drawCell(point, c) {
    this.ctx2d.beginPath();
    var screenPoint = this.hexGrid.cellPath(point);
    this.ctx2d.closePath();
    this.ctx2d.fillStyle = this.cellColors[c - 1];
    this.ctx2d.fill();
    return screenPoint;
};

HexAntWorld.prototype.drawLabeledCell = function drawCell(point, c) {
    var screenPoint = this.drawUnlabeledCell(point, c);
    this.drawCellLabel(point, screenPoint);
};

HexAntWorld.prototype.drawCellLabel =
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

HexAntWorld.prototype.drawCell = HexAntWorld.prototype.drawUnlabeledCell;

HexAntWorld.prototype.addAnt = function addAnt() {
    var ant = new Ant(this);
    if (this.ants.length === 0) {
        ant.pos = this.tile.centerPoint().toCube();
    }
    var c = this.tile.get(ant.pos);
    if (!c) {
        this.tile.set(ant.pos, 1);
    }
    this.ants.push(ant);

    this.cellColors = this.cellColorGen(Math.max(
        this.cellColors.length, ant.rules.length));

    this.antBodyColors = this.antBodyColorGen(this.ants.length);
    this.antHeadColors = this.antHeadColorGen(this.ants.length);

    for (var i = 0; i < this.ants.length; i++) {
        this.ants[i].bodyColor = this.antBodyColors[i];
        this.ants[i].headColor = this.antHeadColors[i];
    }

    return ant;
};
