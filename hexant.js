'use strict';
/* global console, prompt */
/* eslint no-console: [0], no-alert: [0], no-try-catch: [0] */

module.exports = Hexant;

var AnimationFrame = require('animation-frame');
var window = require('global/window');

var HexAntWorld = require('./world.js');
var Ant = require('./ant.js');
var Hash = require('./hash.js');
var OddQOffset = require('./coord.js').OddQOffset;
var HexTileTree = require('./hextiletree.js');

var BatchLimit = 256;

var RulesLegend = 'W=West, L=Left, A=Ahead, R=Right, E=East, F=Flip';
var Rules = {
    W: -2,
    L: -1,
    A: 0,
    R: 1,
    E: 2,
    F: 3
};

function parseRule(ant, rule) {
    rule = rule.toUpperCase();
    var rerule = '';
    ant.rules = rule
        .split('')
        .map(function each(part) {
            var r = Rules[part];
            if (r !== undefined) {
                rerule += part;
            }
            return r;
        })
        .filter(function truthy(part) {
            return typeof part === 'number';
        })
        ;
    return rerule;
}

function Hexant(el) {
    var self = this;

    this.el = el;
    this.hash = new Hash(window);
    this.animFrame = new AnimationFrame();
    this.frameId = null;
    this.lastFrameTime = null;
    this.frameRate = 0;
    this.frameInterval = 0;
    this.world = new HexAntWorld(this.el);
    this.boundTick = tick;

    var ant = this.world.addAnt(new Ant(this.world));
    ant.pos = this.world.tile.centerPoint().toCube();
    this.hash.set('rule', parseRule(ant, this.hash.get('rule', 'LR')));

    this.el.addEventListener('click', playpause);
    window.addEventListener('keypress', onKeyPress);

    this.setFrameRate(this.hash.get('frameRate', 4));
    this.world.setLabeled(this.hash.get('labeled', false));
    this.world.defaultCellValue = this.hash.get('drawUnvisited', false) ? 1 : 0;

    function onKeyPress(e) {
        self.onKeyPress(e);
    }

    function playpause() {
        self.playpause();
    }

    function tick(time) {
        self.tick(time);
    }
}

Hexant.prototype.onKeyPress =
function onKeyPress(e) {
    switch (e.keyCode) {
    case 0x20: // <Space>
        this.playpause();
        break;
    case 0x23: // #
        this.toggleLabeled();
        break;
    case 0x2a: // *
        console.log(this.world.tile.dump());
        break;
    case 0x2b: // +
        this.setFrameRate(this.frameRate * 2);
        this.hash.set('frameRate', this.frameRate);
        break;
    case 0x2d: // -
        this.setFrameRate(Math.max(1, Math.floor(this.frameRate / 2)));
        this.hash.set('frameRate', this.frameRate);
        break;
    case 0x2e: // .
        this.stepit();
        break;
    case 0x2f: // /
        var ant = this.world.ants[0];
        this.pause();
        var rule = this.hash.get('rule');
        rule = prompt('New Rules: (' + RulesLegend + ')', rule);
        this.hash.set('rule', parseRule(ant, rule));
        this.world.updateAntColors();
        this.reset();
        break;
    }
};

Hexant.prototype.reset =
function reset() {
    var ant = this.world.ants[0];
    this.world.tile = new HexTileTree(OddQOffset(0, 0), 2, 2);
    this.world.hexGrid.bounds = this.world.tile.boundingBox().copy();
    ant.dir = 0;
    ant.pos = this.world.tile.centerPoint().toCube();
    this.world.tile.set(ant.pos, 1);
    this.el.width = this.el.width;
    this.world.hexGrid.updateSize();
    this.world.redraw();
};

Hexant.prototype.tick =
function tick(time) {
    var frames = 1;
    if (!this.lastFrameTime) {
        this.lastFrameTime = time;
    } else {
        var progress = time - this.lastFrameTime;
        frames = Math.min(BatchLimit, progress / this.frameInterval);
    }

    for (var i = 0; i < frames; i++) {
        this.lastFrameTime += this.frameInterval;
        var err = this.step();
        if (err) {
            this.pause();
            throw err;
        }
    }

    this.frameId = this.animFrame.request(this.boundTick);
};

Hexant.prototype.play =
function play() {
    this.lastFrameTime = null;
    this.frameId = this.animFrame.request(this.boundTick);
};

Hexant.prototype.pause =
function pause() {
    this.animFrame.cancel(this.frameId);
    this.lastFrameTime = null;
    this.frameId = null;
};

Hexant.prototype.playpause =
function playpause() {
    if (this.frameId) {
        this.pause();
    } else {
        this.play();
    }
};

Hexant.prototype.stepit =
function stepit() {
    if (!this.frameId) {
        this.world.stepDraw();
    } else {
        this.pause();
    }
};

Hexant.prototype.step =
function step() {
    try {
        this.world.stepDraw();
        return null;
    } catch(err) {
        return err;
    }
};

Hexant.prototype.setFrameRate =
function setFrameRate(rate) {
    this.frameRate = rate;
    this.frameInterval = 1000 / this.frameRate;
    if (this.frameId) {
        this.animFrame.cancel(this.frameId);
    }
    if (this.frameId) {
        this.play();
    }
};

Hexant.prototype.toggleLabeled =
function toggleLabeled() {
    this.world.setLabeled(!this.world.labeled);
    this.world.redraw();
    this.hash.set('labeled', this.world.labeled);
};

Hexant.prototype.resize =
function resize(width, height) {
    this.world.resize(width, height);
};
