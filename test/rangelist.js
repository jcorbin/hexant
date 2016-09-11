'use strict';

var test = require('tape');

var rangeListAdd = require('../rangelist.js').add;

[
    // add zero-width -> noop
    [[], [10, 10], []],

    // empty -> add one
    [[], [10, 20], [10, 20]],

    // one -> add disjoint -> two
    [[10, 20], [30, 40], [10, 20, 30, 40]],

    // one -> add tangent -> one
    [[10, 20], [21, 30], [10, 30]],
    [[10, 20], [0, 9], [0, 20]],

    // two -> add middle {co,half}-tangent
    [[10, 20, 30, 40], [21, 29], [10, 40]],
    [[10, 20, 30, 40], [21, 25], [10, 25, 30, 40]],
    [[10, 20, 30, 40], [25, 29], [10, 20, 25, 40]],

    // two -> add tangent that spans/subsumes first
    [[10, 20, 30, 40], [9, 29], [9, 40]],
    [[10, 20, 30, 40], [5, 29], [5, 40]],
    [[10, 20, 30, 40], [10, 30], [10, 40]],
    [[10, 20, 30, 40], [9, 30], [9, 40]],
    [[10, 20, 30, 40], [5, 30], [5, 40]],
    [[10, 20, 30, 40], [10, 31], [10, 40]],
    [[10, 20, 30, 40], [9, 31], [9, 40]],
    [[10, 20, 30, 40], [5, 31], [5, 40]],
    [[10, 20, 30, 40], [10, 35], [10, 40]],
    [[10, 20, 30, 40], [9, 35], [9, 40]],
    [[10, 20, 30, 40], [5, 35], [5, 40]],

    // two -> add tangent that spans/subsumes second
    [[10, 20, 30, 40], [21, 40], [10, 40]],
    [[10, 20, 30, 40], [21, 41], [10, 41]],
    [[10, 20, 30, 40], [21, 45], [10, 45]],
    [[10, 20, 30, 40], [20, 40], [10, 40]],
    [[10, 20, 30, 40], [20, 41], [10, 41]],
    [[10, 20, 30, 40], [20, 45], [10, 45]],
    [[10, 20, 30, 40], [19, 40], [10, 40]],
    [[10, 20, 30, 40], [19, 41], [10, 41]],
    [[10, 20, 30, 40], [19, 45], [10, 45]],
    [[10, 20, 30, 40], [15, 40], [10, 40]],
    [[10, 20, 30, 40], [15, 41], [10, 41]],
    [[10, 20, 30, 40], [15, 45], [10, 45]],

    // two -> add whole span / subsume
    [[10, 20, 30, 40], [10, 40], [10, 40]],
    [[10, 20, 30, 40], [9, 41], [9, 41]],
    [[10, 20, 30, 40], [5, 45], [5, 45]],
].forEach(function testEachCase(testCase) {
    var start = testCase[0];
    var add = testCase[1];
    var expect = testCase[2];
    var desc = JSON.stringify(start) + ' -> add ' + JSON.stringify(add);

    test(desc, function t(assert) {
        var rl = start.slice(0);
        for (var i = 0; i < add.length; i+=2) {
            rangeListAdd(rl, add[i], add[i+1]);
        }
        assert.deepEquals(rl, expect);
        assert.end();
    });
});

var rangeListSub = require('../rangelist.js').sub;

[
    // sub zero-width -> noop
    [[], [10, 10], []],

    // empty -> sub one
    [[], [10, 20], []],

    // one -> sub middle -> two
    [[10, 40], [21, 29], [10, 20, 30, 40]],

    // one -> sub tail -> one
    [[10, 40], [30, 40], [10, 29]],

    // one -> sub head -> one
    [[10, 40], [10, 20], [21, 40]],

    // two -> sub span -> two
    [[10, 20, 30, 40], [15, 35], [10, 14, 36, 40]],

    // three -> sub exact middle -> two
    [[10, 20, 30, 40, 50, 60], [30, 40], [10, 20, 50, 60]],

    // three -> sub span middle -> two
    [[10, 20, 30, 40, 50, 60], [25, 45], [10, 20, 50, 60]],
    [[10, 20, 30, 40, 50, 60], [15, 55], [10, 14, 56, 60]],

].forEach(function testEachCase(testCase) {
    var start = testCase[0];
    var sub = testCase[1];
    var expect = testCase[2];
    var desc = JSON.stringify(start) + ' -> sub ' + JSON.stringify(sub);

    test(desc, function t(assert) {
        var rl = start.slice(0);
        for (var i = 0; i < sub.length; i+=2) {
            rangeListSub(rl, sub[i], sub[i+1]);
        }
        assert.deepEquals(rl, expect);
        assert.end();
    });
});
