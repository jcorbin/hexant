'use strict';

var Coord = require('./coord.js');
var HexTileTree = require('./hextiletree.js');
var CubePoint = Coord.CubePoint;

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
    // TODO: consider combining pos & dir
    this.pos = [];
    this.dir = [];
    this.views = [];
}

World.prototype.getEntPos =
function getEntPos(i) {
    return this.pos[i];
};

World.prototype.getEntDir =
function getEntDir(i) {
    return this.dir[i];
};

World.prototype.resetEnt =
function resetEnt(i) {
    this.ents[i].reset();
    this.tile.centerPoint().toCubeInto(this.pos[i]);
    this.dir[i] = 0;
};

World.prototype.turnEnt =
function turnEnt(i, turnFunc) {
    var dir = turnFunc(this.dir[i]);
    this.dir[i] = dir;
    this.pos[i].add(CubePoint.basis[dir]);
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
        this.pos[i] = CubePoint(0, 0, 0);
        this.dir[i] = 0;
        this.tile.update(this.pos[i], markVisited);
    }

    this.numColors = 0;
    this.numStates = 0;
    for (j = 0; j < this.ents.length; j++) {
        this.numColors = Math.max(this.numColors, this.ents[j].numColors);
        this.numStates = Math.max(this.numStates, this.ents[j].numStates);
    }

    for (i = 0; i < n; ++i) {
        for (var j = 0; j < this.views.length; j++) {
            this.views[j].updateEnt(j);
        }
    }
    for (; i < ents.length; ++i) {
        for (var j = 0; j < this.views.length; j++) {
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
