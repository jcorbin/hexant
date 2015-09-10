'use strict';

var Coord = require('./coord.js');
var CubePoint = Coord.CubePoint;

module.exports = Ant;

function Ant(world) {
    this.index = 0;
    this.world = world;
    this.pos = CubePoint(0, 0, 0);
    this.dir = 0;
    this.size = 0.5;
    this.rules = [-1, 1];
}

Ant.prototype.step = function step() {
    var tile = this.world.tile;
    var c = tile.get(this.pos) || 1;
    var rule = this.rules[(c - 1) % this.rules.length];
    c = tile.set(this.pos, 1 + c % this.world.numStates);
    this.dir = (CubePoint.basis.length + this.dir + rule
               ) % CubePoint.basis.length;
    this.pos.add(CubePoint.basis[this.dir]);
};
