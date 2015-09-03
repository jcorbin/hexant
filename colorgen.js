'use strict';

module.exports = HueWheelGenerator;

// TODO: husl instead of hsl
function HueWheelGenerator(s, l) {
    var ss = (s * 100).toFixed(1) + '%';
    var sl = (l * 100).toFixed(1) + '%';
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
