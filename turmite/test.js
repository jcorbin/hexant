/* global console, process, Buffer */
/* eslint no-console:0 */

'use strict';

var hex = require('hexer');
var Turmite = require('./index.js');

var bufs = [];
process.stdin.on('data', function read(chunk) {
    bufs.push(chunk);
});
process.stdin.on('error', function onError(err) {
    console.error(err);
    return;
});
process.stdin.on('end', function end() {
    var buf = Buffer.concat(bufs);
    var str = buf.toString();

    // dump(str);
    roundTrip(str);
});

// diffRules(
//     'ant(L R)',
//     '0, c => 0, c+1, turns(L R)');

function diffRules(str1, str2) {
    var res = Turmite.compile(str1);
    if (!check(res)) {
        return;
    }
    var ent1 = res.value;

    res = Turmite.compile(str2);
    if (!check(res)) {
        return;
    }
    var ent2 = res.value;

    var dump1 = hex(new Buffer(new Uint8Array(ent1.rules.buffer)));
    var dump2 = hex(new Buffer(new Uint8Array(ent2.rules.buffer)));

    console.log('%s\n-- vs\n%s', ent1.specString, ent2.specString);
    printDiff([dump1, dump2]);
}

function dump(str) {
    var res = Turmite.parse(str);
    if (!check(res)) {
        return;
    }

    var compile = res.value;
    console.log('COMPILE:\n%s\n', compile.toString());

    res = compile(new Turmite());
    if (!check(res)) {
        return;
    }

    var ent = res.value;

    var rulesDump = new Buffer(new Uint8Array(ent.rules.buffer));
    process.stdout.write(hex(rulesDump) + '\n');
}

function roundTrip(str) {
    var res = Turmite.parse(str);
    if (!check(res)) {
        return;
    }

    var compile = res.value;
    var comp1 = compile.toString();

    console.log(comp1);

    res = compile(new Turmite());
    if (!check(res)) {
        return;
    }

    var ent = res.value;

    console.log('Round Tripping:\n%s', ent.specString);

    res = Turmite.parse(ent.specString);
    if (!check(res)) {
        return;
    }

    compile = res.value;
    var comp2 = compile.toString();

    if (comp1 !== comp2) {
        printDiff([comp1, comp2]);
        return;
    }

    console.log('round code trip okay:\n%s', comp2);

    var rulesDump = new Buffer(new Uint8Array(ent.rules.buffer));
    process.stdout.write(hex(rulesDump) + '\n');
}

function check(res) {
    if (res.err) {
        console.error(res.err);
        if (res.value !== null) {
            console.log(res.value);
        }
        return false;
    }
    return true;
}

// function debugAmbiguous(results) {
//     var util = require('util');
//     console.error('ambiguous parse, got %s results', results.length);
//     var dumps = [];
//     for (var i = 0; i < results.length; i++) {
//         dumps.push(util.inspect(results[i], {depth: Infinity}));
//     }
//     printDiff(dumps);
// }

function printDiff(strs) {
    var cols = strs.map(splitLines);
    var widths = cols.map(maxLength);
    var n = maxLength(cols);
    for (var i = 0; i < n; i++) {
        var out = '';
        for (var j = 0; j < cols.length; j++) {
            var line = pad(widths[j], cols[j][i]);
            if (j > 0) {
                var sep = cols[j - 1][i] === cols[j][i] ? '|' : 'X';
                out += ' ' + sep + ' ';
            }
            out += line;
        }
        process.stdout.write(out + '\n');
    }
}

function splitLines(str) {
    return str.split(/\n/);
}

function pad(n, str) {
    while (str.length < n) {
        str = str + ' ';
    }
    return str;
}

function maxLength(items) {
    return items
        .map(function each(item) {
            return item.length;
        })
        .reduce(function max(a, b) {
            return Math.max(a, b);
        });
}
