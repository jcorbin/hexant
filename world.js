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

World.prototype.resetEnt =
function resetEnt(i) {
    this.ents[i].reset();
    this.tile.centerPoint().toCubeInto(this.ents[i].pos);
    this.ents[i].dir = 0;
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
    for (var i = 0; i < this.views.length; i++) {
        var view = this.views[i];
        if (view.needsRedraw) {
            view.redraw();
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
    this.tile.update(ent.pos, markVisited);

    for (var i = 0; i < this.views.length; i++) {
        this.views[i].addEnt(i);
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
        this.views[i].updateEnt(i);
    }

    return ent;
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

World.prototype.pruneEnts =
function pruneEnts(n) {
    if (n >= this.ents.length) {
        return;
    }
    for (var i = n; i < this.ents.length; i++) {
        for (var j = 0; j < this.views.length; ++j) {
            this.views[j].removeEnt(i);
        }
    }
    this.ents = this.ents.silce(0, n);
};

World.prototype.setEnts =
function setEnts(ents) {
    var cons = ents[0].constructor;
    var i;
    for (i = 1; i < ents.length; ++i) {
        if (ents[i].constructor !== cons) {
            throw new Error('setEnts must get a list of same-type ents');
        }
    }

    this.pruneEnts(ents.length);

    for (i = 0; i < ents.length; ++i) {
        if (i < this.ents.length) {
            this.updateEnt(ents[i], i);
        } else {
            this.addEnt(ents[i]);
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
