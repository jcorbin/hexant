'use strict';

/* eslint max-params:[0,6] */

module.exports = NGonContext;

function NGonContext(degree, ctx2d) {
    this.ctx2d = ctx2d;
    this.degree = degree;
    this.offset = 0;
    this.step = 2 * Math.PI / this.degree;
}

NGonContext.prototype.full =
function full(x, y, radius) {
    var r = this.offset;
    this.ctx2d.moveTo(
        x + radius * Math.cos(r),
        y + radius * Math.sin(r));
    for (var i = 1; i < this.degree; i++) {
        r += this.step;
        this.ctx2d.lineTo(
            x + radius * Math.cos(r),
            y + radius * Math.sin(r));
    }
};

NGonContext.prototype.arc =
function arc(x, y, radius, startArg, endArg, complement) {
    var start = 0;
    var end = 0;
    if (typeof startArg === 'number') {
        start = startArg % this.degree;
    }
    if (typeof endArg === 'number') {
        end = endArg % this.degree;
    }
    if (start === end) {
        this.full(x, y, radius);
        return;
    }
    if (complement) {
        // degree := 6
        // 0, 4, false --> 0, 1, 2, 3 ,4
        // 0, 4, true  --> 0, 5 ,4
        // 4, 6, false --> 4, 5, 6
        this.arc(x, y, radius, end, this.degree - start, false);
        return;
    }

    var n = this.degree + end - start;
    if (n > this.degree) {
        n -= this.degree;
    }

    var r = this.offset + this.step * start;
    var px = x + radius * Math.cos(r);
    var py = y + radius * Math.sin(r);
    this.ctx2d.moveTo(px, py);

    for (var i = 1; i <= n; i++) {
        r += this.step;
        px = x + radius * Math.cos(r);
        py = y + radius * Math.sin(r);
        this.ctx2d.lineTo(px, py);
    }
};

NGonContext.prototype.wedge =
function wedge(x, y, radius, startArg, endArg, complement) {
    var start = 0;
    var end = 0;
    if (typeof startArg === 'number') {
        start = startArg % this.degree;
    }
    if (typeof endArg === 'number') {
        end = endArg % this.degree;
    }
    if (start === end) {
        this.full(x, y, radius);
        return;
    }
    if (complement) {
        // degree := 6
        // 0, 4, false --> 0, 1, 2, 3 ,4
        // 0, 4, true  --> 0, 5 ,4
        // 4, 6, false --> 4, 5, 6
        this.wedge(x, y, radius, end, start, false);
        return;
    }

    var n = this.degree + end - start;
    if (n > this.degree) {
        n -= this.degree;
    }

    this.ctx2d.moveTo(x, y);

    var r = this.offset + this.step * start;
    for (var i = 0; i <= n; i++) {
        var px = x + radius * Math.cos(r);
        var py = y + radius * Math.sin(r);
        this.ctx2d.lineTo(px, py);
        r += this.step;
    }
};

