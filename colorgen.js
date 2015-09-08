'use strict';

var gens = {};
module.exports.gens = gens;
module.exports.parse = parse;
module.exports.toString = toString;

function parse(str) {
    var match = /^(\w+)(?:\((.+)\))?$/.exec(str);
    if (!match) {
        return HueWheelGenerator;
    }

    var name = match[1];
    var gen = gens[name];
    if (!gen) {
        return HueWheelGenerator;
    }

    var args = match[2] && match[2].split(/, */);
    if (args) {
        /* eslint no-try-catch: [0] */
        try {
            return gen.apply(null, args);
        } catch(e) {
            return HueWheelGenerator;
        }
    }

    return gen;
}

function toString(gen) {
    return gen.genString || 'hue';
}

gens.hue = HueWheelGenerator;

// TODO: husl too

HueWheelGenerator.genString = 'hue';

function HueWheelGenerator(intensity) {
    var ss = (65 + 10 * intensity).toFixed(1) + '%';
    var sl = (30 + 10 * intensity).toFixed(1) + '%';

    var suffix = ', ' + ss + ', ' + sl + ')';
    return function wheelGen(ncolors) {
        var scale = 360 / ncolors;
        var r = [];
        for (var i = 0; i < ncolors; i++) {
            var sh = Math.floor(i * scale).toString();
            r.push('hsl(' + sh + suffix);
        }
        return r;
    };
}
