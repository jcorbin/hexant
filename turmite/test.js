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

    dump(str);
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
    process.stdout.write(hex(new Buffer(new Uint8Array(ent.rules.buffer))) + '\n');
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
