'use strict';

var domready = require('domready');
var AnimationFrame = require('animation-frame');
var window = require('global/window');
var document = require('global/document');

var HexAntWorld = require('./world.js');
var Hash = require('./hash.js');

domready(setup);

function setup() {
    var el = document.querySelector('#view');

    var hash = new Hash(window);
    var animFrame = null;
    var frameId = null;
    var lastFrameTime = null;

    var hexant = new HexAntWorld(el);
    hexant.addAnt();
    console.log(hexant.tile.dump());
    el.addEventListener('click', stepit);
    setFrameRate(10);
    window.hexant = hexant;

    window.addEventListener('keypress', onKeyPress);

    if (hash.get('labeled')) {
        hexant.setLabeled(true);
    }

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
        // default:
        //     console.log(e.keyCode);
        }
    }

    function toggleLabeled() {
        hexant.setLabeled(!hexant.labeled);
        hexant.redraw();
        hash.set('labeled', hexant.labeled);
    }

    function stepit() {
        hexant.stepDraw();
        console.log(hexant.tile.dump());
    }

    function setFrameRate(frameRate) {
        if (frameId) {
            animFrame.cancel(frameId);
        }
        animFrame = new AnimationFrame(frameRate);
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
        if (!lastFrameTime) {
            lastFrameTime = time;
        }
        var progress = time - lastFrameTime;
        if (progress >= 2000) {
            pause();
            return;
        }
        frameId = animFrame.request(tick);

        try {
            hexant.stepDraw();
        } catch(err) {
            pause();
            throw err;
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
