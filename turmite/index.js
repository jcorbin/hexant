'use strict';

/* eslint no-multi-spaces:0 consistent-this:0 */

var Coord = require('../coord.js');
var CubePoint = Coord.CubePoint;
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
    '\nant(<number>?<turn> ...) , turns:\n' +
    '  - L=left, R=right\n' +
    '  - B=back, F=forward\n' +
    '  - P=port, S=starboard (these are rear-facing left/right)\n'
    ;

function Turmite() {
    this.numStates = 0;
    this.numColors = 0;
    this.rules = new Uint32Array(64 * 1024);
    this.specString = '';

    this.dir = 0;
    this.oldDir = 0;

    this.pos = CubePoint(0, 0, 0);
    this.oldPos = CubePoint(0, 0, 0);

    this.state = 0;
    this.stateKey = 0;

    this.size = 0.5;
    this.index = 0;
}

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
    var compile = res.value;
    return compile(ent || new Turmite());
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
    var tile = world.tile;
    var data = tile.get(this.pos);
    var color = data & 0x00ff;
    var flags = data & 0xff00;

    var ruleIndex = this.stateKey | color;
    var rule = this.rules[ruleIndex];
    var turn = rule & 0x0000ffff;
    var write = (rule & 0x00ff0000) >> 16;
    var nextState = (rule & 0xff000000) >> 24;

    flags |= 0x0100; // TODO: World constant
    data = flags | write;
    tile.set(this.pos, data);

    this.oldDir = this.dir;
    this.oldPos.copyFrom(this.pos);

    if (nextState !== this.state) {
        this.state = nextState;
        this.stateKey = nextState << 8;
    }

    turn = this.executeTurn(turn);
    this.pos.add(CubePoint.basis[this.dir]);
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
    //     turn = self.executeTurn(turn);
    //     self.pos.add(CubePoint.basis[self.dir]);
    // }
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
//     self.stateKey = this.stateKey;
//     self.size = this.size;
//     self.index = this.index;

//     // TODO: add to world

//     return self;
// };

Turmite.prototype.executeTurn =
function executeTurn(turn) {
    var t = 1;
    for (; t <= 0x0020; t <<= 1) {
        if (turn & t) {
            this.dir = (6 + this.oldDir + constants.RelTurnDelta[t]) % 6;
            return turn & ~t;
        }
    }
    for (; t <= 0x0800; t <<= 1) {
        if (turn & t) {
            this.dir = constants.AbsTurnDir[t];
            return turn & ~t;
        }
    }
    // TODO: assert that turn is 0?
    return 0;
};
