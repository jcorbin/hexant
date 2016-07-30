'use strict';

var Coord = require('../coord.js');
var CubePoint = Coord.CubePoint;
var World = require('../world.js');
var constants = require('./constants.js');
var parseTurmite = require('./parse.js');

module.exports = Turmite;

/*
 * state, color -> nextState, write, turn
 *
 * index struct {
 *     state u8
 *     color u8
 * }
 *
 * rule struct {
 *     nextState u8
 *     write     u8
 *     turn      u16 // bit-field
 * }
 */

Turmite.ruleHelp =
    'ant(<number>?<turn> ...) , turns:\n' +
    '  - L=left, R=right\n' +
    '  - B=back, F=forward\n' +
    '  - P=port, S=starboard (these are rear-facing left/right)\n' +
    '\n' +
    'See README for full turmite language details.'
    ;

function Turmite() {
    this.numStates = 0;
    this.numColors = 0;
    this.rules = new Uint32Array(64 * 1024);
    this.specString = '';

    this.dir = 0;
    this.pos = CubePoint(0, 0, 0);

    this.state = 0;

    this.index = 0;
}

Turmite.prototype.reset =
function reset() {
    this.state = 0;
};

Turmite.prototype.clearRules =
function clearRules() {
    for (var i = 0; i < this.rules.length; i++) {
        this.rules[i] = 0;
    }
};

Turmite.parse =
function parse(str) {
    return parseTurmite(str);
};

Turmite.compile =
function compile(str, ent) {
    var res = Turmite.parse(str);
    if (res.err) {
        return res;
    }
    var func = res.value;
    return func(ent || new Turmite());
};

Turmite.prototype.toString =
function toString() {
    if (this.specString) {
        return this.specString;
    }
    return '<UNKNOWN turmite>';
};

Turmite.prototype.step =
function step(world) {
    var self = this;
    var tile = world.tile;
    var pos = world.getEntPos(this.index);
    var turn = 0;

    tile.update(pos, update);
    world.turnEnt(this.index, executeTurn);
    if (turn !== 0) {
        throw new Error('turmite forking unimplemented');
    }

    // TODO: WIP
    // var self = null;
    // while (turn !== 0) {
    //     if (self) {
    //         self = self.fork();
    //     } else {
    //         self = this;
    //     }
    //     world.tuneEnt(self.index, executeTurn);
    // }

    function update(data) {
        var color = data & 0x00ff;
        var flags = data & 0xff00;
        var ruleIndex = self.state << 8 | color;
        var rule = self.rules[ruleIndex];
        turn = rule & 0x0000ffff;
        var write = (rule & 0x00ff0000) >> 16;
        self.state = (rule & 0xff000000) >> 24;
        return World.FlagVisited | flags | write | 0x0100;
    }

    function executeTurn(dir) {
        var t = 1;
        for (; t <= 0x0020; t <<= 1) {
            if (turn & t) {
                turn &= ~t;
                return (6 + dir + constants.RelTurnDelta[t]) % 6;
            }
        }
        for (; t <= 0x0800; t <<= 1) {
            if (turn & t) {
                turn &= ~t;
                return constants.AbsTurnDir[t];
            }
        }
        if (turn !== 0) {
            throw new Error('unrecognized turning constant ' + turn);
        }
        return dir;
    }
};

// TODO: WIP
// Turmite.prototype.fork =
// function fork() {
//     // TODO: ability to steal an already allocated ant from world pool
//     var self = new Turmite(this.world, this.rules);

//     // self.world = this.world;
//     // self.rules = this.rules;

//     self.numStates = this.numStates;
//     self.numColors = this.numColors;
//     self.specString = this.specString;
//     self.dir = this.oldDir;
//     self.oldDir = this.oldDir;
//     self.pos.copyFrom(this.oldPos);
//     self.oldPos.copyFrom(this.oldPos);
//     self.state = this.state;
//     self.size = this.size;
//     self.index = this.index;

//     // TODO: add to world

//     return self;
// };
