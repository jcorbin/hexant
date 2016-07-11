'use strict';

var Coord = require('./coord.js');
var HexTileTree = require('./hextiletree.js');

var OddQOffset = Coord.OddQOffset;

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
    this.tile = new HexTileTree(OddQOffset(0, 0), 2, 2);
    this.ents = [];
    this.views = [];
}

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
    for (var i = 0; i < this.views.length; i++) {
        var view = this.views[i];
        if (view.needsRedraw) {
            view.redraw();
            view.needsRedraw = false;
            didredraw = true;
        }
    }
    return didredraw;
};

World.prototype.addEnt =
function addEnt(ent) {
    this.numColors = Math.max(this.numColors, ent.numColors);
    this.numStates = Math.max(this.numStates, ent.numStates);
    ent.index = this.ents.length;
    this.ents.push(ent);

    var data = this.tile.get(ent.pos);
    if (!(data & World.FlagVisited)) {
        data = this.tile.set(ent.pos, data | World.FlagVisited);
    }

    for (var i = 0; i < this.views.length; i++) {
        this.views[i].addEnt(ent);
    }

    return ent;
};

World.prototype.updateEnt =
function updateEnt(ent, i) {
    if (i === undefined) {
        i = ent.index;
    } else {
        ent.index = i;
    }

    if (this.ents[i] !== ent) {
        this.ents[i] = ent;
    }

    this.numColors = 0;
    this.numStates = 0;
    for (i = 0; i < this.ents.length; i++) {
        this.numColors = Math.max(this.numColors, this.ents[i].numColors);
        this.numStates = Math.max(this.numStates, this.ents[i].numStates);
    }

    for (i = 0; i < this.views.length; i++) {
        this.views[i].updateEnt(ent);
    }

    return ent;
};

World.prototype.removeEnt =
function removeEnt(ent) {
    if (this.ents[ent.index] !== ent) {
        throw new Error('removeEnt mismatch');
    }

    var i = ent.index;
    var j = i++;
    for (; i < this.ents.length; i++, j++) {
        this.ents[j] = this.ents[i];
        this.ents[j].index = j;
    }
    this.ents.pop();

    for (i = 0; i < this.views.length; i++) {
        this.views[i].removeEnt(ent);
    }

    return ent;
};

World.prototype.addView =
function addView(view) {
    this.views.push(view);
    view.updateEnts();
    return view;
};
