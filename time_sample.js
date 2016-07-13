module.exports = TimeSample;

function TimeSample() {
    this.data = [];
    this.t = 0;
}

TimeSample.prototype.reset =
function reset() {
    this.data.length = 0;
    this.t = 0;
};

TimeSample.prototype.start =
function start() {
    this.t = performance.now();
};

TimeSample.prototype.discard =
function discard() {
    this.t = 0;
};

TimeSample.prototype.end =
function end() {
    var t = performance.now();
    this.data.push(t - this.t);
    this.t = 0;
};

TimeSample.prototype.report =
function report(qs) {
    this.data.sort(numericCmp);
    var s = 'N=' + this.data.length;
    for (var i = 0; i < qs.length; ++i) {
        var v = q(qs[i], this.data);
        var t = 'ms';
        if (v < 1) {
            v *= 1e3;
            if (v < 1) {
                v *= 1e3;
                t = 'ns';
            } else {
                t = 'µs';
            }
        }
        s += ' ' + Math.round(100 * qs[i]) + '%=' + v.toPrecision(3) + t;
    }
    return s;
};

function q(p, S) {
    var i = 0.5 * S.length;
    return S[Math.floor(i)] / 2 + S[Math.ceil(i)] / 2;
}

function numericCmp(a, b) {
    return a - b;
}
