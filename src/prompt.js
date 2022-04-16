'use strict';

export class Prompt{

  constructor({
    body,
    help=body.querySelecotr('#help'),
    text=body.querySelecotr('#text'),
    error=body.querySelecotr('#error'),
  }) {
    this.box = body;
    this.help = help;
    this.error = error;
    this.text = text;
    this.callback = null;
    this.lastEnter = 0;

    this.text.addEventListener('keydown', e => this.onKeyDown(e));
    this.text.addEventListener('keyup', e => this.onKeyUp(e));
    this.text.addEventListener('blur', () => this.cancel());
  }

  active() {
    return !!this.callback;
  }

  prompt(help, value, callback) {
    this.help.innerText = help;
    this.text.value = value;
    this.callback = callback;
    this.box.style.display = '';
    this.resizeTextRows();
    this.text.select();
    this.text.focus();
  }

  resizeTextRows() {
    const lines = this.text.value.split(/\n/);
    this.text.rows = lines.length + 1;
  }

  finish() {
    let value = this.text.value;
    const callback = this.callback;

    if (callback) {
      value = value.replace(/(?:\r?\n)+$/, '');
      callback(false, value, (err, help, revalue) => {
        this.finished(err, help, revalue);
      });
    } else {
      this.finished(null, '', '');
    }
  }

  cancel() {
    const callback = this.callback;
    if (callback) {
      callback(true, null, (err, help, revalue) => {
        this.finished(err, help, revalue);
      });
    }
  }

  finished(err, help, revalue) {
    if (err) {
      this.error.innerText = '' + err;
      this.error.style.display = '';
      if (help) {
        this.help.innerText = help;
      }
      if (revalue) {
        this.text.value = revalue;
      }
      return;
    }
    this.hide();
  }

  hide() {
    this.lastEnter = 0;
    this.box.style.display = 'none';
    this.callback = null;
    this.text.value = '';
    this.help.innerText = '';
    this.error.style.display = 'none';
    this.error.innerText = '';
  }

  onKeyDown(e) {
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
  }

  onKeyUp(e) {
    switch (e.keyCode) {
    case 0x0d: // <Enter>
      if (Date.now() - this.lastEnter < 1000 || e.ctrlKey) {
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
  }

}
