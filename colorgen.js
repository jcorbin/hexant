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

    var args = match[2] ? match[2].split(/, */) : [];
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

gens.light = LightWheelGenerator;
gens.hue = HueWheelGenerator;

// TODO: husl too

function LightWheelGenerator(hue, sat) {
    hue = parseInt(hue, 10) || 0;
    sat = parseInt(sat, 10) || 65;

    wheelGenGen.genString = 'light(' +
                            hue.toString() + ', ' +
                            sat.toString() + ')';
    return wheelGenGen;

    function wheelGenGen(intensity) {
        var h = hue * (1 + (intensity - 1) / 3);
        var sh = h.toString();
        var prefix = 'hsl(' + sh + ', ' + sat + '%, ';
        var suffix = ')';
        return function wheelGen(ncolors) {
            var step = 100 / (ncolors + 1);
            var r = [];
            var l = step;
            for (var i = 0; i < ncolors; l += step, i++) {
                var sl = l.toFixed(1) + '%';
                r.push(prefix + sl + suffix);
            }
            return r;
        };
    }
}

function HueWheelGenerator(sat, light) {
    sat = parseInt(sat, 10) || 70;
    light = parseInt(light, 10) || 40;
    var satDelta = sat > 70 ? -10 : 10;
    var lightDelta = light > 70 ? -10 : 10;

    hueWheelGenGen.genString = 'hue(' + sat + ', ' + light + ')';
    return hueWheelGenGen;

    function hueWheelGenGen(intensity) {
        var ss = (sat + satDelta * intensity).toFixed(1) + '%';
        var sl = (light + lightDelta * intensity).toFixed(1) + '%';

        var suffix = ', ' + ss + ', ' + sl + ')';
        return function wheelGen(ncolors) {
            var scale = 360 / ncolors;
            var r = [];
            for (var i = 0; i < ncolors; i++) {
                var sh = Math.round(i * scale).toString();
                r.push('hsl(' + sh + suffix);
            }
            return r;
        };
    }
}
