'use strict';

var domready = require('domready');
var window = require('global/window');
var Scope = require('gutentag/scope');
var Document = require('gutentag/document');
var Animator = require('blick');
var Point2 = require('ndim/point2');
var Hexant = require('./hexant.html');

domready(setup);

function setup() {
    var scope = new Scope();
    scope.window = window;
    var document = window.document;
    scope.animator = new Animator();
    var bodyDocument = new Document(document.body);
    var body = bodyDocument.documentElement;
    var hexant = new Hexant(body, scope);

    var size = new Point2();
    onResize();
    window.addEventListener('resize', onResize);

    function onResize() {
        size.x = Math.max(
            document.documentElement.clientWidth,
            window.innerWidth || 0);
        size.y = Math.max(
            document.documentElement.clientHeight,
            window.innerHeight || 0);
        hexant.resize(size);
    }
}
