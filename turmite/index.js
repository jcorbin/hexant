'use strict';

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

Turmite.Step =
function step(world, ents) {
    var i;
    var turm;
    var tile = world.tile;

    // TODO: use world.getEnt{Pos,Dir}

    // execute all turns, maybe creating new turmites
    var n = ents.length;
    for (i = 0; i < n; ++i) {
        turm = ents[i];

        tile.update(turm.pos, update);
        world.turnEnt(this.index, executeTurn);

        // var next = null;
        // while (turn !== 0) {
        //     if (next === null) {
        //         next = turm;
        //     } else {
        //         next = turm.copy();
        //         ents.push(next);
        //     }
        //     turn = executeTurn(next, turn);
        //     world.tuneEnt(self.index, executeTurn);
        // }
    }

    // advance turmites
    for (i = 0; i < ents.length; ++i) {
        turm = ents[i];
        turm.pos.add(CubePoint.basis[turm.dir]);
    }

    // TODO: turmite collision check: annihilate all contenders
    // TODO: collision detection beyond our ent type
    // TODO: collision outcomes other than "all die"
    // for (i = 0; i < ents.length; ++i) {
    //     turm = ents[i];
    // }

    function update(data) {
        var color = data & 0x00ff;
        var flags = data & 0xff00;
        var ruleIndex = (turm.state << 8) | color;
        var rule = turm.rules[ruleIndex];
        turn = rule & 0x0000ffff;
        var write = (rule & 0x00ff0000) >> 16;
        turm.state = (rule & 0xff000000) >> 24;
        return flags | write | 0x0100; // TODO: World.FlagVisited
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

Turmite.prototype.copy =
function copy() {
    // TODO: pooled re-use
    var self = new Turmite();
    self.numStates = this.numStates;
    self.numColors = this.numColors;
    self.specString = this.specString;
    self.dir = this.dir;
    self.pos.copyFrom(this.pos);
    self.state = this.state;
    self.index = this.index;
    for (var i = 0; i < this.rules.length; ++i) {
        self.rules[i] = this.rules[i];
    }
    return self;
};
