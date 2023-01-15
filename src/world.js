// @ts-check

import {
  CubePoint,
  OddQBox,
  OddQOffset,
} from './coord.js';
import { HexTileTree } from './hextiletree.js';

const REDRAW_TIMING_WINDOW = 5000;

// TODO refactor ent to be system oriented, pushing array ownership out of
// World into a passed in EntSystem interface

/** @typedef {object} Ent
 * @prop {number} index
 * @prop {number} numColors
 * @prop {number} numStates
 * @prop {OddQOffset} pos
 * @prop {number} dir
 * @prop {number} state
 * @prop {() => void} reset
 * @prop {(world: World) => void} step
 */

/** @typedef {object} View
 * @prop {() => void} step - TODO why are view stepped?
 * @prop {() => void} reset
 * @prop {boolean} needsRedraw -- TODO push this concern down into view?
 * @prop {() => void} redraw
 * @prop {() => void} updateEnts
 */

// TODO view per-ent concerns may be better to push down into each view
// entirely; pass EntSystem to each view?

export class World {

  static MaxColor = 0xff
  static MaxState = 0xff
  static MaxTurn = 0xffff

  static MaskResultState = 0xff000000
  static MaskResultColor = 0x00ff0000
  static MaskResultTurn = 0x0000ffff

  static ColorShift = 8
  static TurnShift = 16

  static FlagVisited = 0x0100
  static MaskColor = 0x00ff
  static MaskFlags = 0xff00

  constructor() {
    this.numColors = 0;
    this.numStates = 0;
    this.stepCount = 0;
    this.tile = new HexTileTree();

    this.visitedBounds = new OddQBox();

    /** @type {Ent[]} */
    this.ents = [];

    /** @type {View[]} */
    this.views = [];

    /** @type {number[]} */
    this.redrawTiming = [];
    this.now = () => performance.now();

    this.tmpCP = new CubePoint();
  }

  /** @param {number} i */
  getEntPos(i) {
    // TODO push this method out into EntSystem implementations
    const ent = this.ents[i];
    return ent ? ent.pos : new OddQOffset(NaN, NaN);
  }

  /** @param {number} i */
  getEntDir(i) {
    // TODO push this method out into EntSystem implementations
    const ent = this.ents[i];
    return ent ? ent.dir : NaN;
  }

  reset() {
    const { ents, tile, views } = this;

    this.visitedBounds.topLeft.q = 0;
    this.visitedBounds.topLeft.r = 0;
    this.visitedBounds.bottomRight.q = 0;
    this.visitedBounds.bottomRight.r = 0;

    // TODO push out into EntSystem.reset()
    for (const ent of ents) {
      ent.reset();
      this.visitedBounds.expandTo(ent.pos);
    }

    tile.reset();
    this.stepCount = 0;

    for (const view of views) {
      view.reset();
    }

    // TODO push out into EntSystem.occupiedPositions()
    const occupiedPositions = ents.map(({ pos }) => pos);
    for (const pos of occupiedPositions) {
      tile.update(pos, datum => World.FlagVisited | datum);
    }

  }

  /**
   * @param {number} i
   * @param {(dir: number, state: number, datum: number) => {dir: number, state: number, datum: number}} fn
   */
  updateEnt(i, fn) {
    // TODO refactor into unified EntSystem.step(tile);
    //      currently this is called by Turmite.prototype.step() ala Ent.step()

    const { ents, tile, tmpCP } = this;
    const ent = ents[i];
    if (!ent) { return }
    const { pos, dir, state } = ent;
    tile.update(pos, datum => {
      const { dir: newDir, state: newState, datum: newDatum } = fn(dir, state, datum);
      const basis = CubePoint.basis[newDir];
      if (basis) {
        pos.toCubeInto(tmpCP)
          .add(basis)
          .toOddQOffsetInto(pos);
      }
      ent.dir = newDir;
      ent.state = newState;
      return newDatum;
    });
    tile.update(ent.pos, datum => World.FlagVisited | datum);
  }

  step() {
    this._step();
    this.redraw();
  }

  /** @param {number} n */
  stepn(n) {
    for (let i = 0; i < n; i++) {
      this._step();
    }
    return this.redraw();
  }

  _step() {
    // TODO becomes EntSystem.step()
    for (const ent of this.ents) {
      ent.step(this);
      this.visitedBounds.expandTo(ent.pos);
    }
    // TODO why are view stepped? that sounds like a (re)drawing concern?
    for (const view of this.views) {
      view.step();
    }
    this.stepCount++;
  }

  redraw() {
    let didredraw = false;

    const t0 = this.now();
    for (const view of this.views) {
      if (view.needsRedraw) {
        view.redraw();
        didredraw = true;
      }
    }
    const t1 = this.now();

    // TODO encapulate similarly to Sample... TimingSample?
    if (didredraw) {
      const { redrawTiming } = this;
      while (
        redrawTiming[0] !== undefined &&
        t0 - redrawTiming[0] > REDRAW_TIMING_WINDOW
      ) {
        redrawTiming.shift();
        redrawTiming.shift();
      }
      redrawTiming.push(t0, t1);
    }

    return didredraw;
  }

  redrawTimingStats() {
    const { redrawTiming } = this;
    if (redrawTiming.length < 4) {
      return null;
    }

    let n = 0, m1 = 0, m2 = 0;

    let i = 0;
    while (i < redrawTiming.length) {
      // NOTE: the ||NaN is mainly for undefined proof, but 0 is also not a
      // reasonable number in redrawTiming, so annihilating any maths circa a
      // spurious 0 is likely a Good Idea ™️ ... or is at least more likely to
      // get noticed sooner ;-)
      const t0 = redrawTiming[i++] || NaN;
      const t1 = redrawTiming[i++] || NaN;
      const dur = t1 - t0;
      const delta = dur - m1;
      n++
      m1 += delta / n;
      m2 += delta * delta;
    }

    m2 /= n - 1;
    return { n, m1, m2 };
  }

  /** @param {Ent} ent */
  removeEnt(ent) {
    // TODO push out into EntSystem internal concerns;
    //      does not need to be on the World : EntSystem surface
    const { index } = ent;
    const { ents, views } = this;
    if (ents[index] !== ent) {
      throw new Error('removeEnt mismatch');
    }

    let i = index;
    for (let j = i++; j < ents.length; j++) {
      const ent = ents[j];
      if (ent) {
        ents[i] = ent;
        ent.index = i;
        i++;
      }
    }
    ents.length = i;

    for (let view of views) {
      view.updateEnts();
    }
  }

  /** @param {Ent[]} newEnts */
  setEnts(newEnts) {
    const { ents, tile, views } = this;

    ents.length = 0;
    for (const ent of newEnts) {
      ent.index = ents.length;
      ents.push(ent);
    }

    // TODO EntSystem.occupiedPositions()
    const occupiedPositions = newEnts.map(({ pos }) => pos);
    for (const pos of occupiedPositions) {
      tile.update(pos, datum => World.FlagVisited | datum);
    }

    // TODO EntSystem.numColors()
    this.numColors = Math.max.apply(null, ents.map(({ numColors }) => numColors));
    this.numStates = Math.max.apply(null, ents.map(({ numStates }) => numStates));

    for (const view of views) {
      view.updateEnts();
    }
  }

  /** @param {View} view */
  addView(view) {
    this.views.push(view);
    view.updateEnts();
    return view;
  }

}
