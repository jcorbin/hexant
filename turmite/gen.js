'use strict';

var Turmite = require('./index.js');

module.exports.rulesSimilarity = rulesSimilarity;
module.exports.randomAnt = randomAnt;
module.exports.specSimilarity = specSimilarity;

// XXX copied from parse.js
var antPattern = /^\s*ant\(\s*(.+?)\s*\)\s*$/;

function specSimilarity(a, b) {
    a = antTurns(a);
    b = antTurns(b);
    if (a === null || b === null) {
        return 0;
    }
    return 1 - levenshtein(a, b) / (a + b);
    // return jaroDistance(a, b);

    function antTurns(str) {
        var match = antPattern.exec(str);
        if (!match) {
            return null;
        }
        return match[1];
    }
}

function levenshtein(a, b) {
    var t = [], u, i, j, m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    for (j = 0; j <= n; j++) t[j] = j;
    for (i = 1; i <= m; i++) {
        for (u = [i], j = 1; j <= n; j++) {
            u[j] = a[i - 1] === b[j - 1]
                ? t[j - 1]
                : Math.min(t[j - 1], t[j], u[j - 1]) + 1;
        }
        t = u;
    }
    return u[n];
}

// function jaroDistance(a, b) {
//     if (a.length === 0 && b.length === 0) return 1;
//     if (a.length === 0 || b.length === 0) return 0;
//     var i, k, aMatches = [], bMatches = [];

//     var m = 0;
//     var matchDistance = Math.max(a.length, b.length) / 2 - 1;
//     for (i = 0; i < a.length; ++i) {
//         var end = Math.min(i + matchDistance + 1, b.length);
//         for (k = Math.max(0, i - matchDistance); k < end; ++k) {
//             if (!bMatches[k] && a[i] === b[k]) {
//                 aMatches[i] = true;
//                 bMatches[k] = true;
//                 m++;
//                 break;
//             }
//         }
//     }
//     if (m === 0) return 0;

//     var t = 0.0;
//     for (i = 0, k = 0; i < a.length; ++i) {
//         if (aMatches[i]) {
//             while (!bMatches[k]) k++;
//             if (a[i] !== b[k++]) t += 0.5
//         }
//     }

//     return (m / a.length + m / b.length + (m - t) / m) / 3.0;
// }

/*
 * A Turmite rules table is a 2^16 array of 32-bit words:
 * - the 64Ki entries are organized in 256 groups of 256.
 * - we'll call each group of 256 a "mode" since it
 *   represents a state that its turmite may be in.
 * - each 32-bit words is broken down thusly:
 *   - 0xff000000 -- the high byte is the next state.
 *   - 0x00ff0000 -- the next byte is the color to write.
 *   - 0x0000ffff -- the lower two bytes encode turns as a bit field:
 *     - bits 0x0020 thru 0x0001 are relative turns
 *     - bits 0x0800 thru 0x0040 are absolute turns
 *     - bits 0x8000 thru 0x1000 are unused
 */

// TODO: maybe move to constants?
var MODE_SIZE  = 256;
var STATE_MASK = 0xff000000;
var COLOR_MASK = 0x00ff0000;
var TURN_MASK  = 0x0000ffff;
var TURN_NBITS = popcount(TURN_MASK);

var RelTurns = 'LRPSBF'

// TODO: moar generation:
// - multi-modal rules
// - mixing from canned components
// - mixing from components extracted from priors
// - pertubations on such

// randomAnt builds a random ant into the i-th mode of a rules table by:
// - choosing a random order in the range [2, 256]
// - choosing order-many random relative turns
// - stamping out ant tranistion rules into specified mode
//
// It may be passed a function randi(lo, hi) that returns a random integer in
// the half-open range [lo, hi).
function randomAnt(randi) {
    if (typeof randi !== 'function') {
        randi = randint;
    }
    var turns = randomTurns(randi);
    var spec = 'ant(' + turns.join(' ') + ')';
    return Turmite.compile(spec).toValue();
}

function randomTurns(randi) {
    var order = randi(2, 256);
    var turns = [];
    while (turns.length < order) {
        turns.push(RelTurns[randi(0, RelTurns.length)]);
    }
    return turns;
}

function randint(lo, hi) {
    return Math.floor(lo + Math.random() * (hi - lo));
}

// rulesSimilarity computes a similarity score in the range [0.0, 1.0] of the
// rules a and b by averaging together all of their corresponding mode
// similarity scores.
//
// TODO: this doesn't account for things like mode renames, to get there'd we'd
// have to start doing things like:
// - score each mode of a against each mode of b, and take its best score...
// - ...but that could make unreasonable scores, so probably find the most
//   advantageous premutation of Modes_A X Modes_B...
// - ...however we probably want to be doing even more complex convolutions
//   than that...
function rulesSimilarity(a, b) {
    var score = 0;
    for (var i = 0; i < 256; ++i) {
        score += modeSimilarity(a, b, i) / 256;
    }
    return score;
}

// modeSimilarity computes a similarity score in the range [0.0, 1.0] of the
// i-th mode of rules a and b by averaging together all of their corresponding
// rule similarity scores
function modeSimilarity(a, b, i) {
    var score = 0;
    for (var j = i * MODE_SIZE, k = 0; k < MODE_SIZE; j++, k++) {
        score += ruleSimilarity(a[j], b[j]) / 256;
    }
    return score;
}

// ruleSimilarity computes a similarity score in the range [0.0, 1.0] of a
// given entry from a rules table.
function ruleSimilarity(a, b) {
    if (a === b) {
        return 1;
    }
    var score = 0;
    if (a & STATE_MASK === b & STATE_MASK) {
        score++;
    }
    if (a & COLOR_MASK === b & COLOR_MASK) {
        score++;
    }
    score += popcount(~(a & TURN_MASK ^ b & TURN_MASK) & TURN_MASK);
    return score / (2 + TURN_NBITS);
}

function popcount(b) {
    var n = 0;
    while (b > 0) {
        n += b & 0x01;
        b >>= 1;
    }
    return n;
}
