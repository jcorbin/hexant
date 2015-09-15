'use strict';

var Coord = require('./coord.js');
var World = require('./world.js');
var CubePoint = Coord.CubePoint;

Ant.ruleHelp = 'W=West, L=Left, A=Ahead, R=Right, E=East, F=Flip';

var Rules = {
    W: -2,
    L: -1,
    A: 0,
    R: 1,
    E: 2,
    F: 3
};

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

Ant.prototype.toString =
function toString() {
    var ruleKeys = Object.keys(Rules);
    var rule = '';
    for (var i = 0; i < this.numStates; i++) {
        for (var j = 0; j < ruleKeys.length; j++) {
            if (this.rules[i] === Rules[ruleKeys[j]]) {
                rule += ruleKeys[j];
                break;
            }
        }
    }
    return rule;
};

Ant.prototype.parse =
function parseAnt(rule) {
    rule = rule.toUpperCase();
    var parts = rule.split('');
    var rules = [];
    for (var i = 0; i < parts.length; i++) {
        var r = Rules[parts[i]];
        if (r !== undefined) {
            rules.push(r);
        }
    }
    this.setRules(rules);
    return null;
};

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
