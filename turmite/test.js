/* eslint no-console:0 */

'use strict';

var Turmite = require('./index.js');

var turm = new Turmite();
var err = turm.parse('ant(L R LL RRR 5L 8R 13L 21R)');
if (err) {
    console.error(err);
} else {
    // console.log(turm.toString());
    console.log(
        // turm.rules
        new Buffer(
            new Uint8Array(turm.rules.buffer)
        ).toString()
    );
}
