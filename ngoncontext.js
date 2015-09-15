'use strict';

/* eslint max-params:[0,6] */

module.exports = NGonContext;

function NGonContext(degree, ctx2d) {
    this.ctx2d = ctx2d;
    this.degree = degree;
    this.offset = 0;
    this.step = 2 * Math.PI / this.degree;
    this.cos = null;
    this.sin = null;

    this.setOffset(0);
}

NGonContext.prototype.setOffset =
function setOffset(offset) {
    this.offset = offset;
    this.cos = new Float64Array(this.degree);
    this.sin = new Float64Array(this.degree);
    var r = offset;
    for (var i = 0; i < this.degree; i++) {
        this.cos[i] = Math.cos(r);
        this.sin[i] = Math.sin(r);
        r += this.step;
    }
};

NGonContext.prototype.buildFor =
function buildFor(radius, xys) {
    for (var i = 0, j = 0; i < this.degree; i++) {
        xys[j++] = radius * this.cos[i];
        xys[j++] = radius * this.sin[i];
    }
};

NGonContext.prototype.fullWith =
function fullWith(x, y, xys) {
    this.ctx2d.moveTo(x + xys[0], y + xys[1]);
    for (var i = 1, j = 2; i < this.degree; i++) {
        this.ctx2d.lineTo(x + xys[j++], y + xys[j++]);
    }
};

NGonContext.prototype.full =
function full(x, y, radius) {
    if (radius <= 2) {
        this.ctx2d.arc(x, y, radius, 0, 2 * Math.PI);
    } else {
        this.ctx2d.moveTo(
            x + radius * this.cos[0],
            y + radius * this.sin[0]);
        for (var i = 1; i < this.degree; i++) {
            this.ctx2d.lineTo(
                x + radius * this.cos[i],
                y + radius * this.sin[i]);
        }
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

    var j = start;
    var px = x + radius * this.cos[j];
    var py = y + radius * this.sin[j];
    this.ctx2d.moveTo(px, py);

    for (var i = 1; i <= n; i++) {
        j = (j + 1) % this.degree;
        px = x + radius * this.cos[j];
        py = y + radius * this.sin[j];
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

    var j = start;
    for (var i = 0; i <= n; i++) {
        var px = x + radius * this.cos[j];
        var py = y + radius * this.sin[j];
        this.ctx2d.lineTo(px, py);
        j = (j + 1) % this.degree;
    }
};

