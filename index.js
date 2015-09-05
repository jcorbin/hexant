'use strict';

var domready = require('domready');
var AnimationFrame = require('animation-frame');
var window = require('global/window');
var document = require('global/document');

var HexAntWorld = require('./world.js');
var Hash = require('./hash.js');

var BatchLimit = 256;

domready(setup);

function setup() {
    var el = document.querySelector('#view');

    var hash = new Hash(window);
    var animFrame = new AnimationFrame();
    var frameId = null;
    var lastFrameTime = null;
    var frameRate = 0;
    var frameInterval = 0;

    var hexant = new HexAntWorld(el);
    hexant.addAnt();
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
