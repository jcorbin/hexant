'use strict';

module.exports = Hexant;

var Hash = require('hashbind');
var colorGen = require('./colorgen.js');
var World = require('./world.js');
var View = require('./view.js');
var Turmite = require('./turmite/index.js');
var OddQOffset = require('./coord.js').OddQOffset;
var HexTileTree = require('./hextiletree.js');

var BatchLimit = 512;

function Hexant(body, scope) {
    var self = this;

    this.el = null;
    this.world = null;
    this.view = null;

    this.window = scope.window;
    this.hash = new Hash(this.window);
    this.animator = scope.animator.add(this);
    this.lastFrameTime = null;
    this.frameRate = 0;
    this.frameInterval = 0;
    this.paused = true;
    this.prompt = null;

    this.boundPlaypause = playpause;

    function playpause() {
        self.playpause();
    }
}

Hexant.prototype.hookup =
function hookup(id, component, scope) {
    // Only one scope of interest
    if (id !== 'this') {
        return;
    }

    this.prompt = scope.components.prompt;
    this.el = scope.components.view;

    this.titleBase = this.window.document.title;
    this.world = new World();
    this.view = this.world.addView(
        new View(this.world, this.el));

    this.setup(scope);
};

Hexant.prototype.setup =
function setup(scope) {
    var self = this;

    this.window.addEventListener('keypress', function onKeyPress(e) {
        self.onKeyPress(e);
    });

    this.el.addEventListener('click', this.boundPlaypause);

    this.hash.bind('colors')
        .setParse(colorGen.parse, colorGen.toString)
        .setDefault('light')
        .addListener(function onColorGenChange(gen) {
            self.view.setColorGen(gen);
            self.view.redraw();
        })
        ;

    this.hash.bind('rule')
        .setParse(function parseRule(str) {
            var res = Turmite.compile(str);
            if (res.err) {
                console.error(res.err); // TODO: better error facility
                return this.value;
            }
            return res.value;
        })
        .setDefault('ant(L R)')
        .addListener(function onRuleChange(ent) {
            self.window.document.title = self.titleBase + ': ' + ent;
            if (self.world.ents[0]) {
                self.world.updateEnt(ent, 0);
            } else {
                self.world.addEnt(ent);
            }
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
            self.view.drawUnvisited = !!drawUnvisited;
        });

    var autoplay;
    var autorefresh;
    if (this.hash.get('fullauto')) {
        autoplay = true;
        autorefresh = 24 * 60 * 60;
    } else {
        autoplay = this.hash.get('autoplay');
        autorefresh = parseInt(this.hash.get('autorefresh'), 10);
    }

    if (!isNaN(autorefresh) && autorefresh) {
        this.window.setTimeout(function shipit() {
            this.window.location.reload();
        }, autorefresh * 1000);
    }

    if (autoplay) {
        this.play();
    }
};

Hexant.prototype.onKeyPress =
function onKeyPress(e) {
    if (e.target !== this.window.document.documentElement &&
        e.target !== this.window.document.body &&
        e.target !== this.el
    ) {
        return;
    }

    switch (e.keyCode) {
    case 0x20: // <Space>
        this.playpause();
        break;
    case 0x23: // #
        this.toggleLabeled();
        break;
    case 0x2a: // *
        this.pause();
        this.reset();
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
    case 0x43: // C
    case 0x63: // c
        this.promptFor('colors', 'New Colors:');
        e.preventDefault();
        break;

    case 0x2f: // /
        this.promptFor('rule', Turmite.ruleHelp);
        e.preventDefault();
        break;
    }
};

Hexant.prototype.promptFor =
function promptFor(name, desc) {
    var self = this;

    if (self.prompt.active()) {
        return;
    }

    var orig = self.hash.getStr(name);
    self.prompt.prompt(desc, orig, finish);

    function finish(canceled, value) {
        if (!canceled) {
            self.hash.set(name, value);
        }
    }
};

Hexant.prototype.reset =
function reset() {
    this.world.tile = new HexTileTree(OddQOffset(0, 0), 2, 2);

    this.view.hexGrid.bounds = this.world.tile.boundingBox().copy();
    this.view.hexGrid.updateSize();

    var ent = this.world.ents[0];
    ent.dir = 0;
    this.world.tile.centerPoint().toCubeInto(ent.pos);
    var data = this.world.tile.get(ent.pos);
    this.world.tile.set(ent.pos, World.FlagVisited | data);

    this.el.width = this.el.width;
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

    this.world.stepn(frames);
    this.lastFrameTime += frames * this.frameInterval;
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
