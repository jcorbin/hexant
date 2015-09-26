'use strict';

/* eslint no-multi-spaces:0 consistent-this:0 */

var Coord = require('../coord.js');
var World = require('../world.js');
var CubePoint = Coord.CubePoint;
var constants = require('./constants.js');

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
    '  - BL=back-left BR=back-right\n'
    ;

Turmite.Kinds = {
    'ant': parseAnt
};

function parseAnt(str, turmite) {
    str = str.toUpperCase();

    // we'll also build the canonical version of the parsed rule string in the
    // same pass as parsing it; rulestr will be that string, and we'll need
    // some state between arg matches
    var numColors    = 0;
    var buildRuleStr = RLEBuilder('ant(', ' ', ')');

    // TODO: describe
    var state    = 0;
    var color    = 0;
    var stateKey = state << 8;
    var rule     = stateKey | color;

    parseArgs(/\s*(\d+)?(B|BL|L|F|R|BR)\s*/g, str,
        function eachArg(_, nStr, sym) {
            var mult = nStr ? parseInt(nStr, 10) : 1;
            var relturn = constants.RelSymbolTurns[sym];
            numColors += mult;
            if (numColors > World.MaxColor) {
                return new Error('too many colors needed for ant ruleset');
            }

            for (var j = 0; j < mult; j++) {
                var nextRule        = stateKey | ++color & World.MaxColor;
                turmite.rules[rule] = nextRule << 16 | relturn;
                rule                = nextRule;
            }
            buildRuleStr(mult, sym);
        });
    var rulestr = buildRuleStr(0, '');

    // now that we've compiled the base case, we need to cover the rest of the
    // (state, color) key space for numColors < color <= World.MaxColor; this
    // essentially pre-computes "color modulo numColors" as a static rule table
    // lookup so that no modulo logic is required in .step below (at least
    // explicitly, since unsigned integer wrap-around is modulo 2^bits)
    while (color > 0 && color <= World.MaxColor) {
        var baseRule        = stateKey |   color % numColors;
        var nextRule        = stateKey | ++color & World.MaxColor;
        var turn            = turmite.rules[baseRule] & 0x0000ffff;
        turmite.rules[rule] = nextRule << 16 | turn;
        rule                = nextRule;
    }

    turmite.state = state;
    turmite.specString = rulestr;
    turmite.numColors = numColors;
    turmite.numStates = 1;

    return null;
}

function RLEBuilder(prefix, sep, suffix) {
    build.prefix = prefix;
    build.sep    = sep;
    build.suffix = suffix;
    build.cur    = '';
    build.count  = 0;
    build.str    = build.prefix;
    build.init   = true;
    return build;

    function build(mult, sym) {
        if (build.cur !== sym) {
            if (build.cur && build.count) {
                if (build.init) {
                    build.init = false;
                } else {
                    build.str += build.sep;
                }
                if (build.count > 1) {
                    build.str += build.count.toString();
                }
                build.str += build.cur;
            }
            build.cur = sym || '';
            build.count = 0;
        }
        if (mult === 0 && !sym) {
            var ret     = build.str + build.suffix;
            build.cur   = '';
            build.count = 0;
            build.str   = build.prefix;
            build.init  = false;
            return ret;
        }
        build.count += mult;
        return '';
    }
}

function Turmite(rules) {
    this.numStates = 0;
    this.numColors = 0;
    this.rules = rules || new Uint32Array(64 * 1024);
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

var antCompatMap = {
    L: 'L',
    R: 'R',
    W: 'BL',
    E: 'BR',
    F: 'B',
    A: 'F'
};

function antCompatConvert(str) {
    str = str.toUpperCase();
    var equivMoves = [];
    for (var i = 0; i < str.length; i++) {
        var equivMove = antCompatMap[str[i]];
        if (equivMove === undefined) {
            return undefined;
        }
        equivMoves.push(equivMove);
    }
    return 'ant(' + equivMoves.join(' ') + ')';
}

Turmite.prototype.parse =
function parseTurmite(str) {
    var match = /^\s*(\w+)\(\s*(.+?)\s*\)\s*$/.exec(str);
    if (!match) {
        var equivAnt = antCompatConvert(str);
        if (equivAnt !== undefined) {
            return this.parse(equivAnt);
        }
        return new Error('invalid spec string');
    }
    var kind = match[1].toLowerCase();
    var args = match[2];

    var parseKind = Turmite.Kinds[kind];
    if (!parseKind) {
        return new Error('no such turmite kind');
    }

    return parseKind(args, this);
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

function parseArgs(re, str, each) {
    var i = 0;
    for (
        var match = re.exec(str);
        match && i === match.index;
        i += match[0].length, match = re.exec(str)
    ) {
        each.apply(null, match);
    }

    // TODO: check if didn't match full input
}

function main() {
    var turm = new Turmite(null);
    var err = Turmite.parse('ant(L R LL RRR 5L 8R 13L 21R)', turm);
    if (err) {
        console.error(err);
    } else {
        // console.log(turm.toString());
        console.log(
            // turm.rules
            new Buffer(
                new Uint8Array(turm.rules.buffer)
            ).toString()
        );
    }
}

if (require.main === module) {
    main();
}
