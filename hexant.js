'use strict';

module.exports = Hexant;

var AnimationFrame = require('animation-frame');
var window = require('global/window');
var document = window.document;

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

    setFrameRate(this.hash.get('frameRate', 4));
    this.world.setLabeled(this.hash.get('labeled', false));
    this.world.defaultCellValue = this.hash.get('drawUnvisited', false) ? 1 : 0;

    function onKeyPress(e) {
        switch (e.keyCode) {
        case 0x20: // <Space>
            self.playpause();
            break;
        case 0x23: // #
            toggleLabeled();
            break;
        case 0x2a: // *
            console.log(self.world.tile.dump());
            break;
        case 0x2b: // +
            setFrameRate(self.frameRate * 2);
            self.hash.set('frameRate', self.frameRate);
            break;
        case 0x2d: // -
            setFrameRate(Math.max(1, Math.floor(self.frameRate / 2)));
            self.hash.set('frameRate', self.frameRate);
            break;
        case 0x2e: // .
            self.stepit();
            break;
        case 0x2f: // /
            var ant = self.world.ants[0];
            self.pause();
            var rule = self.hash.get('rule');
            rule = prompt('New Rules: (' + RulesLegend + ')', rule);
            self.hash.set('rule', parseRule(ant, rule));
            self.world.updateAntColors();
            reset();
            break;
        }
    }

    function toggleLabeled() {
        self.world.setLabeled(!self.world.labeled);
        self.world.redraw();
        self.hash.set('labeled', self.world.labeled);
    }

    function setFrameRate(rate) {
        self.frameRate = rate;
        self.frameInterval = 1000 / self.frameRate;
        if (self.frameId) {
            self.animFrame.cancel(self.frameId);
        }
        if (self.frameId) {
            self.play();
        }
    }

    function reset() {
        var ant = self.world.ants[0];
        self.world.tile = new HexTileTree(OddQOffset(0, 0), 2, 2);
        self.world.hexGrid.bounds = self.world.tile.boundingBox().copy();
        ant.dir = 0;
        ant.pos = self.world.tile.centerPoint().toCube();
        self.world.tile.set(ant.pos, 1);
        self.el.width = self.el.width;
        self.world.hexGrid.updateSize();
        self.world.redraw();
    }

    function playpause() {
        self.playpause();
    }

    function tick(time) {
        self.tick(time);
    }

    window.addEventListener('resize', onResize);
    onResize();

    function onResize() {
        var width = Math.max(
            document.documentElement.clientWidth,
            window.innerWidth || 0);
        var height = Math.max(
            document.documentElement.clientHeight,
            window.innerHeight || 0);
        self.world.resize(width, height);
    }
}

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
