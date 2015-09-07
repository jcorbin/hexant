'use strict';

var domready = require('domready');
var window = require('global/window');
var document = window.document;

var Scope = require('gutentag/scope');
var Document = require('gutentag/document');
var Hexant = require('./hexant.html');

domready(setup);

function setup() {
    var scope = new Scope();
    scope.window = window;
    var bodyDocument = new Document(window.document.body);
    var body = bodyDocument.documentElement;
    var hexant = new Hexant(body, scope);
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
