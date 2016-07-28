'use strict';

var Result = require('rezult');
var husl = require('husl');

var gens = {};
gens.light = LightWheelGenerator;
gens.hue = HueWheelGenerator;

function parse(str) {
    var match = /^(\w+)(?:\((.*)\))?$/.exec(str);
    if (!match) {
        return Result.error(new Error('invalid color spec'));
    }

    var name = match[1];
    var gen = gens[name];
    if (!gen) {
        var choices = Object.keys(gens).sort().join(', ');
        return Result.error(new Error(
            'no such color scheme ' + JSON.stringify(name) +
            ', valid choices: ' + choices
        ));
    }

    var args = match[2] ? match[2].split(/, */) : [];
    return Result.lift(gen).apply(null, args);
}

function toString(gen) {
    return gen.genString || 'hue';
}

// TODO: husl too

/* roles:
 * 0: empty cells
 * 1: ant traced cells
 * 2: ant body
 * 3: ant head
 */

function LightWheelGenerator(hue, sat) {
    hue = parseInt(hue, 10) || 0;
    sat = parseInt(sat, 10) || 100;

    if (hue === 0) {
        hue = 360;
    }

    wheelGenGen.genString = 'light(' +
                            hue.toString() + ', ' +
                            sat.toString() + ')';
    return wheelGenGen;

    function wheelGenGen(intensity) {
        var h = hue * (1 + (intensity - 1) / 3) % 360;
        return function wheelGen(ncolors) {
            var step = 100 / (ncolors + 1);
            var r = [];
            var l = step;
            for (var i = 0; i < ncolors; l += step, i++) {
                r.push(husl.toRGB(h, sat, l));
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
        var mySat = sat + satDelta * intensity;
        var myLight = light + lightDelta * intensity;

        var suffix = ', ' + ss + ', ' + sl + ')';
        return function wheelGen(ncolors) {
            var scale = 360 / ncolors;
            var r = [];
            for (var i = 0; i < ncolors; i++) {
                r.push([i * scale, mySat, myLight]);
            }
            return r;
        };
    }
}

module.exports.gens = gens;
module.exports.parse = parse;
module.exports.toString = toString;
