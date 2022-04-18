// @ts-check

'use strict';

import { hsluvToRgb } from 'hsluv';

import * as rezult from './rezult.js';

/** A color tuple in some color space (e.g. rgb or hsl)
 *
 * @typedef {[a: number, b: number, c: number]} ColorTuple
 */

/** A function which can generate N color tuples
 *
 * @typedef {(n: number) => IterableIterator<ColorTuple>} ColorGen
 */

/** A factory for creating N-color generators for a given intensity level
 *
 * The view module currently uses these intensity levels for fixed roles:
 * 0: empty cells
 * 1: ant traced cells
 * 2: ant body
 * 3: ant head
 *
 * @typedef {object} ColorGenMaker
 * @prop {(intensity: number) => ColorGen} makeColorGen
 * @prop {() => string} toString
 */

/** A family of N-color-generator factories, parameterized by 2 arguments
 *
 * Family implementations must provide argument defaults
 *
 * Family aguments are presumabley 2 fixed color space but not necessarily so...
 *
 * @typedef {(a?: number, b?: number) => ColorGenMaker} ColorGenFam2
 */

/** @type {Map<string, ColorGenFam2>} */
const gens = new Map();

/**
 * @param {string} str
 * @returns {rezult.Result<ColorGenMaker>}
 */
export default function parse(str) {
  const match = /^(\w+)(?:\((.*)\))?$/.exec(str);
  if (!match) {
    return rezult.error(new Error('invalid color spec'));
  }

  const name = match[1] || '';
  const gen = gens.get(name);
  if (!gen) {
    const choices = Object.keys(gens).sort().join(', ');
    return rezult.error(new Error(
      `no such color scheme ${JSON.stringify(name)}, valid choices: ${choices}`
    ));
  }

  const args = match[2] ? match[2].split(/, */) : [];
  const a = args[0] ? parseInt(args[0], 10) : undefined;
  const b = args[1] ? parseInt(args[1], 10) : undefined;

  return rezult.just(gen(a, b));
}

gens.set('light', (hue = 0, sat = 100) => {
  if (hue === 0) {
    hue = 360;
  }
  return {
    toString() {
      return `light(${hue}, ${sat})`;
    },
    makeColorGen(intensity) {
      const h = hue * (1 + (intensity - 1) / 3) % 360;
      return function*(ncolors) {
        const step = 100 / (ncolors + 1);
        for (let i = 0, l = step; i < ncolors; l += step, i++) {
          yield hsluvToRgb([h, sat, l]);
        }
      };
    },
  };
});

gens.set('hue', (sat = 70, light = 40) => {
  const satDelta = sat > 70 ? -10 : 10;
  const lightDelta = light > 70 ? -10 : 10;
  return {
    toString() {
      return `hue(${sat}, ${light})`;
    },
    makeColorGen(intensity) {
      const mySat = sat + satDelta * intensity;
      const myLight = light + lightDelta * intensity;
      return function*(ncolors) {
        const step = 360 / ncolors;
        for (let i = 0, h = 0; i < ncolors; h += step, i++) {
          yield [h, mySat, myLight];
        }
      };
    },
  };
});

// TODO: implement a 'hsluv' family
