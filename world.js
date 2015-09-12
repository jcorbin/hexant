'use strict';

var Coord = require('./coord.js');
var HexTileTree = require('./hextiletree.js');

var OddQOffset = Coord.OddQOffset;

module.exports = World;

function World() {
    this.numStates = 0;
    this.tile = new HexTileTree(OddQOffset(0, 0), 2, 2);
    this.ants = [];
    this.views = [];
}

World.prototype.step = function step() {
    var i;
    for (i = 0; i < this.ants.length; i++) {
        this.ants[i].step();
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
        for (j = 0; j < this.ants.length; j++) {
            this.ants[j].step();
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

World.prototype.addAnt = function addAnt(ant) {
    this.numStates = Math.max(this.numStates, ant.rules.length);
    ant.index = this.ants.length;
    this.ants.push(ant);
    var c = this.tile.get(ant.pos);
    if (!c) {
        this.tile.set(ant.pos, 1);
    }

    for (var i = 0; i < this.views.length; i++) {
        this.views[i].addAnt(ant);
    }

    return ant;
};

World.prototype.updateAnt = function updateAnt(ant) {
    var i;

    this.numStates = 0;
    for (i = 0; i < this.ants.length; i++) {
        this.numStates = Math.max(this.numStates, this.ants[i].rules.length);
    }

    for (i = 0; i < this.views.length; i++) {
        this.views[i].updateAnt(ant);
    }

    return ant;
};

World.prototype.removeAnt = function removeAnt(ant) {
    if (this.ants[ant.index] !== ant) {
        throw new Error('removeAnt mismatch');
    }

    var i = ant.index;
    var j = i++;
    for (; i < this.ants.length; i++, j++) {
        this.ants[j] = this.ants[i];
        this.ants[j].index = j;
    }
    this.ants.pop();

    for (i = 0; i < this.views.length; i++) {
        this.views[i].removeAnt(ant);
    }

    return ant;
};

World.prototype.addView = function addView(view) {
    this.views.push(view);
    view.updateAnts();
    return view;
};
