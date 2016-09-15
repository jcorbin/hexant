'use strict';

// TODO: take over more code, currently this module only has code to be tested

function collectTombstone(tiles, i, length) {
    if (tiles[i] !== null) {
        throw new Error('not a tombstone');
    }

    var tileLength = tiles[i+1];
    tiles[i+1] = length;

    // coalesce range; we assume that we've been told an index of a usable set
    // of tombstones, and so don't range check here
    var j = i + 2;
    var spare = 0;
    for (; tileLength < length; j += 2) {
        tileLength += tiles[j+1];
        spare += 2;
    }

    // truncate (finish any coalesce)
    if (spare > 0) {
        var k = i + 2;
        while (j < tiles.length) {
            tiles[k++] = tiles[j++];
        }
        j = i + 2;
    }

    // distribute leftover
    if (length < tileLength) {
        var remain = tileLength - length;
        if (tiles[j] === null) {
            // easy, give it to the next tombstone
            tiles[j+1] += remain;
        } else {
            // split into new tombstone
            var n = tiles.length - j;
            if (spare >= 2) {
                spare -= 2;
            } else {
                tiles.push(0, 0);
            }
            var k = tiles.length - 1;
            for (; n-- > 0; k--) tiles[k] = tiles[k - 2];
            tiles[j] = null;
            tiles[j+1] = remain;
        }
    }

    tiles.length -= spare;
}

module.exports.collectTombstone = collectTombstone;
