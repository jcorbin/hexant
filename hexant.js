'use strict';
/* global console, prompt */
/* eslint no-console: [0], no-alert: [0], no-try-catch: [0] */

module.exports = Hexant;

var colorGen = require('./colorgen.js');
var World = require('./world.js');
var View = require('./view.js');
var Ant = require('./ant.js');
var Hash = require('./hash.js');
var OddQOffset = require('./coord.js').OddQOffset;
var HexTileTree = require('./hextiletree.js');
var rules = require('./rules.js');

var BatchLimit = 256;

function Hexant(body, scope) {
    var self = this;

    this.el = null;
    this.world = null;
    this.view = null;

    this.hash = new Hash(scope.window);
    this.animator = scope.animator.add(this);
    this.lastFrameTime = null;
    this.frameRate = 0;
    this.frameInterval = 0;
    this.paused = true;

    this.boundOnKeyPress = onKeyPress;
    function onKeyPress(e) {
        self.onKeyPress(e);
    }

    this.boundPlaypause = playpause;
    function playpause() {
        self.playpause();
    }
}

Hexant.prototype.hookup = function hookup(id, component, scope) {
    var self = this;
    if (id !== 'view') {
        return;
    }

    this.el = component;
    this.world = new World();
    this.view = this.world.addView(
        new View(this.world, component));

    this.el.addEventListener('click', this.boundPlaypause);
    scope.window.addEventListener('keypress', this.boundOnKeyPress);

    this.hash.bind('colors')
        .setParse(colorGen.parse, colorGen.toString)
        .setDefault(colorGen.gens.hue)
        .addListener(function onColorGenChange(gen) {
            self.view.setColorGen(gen);
            self.view.redraw();
        })
        ;

    this.world.addAnt(new Ant(this.world));

    this.hash.bind('rule')
        .setParse(rules.parse, rules.toString)
        .setDefault('LR')
        .addListener(function onRuleChange(rules) {
            var ant = self.world.ants[0];
            ant.rules = rules;
            self.world.updateAnt(ant);
            self.reset();
        });

    this.hash.bind('frameRate')
        .setParse(parseInt)
        .setDefault(4)
        .addListener(function onFrameRateChange(rate) {
            self.setFrameRate(rate);
        });

    this.hash.bind('labeled')
        .setDefault(false)
        .addListener(function onLabeledChange(labeled) {
            self.view.setLabeled(labeled);
            self.view.redraw();
        });

    this.hash.bind('drawUnvisited')
        .setDefault(false)
        .addListener(function onDrawUnvisitedChange(drawUnvisited) {
            self.view.defaultCellValue = drawUnvisited ? 1 : 0;
        });

    if (this.hash.get('autoplay')) {
        this.play();
    }
};

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
        this.hash.set('frameRate', this.frameRate * 2);
        break;
    case 0x2d: // -
        this.hash.set('frameRate', Math.max(1, Math.floor(this.frameRate / 2)));
        break;
    case 0x2e: // .
        this.stepit();
        break;
    case 0x2f: // /
        var rule = this.hash.getStr('rule');
        rule = prompt('New Rules: (' + rules.help + ')', rule);
        if (typeof rule === 'string') {
            this.pause();
            this.hash.set('rule', rule);
        }
        break;
    }
};

Hexant.prototype.reset =
function reset() {
    var ant = this.world.ants[0];
    this.world.tile = new HexTileTree(OddQOffset(0, 0), 2, 2);
    this.view.hexGrid.bounds = this.world.tile.boundingBox().copy();
    ant.dir = 0;
    ant.pos = this.world.tile.centerPoint().toCube();
    this.world.tile.set(ant.pos, 1);
    this.el.width = this.el.width;
    this.view.hexGrid.updateSize();
    this.view.redraw();
};

Hexant.prototype.animate =
function animate(time) {
    var frames = 1;
    if (!this.lastFrameTime) {
        this.lastFrameTime = time;
    } else {
        var progress = time - this.lastFrameTime;
        frames = Math.min(BatchLimit, progress / this.frameInterval);
    }

    this.lastFrameTime += frames * this.frameInterval;
    var err = this.stepn(frames);
    if (err) {
        this.pause();
        throw err;
    }
};

Hexant.prototype.play =
function play() {
    this.lastFrameTime = null;
    this.animator.requestAnimation();
    this.paused = false;
};

Hexant.prototype.pause =
function pause() {
    this.lastFrameTime = null;
    this.animator.cancelAnimation();
    this.paused = true;
};

Hexant.prototype.playpause =
function playpause() {
    if (this.paused) {
        this.play();
    } else {
        this.pause();
    }
};

Hexant.prototype.stepit =
function stepit() {
    if (this.paused) {
        this.world.step();
    } else {
        this.pause();
    }
};

Hexant.prototype.stepn =
function stepn(n) {
    for (var i = 0; i < n; i++) {
        this.step();
    }
};

Hexant.prototype.step =
function step() {
    try {
        this.world.step();
        return null;
    } catch(err) {
        return err;
    }
};

Hexant.prototype.setFrameRate =
function setFrameRate(rate) {
    this.frameRate = rate;
    this.frameInterval = 1000 / this.frameRate;
};

Hexant.prototype.toggleLabeled =
function toggleLabeled() {
    this.hash.set('labeled', !this.view.labeled);
};

Hexant.prototype.resize =
function resize(width, height) {
    this.view.resize(width, height);
};
