// @ts-check

import colorGen from './colorgen.js';
import { mustQuery } from './domkit.js';
import makeHash from './hashbind.js';
import { Prompt } from './prompt.js';
import * as rezult from './rezult.js';
import { Sample } from './sample.js';
import {
  Turmite,
  ruleHelp as turmiteRuleHelp,
} from './turmite/index.js';
import { ViewGL } from './view_gl.js';
import { World } from './world.js';

/** @typedef {import('./world.js').Ent} Ent */

const FPSInterval = 3 * 1000;
const NumTimingSamples = FPSInterval / 1000 * 60;
const MinFPS = 20;

export default class Hexant {

  /**
   * @param {object} options
   * @param {HTMLElement} options.$body
   * @param {HTMLElement} [options.$prompt]
   * @param {HTMLCanvasElement} [options.$view]
   * @param {HTMLElement} [options.$fpsOverlay]
   * @param {HTMLElement} [options.$step]
   * @param {HTMLElement} [options.$fps]
   * @param {HTMLElement} [options.$sps]
   * @param {HTMLElement} [options.$redrawTiming]
   */
  constructor({
    $body,
    $prompt = mustQuery($body, '.prompt', HTMLElement),
    $view = mustQuery($body, '#view', HTMLCanvasElement),
    $fpsOverlay = mustQuery($body, '#fpsOverlay', HTMLElement),
    $step = mustQuery($body, '#step', HTMLElement),
    $fps = mustQuery($body, '#fps', HTMLElement),
    $sps = mustQuery($body, '#sps', HTMLElement),
    $redrawTiming = mustQuery($body, '#redrawTiming', HTMLElement),
  }) {
    const window = $body.ownerDocument.defaultView;
    if (!window) {
      throw new Error('$body has no defaultView');
    }

    this.$body = $body;
    this.prompt = new Prompt({ $body: $prompt });

    this.$fpsOverlay = $fpsOverlay;
    this.$step = $step;
    this.$fps = $fps;
    this.$sps = $sps;
    this.$redrawTiming = $redrawTiming;

    this.window = window;
    this.lastStepTime = null;
    this.goalStepRate = 0;
    this.stepRate = 0;
    this.locked = false;
    this.paused = true;
    this.showFPS = false;

    /** @type {number[]} */
    this.animTimes = [];

    /** @type {number[]} */
    this.stepTimes = [];

    this.animTiming = new Sample(NumTimingSamples);

    this.titleBase = this.window.document.title;

    this.world = new World();

    this.view = new ViewGL(this.world, $view);
    this.world.addView(this.view);
    this.world.tile.maxTileArea = this.view.maxCellsPerTile;

    const {
      bind: bindHash,
      load: loadHash,
      ...hash
    } = makeHash(window);

    bindHash('colors', {
      parse: colorGen,
      defaultValue: rezult.toValue(colorGen('light')),
      listener: gen => {
        this.view.setColorGen(gen);
        this.view.redraw();
      },
    });

    bindHash('rule', {
      parse: str => Turmite.from(World, str),
      defaultValue: rezult.toValue(Turmite.from(World, 'ant(L R)')),
      listener: ent => this.setEnts(ent ? [ent] : []),
    });

    bindHash('showFPS', {
      defaultValue: false,
      listener: showFPS => {
        this.showFPS = showFPS;
        this.$fpsOverlay.style.display = this.showFPS ? '' : 'none';
      },
    });

    bindHash('stepRate', {
      parse: rezult.lift(parseInt),
      defaultValue: 4,
      listener: rate => this.setStepRate(rate),
    });

    bindHash('drawUnvisited', {
      defaultValue: false,
      listener: drawUnvisited => this.view.drawUnvisited = drawUnvisited,
    });

    bindHash('drawTrace', {
      defaultValue: false,
      listener: drawTrace => {
        this.view.setDrawTrace(drawTrace);
        this.view.redraw();
      },
    });

    loadHash();

    this.hash = hash;

    // TODO shifted keys are a bit awkward right now
    /** @type {Map<string, (type: string, key: string) => void>} */
    this.keymap = new Map([
      // ['', (t, k) => console.log(`${t}:${k}`)], // to log unhandled events
      ['click:0', () => this.playpause()],
      ['click:S-0', () => this.stepit()],
      ['keypress: ', () => this.playpause()],
      ['keypress:.', () => this.stepit()],
      ['keypress:S-*', () => this.reboot()],
      ['keypress:/', () => this.promptFor('rule', [...turmiteRuleHelp()].join('\n'))],
      ['keypress:c', () => this.promptFor('colors', 'New Colors:')],
      ['keypress:S-+', () => this.hash.set('stepRate', this.stepRate * 2)],
      ['keypress:-', () => this.hash.set('stepRate', Math.max(1, Math.floor(this.stepRate / 2)))],
      ['keypress:f', () => this.hash.set('showFPS', !this.showFPS)],
      ['keypress:u', () => this.hash.set('drawUnvisited', !this.view.drawUnvisited)],
      ['keypress:t', () => this.hash.set('drawTrace', !this.view.drawTrace)],
      ['keypress:b', () => this.hash.encoding = this.hash.encoding == 'b64:' ? '' : 'b64:'],
      ['keypress:enter', () => {
        const { ownerDocument: document } = $body;
        if (!document.fullscreenElement) {
          $body.requestFullscreen();
        } else if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }],
    ]);

    this.window.addEventListener('keypress', this);
    this.window.addEventListener('click', this);

    let autoplay = false;
    let autorefresh = 0;
    if (this.hash.get('fullauto')) {
      autoplay = true;
      autorefresh = 24 * 60 * 60;
    } else {
      autoplay = this.hash.get('autoplay');
      autorefresh = parseInt(this.hash.get('autorefresh'), 10);
    }

    if (!isNaN(autorefresh) && autorefresh) {
      this.window.setTimeout(
        () => this.window.location.reload(),
        autorefresh * 1000);
    }

    if (autoplay) this.play();
  }

  reboot() {
    this.pause();
    this.setEnts([this.hash.get('rule')]);
  }

  /** @param {Ent[]} ents */
  setEnts(ents) {
    const title = ents.map(ent => `${ent}`).join(', ');
    this.world.setEnts(ents);
    this.world.reset();
    this.view.$canvas.width = this.view.$canvas.width;
    this.view.redraw();
    this.window.document.title = this.titleBase + ': ' + title;
  }

  /** @param {Event} e */
  handleEvent(e) {
    const { target } = e;
    if (target !== this.window.document.documentElement &&
      target !== this.window.document.body &&
      target !== this.view.$canvas
    ) return;

    const { type } = e;
    const key = function() {
      if (e instanceof KeyboardEvent) {
        return modified(e, e.key.toLowerCase());
      }
      if (e instanceof MouseEvent) {
        return modified(e, `${e.button}`);
      }
      return '';
    }();

    const fn = this.keymap.get(`${type}:${key}`) || this.keymap.get('');
    if (fn) {
      e.preventDefault();
      fn(type, key);
    }
  }

  /**
   * @param {string} name
   * @param {string} desc
   */
  async promptFor(name, desc) {
    if (this.prompt.active()) return;
    const orig = this.hash.getStr(name);
    for await (const { canceled, value } of this.prompt.interact(desc, orig)) {
      if (canceled) {
        this.prompt.hide();
        break;
      }
      const { res: { err } } = this.hash.set(name, value);
      if (err) {
        this.prompt.error(err.message);
      } else {
        this.prompt.hide();
      }
    }
  }

  /** @param {number} time */
  calcSteps(time) {
    if (!this.lastStepTime) {
      this.lastStepTime = time;
      return 0;
    }

    const sinceLast = time - this.lastStepTime;
    if (sinceLast > 0) {
      this.animTiming.collect(sinceLast);
    }
    this.throttle();
    return Math.round(sinceLast / 1000 * this.stepRate);
  }

  /** @param {number} time */
  stepWorld(time) {
    if (this.locked) { return; }
    const steps = this.calcSteps(time);
    if (steps < 1) {
      return;
    }
    if (steps == 1) {
      this.world.step();
    } else {
      this.world.stepn(steps);
    }
    this.stepTimes.push(time, steps);
    this.lastStepTime = time;
  }

  /** @param {number} time */
  updateFPS(time) {
    this.animTimes.push(time);
    while (time - this.animTimes[0] > FPSInterval) {
      this.animTimes.shift();
    }
    while (time - this.stepTimes[0] > FPSInterval) {
      this.stepTimes.shift();
    }
    if (!this.showFPS) return;
    this.$step.innerText = '#' + this.world.stepCount;
    this.$fps.innerText = this.computeFPS().toFixed(0) + 'fps';
    this.$sps.innerText = toSI(this.computeSPS()) + 'sps';
    var stats = this.world.redrawTimingStats();
    if (stats) {
      this.$redrawTiming.innerText =
        'µ=' + toSI(stats.m1 / 1e3) + 's ' +
        '𝜎=' + toSI(Math.sqrt(stats.m2 / 1e3)) + 's';
    } else {
      this.$redrawTiming.innerText = '';
    }
  }

  throttle() {
    if (!this.animTiming.complete()) {
      return;
    }

    if (this.animTiming.sinceWeightedMark() <= 3) {
      return;
    }

    if (this.stepRate > 1) {
      const fps = this.computeFPS();
      if (fps < MinFPS) {
        this.animTiming.weightedMark(2);
        this.stepRate /= 2;
        return;
      }
    }

    var as = this.animTiming.classifyAnomalies();
    var i = as.length - 1;
    if (
      this.stepRate > 1 &&
      as[i] > 0.5 && as[i - 1] > 0.5 && as[i - 2] > 0.5
    ) {
      this.stepRate /= 2;
      this.animTiming.weightedMark(2);
    } else if (
      this.stepRate < this.goalStepRate &&
      as[i] <= 0 && as[i - 1] <= 0 && as[i - 2] <= 0
    ) {
      this.stepRate *= 2;
      this.animTiming.weightedMark(0.5);
    }

  }

  computeFPS() {
    return this.animTimes.length / FPSInterval * 1000;
  }

  computeSPS() {
    let totalSteps = 0;
    for (var i = 1; i < this.stepTimes.length; i += 2) {
      totalSteps += this.stepTimes[i];
    }
    return totalSteps / FPSInterval * 1000;
  }

  async play() {
    if (this.locked) { return; }
    this.paused = false;
    this.animTimes.length = 0;
    this.stepTimes.length = 0;
    this.animTiming.reset();
    this.$fps.innerText = '';
    this.$sps.innerText = '';
    this.$redrawTiming.innerText = '';
    this.lastStepTime = null;

    while (!this.paused) {
      const time = await nextFrame(this.window);
      /* eslint-disable no-try-catch */
      try {
        this.stepWorld(time);
        this.updateFPS(time);
      } catch (err) {
        this.pause();
        this.locked = true;
        logError(err, 'Hexant playtime',
          ['config', Object.fromEntries(this.hash.stringEntries())],
          ['step', this.world.stepCount],
          ['fps', this.computeFPS()],
          ['sps', this.computeSPS()],
          ['redrawTiming', this.world.redrawTimingStats()],
        );
      }
    }
  }

  pause() {
    this.paused = true;
    this.$fps.innerText = '<' + this.$fps.innerText + '>';
    this.$sps.innerText = '<' + this.$sps.innerText + '>';
    this.$redrawTiming.innerText = '<' + this.$redrawTiming.innerText + '>';
    this.lastStepTime = null;
  }

  playpause() {
    if (this.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  stepit() {
    if (!this.paused) {
      this.pause();
    } else if (!this.locked) {
      this.world.step();
    }
  }

  /** @param {number} rate */
  setStepRate(rate) {
    if (this.stepRate === this.goalStepRate) {
      this.stepRate = rate;
    }
    this.goalStepRate = rate;
  }

  /**
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    this.view.resize(width, height);
  }

}

const nsiSuffix = ['', 'm', 'µ', 'n'];
const siSuffix = ['K', 'M', 'G', 'T', 'E'];

/** @param {number} n */
function toSI(n) {
  if (n < 1) {
    let nsi = 0;
    while (nsi < nsiSuffix.length && n < 1) {
      nsi++;
      n *= 1e3;
    }
    return n.toPrecision(3) + nsiSuffix[nsi];
  }
  if (n < 1e3) {
    return n.toFixed(0);
  }
  n /= 1e3;
  let si = 0;
  while (si < siSuffix.length && n > 1e3) {
    si++;
    n /= 1e3;
  }
  return n.toPrecision(3) + siSuffix[si];
}

/**
 * @param {Window} [window]
 * @returns {Promise<number>}
 */
function nextFrame(window = global.window) {
  return new Promise(
    resolve => window.requestAnimationFrame(resolve)
  );
}

/** @typedef {object} ModifierKeyEvent
 * @prop {boolean} metaKey
 * @prop {boolean} altKey
 * @prop {boolean} ctrlKey
 * @prop {boolean} shiftKey
 */

/**
 * @param {ModifierKeyEvent} e
 * @param {string} s
 */
function modified({ metaKey, altKey, ctrlKey, shiftKey }, s) {
  if (metaKey) { s = `M-${s}` }
  if (altKey) { s = `A-${s}` }
  if (ctrlKey) { s = `C-${s}` }
  if (shiftKey) { s = `S-${s}` }
  return s;
}

/**
 * @param {any} err
 * @param {string} desc
 * @param {[key: string, data: any][]} details
 */
function logError(err, desc, ...details) {
  console.group(`${desc} error`);
  console.error(err);
  for (const [key, data] of details) {
    console.log(key, JSON.stringify(data));
  }
  console.groupEnd();
}
