'use strict';

var domready = require('domready');

var Scope = require('gutentag/scope');
var Document = require('gutentag/document');
var Animator = require('blick');
var Main = require('./main.html');

domready(setup);

function setup() {
    var scope = new Scope();
    scope.window = this;
    scope.animator = new Animator();
    var document = scope.window.document;
    var bodyDocument = new Document(document.body);
    scope.window.hexant = new Main(bodyDocument.documentElement, scope);

    scope.window.addEventListener('resize', onResize);
    onResize();

    function onResize() {
        var width = Math.max(
            document.documentElement.clientWidth,
            scope.window.innerWidth || 0);
        var height = Math.max(
            document.documentElement.clientHeight,
            scope.window.innerHeight || 0);
        scope.window.hexant.resize(width, height);
    }
}
