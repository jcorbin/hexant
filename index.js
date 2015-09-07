'use strict';

var domready = require('domready');
var window = require('global/window');
var document = window.document;

var Hexant = require('./hexant');

domready(setup);

function setup() {
    var hexant = new Hexant(document.querySelector('#view'));
    window.hexant = hexant;
    window.addEventListener('resize', onResize);
    onResize();
}

function onResize() {
    var width = Math.max(
        document.documentElement.clientWidth,
        window.innerWidth || 0);
    var height = Math.max(
        document.documentElement.clientHeight,
        window.innerHeight || 0);
    window.hexant.resize(width, height);
}
