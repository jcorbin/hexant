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
        printDiffCols([
            comp1.split(/\n/),
            comp2.split(/\n/)
        ]);
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
//         var dump = util.inspect(results[i], {depth: Infinity}).split(/\n/);
//         dumps.push(dump);
//     }
//     printDiffCols(dumps);
// }

function printDiffCols(dumps) {
    var widths = dumps.map(maxLength);
    var n = maxLength(dumps);
    for (var i = 0; i < n; i++) {
        var out = '';
        for (var j = 0; j < dumps.length; j++) {
            var line = pad(widths[j], dumps[j][i]);
            if (j > 0) {
                var sep = dumps[j - 1][i] === dumps[j][i] ? '|' : 'X';
                out += ' ' + sep + ' ';
            }
            out += line;
        }
        process.stdout.write(out + '\n');
    }
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
