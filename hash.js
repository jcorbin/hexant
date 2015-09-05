'use strict';

module.exports = Hash;

function Hash(window) {
    this.window = window;
}

Hash.prototype.parse = function parse() {
    return this.window.location.hash.slice(1).split('&');
};

Hash.prototype.get = function get(key, def) {
    var parts = this.parse();
    for (var i = 0; i < parts.length; i++) {
        var keyval = parts[i].split('=');
        if (unescape(keyval[0]) === key) {
            var val = unescape(keyval[1]);
            if (val === undefined || val === 'true') {
                return true;
            }
            if (val === 'false') {
                return false;
            }
            if (val === 'null') {
                return null;
            }
            return val;
        }
    }

    return def;
};

Hash.prototype.set = function set(key, val) {
    var part = '' + escape(key);
    if (val === false) {
        part = '';
    } else if (val !== true) {
        part += '=' + escape(val);
    }

    var found = false;
    var parts = this.parse();
    for (var i = 0; i < parts.length; i++) {
        var keyval = parts[i].split('=');
        if (keyval[0] === key) {
            found = true;
            parts[i] = part;
            break;
        }
    }
    if (!found) {
        parts.push(part);
    }

    parts = parts.filter(notEmptyString);
    this.window.location.hash = parts.join('&');
};

function notEmptyString(val) {
    return val !== '';
}
