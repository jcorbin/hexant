// @ts-check

import colorGen from './colorgen.js';
import { mayQuery, mustQuery } from './domkit.js';
import makeHash from './hashbind.js';
import {
  runPrompt,
  loop as promptIOLoop,
} from './prompt.js';
import * as rezult from './rezult.js';
import { Sample } from './sample.js';
import {
  Turmite,
  ruleActions as turmiteRuleActions,
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
   * @param {HTMLCanvasElement} [options.$view]
   * @param {HTMLElement} [options.$fpsOverlay]
   * @param {HTMLElement} [options.$step]
   * @param {HTMLElement} [options.$fps]
   * @param {HTMLElement} [options.$sps]
   * @param {HTMLElement} [options.$redrawTiming]
   */
  constructor({
    $body,
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

    function makePrompt() {
      let $prompt = mayQuery($body, '#prompt', HTMLElement);
      if ($prompt) $body.removeChild($prompt);
      $prompt = $body.appendChild($body.ownerDocument.createElement('div'));
      $prompt.id = 'prompt';
      $prompt.classList.add('prompt');
      return $prompt;
    }

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
      parse: str => Turmite.from(str, World),
      defaultValue: rezult.toValue(Turmite.from('ant(L R)', World)),
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

    /**
     * @typedef {object} ActionProps
     * @prop {string[]} keys
     * @prop {string} name
     * @prop {string} desc
     */

    /** @template T @typedef {import('./prompt.js').Interactor<T>} Interactor */
    /** @template T @typedef {import('./prompt.js').Looper<T>} Looper */

    /**
     * @typedef {ActionProps & (
     * | {then: () => void}
     * | {prompt: Interactor<unknown>}
     * | {loop: Looper<void>}
     * )} Action
     */

    /** @type {Action[]} */
    const actions = [

      {
        name: 'help',
        desc: 'show this help screen',
        keys: ['?', 'h', 'button2'],
        loop: function*() {
          yield { title: 'Actions' };
          yield {
            help: function*() {
              // yield `| Name | Key | Description |`;
              // yield `|------|-----|-------------|`;
              for (const { name, keys: [key], desc } of actions) {
                // yield `| ${name} | \`${key}\` | ${desc} |`;
                yield `${name} ( key: \`${key}\` )`;
                // TODO display other keys
                yield `: ${desc}`;
                yield ``;
              }
            }()
          }
        },
      },

      {
        name: 'play',
        desc: 'play / pause the simulation',
        keys: ['Space', 'button0'],
        then: () => { this.playpause() },
      },

      {
        name: 'step',
        desc: 'single step when paused, pause if playing',
        keys: ['.', 'button1'],
        then: () => this.stepit(),
      },

      {
        name: 'reset',
        keys: ['*'],
        desc: 'reset the simulation to initial state',
        then: () => this.reboot(),
      },

      {
        name: 'rule',
        keys: ['/'],
        desc: 'edit the simulated ant ruleset',
        prompt: this.rulePrompt(),
      },

      {
        name: 'colorscheme',
        keys: ['c'],
        desc: 'edit the color scheme used for tiles and ants',
        prompt: this.colorPrompt(),
      },

      {
        name: 'speed up',
        desc: 'double simulation speed',
        keys: ['+'],
        then: () => this.hash.set('stepRate', this.stepRate * 2),
      },

      {
        name: 'slow down',
        desc: 'halve simulation speed',
        keys: ['-'],
        then: () => this.hash.set('stepRate', Math.max(1, Math.floor(this.stepRate / 2))),
      },

      {
        name: 'FPS',
        desc: 'show/hide runtime statistic overlay',
        keys: ['f'],
        then: () => this.hash.set('showFPS', !this.showFPS),
      },

      {
        name: 'unvisited cells',
        desc: 'toggle whether all visible cells are drawn instead of just visted cells ones',
        keys: ['u'],
        then: () => this.hash.set('drawUnvisited', !this.view.drawUnvisited),
        // TODO trigger an immediate redraw
      },

      // TODO this used to work
      // {
      //   name: 'trace cells',
      //   desc: 'toggle whether to draw traces of recently visited cells',
      //   keys: ['t'],
      //   then: () => this.hash.set('drawTrace', !this.view.drawTrace),
      // },

      // TODO doesn't work correctly, just replace with an action that directly
      // generates and offer for copy such url, rather than change encoding
      // scheme
      //
      // {
      //   name: 'toggle base64 #fragment',
      //   desc: 'change url encoding scheme to output a more easily shareable base64 form',
      //   keys: ['b'],
      //   then: () => this.hash.encoding = this.hash.encoding == 'b64:' ? '' : 'b64:',
      // },

      {
        name: 'fullscreen',
        desc: 'enter/exit fullscreen mode',
        keys: ['Enter'],
        then() {
          const { ownerDocument: document } = $body;
          if (!document.fullscreenElement) {
            $body.requestFullscreen();
          } else if (document.exitFullscreen) {
            document.exitFullscreen();
          }
        },
      },

    ];

    // TODO shifted keys are a bit awkward right now
    /** @type {Map<string, (key: string) => void>} */
    this.keymap = new Map(actions.flatMap(action => {
      const then = 'then' in action ? action.then : (prompt =>
        () => runPrompt(makePrompt, prompt)
      )('prompt' in action ? action.prompt : promptIOLoop(action.loop));
      return action.keys.map(key => [key, () => then()])
    }));
    this.keymap.set('Escape', () => {
      let $prompt = mayQuery($body, '#prompt', HTMLElement);
      if ($prompt) $body.removeChild($prompt);
    });
    // this.keymap.set('', k => console.log('?', k)) // to log unhandled events

    this.window.addEventListener('keydown', this);
    this.window.addEventListener('keyup', this);
    this.window.addEventListener('mouseup', this);

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

    /** @param {string} key */
    const dispatch = key => {
      let fn =
        this.keymap.get(`${key}`)
        || this.keymap.get(`${key.toLowerCase()}`)
        || this.keymap.get('');
      if (fn) {
        e.preventDefault();
        fn(key);
      }
    };

    const { type } = e;
    let $prompt = mayQuery(this.$body, '#prompt', HTMLElement);

    const { target } = e;
    if (!(
      target === $prompt ||
      target === this.view.$canvas ||
      target === this.window.document.documentElement ||
      target === this.window.document.body
    )) return;

    switch (type) {
      case 'mouseup':
        if (e instanceof MouseEvent) {
          dispatch(keycode(e, { button: e.button }));
        }
        break;

      case 'keydown':
        if (e instanceof KeyboardEvent) {
          switch (e.key) {
            case 'Escape':
              e.preventDefault();
              break;
          }
        }
        break;

      case 'keyup':
        if (e instanceof KeyboardEvent) {
          dispatch(keycode(e, { key: e.key }));
        }
    }
  }

  rulePrompt() {
    const { hash } = this;
    const hashName = 'rule';
    return promptIOLoop(function*(inputs) {
      let value = hash.getStr(hashName);

      for (const input of inputs) {
        if ('value' in input) {
          ({ value } = input);
          const { res: { err }, str: revalue } = hash.set(hashName, value);
          if (!err) { return true }
          if (revalue) value = revalue;
          yield { error: err.message };
        }
      }

      for (const { name, then } of turmiteRuleActions(value)) {
        for (const input of inputs) {
          if ('command' in input) {
            const { command } = input;
            if (command === name) {
              let ok = false;
              try {
                value = then(value);
                ok = true;
              } catch (e) {
                yield { error: `${e}` }
              }
              if (ok) {
                const { res: { err }, str: revalue } = hash.set(hashName, value);
                if (revalue) value = revalue;
                if (err) yield { error: err.message };
              }
            }
          }
        }
      }

      for (const { name, label } of turmiteRuleActions(value)) {
        yield { command: name, label: label || name };
      }

      yield { title: 'Rule' };
      yield { value };
      yield { help: turmiteRuleHelp(value) };

      return undefined;
    });
  }

  colorPrompt() {
    const { hash } = this;
    const hashName = 'colors';
    return promptIOLoop(
      function*(inputs) {
        for (const input of inputs) {
          if ('value' in input) {
            const { value } = input;
            const { res: { err }, str: revalue } = hash.set(hashName, value);
            if (!err) { return true }
            yield { error: err.message };
            yield { value: revalue || value };
            yield { title: 'Colors' };
          }
        }
        return undefined;
      },

      function*() {
        const value = hash.getStr(hashName);
        yield { value };
        yield { title: 'Colors' };
        return undefined;
      });
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
      const time = await new Promise(
        resolve => this.window.requestAnimationFrame(resolve));

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

/** @typedef {object} ModifierKeyEvent
 * @prop {boolean} metaKey
 * @prop {boolean} altKey
 * @prop {boolean} ctrlKey
 * @prop {boolean} shiftKey
 */

/**
 * @param {ModifierKeyEvent} e
 * @param {{key:string}|{button:number}} kb
 */
function keycode({ metaKey, altKey, ctrlKey }, kb) {
  return [...function*() {
    let key = '';

    if (metaKey) yield `M`;
    if (altKey) yield `A`;
    if (ctrlKey) yield `C`;
    // if (shiftKey)  yield `S`; // NOTE ignoring shift for now
    if ('key' in kb) {
      ({ key } = kb);
      switch (key) {
        case ' ':
          yield 'Space';
          break;

        default:
          yield key;
      }
    } else yield `button${kb.button}`;
  }()].join('-');
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
