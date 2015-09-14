'use strict';

var Coord = require('./coord.js');
var HexTileTree = require('./hextiletree.js');

var OddQOffset = Coord.OddQOffset;

module.exports = World;

function World() {
    this.numStates = 0;
    this.tile = new HexTileTree(OddQOffset(0, 0), 2, 2);
    this.ents = [];
    this.views = [];
}

World.prototype.step = function step() {
    var i;
    for (i = 0; i < this.ents.length; i++) {
        this.ents[i].step();
    }
    for (i = 0; i < this.views.length; i++) {
        var view = this.views[i];
        view.step();
        if (view.needsRedraw) {
            view.redraw();
            view.needsRedraw = false;
        }
    }
};

World.prototype.stepn = function stepn(n) {
    var i;
    var j;
    for (i = 0; i < n; i++) {
        for (j = 0; j < this.ents.length; j++) {
            this.ents[j].step();
        }
        for (j = 0; j < this.views.length; j++) {
            this.views[j].step();
        }
    }
    for (i = 0; i < this.views.length; i++) {
        var view = this.views[i];
        if (view.needsRedraw) {
            view.redraw();
            view.needsRedraw = false;
        }
    }
};

World.prototype.addEnt = function addEnt(ent) {
    this.numStates = Math.max(this.numStates, ent.rules.length);
    ent.index = this.ents.length;
    this.ents.push(ent);
    var color = this.tile.get(ent.pos);
    if (!color) {
        this.tile.set(ent.pos, 1);
    }

    for (var i = 0; i < this.views.length; i++) {
        this.views[i].addEnt(ent);
    }

    return ent;
};

World.prototype.updateEnt = function updateEnt(ent) {
    var i;

    this.numStates = 0;
    for (i = 0; i < this.ents.length; i++) {
        this.numStates = Math.max(this.numStates, this.ents[i].rules.length);
    }

    for (i = 0; i < this.views.length; i++) {
        this.views[i].updateEnt(ent);
    }

    return ent;
};

World.prototype.removeEnt = function removeEnt(ent) {
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

World.prototype.addView = function addView(view) {
    this.views.push(view);
    view.updateEnts();
    return view;
};
