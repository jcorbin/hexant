'use strict';

const Hash = require('hashbind');
const Base64 = require('Base64');
const Result = require('rezult');
const colorGen = require('./colorgen.js');
const World = require('./world.js');
const ViewGL = require('./view_gl.js');
const Turmite = require('./turmite/index.js');
const Sample = require('./sample.js');
const Prompt = require('./prompt.js');

const FPSInterval = 3 * 1000;
const NumTimingSamples = FPSInterval / 1000 * 60;
const MinFPS = 20;

export class Hexant {
  constructor ({
    body,
    prompt=body.querySelecotr('#prompt'),
    view=body.querySelecotr('#view'),
    fpsOverlay=body.querySelecotr('#fpsOverlay'),
    fps=body.querySelecotr('#fps'),
    sps=body.querySelecotr('#sps'),
    redrawTiming=body.querySelecotr('#redrawTiming'),
  }) {
    const window = body.ownerDocument.defaultView;

    const atob = window.atob || Base64.atob;
    const btoa = window.btoa || Base64.btoa;

    // components
    this.body = body;
    this.prompt = new Prompt({body: prompt});
    this.el = view;

    this.fpsOverlay = fpsOverlay;
    this.step = step;
    this.fps = fps;
    this.sps = sps;
    this.redrawTiming = redrawTiming;

    this.world = new World();
    this.view = null;

    this.window = window;
    this.hash = new Hash(this.window, {
      decode(str) {
        if (/^b64:/.test(str)) {
          str = str.slice(4);
          str = atob(str);
        }
        return Hash.decodeUnescape(str);
      }
    });
    // this.animator = animator.add(this); FIXME raf
    this.lastStepTime = null;
    this.goalStepRate = 0;
    this.stepRate = 0;
    this.paused = true;
    this.showFPS = false;
    this.animTimes = [];
    this.stepTimes = [];
    this.animTiming = new Sample(NumTimingSamples);

    this.boundPlaypause = () => this.playpause();
    this.boundOnKeyPress = e => this.onKeyPress(e);

    this.b64EncodeHash = (keyvals) => {
      const str = Hash.encodeMinEscape(keyvals);
      return 'b64:' + btoa(str);
    };

    this.titleBase = this.window.document.title;
    this.view = this.world.addView(new ViewGL(this.world, this.el));

    this.world.tile.maxTileArea = this.view.maxCellsPerTile;

    this.window.addEventListener('keypress', this.boundOnKeyPress);
    this.el.addEventListener('click', this.boundPlaypause);

    this.hash.bind('colors')
      .setParse(colorGen.parse, colorGen.toString)
      .setDefault('light')
      .addListener(gen => {
        this.view.setColorGen(gen);
        this.view.redraw();
      });

    this.hash.bind('rule')
      .setParse(Turmite.compile)
      .setDefault('ant(L R)')
      .addListener(ent => this.setEnts(ent));

    this.hash.bind('showFPS')
      .setDefault(false)
      .addListener(showFPS => {
        this.showFPS = !!showFPS;
        this.fpsOverlay.style.display = this.showFPS ? '' : 'none';
      });

    this.hash.bind('stepRate')
      .setParse(Result.lift(parseInt))
      .setDefault(4)
      .addListener(rate => this.setStepRate(rate));

    this.hash.bind('labeled')
      .setDefault(false)
      .addListener(labeled => {
        this.view.setLabeled(labeled);
        this.view.redraw();
      });

    this.hash.bind('drawUnvisited')
      .setDefault(false)
      .addListener(drawUnvisited => this.view.setDrawUnvisited(!!drawUnvisited));

    this.hash.bind('drawTrace')
      .setDefault(false)
      .addListener(drawTrace => {
        this.view.setDrawTrace(!!drawTrace);
        this.view.redraw();
      });

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

    setEnts(ents) {
      let title = '';
      for (let i = 0; i < ents.length; ++i) {
        if (i > 0) title += ', ';
        title += ents[i];
      }
      this.world.setEnts(ents);
      this.world.reset();
      this.el.width = this.el.width;
      this.view.redraw();
      this.window.document.title = this.titleBase + ': ' + title;
    }

  onKeyPress(e) {
    if (e.target !== this.window.document.documentElement &&
        e.target !== this.window.document.body &&
        e.target !== this.el
    ) return;

    switch (e.keyCode) {

    case 0x20: // <Space>
      this.playpause();
      break;

    case 0x23: // #
      this.hash.set('labeled', !this.view.labeled);
      break;

    case 0x2a: // *
      this.pause();
      this.setEnts(this.hash.get('rule'));
      break;

    case 0x2b: // +
      this.hash.set('stepRate', this.stepRate * 2);
      break;

    case 0x2d: // -
      this.hash.set('stepRate', Math.max(1, Math.floor(this.stepRate / 2)));
      break;

    case 0x2e: // .
      this.stepit();
      break;

    case 0x42: // B
    case 0x62: // b
      this.hash.encode =
        this.hash.encode === Hash.encodeMinEscape
        ? this.b64EncodeHash : Hash.encodeMinEscape;
      this.hash.save();
      break;

    case 0x43: // C
    case 0x63: // c
      this.promptFor('colors', 'New Colors:');
      e.preventDefault();
      break;

    case 0x46: // F
    case 0x66: // f
      this.hash.set('showFPS', !this.showFPS);
      break;

    case 0x55: // U
    case 0x75: // u
      this.hash.set('drawUnvisited', !this.view.drawUnvisited);
      break;

    case 0x54: // T
    case 0x74: // t
      this.hash.set('drawTrace', !this.view.drawTrace);
      break;

    case 0x2f: // /
      this.promptFor('rule', Turmite.ruleHelp);
      e.preventDefault();
      break;
    }
  }

  promptFor(name, desc) {
    if (self.prompt.active()) return;
    const orig = this.hash.getStr(name);
    this.prompt.prompt(desc, orig, (canceled, value, callback) => {
      if (canceled) {
        callback(null);
        return;
      }
      this.hash.set(name, value, err => {
        // NOTE: we get two extra args, the string value entered, and the
        // parsed value, so we cannot just pass callback in directly, whose
        // signature is callback(err, help, revalue)
        callback(err);
      });
    });
  }

  animate(time) {
    /* eslint-disable no-try-catch */
    try {
      this._animate(time);
    } catch(err) {
      // this.animator.cancelAnimation(); FIXME raf
      throw err;
    }
  }

  _animate(time) {
    if (!this.lastStepTime) {
      this.lastStepTime = time;
      return;
    }
    this.stepWorld(time);
    this.updateFPS(time);
  }

  stepWorld(time) {
    const sinceLast = time - this.lastStepTime;
    this.animTiming.collect(sinceLast);
    this.throttle();
    const steps = Math.round(sinceLast / 1000 * this.stepRate);
    switch (steps) {

    case 0:
        break;

    case 1:
        this.world.step();
        this.stepTimes.push(time, 1);
        this.lastStepTime = time;
        break;

    default:
        this.world.stepn(steps);
        this.stepTimes.push(time, steps);
        this.lastStepTime = time;
        break;

    }
    return steps;
  }

  updateFPS(time) {
    this.animTimes.push(time);
    while (time - this.animTimes[0] > FPSInterval) {
        this.animTimes.shift();
    }
    while (time - this.stepTimes[0] > FPSInterval) {
        this.stepTimes.shift();
    }
    if (!this.showFPS) return;
    this.step.innerText = '#' + this.world.stepCount;
    this.fps.innerText = this.computeFPS().toFixed(0) + 'fps';
    this.sps.innerText = toSI(this.computeSPS()) + 'sps';
    var stats = this.world.redrawTimingStats();
    if (stats) {
      this.redrawTiming.innerText =
        'µ=' + toSI(stats.m1 / 1e3) + 's ' +
        '𝜎=' + toSI(Math.sqrt(stats.m2 / 1e3)) + 's';
    } else {
      this.redrawTiming.innerText = '';
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

  play() {
    this.animTimes.length = 0;
    this.stepTimes.length = 0;
    this.animTiming.reset();
    this.fps.innerText = '';
    this.sps.innerText = '';
    this.redrawTiming.innerText = '';
    this.lastStepTime = null;
    // this.animator.requestAnimation(); FIXME raf
    this.paused = false;
  }

  pause() {
    this.fps.innerText = '<' + this.fps.innerText + '>';
    this.sps.innerText = '<' + this.sps.innerText + '>';
    this.redrawTiming.innerText = '<' + this.redrawTiming.innerText + '>';
    this.lastStepTime = null;
    // this.animator.cancelAnimation(); FIXME raf
    this.paused = true;
  }

  playpause() {
    if (this.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  stepit() {
    if (this.paused) {
      this.world.step();
    } else {
      this.pause();
    }
  }

  setStepRate(rate) {
    if (this.stepRate === this.goalStepRate) {
        this.stepRate = rate;
    }
    this.goalStepRate = rate;
  }

  resize(width, height) {
    this.view.resize(width, height);
  }

}

const nsiSuffix = ['', 'm', 'µ', 'n'];
const siSuffix = ['K', 'M', 'G', 'T', 'E'];

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
