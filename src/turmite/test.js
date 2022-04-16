/* global process, Buffer */
/* eslint-disable no-console */

'use strict';

var hex = require('hexer');
var Turmite = require('./index.js');

function main(args) {
    switch (args[0]) {
    case 'dump':
        bufferStream(process.stdin, errStrMap(parseAndDump));
        break;

    case 'roundTrip':
        bufferStream(process.stdin, errStrMap(roundTrip));
        break;

    case 'diffRules':
        diffRules(args[1], args[2]);
        break;

    default:
        console.error('invalid test action', args[0]);
    }
}

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

function parseAndDump(str) {
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
    dump(ent, function each(line) {
        process.stdout.write(line + '\n');
    });
}

function dump(ent, emit) {
    var rulesDump = new Buffer(new Uint8Array(ent.rules.buffer));

    emit('numStates: ' + ent.numStates);
    emit('numColors: ' + ent.numColors);

    ent.specString
        .split(/\n/)
        .forEach(function each(line, i) {
            if (i === 0) {
                line = 'spec: ' + line;
            } else {
                line = '      ' + line;
            }
            emit(line);
        });
    emit('rules:');
    hex(rulesDump).split('\n').forEach(emit);
}

function roundTrip(str1) {
    var res = Turmite.parse(str1);
    if (!check(res)) {
        return;
    }

    var compile = res.value;
    var comp1 = compile.toString();
    console.log('first compile:\n%s', comp1);

    res = compile(new Turmite());
    if (!check(res)) {
        return;
    }

    var ent = res.value;
    var str2 = ent.specString;

    res = Turmite.parse(ent.specString);
    if (!check(res)) {
        return;
    }

    compile = res.value;
    var comp2 = compile.toString();

    if (comp1 !== comp2) {
        printDiff([comp1, comp2],
                  [str1, str2]);
        return;
    }

    console.log('round code trip okay:\n%s', comp2);

    dump(ent, function each(line) {
        process.stdout.write(line + '\n');
    });
}

function check(res) {
    if (res.err) {
        console.error(res.err.stack);
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

function printDiff(strs, heads) {
    var cols = strs.map(splitLines);

    var start = 0;
    var i;
    var j;
    if (heads) {
        var headCols = heads.map(splitLines);
        start = maxLength(headCols) + 1;
        for (i = 0; i < headCols.length; i++) {
            var headCol = headCols[i];
            for (j = headCol.length; j < start; j++) {
                headCol.unshift('');
            }
            headCol.push('');
            cols[i] = headCol.concat(cols[i]);
        }
    }

    var widths = cols.map(maxLength);
    var n = maxLength(cols);

    for (i = 0; i < n; i++) {
        var out = '';
        for (j = 0; j < cols.length; j++) {
            var line = pad(widths[j], cols[j][i]);
            var sep = '   ';
            if (i > start && j > 0) {
                sep = cols[j - 1][i] === cols[j][i] ? '|' : 'X';
            }
            out += ' ' + sep + ' ';
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
        str += ' ';
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

function bufferStream(stream, callback) {
    var bufs = [];
    stream.on('data', function read(chunk) {
        bufs.push(chunk);
    });
    stream.on('error', function onError(err) {
        callback(err, null);
    });
    stream.on('end', function end() {
        var buf = Buffer.concat(bufs);
        var str = buf.toString();
        callback(null, str);
    });
}

function errStrMap(func) {
    return done;
    function done(err, str) {
        if (err) {
            console.error(err);
            return;
        }
        func(str);
    }
}

if (require.main === module) {
    main(process.argv.slice(2));
}
