/* eslint no-console:0 */

'use strict';

var hex = require('hexer');
var Turmite = require('./index.js');

var bufs = [];
process.stdin.on('data', function read(chunk) {
    bufs.push(chunk);
});
process.stdin.on('error', finish);
process.stdin.on('end', function end() {
    var buf = Buffer.concat(bufs);
    var str = buf.toString();
    finish(null, str);
});

function finish(err, str) {
    if (err) {
        console.error(err);
        return;
    }

    var res = Turmite.parse(str);
    if (res.err) {
        console.error(res.err);
        if (res.value !== null) {
            console.log(res.value);
        }
        return;
    }

    var compile = res.value;
    console.log('COMPILE:\n%s\n', compile.toString());

    res = compile(new Turmite());
    if (res.err) {
        console.error(res.err);
        if (res.value !== null) {
            console.log(res.value);
        }
        return;
    }

    var ent = res.value;
    process.stdout.write(hex(new Buffer(new Uint8Array(ent.rules.buffer))) + '\n');
}
