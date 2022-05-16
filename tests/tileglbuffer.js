// @ts-check

import test from 'ava';

import {
  placeTile,
  scavengeTombstone,
} from '../src/tileglbuffer.js';

for (const { desc, tiles, capacity, length, expected } of [

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
      0, 0x1000,
      0, 0x1000,
      0, 0x1000,
      0, 0x1000,
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
      0, 0x1000,
      0, 0x1000,
      0, 0x1000,
      0, 0x1000,
      11, 0x1000
    ],
    capacity: 0x10000,
    length: 0x4000,
    expected: [4, 0x5000, 0]
  }

]) test(`placeTile: ${desc}`, t => t.deepEqual(
  placeTile(tiles.slice(0), capacity, length),
  expected,
  JSON.stringify(expected)));

for (const { desc, start, collect, expected } of [

  {
    desc: 'nothing to do, story checks out',
    start: [
      1, 32,
      0, 32,
      3, 32
    ],
    collect: [2, 32],
    expected: [
      1, 32,
      0, 32,
      3, 32
    ]
  },

  {
    desc: 'need to split',
    start: [
      1, 32,
      0, 32,
      3, 32
    ],
    collect: [2, 16],
    expected: [
      1, 32,
      0, 16,
      0, 16,
      3, 32
    ]
  },

  {
    desc: 'can gift',
    start: [
      1, 32,
      0, 32,
      0, 32,
      3, 32
    ],
    collect: [2, 16],
    expected: [
      1, 32,
      0, 16,
      0, 48,
      3, 32
    ]
  },

  {
    desc: 'coalesce-2, but then it works out',
    start: [
      1, 32,
      0, 32,
      0, 32,
      4, 32
    ],
    collect: [2, 64],
    expected: [
      1, 32,
      0, 64,
      4, 32
    ]
  },

  {
    desc: 'coalesce-2 and split',
    start: [
      1, 32,
      0, 32,
      0, 48,
      4, 32
    ],
    collect: [2, 64],
    expected: [
      1, 32,
      0, 64,
      0, 16,
      4, 32
    ]
  },

  {
    desc: 'coalesce-2 and gift',
    start: [
      1, 32,
      0, 32,
      0, 48,
      0, 8,
      4, 32
    ],
    collect: [2, 64],
    expected: [
      1, 32,
      0, 64,
      0, 24,
      4, 32
    ]
  },

  {
    desc: 'coalesce-3, but then it works out',
    start: [
      1, 32,
      0, 32,
      0, 32,
      0, 32,
      4, 32
    ],
    collect: [2, 96],
    expected: [
      1, 32,
      0, 96,
      4, 32
    ]
  },

  {
    desc: 'coalesce-3 and split',
    start: [
      1, 32,
      0, 32,
      0, 48,
      0, 32,
      4, 32
    ],
    collect: [2, 96],
    expected: [
      1, 32,
      0, 96,
      0, 16,
      4, 32
    ]
  },

  {
    desc: 'coalesce-3 and gift',
    start: [
      1, 32,
      0, 32,
      0, 48,
      0, 32,
      0, 8,
      4, 32
    ],
    collect: [2, 96],
    expected: [
      1, 32,
      0, 96,
      0, 24,
      4, 32
    ]
  }

]) test(`scavengeTombstone: ${desc}`, t => {
  const tiles = start.slice(0);
  for (var i = 0; i < collect.length;) {
    const j = collect[i++];
    const n = collect[i++];
    scavengeTombstone(tiles, j, n);
  }
  t.deepEqual(tiles, expected, JSON.stringify(expected));
});
