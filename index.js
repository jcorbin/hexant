'use strict';

var domready = require('domready');
var window = require('global/window');
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
}
