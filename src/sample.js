// @ts-check

/* TODO:
 * - evaluate online sorting
 * - improve anomaly scoring
 * - better consider all the marking stuff in context of its use case
 * - maybe split out the marking stuff, and combine it with its use case
 *   around animation throttling into a separate subclass
 */

// TODO recall what the point / idea of TIGHT_TOL and subsequent mode switching
// under classifyAnomalies
const TIGHT_TOL = 0.1;

export class Sample {

  /** @param {number} n */
  constructor(n) {
    this.n = n;
    /** @type {number[]} */
    this.data = [];
    this.lastMark = 0;
    this.markWeight = 1;
  }

  // TODO sort out and document the semantics of marking and weight

  mark() {
    this.markWeight = 1;
    this.lastMark = this.data.length;
  }

  /** @param {number} weight */
  weightedMark(weight) {
    if (this.lastMark > 0) {
      this.markWeight *= weight;
    }
    this.lastMark = this.data.length;
  }

  sinceWeightedMark() {
    return (this.data.length - this.lastMark) / this.markWeight;
  }

  sinceMark() {
    return this.data.length - this.lastMark;
  }

  reset() {
    this.data.length = 0;
    this.lastMark = 0;
    this.markWeight = 1;
  }

  complete() {
    return this.data.length >= this.n;
  }

  /** @param {number} datum */
  collect(datum) {
    while (this.data.length >= this.n) {
      this.data.shift();
    }
    this.data.push(datum);
    if (this.lastMark > 0) {
      if (--this.lastMark === 0) {
        this.markWeight = 1;
      }
    }
  }

  classifyAnomalies() {
    const q = this.quantileSelector();
    const q25 = q(0.25), q50 = q(0.50), q75 = q(0.75);
    const iqr = q75 - q25;
    const { data } = this;

    // TODO what is this?
    if (iqr / q50 < TIGHT_TOL) {
      return data.map(
        datum => datum / q50 - 1
      );
    }

    // const lh = q50 - q25;
    // const rh = q75 - q50;
    // const skew = (rh - lh) / iqr;

    const tol = iqr * 1.5;
    const lo = q25 - tol;
    const hi = q75 + tol;

    return data.map(datum => {
      if (datum < lo) {
        return (datum - lo) / iqr;
      } else if (datum > hi) {
        return (datum - hi) / iqr;
      } else {
        return 0;
      }
    });
  }

  /** @returns {(q: number) => number} */
  quantileSelector() {
    // TODO when is a cleverer data structure / algo worth?
    const S = [...this.data];
    S.sort((a, b) => a - b);
    return q => {
      const i = q * S.length;
      // @ts-ignore proven by S.length bound in prior line
      return S[Math.floor(i)] / 2 + S[Math.ceil(i)] / 2;
    }
  }
}
