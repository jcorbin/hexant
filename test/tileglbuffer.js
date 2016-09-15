'use strict';

var test = require('tape');

var tileglbuf = require('../tileglbuffer.js');

[
    {
        desc: 'nothing to do, story checks out',
        start: [
            1, 32,
            null, 32,
            3, 32
        ],
        collect: [2, 32],
        expected: [
            1, 32,
            null, 32,
            3, 32
        ]
    },
    {
        desc: 'need to split',
        start: [
            1, 32,
            null, 32,
            3, 32
        ],
        collect: [2, 16],
        expected: [
            1, 32,
            null, 16,
            null, 16,
            3, 32
        ]
    },
    {
        desc: 'can gift',
        start: [
            1, 32,
            null, 32,
            null, 32,
            3, 32
        ],
        collect: [2, 16],
        expected: [
            1, 32,
            null, 16,
            null, 48,
            3, 32
        ]
    },
    {
        desc: 'coalesce-2, but then it works out',
        start: [
            1, 32,
            null, 32,
            null, 32,
            4, 32
        ],
        collect: [2, 64],
        expected: [
            1, 32,
            null, 64,
            4, 32
        ]
    },
    {
        desc: 'coalesce-2 and split',
        start: [
            1, 32,
            null, 32,
            null, 48,
            4, 32
        ],
        collect: [2, 64],
        expected: [
            1, 32,
            null, 64,
            null, 16,
            4, 32
        ]
    },
    {
        desc: 'coalesce-2 and gift',
        start: [
            1, 32,
            null, 32,
            null, 48,
            null, 8,
            4, 32
        ],
        collect: [2, 64],
        expected: [
            1, 32,
            null, 64,
            null, 24,
            4, 32
        ]
    },
    {
        desc: 'coalesce-3, but then it works out',
        start: [
            1, 32,
            null, 32,
            null, 32,
            null, 32,
            4, 32
        ],
        collect: [2, 96],
        expected: [
            1, 32,
            null, 96,
            4, 32
        ]
    },
    {
        desc: 'coalesce-3 and split',
        start: [
            1, 32,
            null, 32,
            null, 48,
            null, 32,
            4, 32
        ],
        collect: [2, 96],
        expected: [
            1, 32,
            null, 96,
            null, 16,
            4, 32
        ]
    },
    {
        desc: 'coalesce-3 and gift',
        start: [
            1, 32,
            null, 32,
            null, 48,
            null, 32,
            null, 8,
            4, 32
        ],
        collect: [2, 96],
        expected: [
            1, 32,
            null, 96,
            null, 24,
            4, 32
        ]
    }
].forEach(function testEach(testCase) {
    test('collectTombstone: ' + testCase.desc, function t(assert) {
        var tiles = testCase.start.slice(0);
        for (var i = 0; i < testCase.collect.length; i+=2) {
            var j = testCase.collect[i];
            var n = testCase.collect[i+1];
            tileglbuf.collectTombstone(tiles, j, n);
        }
        assert.deepEqual(tiles, testCase.expected, JSON.stringify(testCase.expected));
        assert.end();
    });
});
