'use strict';

function Main() {
    this.view = null;
}

Main.prototype.hookup = function hookup(id, component) {
    if (id === 'view') {
        this.view = component;
    }
};

Main.prototype.resize = function resize(width, height) {
    this.view.resize(width, height);
};

module.exports = Main;
