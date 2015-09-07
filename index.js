'use strict';

var domready = require('domready');
var AnimationFrame = require('animation-frame');
var window = require('global/window');
var document = window.document;

var HexAntWorld = require('./world.js');
var Ant = require('./ant.js');
var Hash = require('./hash.js');
var OddQOffset = require('./coord.js').OddQOffset;
var HexTileTree = require('./hextiletree.js');

var BatchLimit = 256;

domready(setup);

var RulesLegend = 'W=West, L=Left, A=Ahead, R=Right, E=East, F=Flip';
var Rules = {
    W: -2,
    L: -1,
    A: 0,
    R: 1,
    E: 2,
    F: 3
};

function setup() {
    var el = document.querySelector('#view');

    var hash = new Hash(window);
    var animFrame = new AnimationFrame();
    var frameId = null;
    var lastFrameTime = null;
    var frameRate = 0;
    var frameInterval = 0;

    var hexant = new HexAntWorld(el);
    var ant = new Ant(hexant);
    ant.pos = hexant.tile.centerPoint().toCube();
    hash.set('rule', parseRule(ant, hash.get('rule', 'LR')));
    hexant.addAnt(ant);

    el.addEventListener('click', playpause);
    window.hexant = hexant;
    window.addEventListener('keypress', onKeyPress);

    setFrameRate(hash.get('frameRate', 4));
    hexant.setLabeled(hash.get('labeled', false));

    hexant.defaultCellValue = hash.get('drawUnvisited', false) ? 1 : 0;

    function onKeyPress(e) {
        switch (e.keyCode) {
        case 0x20: // <Space>
            if (!frameId) {
                stepit();
                e.preventDefault();
            } else {
                pause();
            }
            break;
        case 0x23: // #
            toggleLabeled();
            break;
        case 0x2a: // *
            console.log(hexant.tile.dump());
            break;
        case 0x2b: // +
            setFrameRate(frameRate * 2);
            hash.set('frameRate', frameRate);
            break;
        case 0x2d: // -
            setFrameRate(Math.max(1, Math.floor(frameRate / 2)));
            hash.set('frameRate', frameRate);
            break;
        case 0x2f: // /
            pause();
            var rule = hash.get('rule');
            rule = prompt('New Rules: (' + RulesLegend + ')', rule).toUpperCase();
            hash.set('rule', parseRule(ant, rule));
            hexant.updateAntColors();
            reset();
            break;
        }
    }

    function toggleLabeled() {
        hexant.setLabeled(!hexant.labeled);
        hexant.redraw();
        hash.set('labeled', hexant.labeled);
    }

    function stepit() {
        hexant.stepDraw();
    }

    function setFrameRate(rate) {
        frameRate = rate;
        frameInterval = 1000 / frameRate;
        if (frameId) {
            animFrame.cancel(frameId);
        }
        if (frameId) {
            play();
        }
    }

    function play() {
        lastFrameTime = null;
        frameId = animFrame.request(tick);
    }

    function reset() {
        hexant.tile = new HexTileTree(OddQOffset(0, 0), 2, 2);
        hexant.hexGrid.bounds = hexant.tile.boundingBox().copy();
        ant.pos = hexant.tile.centerPoint().toCube();
        hexant.tile.set(ant.pos, 1);
        el.width = el.width;
        hexant.hexGrid.updateSize();
        hexant.redraw();
    }

    function pause() {
        animFrame.cancel(frameId);
        lastFrameTime = null;
        frameId = null;
    }

    function playpause() {
        if (frameId) {
            pause();
        } else {
            play();
        }
    }

    function tick(time) {
        var frames = 1;
        if (!lastFrameTime) {
            lastFrameTime = time;
        } else {
            var progress = time - lastFrameTime;
            frames = Math.min(BatchLimit, progress / frameInterval);
        }

        for (var i = 0; i < frames; i++) {
            lastFrameTime += frameInterval;
            var err = step();
            if (err) {
                pause();
                throw err;
            }
        }

        frameId = animFrame.request(tick);
    }

    function step() {
        try {
            hexant.stepDraw();
            return null;
        } catch(err) {
            return err;
        }
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
        hexant.resize(width, height);
    }
}

function parseRule(ant, rule) {
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
            return typeof(part) === 'number';
        })
        ;
    return rerule;
}
