'use strict';

var domready = require('domready');
var AnimationFrame = require('animation-frame');
var HexAntWorld = require('./world.js');

domready(setup);

function setup() {
    var el = document.querySelector('#view');

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

    if (getHash('labeled')) {
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
        setHash('labeled', hexant.labeled);
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

function setHash(key, val) {
    var parts = window.location.hash.slice(1).split('&');

    var part = '' + escape(key);
    if (val === false) {
        part = '';
    } else if (val !== true) {
        part += '=' + escape(val);
    }

    var found = false;
    for (var i = 0; i < parts.length; i++) {
        var keyval = parts[i].split('=');
        if (keyval[0] === key) {
            found = true;
            parts[i] = part;
            break;
        }
    }

    if (!found) {
        parts.push(part);
    }
    parts = parts.filter(notEmptyString);
    window.location.hash = parts.join('&');
}

function getHash(key) {
    var parts = window.location.hash.slice(1).split('&');
    for (var i = 0; i < parts.length; i++) {
        var keyval = parts[i].split('=');
        if (unescape(keyval[0]) === key) {
            var val = unescape(keyval[1]);
            if (val === undefined || val === 'true') {
                return true;
            } else if (val === 'false') {
                return false;
            } else if (val === 'null') {
                return null;
            } else {
                return val;
            }
        }
    }
    return undefined;
}

function notEmptyString(val) {
    return val !== '';
}
