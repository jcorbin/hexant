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
    this.rules = new Int8Array(World.MaxColor + 1);

    this.setRules([-1, 1]);
}

Ant.prototype.setRules =
function setRules(rules) {
    var N = rules.length;
    for (var i = 0; i < N; i++) {
        this.rules[i] = rules[i];
    }
    for (; i <= World.MaxColor; i++) {
        this.rules[i] = rules[i % N];
    }

    this.numStates = N;
    this.numColors = N;
};

Ant.prototype.step =
function step() {
    var tile = this.world.tile;
    var data = tile.get(this.pos);
    var color = data & World.MaskColor;
    var rule = this.rules[color];
    color = (color + 1) & World.MaxColor;
    data = data | World.FlagVisited;
    data = data & World.MaskFlags | color;
    tile.set(this.pos, data);
    this.dir = (CubePoint.basis.length + this.dir + rule
               ) % CubePoint.basis.length;
    this.pos.add(CubePoint.basis[this.dir]);
};
