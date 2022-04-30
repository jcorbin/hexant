// @ts-check

'use strict';

/** @enum {number} - resultant turn bits in a Rules table */
export const Turn = {
  // relative turns
  //    F -- +0 -- no turn, forward
  //    B -- +3 -- u turn, backaward
  //    P -- -2 -- double left turn
  //    L -- -1 -- left turn
  //    R -- +1 -- right turn
  //    S -- +2 -- double right turn
  RelForward: 0x0001,
  RelBackward: 0x0002,
  RelLeft: 0x0004,
  RelRight: 0x0008,
  RelDoubleLeft: 0x0010,
  RelDoubleRight: 0x0020,

  // absolute turns (for "flat-top" odd or even q hexagons)
  //   NW -- ? -- North West
  //   NO -- ? -- North
  //   NE -- ? -- North East
  //   SE -- ? -- South East
  //   SO -- ? -- South
  //   SW -- ? -- South West
  AbsNorthWest: 0x0040,
  AbsNorth: 0x0080,
  AbsNorthEast: 0x0100,
  AbsSouthEast: 0x0200,
  AbsSouth: 0x0400,
  AbsSouthWest: 0x0800,
};

/**
 * @param {Turn} turn - a bit field containing any/all chosen turn(s)
 * @param {number} dir - current heading direction for relative turns
 * @returns {Generator<number>} - resultant absolute direction heading(s)
 */
export function* turnDirs(turn, dir) {
  let t = 0x0001;
  for (; t <= 0x0020; t <<= 1) {
    if (turn & t) {
      yield (dir + (RelTurnDelta.get(t) || 0) + 6) % 6;
    }
  }
  for (; t <= 0x0800; t <<= 1) {
    if (turn & t) {
      yield (AbsTurnDir.get(t) || 0);
    }
  }
}

/** @type {Map<Turn, number>} */
export const RelTurnDelta = new Map([
  [Turn.RelBackward, 3],
  [Turn.RelDoubleLeft, -2],
  [Turn.RelLeft, -1],
  [Turn.RelForward, 0],
  [Turn.RelRight, 1],
  [Turn.RelDoubleRight, 2],
]);

/** @type {Map<Turn, number>} */
export const AbsTurnDir = new Map([
  [Turn.AbsSouthEast, 0],
  [Turn.AbsSouth, 1],
  [Turn.AbsSouthWest, 2],
  [Turn.AbsNorthWest, 3],
  [Turn.AbsNorth, 4],
  [Turn.AbsNorthEast, 5],
]);

/** @type {Map<Turn, string>} */
export const RelTurnSymbol = new Map([
  [Turn.RelBackward, 'B'],
  [Turn.RelDoubleLeft, 'BL'],
  [Turn.RelLeft, 'L'],
  [Turn.RelForward, 'F'],
  [Turn.RelRight, 'R'],
  [Turn.RelDoubleRight, 'BR'],
]);

// TODO why no AbsTurnSymbol?

/** @type {Map<string, Turn>} */
export const RelSymbolTurns = new Map([
  ['B', Turn.RelBackward],
  ['P', Turn.RelDoubleLeft],
  ['L', Turn.RelLeft],
  ['F', Turn.RelForward],
  ['R', Turn.RelRight],
  ['S', Turn.RelDoubleRight],
]);

/** @type {Map<string, Turn>} */
export const AbsSymbolTurns = new Map([
  ['NW', Turn.AbsNorthWest],
  ['NO', Turn.AbsNorth],
  ['NE', Turn.AbsNorthEast],
  ['SE', Turn.AbsSouthEast],
  ['SO', Turn.AbsSouth],
  ['SW', Turn.AbsSouthWest],
]);
