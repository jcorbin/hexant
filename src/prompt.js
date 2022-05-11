// @ts-check

import { mustQuery } from './domkit.js';

/** @typedef {Canceled|Response} Result */
/** @typedef {{canceled: true, value?: undefined}} Canceled */
/** @typedef {{value: string, canceled?: false}} Response */

export class Prompt {

  /**
   * @param {object} params
   * @param {HTMLElement} params.$body
   * @param {HTMLElement} [params.$help]
   * @param {HTMLTextAreaElement} [params.$text]
   * @param {HTMLElement} [params.$error]
   */
  constructor({
    $body,
    $help = mustQuery($body, '#help', HTMLElement),
    $text = mustQuery($body, '#text', HTMLTextAreaElement),
    $error = mustQuery($body, '#error', HTMLElement),
  }) {
    this.$box = $body;
    this.$help = $help;
    this.$text = $text;
    this.$error = $error;

    /** @type {((res: Result) => void)|null} */
    this.callback = null;
    this.lastEnter = 0;

    this.$text.addEventListener('keydown', this);
    this.$text.addEventListener('keyup', this);
    this.$text.addEventListener('blur', this);
  }

  active() {
    return !!this.callback;
  }

  /**
   * @param {string} help
   * @param {string} value
   * @returns {Generator<Promise<Result>>}
   */
  *interact(help, value) {
    const restore = this.stash();
    try {
      this.prompt(help, value);
      while (this.$box.style.display != 'none') {
        yield new Promise(resolve => this.callback = resolve);
      }
    } finally {
      restore();
    }
  }

  /**
   * @param {string} help
   * @param {string} value
   */
  prompt(help, value) {
    // TODO refactor to return a promise, rather than take a callback
    this.$help.innerText = help;
    this.$text.value = value;
    this.$box.style.display = '';
    this.resizeTextRows();
    this.$text.select();
    this.$text.focus();
  }

  stash() {
    const {
      $box: { style: { display } },
      $help: { innerText: help },
      $text: { value },
      $error: {
        innerText: err,
        style: { display: errDisplay },
      },
      callback,
      lastEnter,
    } = this;
    return () => {
      this.$box.style.display = display;
      this.$help.innerText = help;
      this.$text.value = value;
      this.$error.innerText = err;
      this.$error.style.display = errDisplay;
      this.callback = callback;
      this.lastEnter = lastEnter;
    };
  }

  resizeTextRows() {
    const lines = this.$text.value.split(/\n/);
    this.$text.rows = lines.length + 1;
  }

  respond() {
    let value = this.$text.value;
    const callback = this.callback;
    if (callback) {
      value = value.replace(/(?:\r?\n)+$/, '');
      callback({ value });
    } else {
      this.hide();
    }
  }

  cancel() {
    const callback = this.callback;
    if (callback) {
      callback({ canceled: true });
    } else {
      this.hide();
    }
  }

  /**
   * @param {string} err
   * @param {string} [help]
   * @param {string} [revalue]
   */
  error(err, help, revalue) {
    this.$error.innerText = err;
    this.$error.style.display = '';
    if (help) {
      this.$help.innerText = help;
    }
    if (revalue) {
      this.$text.value = revalue;
    }
  }

  hide() {
    this.$box.style.display = 'none';
    this.$help.innerText = '';
    this.$text.value = '';
    this.$error.style.display = 'none';
    this.$error.innerText = '';
    this.lastEnter = 0;
    this.callback = null;
  }

  /** @param {Event} e */
  handleEvent(e) {
    switch (e.type) {

      case 'blur':
        this.cancel();
        break;

      case 'keydown':
        if (e instanceof KeyboardEvent) {
          switch (e.key) {

            case 'Enter':
              if (e.ctrlKey) {
                e.preventDefault();
              }
              break;

            case 'Escape':
              this.cancel();
              e.preventDefault();
              return;

          }
          this.resizeTextRows();
        }
        break;

      case 'keyup':
        if (e instanceof KeyboardEvent) {
          switch (e.key) {

            case 'Enter':
              if (Date.now() - this.lastEnter < 1000 || e.ctrlKey) {
                e.preventDefault();
                this.respond();
                return;
              }
              this.lastEnter = Date.now();
              break;

            default:
              this.lastEnter = 0;

          }
          this.resizeTextRows();
        }
        break;

    }
  }

}
