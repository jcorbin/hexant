'use strict';

var Coord = require('./coord.js');
var HexTileTree = require('./hextiletree.js');
var CubePoint = Coord.CubePoint;

var REDRAW_TIMING_WINDOW = 5000;

module.exports = World;

World.StateShift      = 8;
World.ColorShift      = 8;
World.TurnShift       = 16;
World.FlagVisited     = 0x0100;
World.MaskFlags       = 0xff00;
World.MaskColor       = 0x00ff;
World.MaxState        = 0xff;
World.MaxColor        = 0xff;
World.MaxTurn         = 0xffff;
World.MaskResultState = 0xff000000;
World.MaskResultColor = 0x00ff0000;
World.MaskResultTurn  = 0x0000ffff;

function World() {
    this.numColors = 0;
    this.numStates = 0;
    this.tile = new HexTileTree();
    this.ents = [];
    this.views = [];
    this.redrawTiming = [];
}

World.prototype.getEntPos =
function getEntPos(i) {
    // TODO: take ownership of these
    return this.ents[i].pos;
};

World.prototype.getEntDir =
function getEntDir(i) {
    // TODO: take ownership of these
    return this.ents[i].dir;
};

World.prototype.reset =
function reset() {
    this.ents[0].reset();
    this.ents[0].pos.scale(0); // reset to 0,0
    this.ents[0].dir = 0;
    this.tile.reset();
    for (var i = 0; i < this.views.length; ++i) {
        this.views[i].reset();
    }
    this.tile.update(this.getEntPos(0), markVisited);
};

World.prototype.turnEnt =
function turnEnt(i, turnFunc) {
    var dir = turnFunc(this.ents[i].dir);
    this.ents[i].dir = dir;
    this.tile.update(
        this.ents[i].pos.add(CubePoint.basis[dir]),
        markVisited);
};

World.prototype.step =
function step() {
    var i;
    for (i = 0; i < this.ents.length; i++) {
        this.ents[i].step(this);
    }
    for (i = 0; i < this.views.length; i++) {
        this.views[i].step();
    }
    this.redraw();
};

World.prototype.stepn =
function stepn(n) {
    for (var i = 0; i < n; i++) {
        var j;
        for (j = 0; j < this.ents.length; j++) {
            this.ents[j].step(this);
        }
        for (j = 0; j < this.views.length; j++) {
            this.views[j].step();
        }
    }
    return this.redraw();
};

World.prototype.redraw =
function redraw() {
    var didredraw = false;
    var t0 = Date.now();
    for (var i = 0; i < this.views.length; i++) {
        var view = this.views[i];
        if (view.needsRedraw) {
            view.redraw();
            didredraw = true;
        }
    }
    var t1 = Date.now();
    if (didredraw) {
        while (t0 - this.redrawTiming[0] > REDRAW_TIMING_WINDOW) {
            this.redrawTiming.shift();
            this.redrawTiming.shift();
        }
        this.redrawTiming.push(t0, t1);
    }
    return didredraw;
};

World.prototype.redrawTimingStats =
function redrawTimingStats() {
    var i = 0, n = 0, m1 = 0, m2 = 0;
    while (i < this.redrawTiming.length) {
        var t0 = this.redrawTiming[i++];
        var t1 = this.redrawTiming[i++];
        var dur = t1 - t0;
        var delta = dur - m1;
        m1 += delta / ++n;
        m2 += delta * (dur - m1);
    }
    if (n < 2) {
        return null;
    }
    m2 /= n - 1;
    return {
        n: n,
        m1: m1,
        m2: m2
    };
};

World.prototype.removeEnt =
function removeEnt(ent) {
    if (this.ents[ent.index] !== ent) {
        throw new Error('removeEnt mismatch');
    }
    this._removeEnt(ent.index);
    return ent;
};

World.prototype._removeEnt =
function _removeEnt(i) {
    var j = i++;
    for (; j < this.ents.length; i++, j++) {
        this.ents[i] = this.ents[j];
        this.ents[i].index = i;
    }
    this.ents.pop();

    for (i = 0; i < this.views.length; i++) {
        this.views[i].removeEnt(i);
    }
};

World.prototype.setEnts =
function setEnts(ents) {
    var cons = ents[0].constructor;
    var i;
    var j;
    for (i = 1; i < ents.length; ++i) {
        if (ents[i].constructor !== cons) {
            throw new Error('setEnts must get a list of same-type ents');
        }
    }

    if (ents.length < this.ents.length) {
        for (i = ents.length; i < this.ents.length; i++) {
            for (j = 0; j < this.views.length; j++) {
                this.views[j].removeEnt(i);
            }
        }
        this.ents.length = ents.length;
    }

    var n = this.ents.length;
    for (i = 0; i < ents.length; i++) {
        var ent = ents[i];
        ent.index = i;
        this.ents[i] = ent;
        this.tile.update(ent.pos, markVisited);
    }

    this.numColors = 0;
    this.numStates = 0;
    for (j = 0; j < this.ents.length; j++) {
        this.numColors = Math.max(this.numColors, this.ents[j].numColors);
        this.numStates = Math.max(this.numStates, this.ents[j].numStates);
    }

    for (i = 0; i < n; ++i) {
        for (j = 0; j < this.views.length; j++) {
            this.views[j].updateEnt(j);
        }
    }
    for (; i < ents.length; ++i) {
        for (j = 0; j < this.views.length; j++) {
            this.views[j].addEnt(j);
        }
    }

};

World.prototype.addView =
function addView(view) {
    this.views.push(view);
    view.updateEnts();
    return view;
};

function markVisited(data) {
    return World.FlagVisited | data;
}
