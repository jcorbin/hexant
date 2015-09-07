'use strict';

var domready = require('domready');
var Hexant = require('./hexant');

domready(setup);

function setup() {
    var hexant = new Hexant();
}
