'use strict';

var test = require('tape');

var tileglbuf = require('../tileglbuffer.js');

[
    {
        desc: 'pathological base case',
        tiles: [],
        capacity: 0,
        length: 0,
        expected: [0, 0, 0]
    },

    {
        desc: 'empty base case',
        tiles: [],
        capacity: 0,
        length: 1,
        expected: [-1, -1, -1]
    },

    {
        desc: 'singleton base case',
        tiles: [],
        capacity: 1,
        length: 1,
        expected: [0, 0, 0]
    },

    {
        desc: 'singleton in a doubleton world',
        tiles: [],
        capacity: 2,
        length: 1,
        expected: [0, 0, 1]
    },

    {
        desc: 'second single fills a doubleton world',
        tiles: [
            1, 1
        ],
        capacity: 2,
        length: 1,
        expected: [2, 1, 0]
    },

    {
        desc: '1. empty 64Ki buffer + 4Ki tile',
        tiles: [],
        capacity: 0x10000,
        length: 0x1000,
        expected: [0, 0, 0xf000]
    },

    {
        desc: '2. ... + 4Ki tile',
        tiles: [
            1, 0x1000
        ],
        capacity: 0x10000,
        length: 0x1000,
        expected: [2, 0x1000, 0xe000]
    },

    {
        desc: '3. ... + 4Ki tile',
        tiles: [
            1, 0x1000,
            2, 0x1000
        ],
        capacity: 0x10000,
        length: 0x1000,
        expected: [4, 0x2000, 0xd000]
    },

    {
        desc: '4. ... + 4Ki tile',
        tiles: [
            1, 0x1000,
            2, 0x1000,
            3, 0x1000
        ],
        capacity: 0x10000,
        length: 0x1000,
        expected: [6, 0x3000, 0xc000]
    },

    {
        desc: '5. ... + 4Ki tile',
        tiles: [
            1, 0x1000,
            2, 0x1000,
            3, 0x1000,
            4, 0x1000
        ],
        capacity: 0x10000,
        length: 0x1000,
        expected: [8, 0x4000, 0xb000]
    },

    {
        desc: '6. ... 4x remove ... + 16Ki tile',
        tiles: [
            null, 0x1000,
            null, 0x1000,
            null, 0x1000,
            null, 0x1000,
            5, 0x1000
        ],
        capacity: 0x10000,
        length: 0x4000,
        expected: [0, 0, 0]
    },

    {
        desc: '7. ... + 5x 4Ki ... remove 4 of them ... + 16Ki tile',
        tiles: [
            6, 0x4000,
            5, 0x1000,
            null, 0x1000,
            null, 0x1000,
            null, 0x1000,
            null, 0x1000,
            11, 0x1000
        ],
        capacity: 0x10000,
        length: 0x4000,
        expected: [4, 0x5000, 0]
    }

].forEach(function testEach(testCase) {
    test('placeTile: ' + testCase.desc, function t(assert) {
        var tiles = testCase.tiles.slice(0);
        assert.deepEqual(
            tileglbuf.placeTile(tiles, testCase.capacity, testCase.length),
            testCase.expected,
            JSON.stringify(testCase.expected));
        assert.end();
    });
});

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
