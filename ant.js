'use strict';

var Coord = require('./coord.js');
var CubePoint = Coord.CubePoint;

module.exports = Ant;

function Ant(world) {
    this.world = world;
    this.pos = CubePoint(0, 0, 0);
    this.dir = 0;
    this.headColor = '#eee';
    this.bodyColor = '#ccc';
    this.size = 0.5;
    this.rules = [-1, 1];
}

Ant.prototype.step = function step() {
    var tile = this.world.tile;
    var c = tile.get(this.pos) || 1;
    var rule = this.rules[(c - 1) % this.rules.length];
    c = tile.set(this.pos, 1 + c % this.world.cellColors.length);
    this.dir = (CubePoint.basis.length + this.dir + rule
               ) % CubePoint.basis.length;
    this.pos.add(CubePoint.basis[this.dir]);
};

Ant.prototype.stepDraw = function stepDraw() {
    var tile = this.world.tile;
    var c = tile.get(this.pos) || 1;
    var rule = this.rules[(c - 1) % this.rules.length];
    c = tile.set(this.pos, 1 + c % this.world.cellColors.length);
    this.dir = (CubePoint.basis.length + this.dir + rule
               ) % CubePoint.basis.length;
    this.world.drawCell(this.pos, c);
    this.pos.add(CubePoint.basis[this.dir]);
    this.redraw();
};

Ant.prototype.redraw = function redraw() {
    var ctxHex = this.world.hexGrid.ctxHex;
    var ctx2d = ctxHex.ctx2d;

    var start = this.dir;
    var end = this.dir + 1;
    var screenPoint = this.world.hexGrid.toScreen(this.pos);
    var size = this.world.hexGrid.cellSize * this.size;

    // head
    ctx2d.fillStyle = this.headColor;
    ctx2d.strokeStyle = this.headColor;
    ctx2d.lineWidth = size / 2;
    ctx2d.beginPath();
    ctxHex.wedge(screenPoint.x, screenPoint.y, size, start, end, false);
    ctx2d.closePath();
    ctx2d.fill();
    ctx2d.stroke();

    // body
    ctx2d.fillStyle = this.bodyColor;
    ctx2d.beginPath();
    ctxHex.wedge(screenPoint.x, screenPoint.y, size, start, end, true);
    ctx2d.closePath();
    ctx2d.fill();

    if (this.world.labeled) {
        this.world.drawCellLabel(this.pos, screenPoint);
    }
};
