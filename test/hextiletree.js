'use strict';

var test = require('tape');

var OddQOffset = require('../coord.js').OddQOffset;
var OddQHexTile = require('../hextile.js');
// var HexTileTree = require('../hextiletree.js');
require('../hextiletree.js');

[
    OddQOffset(-1, -1),
    OddQOffset(0, -1),
    OddQOffset(-1, 0),
    OddQOffset(0, 0)
].forEach(function each(origin, i) {
    var plan = [
        ['initTile', origin, 1, 1],
        ['check', [[0]]],
        ['set', origin, 1],
        ['check', [[1]]]
    ];
    for (var n = 1; n <= 3; n++) {
        var N = Math.pow(2, n);
        var expected = zeros(N);
        var row = expected[(N + origin.r) % N];
        row[(N + origin.q) % N] = 1;
        plan.push(
            ['grow', i],
            ['check', expected]);
    }
    testPlan('grow(' + i + ')', plan);

});

var Actions = {};

Actions.initTile = function initTile(origin, width, height) {
    this.tile = new OddQHexTile(origin, width, height);
};

Actions.set = function set(point, value) {
    this.tile.set(point, value);
};

Actions.grow = function grow(i) {
    this.tile = this.tile.grow(i);
};

Actions.check = function check(expected) {
    var topLeft = this.tile.boundingBox().topLeft;
    var out = [];
    this.tile.eachDataPoint(function each(point, d) {
        var q = point.q - topLeft.q;
        var r = point.r - topLeft.r;
        var row = out[r] || (out[r] = []);
        row[q] = d;
    });

    this.assert.deepEqual(out, expected, 'expected ' + disp(expected));
};

function testPlan(desc, plan) {
    test(desc, function t(assert) {
        runTestPlan(assert, plan);
        assert.end();
    });
}

function runTestPlan(assert, plan) {
    var ctx = {
        assert: assert,
        tile: null
    };
    plan.forEach(function eachStep(inst) {
        // assert.comment(disp(inst));
        Actions[inst[0]].apply(ctx, inst.slice(1));
        // console.log(ctx.tile.dump());
    });
}

function disp(arg) {
    if (Array.isArray(arg)) {
        return '[' + arg.map(disp).join(' ') + ']';
    }

    return arg.toString();
}

function zeros(N) {
    var ar = [];
    for (var i = 0; i < N; i++) {
        ar[i] = [];
        for (var j = 0; j < N; j++) {
            ar[i][j] = 0;
        }
    }
    return ar;
}
