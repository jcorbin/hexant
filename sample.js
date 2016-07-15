'use strict';

module.exports = Sample;

/* TODO:
 * - evaluate online sorting
 * - improve anomaly scoring
 * - better consider all the marking stuff in context of its use case
 * - maybe split out the marking stuff, and combine it with its use case
 *   around animation throttling into a separate subclass
 */

var TIGHT_TOL = 0.1;

function Sample(n) {
    this.n = n;
    this.data = [];
    this.lastMark = 0;
    this.markWeight = 1;
}

Sample.prototype.mark =
function mark() {
    this.markWeight = 1;
    this.lastMark = this.data.length;
};

Sample.prototype.weightedMark =
function weightedMark(weight) {
    if (this.lastMark > 0) {
        this.markWeight *= weight;
    }
    this.lastMark = this.data.length;
};

Sample.prototype.sinceWeightedMark =
function sinceWeightedMark() {
    return (this.data.length - this.lastMark) / this.markWeight;
};

Sample.prototype.sinceMark =
function sinceMark() {
    return this.data.length - this.lastMark;
};

Sample.prototype.reset =
function reset() {
    this.data.length = 0;
    this.lastMark = 0;
    this.markWeight = 1;
};

Sample.prototype.complete =
function complete() {
    return this.data.length >= this.n;
};

Sample.prototype.collect =
function collect(datum) {
    while (this.data.length >= this.n) {
        this.data.shift();
    }
    this.data.push(datum);
    if (this.lastMark > 0) {
        if (--this.lastMark === 0) {
            this.markWeight = 1;
        }
    }
};

Sample.prototype.classifyAnomalies =
function classifyAnomalies() {
    var cs = [];
    var qs = this.quantiles([0.25, 0.50, 0.75]);
    var iqr = qs[2] - qs[0];
    if (iqr / qs[1] < TIGHT_TOL) {
        for (var i = 0; i < this.data.length; ++i) {
            cs.push(this.data[i] / qs[1] - 1);
        }
    } else {
        // var lh = qs[1] - qs[0];
        // var rh = qs[2] - qs[1];
        // var skew = (rh - lh) / iqr;
        var tol = iqr * 1.5;
        var lo = qs[0] - tol;
        var hi = qs[2] + tol;
        for (var i = 0; i < this.data.length; ++i) {
            if (this.data[i] < lo) {
                cs.push((this.data[i] - lo) / iqr);
            } else if (this.data[i] > hi) {
                cs.push((this.data[i] - hi) / iqr);
            } else {
                cs.push(0);
            }
        }
    }
    return cs;
};

Sample.prototype.quantiles =
function quantiles(qs) {
    var S = this.data.slice(0);
    S.sort(numericCmp);
    var vs = [];
    for (var i = 0; i < qs.length; ++i) {
        vs.push(q(qs[i], S));
    }
    return vs;
};

function q(p, S) {
    var i = 0.5 * S.length;
    return S[Math.floor(i)] / 2 + S[Math.ceil(i)] / 2;
}

function numericCmp(a, b) {
    return a - b;
}
