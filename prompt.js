/* eslint no-try-catch: [0] */

'use strict';

module.exports = Prompt;

function Prompt(body, scope) {
    var self = this;

    this.box = null;
    this.help = null;
    this.text = null;
    this.callback = null;

    this.boundOnKeyDown = onKeyDown;
    this.boundOnKeyUp = onKeyUp;
    this.boundCancel = cancel;
    this.boundFinished = finished;
    this.lastEnter = 0;

    function onKeyDown(e) {
        self.onKeyDown(e);
    }

    function onKeyUp(e) {
        self.onKeyUp(e);
    }

    function cancel(e) {
        self.cancel();
    }

    function finished(err, help, revalue) {
        self.finished(err, help, revalue);
    }
}

Prompt.prototype.active =
function active() {
    return !!this.callback;
};

Prompt.prototype.prompt =
function prompt(help, value, callback) {
    this.help.innerText = help;
    this.text.value = value;
    this.callback = callback;
    this.box.style.display = '';
    this.resizeTextRows();
    this.text.select();
    this.text.focus();
};

Prompt.prototype.resizeTextRows =
function resizeTextRows() {
    var lines = this.text.value.split(/\n/);
    this.text.rows = lines.length + 1;
};

Prompt.prototype.finish =
function finish() {
    var value = this.text.value;
    var callback = this.callback;
    if (callback) {
        value = value.replace(/(?:\r?\n)+$/, '');
        callback(false, value, this.boundFinished);
    } else {
        this.boundFinished(null);
    }
};

Prompt.prototype.cancel =
function cancel() {
    var callback = this.callback;
    if (callback) {
        callback(true, null, this.boundFinished);
    }
};

Prompt.prototype.finished =
function finished(err, help, revalue) {
    if (err) {
        if (help) {
            this.help.innerText = help;
        } else {
            this.help.innerText = '' + err;
        }
        if (revalue) {
            this.text.value = revalue;
        }
        return;
    }
    this.hide();
};

Prompt.prototype.hide =
function hide() {
    this.lastEnter = 0;
    this.box.style.display = 'none';
    this.callback = null;
    this.text.value = '';
    this.help.innerText = '';
};

Prompt.prototype.hookup =
function hookup(id, component, scope) {
    // Only one scope of interest
    if (id !== 'this') {
        return;
    }

    this.box = scope.components.box;
    this.help = scope.components.help;
    this.text = scope.components.text;

    this.text.addEventListener('keydown', this.boundOnKeyDown);
    this.text.addEventListener('keyup', this.boundOnKeyUp);
    this.text.addEventListener('blur', this.boundCancel);
};

Prompt.prototype.onKeyDown =
function onKeyDown(e) {
    switch (e.keyCode) {
    case 0x0d: // <Enter>
        if (e.ctrlKey) {
            e.preventDefault();
        }
        break;
    case 0x1b: // <Esc>
        this.cancel();
        e.preventDefault();
        return;
    }
    this.resizeTextRows();
};

Prompt.prototype.onKeyUp =
function onKeyUp(e) {
    switch (e.keyCode) {
    case 0x0d: // <Enter>
        if (Date.now() - this.lastEnter < 1000 ||
            e.ctrlKey) {
            e.preventDefault();
            this.finish();
            return;
        }
        this.lastEnter = Date.now();
        break;
    default:
        this.lastEnter = 0;
    }
    this.resizeTextRows();
};
