'use strict';

var domready = require('domready');
var window = require('global/window');
var document = window.document;

var Hexant = require('./hexant');

domready(setup);

function setup() {
    var hexant = new Hexant(document.querySelector('#view'));
    window.hexant = hexant;
}
