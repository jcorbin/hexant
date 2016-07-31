'use strict';

module.exports = Hexant;

var Hash = require('hashbind');
var Base64 = require('Base64');
var Result = require('rezult');
var colorGen = require('./colorgen.js');
var World = require('./world.js');
var View = require('./view.js');
var Turmite = require('./turmite/index.js');
var OddQOffset = require('./coord.js').OddQOffset;
var HexTileTree = require('./hextiletree.js');
var Sample = require('./sample.js');

var FPSInterval = 3 * 1000;
var NumTimingSamples = FPSInterval / 1000 * 60;
var MinFPS = 20;

function Hexant(body, scope) {
    var self = this;
    var atob = scope.window.atob || Base64.atob;
    var btoa = scope.window.btoa || Base64.btoa;

    // components
    this.prompt = null;
    this.el = null;

    this.world = null;
    this.view = null;

    this.window = scope.window;
    this.hash = new Hash(this.window, {
        decode: decodeHash
    });
    this.animator = scope.animator.add(this);
    this.lastStepTime = null;
    this.goalStepRate = 0;
    this.stepRate = 0;
    this.paused = true;
    this.showFPS = false;
    this.animTimes = [];
    this.stepTimes = [];
    this.animTiming = new Sample(NumTimingSamples);
    this.throtLog = false;

    this.boundPlaypause = playpause;
    this.boundOnKeyPress = onKeyPress;
    this.b64EncodeHash = encodeHash;

    function playpause() {
        self.playpause();
    }

    function onKeyPress(e) {
        self.onKeyPress(e);
    }

    function decodeHash(str) {
        if (/^b64:/.test(str)) {
            str = str.slice(4);
            str = atob(str);
        }
        return Hash.decodeUnescape(str);
    }

    function encodeHash(keyvals) {
        var str = Hash.encodeMinEscape(keyvals);
        str = 'b64:' + btoa(str);
        return str;
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
    this.fpsOverlay = scope.components.fpsOverlay;
    this.fps = scope.components.fps;
    this.sps = scope.components.sps;

    this.titleBase = this.window.document.title;
    this.world = new World();
    this.view = this.world.addView(
        new View(this.world, this.el));

    this.window.addEventListener('keypress', this.boundOnKeyPress);
    this.el.addEventListener('click', this.boundPlaypause);

    this.configure();
};

Hexant.prototype.configure =
function configure() {
    var self = this;

    this.hash.bind('colors')
        .setParse(colorGen.parse, colorGen.toString)
        .setDefault('light')
        .addListener(function onColorGenChange(gen) {
            self.onColorGenChange(gen);
        })
        ;

    this.hash.bind('rule')
        .setParse(Turmite.compile)
        .setDefault('ant(L R)')
        .addListener(function onRuleChange(ent) {
            self.onRuleChange(ent);
        });

    this.hash.bind('showFPS')
        .setDefault(false)
        .addListener(function onDrawFPSChange(showFPS) {
            self.showFPS = !! showFPS;
            self.fpsOverlay.style.display = self.showFPS ? '' : 'none';
        });


    this.hash.bind('stepRate')
        .setParse(Result.lift(parseInt))
        .setDefault(4)
        .addListener(function onStepRateChange(rate) {
            self.setStepRate(rate);
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

    this.hash.bind('drawTrace')
        .setDefault(false)
        .addListener(function onDrawTraceChange(drawTrace) {
            self.view.setDrawTrace(!!drawTrace);
            self.view.redraw();
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

Hexant.prototype.onColorGenChange =
function onColorGenChange(gen) {
    this.view.setColorGen(gen);
    this.view.redraw();
};

Hexant.prototype.onRuleChange =
function onRuleChange(ent) {
    this.window.document.title = this.titleBase + ': ' + ent;
    this.world.setEnts([ent]);
    this.reset();
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
        this.hash.set('stepRate', this.stepRate * 2);
        break;
    case 0x2d: // -
        this.hash.set('stepRate', Math.max(1, Math.floor(this.stepRate / 2)));
        break;
    case 0x2e: // .
        this.stepit();
        break;

    case 0x42: // B
    case 0x62: // b
        this.hash.encode =
            this.hash.encode === Hash.encodeMinEscape
            ? this.b64EncodeHash : Hash.encodeMinEscape;
        this.hash.save();
        break;

    case 0x43: // C
    case 0x63: // c
        this.promptFor('colors', 'New Colors:');
        e.preventDefault();
        break;

    case 0x46: // F
    case 0x66: // f
        this.hash.set('showFPS', !this.showFPS);
        break;

    case 0x54:
    case 0x74:
        this.hash.set('drawTrace', !this.view.drawTrace);
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

    function finish(canceled, value, callback) {
        if (canceled) {
            callback(null);
            return;
        }

        self.hash.set(name, value, function setDone(err) {
            // NOTE: we get two extra args, the string value entered, and  the
            // parsed value, so we cannot just pass callback in directly, whose
            // signature is callback(err, help, revalue)
            callback(err);
        });
    }
};

Hexant.prototype.reset =
function reset() {
    this.world.tile = new HexTileTree(OddQOffset(0, 0), 2, 2);

    this.view.hexGrid.bounds = this.world.tile.boundingBox().copy();
    this.view.updateSize();

    this.world.resetEnt(0);
    this.world.tile.update(this.world.getEntPos(0), markVisited);

    this.el.width = this.el.width;
    this.view.redraw();
};

function markVisited(data) {
    return World.FlagVisited | data;
}

Hexant.prototype.animate =
function animate(time) {
    try {
        this._animate(time);
    } catch(err) {
        this.animator.cancelAnimation();
        throw err;
    }
};

Hexant.prototype._animate =
function _animate(time) {
    if (!this.lastStepTime) {
        this.lastStepTime = time;
        return;
    }

    var steps = 1;
    var sinceLast = time - this.lastStepTime;
    steps = Math.round(sinceLast / 1000 * this.stepRate);
    this.animTiming.collect(sinceLast);
    this.throttle()

    switch (steps) {
    case 0:
        break;
    case 1:
        this.world.step();
        this.stepTimes.push(time, 1);
        break;
    default:
        this.stepTimes.push(time, steps);
        this.world.stepn(steps);
        break;
    }
    this.lastStepTime = time;
    this.animTimes.push(time);

    while ((time - this.animTimes[0]) > FPSInterval) {
        this.animTimes.shift();
    }
    while ((time - this.stepTimes[0]) > FPSInterval) {
        this.stepTimes.shift();
        this.stepTimes.shift();
    }

    if (this.showFPS) {
        this.fps.innerText = this.computeFPS().toFixed(0) + 'fps';
        this.sps.innerText = toSI(this.computeSPS()) + 'sps';
    }
};

Hexant.prototype.throttle =
function throttle() {
    if (!this.animTiming.complete()) {
        return;
    }

    if (this.animTiming.sinceWeightedMark() <= 3) {
        return;
    }

    if (this.stepRate > 1) {
        var fps = this.computeFPS();
        if (fps < MinFPS) {
            this.animTiming.weightedMark(2);
            this.stepRate /= 2;
            if (this.throtLog) {
                console.log('FPS SLOW DOWN', fps, this.stepRate);
            }
            return;
        }
    }

    var as = this.animTiming.classifyAnomalies();
    var i = as.length-1;
    if (this.stepRate > 1 && as[i] > 0.5 && as[i-1] > 0.5 && as[i-2] > 0.5) {
        this.stepRate /= 2;
        if (this.throtLog) {
            console.log('SLOW DOWN', this.stepRate, this.animTiming.markWeight, this.animTiming.lastMark);
        }
        this.animTiming.weightedMark(2);
    } else if (
        this.stepRate < this.goalStepRate &&
        as[i] <= 0 && as[i-1] <= 0 && as[i-2] <= 0
    ) {
        this.stepRate *= 2;
        this.animTiming.weightedMark(0.5);
        if (this.throtLog) {
            console.log('SPEED UP', this.stepRate, this.animTiming.markWeight, this.animTiming.lastMark);
        }
    }
};

Hexant.prototype.computeFPS =
function computeFPS() {
    return this.animTimes.length / FPSInterval * 1000;
};

Hexant.prototype.computeSPS =
function computeSPS() {
    var totalSteps = 0;
    for (var i = 1; i < this.stepTimes.length; i += 2) {
        totalSteps += this.stepTimes[i];
    }
    return totalSteps / FPSInterval * 1000;
};

Hexant.prototype.play =
function play() {
    this.animTimes.length = 0;
    this.stepTimes.length = 0;
    this.animTiming.reset();
    this.fps.innerText = '';
    this.sps.innerText = '';
    this.lastStepTime = null;
    this.animator.requestAnimation();
    this.paused = false;
};

Hexant.prototype.pause =
function pause() {
    this.fps.innerText = '<' + this.fps.innerText + '>';
    this.sps.innerText = '<' + this.sps.innerText + '>';
    this.lastStepTime = null;
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

Hexant.prototype.setStepRate =
function setStepRate(rate) {
    if (this.stepRate === this.goalStepRate) {
        this.stepRate = rate;
    }
    this.goalStepRate = rate;
};

Hexant.prototype.toggleLabeled =
function toggleLabeled() {
    this.hash.set('labeled', !this.view.labeled);
};

Hexant.prototype.resize =
function resize(width, height) {
    this.view.resize(width, height);
};

var siSuffix = ['K', 'M', 'G', 'T', 'E'];

function toSI(n) {
    if (n < 1000) {
        return n.toFixed(0);
    }
    n /= 1000;
    for (var si = 0; si < siSuffix.length && n > 1000; ++si, n /= 1000) {
    }
    return n.toPrecision(3) + siSuffix[si];
}
