'use strict';
/* global console, prompt */
/* eslint no-console: [0], no-alert: [0], no-try-catch: [0] */

module.exports = Hexant;

var colorGen = require('./colorgen.js');
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

function parseRule(rule) {
    rule = rule.toUpperCase();
    var parts = rule.split('');
    var rules = [];
    for (var i = 0; i < parts.length; i++) {
        var r = Rules[parts[i]];
        if (r !== undefined) {
            rules.push(r);
        }
    }
    return rules;
}

function ruleToString(rules) {
    var rule = '';
    var ruleKeys = Object.keys(Rules);
    for (var i = 0; i < rules.length; i++) {
        for (var j = 0; j < ruleKeys.length; j++) {
            if (rules[i] === Rules[ruleKeys[j]]) {
                rule += ruleKeys[j];
            }
        }
    }
    return rule;
}

function Hexant(body, scope) {
    var self = this;

    this.el = null;
    this.world = null;

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
    if (id === 'view') {
        self.setup(component, scope);
    }
};

Hexant.prototype.setup = function setup(el, scope) {
    var self = this;

    this.el = el;
    this.world = new HexAntWorld(this.el);

    this.el.addEventListener('click', this.boundPlaypause);
    scope.window.addEventListener('keypress', this.boundOnKeyPress);

    this.hash.bind('colors')
        .setParse(colorGen.parse, colorGen.toString)
        .setDefault(colorGen.gens.hue)
        .addListener(function onColorGenChange(gen) {
            self.world.setColorGen(gen);
            self.world.redraw();
        })
        ;

    this.world.addAnt(new Ant(this.world));

    this.hash.bind('rule')
        .setParse(parseRule, ruleToString)
        .setDefault('LR')
        .addListener(function onRuleChange(rules) {
            var ant = self.world.ants[0];
            ant.rules = rules;
            self.world.updateAntColors();
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
            self.world.setLabeled(labeled);
            self.world.redraw();
        });

    this.hash.bind('drawUnvisited')
        .setDefault(false)
        .addListener(function onDrawUnvisitedChange(drawUnvisited) {
            self.world.defaultCellValue = drawUnvisited ? 1 : 0;
        });
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
        rule = prompt('New Rules: (' + RulesLegend + ')', rule);
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
    this.world.hexGrid.bounds = this.world.tile.boundingBox().copy();
    ant.dir = 0;
    ant.pos = this.world.tile.centerPoint().toCube();
    this.world.tile.set(ant.pos, 1);
    this.el.width = this.el.width;
    this.world.hexGrid.updateSize();
    this.world.redraw();
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

    for (var i = 0; i < frames; i++) {
        this.lastFrameTime += this.frameInterval;
        var err = this.step();
        if (err) {
            this.pause();
            throw err;
        }
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
};

Hexant.prototype.toggleLabeled =
function toggleLabeled() {
    this.hash.set('labeled', !this.world.labeled);
};

Hexant.prototype.resize =
function resize(width, height) {
    this.world.resize(width, height);
};
