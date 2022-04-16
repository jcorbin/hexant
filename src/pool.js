'use strict';

module.exports = function installPool(cons) {
    var pool = [];
    cons.alloc = function alloc() {
        if (pool.length > 0) {
            return pool.shift();
        }
        return new cons();
    };
    cons.prototype.free = typeof cons.prototype.reset === 'function'
        ? function resetAndFree() {
            this.reset();
            pool.push(this);
        }
        : function justFree() {
            pool.push(this);
        };
    return cons;
};
