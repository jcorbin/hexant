'use strict';

module.exports.hue = HueWheelGenerator;

// TODO: husl too

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
