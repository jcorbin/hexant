'use strict';

var domready = require('domready');
var window = require('global/window');

var Hexant = require('./hexant');

domready(setup);

function setup() {
    var hexant = new Hexant();
    window.hexant = hexant;
}
