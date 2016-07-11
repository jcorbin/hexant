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
    this.entTypes = [];
    this.stepNames = {};
    this.steps = [];
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

World.prototype.turnEnt =
function turnEnt(i, turnFunc) {
    var dir = turnFunc(this.ents[i].dir);
    this.ents[i].dir = dir;
    this.ents[i].pos.add(CubePoint.basis[dir]);
};

World.prototype._stepEnts =
function _stepEnts() {
    var stepEnts = [];
    for (var i = 0; i < this.steps.length; i++) {
        var ents = [];
        for (var j = 0; j < this.entTypes.length; j++) {
            if (this.entTypes[j] === i) {
                ents.push(this.ents[j]);
            }
        }
        stepEnts.push(ents);
    }
    return stepEnts;
};

World.prototype.step =
function step() {
    var i;
    var stepEnts = this._stepEnts()

    for (i = 0; i < this.steps.length; i++) {
        var ents = stepEnts[i];
        var step = this.steps[i];
        var n = ents.length;
        step(this, ents);
        if (ents.length !== n) {
            throw new Error('adding new ents during step not ');
        }
    }

    for (i = 0; i < this.views.length; i++) {
        this.views[i].step();
    }
    this.redraw();
};

World.prototype.stepn =
function stepn(n) {
    // XXX: re-implement using:
    // var stepEnts = this._stepEnts()
    throw new Error('World#stepn unimplement'd)
    // for (var i = 0; i < n; i++) {
    //     var j;
    //     for (j = 0; j < this.ents.length; j++) {
    //         this.ents[j].step(this);
    //     }
    //     for (j = 0; j < this.views.length; j++) {
    //         this.views[j].step();
    //     }
    // }
    // return this.redraw();
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
    var cons = ent.constructor;
    if (cons.Step) {
        if (!this.stepNames[cons.name]) {
            this.stepNames[cons.name] = this.steps.length;
            this.steps.push(cons.Step);
        }
    }
    this._addEnt(ent);
};

World.prototype._addEnt =
function _addEnt(ent) {
    // TODO: limit
    this.numColors = Math.max(this.numColors, ent.numColors);
    this.numStates = Math.max(this.numStates, ent.numStates);
    ent.index = this.ents.length;
    this.ents.push(ent);

    var data = this.tile.get(ent.pos);
    if (!(data & World.FlagVisited)) {
        data = this.tile.set(ent.pos, data | World.FlagVisited);
    }

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
    // TODO: call destructor to support pooled re-use

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
