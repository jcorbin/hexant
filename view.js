'use strict';

var HexGrid = require('./hexgrid.js');
var NGonContext = require('./ngoncontext.js');
var World = require('./world.js');

module.exports = View;

/* TODO:
 * - drop all coupling to world.ents
 * - finish id/index-based interface started around {add,update,remove}Ent
 */

function View(world, canvas) {
    if (!(this instanceof View)) {
        return new View(world, canvas);
    }
    this.world = world;
    this.canvas = canvas;

    this.ctx2d = this.canvas.getContext('2d');
    this.ctxHex = new NGonContext(6, this.ctx2d);

    this.labeled = false;
    this.drawUnvisited = false;
    this.drawTrace = false;
    this.entSize = 0.5;

    this.antCellColorGen = null;
    this.emptyCellColorGen = null;
    this.bodyColorGen = null;
    this.headColorGen = null;

    this.cellColors = null;
    this.antCellColors = [];
    this.emptyCellColors = [];
    this.bodyColors = [];
    this.headColors = [];
    this.lastEntPos = [];

    this.hexGrid = new HexGrid(
        this.canvas, this.ctxHex,
        this.world.tile.boundingBox().copy());
    this.updateSize();

    this.needsRedraw = false;

    this.boundUpdateEntCell = updateEntCell;
    this.boundDrawEachCell = drawEachCell;
    this.boundMaybeDrawEachCell = maybeDrawEachCell;

    var self = this;

    function updateEntCell(data) {
        return self._updateEntCell(data);
    }

    function drawEachCell(point, data) {
        self.drawCell(point,
                      data & World.MaskColor,
                      self.cellColors);
    }

    function maybeDrawEachCell(point, data) {
        if (data & World.FlagVisited) {
            self.drawCell(point,
                          data & World.MaskColor,
                          self.cellColors);
        }
    }
}

View.prototype.updateSize =
function updateSize() {
    this.hexGrid.updateSize();
    this.featureSize = this.hexGrid.cellSize * this.entSize;
    if (this.featureSize <= 5) {
        this.drawEnt = this.drawSmallEnt;
    } else if (this.labeled) {
        this.drawEnt = this.drawLabeledFullEnt;
    } else {
        this.drawEnt = this.drawUnlabeledFullEnt;
    }
};

View.prototype.setDrawTrace =
function setDrawTrace(dt) {
    this.drawTrace = !!dt;
    this.cellColors = this.drawTrace ? this.emptyCellColors : this.antCellColors;
};

View.prototype.resize =
function resize(width, height) {
    this.hexGrid.resize(width, height);
    this.updateSize();
    this.redraw();
};

View.redraws = [];

var last = 0;
setInterval(function() {
    if (View.redraws.length === last) {
        return;
    }
    var rs = View.redraws.slice(last);
    var mu = 0;
    var max = 0;
    for (var i = 0; i < rs.length; ++i) {
        if (rs[i] > max) {
            max = rs[i];
        }
        mu += rs[i] / rs.length;
    }
    console.log(
        '%s redraws, µ=%sms, max=%sms, last %s: %j',
        View.redraws.length, mu, max, rs.length, rs);
    last = View.redraws.length;
}, 1000);

View.prototype.redraw =
function redraw() {
    if (this.cellColors === null) {
        return;
    }
    var t0 = Date.now();
    var ents = this.world.ents;
    this.world.tile.eachDataPoint(this.drawUnvisited ? this.boundDrawEachCell : this.boundMaybeDrawEachCell);
    for (var i = 0; i < ents.length; i++) {
        this.drawEnt(i);
    }
    this.needsRedraw = false;
    var t1 = Date.now();
    View.redraws.push(t1 - t0);
};

View.prototype.updateEnts =
function updateEnts() {
    var i;
    for (i = 0; i < this.world.ents.length; i++) {
        var pos = this.world.getEntPos(i);
        if (i < this.lastEntPos.length) {
            this.lastEntPos[i].copyFrom(pos);
        } else {
            this.lastEntPos.push(pos.copy());
        }
    }
    while (i < this.lastEntPos.length) {
        this.lastEntPos.pop();
    }
    this.updateColors(false);
};

View.prototype.addEnt =
function addEnt(i) {
    this.lastEntPos.push(this.world.getEntPos(i).copy());
    this.updateColors(false);
};

View.prototype.updateEnt =
function updateEnt(i) {
    this.lastEntPos[i].copyFrom(this.world.getEntPos(i));
    this.updateColors(false);
};

View.prototype.removeEnt =
function removeEnt(i) {
    swapout(this.lastEntPos, i);
    this.lastEntPos.pop();
    this.updateColors(false);
};

View.prototype.setColorGen =
function setColorGen(colorGen) {
    this.emptyCellColorGen = colorGen(0);
    this.antCellColorGen = colorGen(1);
    this.bodyColorGen = colorGen(2);
    this.headColorGen = colorGen(3);
    this.updateColors(true);
};

View.prototype.updateColors = function updateColors(regen) {
    var N = this.world.numColors;
    var M = this.world.ents.length;

    if (this.emptyCellColorGen &&
        (regen || this.emptyCellColors.length !== N)
    ) {
        this.emptyCellColors = this.emptyCellColorGen(N);
        while (this.emptyCellColors.length <= World.MaxColor) {
            this.emptyCellColors.push(
                this.emptyCellColors[this.emptyCellColors.length % N]
            );
        }
        if (this.drawTrace) {
            this.cellColors = this.emptyCellColors;
        }
    }

    if (this.antCellColorGen &&
        (regen || this.antCellColors.length !== N)
    ) {
        this.antCellColors = this.antCellColorGen(N);
        while (this.antCellColors.length <= World.MaxColor) {
            this.antCellColors.push(
                this.antCellColors[this.antCellColors.length % N]
            );
        }
        if (!this.drawTrace) {
            this.cellColors = this.antCellColors;
        }
    }

    if (this.bodyColorGen &&
        (regen || this.bodyColors.length !== M)
    ) {
        this.bodyColors = this.bodyColorGen(M);
    }

    if (this.headColorGen &&
        (regen || this.headColors.length !== M)
    ) {
        this.headColors = this.headColorGen(M);
    }
};

View.prototype.setLabeled =
function setLabeled(labeled) {
    this.labeled = labeled;
    if (this.labeled) {
        this.drawCell = this.drawLabeledCell;
    } else {
        this.drawCell = this.drawUnlabeledCell;
    }
    if (this.featureSize <= 5) {
        this.drawEnt = this.drawSmallEnt;
    } else if (this.labeled) {
        this.drawEnt = this.drawLabeledFullEnt;
    } else {
        this.drawEnt = this.drawUnlabeledFullEnt;
    }
};

View.prototype.drawUnlabeledCell =
function drawUnlabeledCell(point, color, colors) {
    this.ctx2d.beginPath();
    var screenPoint = this.hexGrid.cellPath(point);
    this.ctx2d.closePath();
    this.ctx2d.fillStyle = colors[color];
    this.ctx2d.fill();
    return screenPoint;
};

View.prototype.drawLabeledCell =
function drawLabeledCell(point, color, colors) {
    var ctx2d = this.ctx2d;

    this.ctx2d.beginPath();
    var screenPoint = this.hexGrid.cellPath(point);
    this.ctx2d.closePath();
    this.ctx2d.fillStyle = colors[color];
    this.ctx2d.fill();

    ctx2d.lineWidth = 1;
    ctx2d.strokeStyle = '#fff';
    this._writeText(screenPoint, point.toCube().toString(), 0);
    this._writeText(screenPoint, point.toOddQOffset().toString(), 14);
};

View.prototype.drawCell =
View.prototype.drawUnlabeledCell;

View.prototype.step =
function step() {
    var ents = this.world.ents;
    var i;

    var expanded = false;
    for (i = 0; i < ents.length; i++) {
        expanded = this.hexGrid.bounds.expandTo(this.world.getEntPos(i)) || expanded;
    }

    if (expanded) {
        this.needsRedraw = true;
        this.updateSize();
    }

    if (this.needsRedraw) {
        return;
    }

    var data = []; // TODO: re-use
    this.world.tile.gather(data, this.lastEntPos);

    for (i = 0; i < ents.length; i++) {
        // var data = this.world.tile.get(this.lastEntPos[i]);
        this.drawCell(this.lastEntPos[i],
                      data[i] & World.MaskColor,
                      this.antCellColors);
    }

    for (i = 0; i < ents.length; i++) {
        this.drawEnt(i);
    }
};

View.prototype.drawEnt =
View.prototype.drawUnlabeledFullEnt =
function drawUnlabeledFullEnt(i) {
    var ctx2d = this.ctx2d;
    var ctxHex = this.hexGrid.ctxHex;

    var pos = this.world.getEntPos(i);
    var dir = this.world.getEntDir(i);

    ctx2d.beginPath();
    var screenPoint = this.hexGrid.cellPath(pos);
    ctx2d.closePath();
    this.world.tile.update(pos, this.boundUpdateEntCell);

    // head
    ctx2d.fillStyle = this.headColors[i];
    ctx2d.strokeStyle = this.headColors[i];
    ctx2d.lineWidth = this.featureSize / 2;
    ctx2d.beginPath();
    ctxHex.wedge(screenPoint.x, screenPoint.y, this.featureSize, dir, dir + 1, false);
    ctx2d.closePath();
    ctx2d.fill();
    ctx2d.stroke();

    // body
    ctx2d.fillStyle = this.bodyColors[i];
    ctx2d.beginPath();
    ctxHex.wedge(screenPoint.x, screenPoint.y, this.featureSize, dir, dir + 1, true);
    ctx2d.closePath();
    ctx2d.fill();

    this.lastEntPos[i].copyFrom(pos);
};

View.prototype.drawSmallEnt =
function drawSmallEnt(i) {
    var ctx2d = this.ctx2d;
    var ctxHex = this.hexGrid.ctxHex;

    var pos = this.world.getEntPos(i);

    ctx2d.beginPath();
    var screenPoint = this.hexGrid.cellPath(pos);
    ctx2d.closePath();
    this.world.tile.update(pos, this.boundUpdateEntCell);

    ctx2d.fillStyle = this.headColors[i];
    ctx2d.beginPath();
    ctxHex.full(screenPoint.x, screenPoint.y, this.featureSize);
    ctx2d.closePath();
    ctx2d.fill();

    this.lastEntPos[i].copyFrom(pos);
};

View.prototype.drawLabeledFullEnt =
function drawLabeledFullEnt(i) {
    var ctx2d = this.ctx2d;
    var ctxHex = this.hexGrid.ctxHex;

    var pos = this.world.getEntPos(i);
    var dir = this.world.getEntDir(i);

    ctx2d.beginPath();
    var screenPoint = this.hexGrid.cellPath(pos);
    ctx2d.closePath();
    this.world.tile.update(pos, this.boundUpdateEntCell);

    // head
    ctx2d.fillStyle = this.headColors[i];
    ctx2d.strokeStyle = this.headColors[i];
    ctx2d.lineWidth = this.featureSize / 2;
    ctx2d.beginPath();
    ctxHex.wedge(screenPoint.x, screenPoint.y, this.featureSize, dir, dir + 1, false);
    ctx2d.closePath();
    ctx2d.fill();
    ctx2d.stroke();

    // body
    ctx2d.fillStyle = this.bodyColors[i];
    ctx2d.beginPath();
    ctxHex.wedge(screenPoint.x, screenPoint.y, this.featureSize, dir, dir + 1, true);
    ctx2d.closePath();
    ctx2d.fill();

    ctx2d.lineWidth = 1;
    ctx2d.strokeStyle = '#fff';
    this._writeText(screenPoint, pos.toCube().toString(), 0);
    this._writeText(screenPoint, pos.toOddQOffset().toString(), 14);

    this.lastEntPos[i].copyFrom(pos);
};

View.prototype._updateEntCell =
function _updateEntCell(data) {
    if (!(data & World.FlagVisited)) {
        this.ctx2d.fillStyle = this.antCellColors[data & World.MaskColor];
        this.ctx2d.fill();
    }
    return data | World.FlagVisited;
};

View.prototype._writeText =
function _writeText(screenPoint, mess, yoff) {
    var textWidth = this.ctx2d.measureText(mess).width;
    this.ctx2d.strokeText(
        mess,
        screenPoint.x - textWidth / 2,
        screenPoint.y + yoff);
};

function swapout(ar, i) {
    var j = i;
    var old = ar[i];
    for (j = i++; i < ar.length; i++, j++) {
        ar[j] = ar[i];
    }
    ar[j] = old;
    return j;
}
