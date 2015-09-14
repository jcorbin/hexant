'use strict';

var Coord = require('./coord.js');
var World = require('./world.js');
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
    var data = tile.get(this.pos);
    var color = data & World.MaskColor;
    var rule = this.rules[color % this.rules.length];
    color = (color + 1) % this.world.numStates;
    data = data | World.FlagVisited;
    data = data & World.MaskFlags | color;
    tile.set(this.pos, data);
    this.dir = (CubePoint.basis.length + this.dir + rule
               ) % CubePoint.basis.length;
    this.pos.add(CubePoint.basis[this.dir]);
};
