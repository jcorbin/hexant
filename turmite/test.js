/* eslint no-console:0 */

'use strict';

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

    var turm = new Turmite(null);
    var err = turm.parse(str);
    if (err) {
        console.error(err);
        return;
    }

    // console.log(turm.toString());
    console.log(
        // turm.rules
        new Buffer(
            new Uint8Array(turm.rules.buffer)
        ).toString()
    );
}
