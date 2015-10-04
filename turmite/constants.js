/* eslint no-multi-spaces:0 consistent-this:0 */

'use strict';

/* relative turns
 *    F -- +0 -- no turn, forward
 *    B -- +3 -- u turn, backaward
 *    P -- -2 -- double left turn
 *    L -- -1 -- left turn
 *    R -- +1 -- right turn
 *    S -- +2 -- double right turn
 *
 * absolute turns (for "flat-top" (odd or even q)
 *   NW -- ? -- North West
 *   NO -- ? -- North
 *   NE -- ? -- North East
 *   SE -- ? -- South East
 *   SO -- ? -- South
 *   SW -- ? -- South West
 */

var Turn            = {};
Turn.RelForward     = 0x0001;
Turn.RelBackward    = 0x0002;
Turn.RelLeft        = 0x0004;
Turn.RelRight       = 0x0008;
Turn.RelDoubleLeft  = 0x0010;
Turn.RelDoubleRight = 0x0020;
Turn.AbsNorthWest   = 0x0040;
Turn.AbsNorth       = 0x0080;
Turn.AbsNorthEast   = 0x0100;
Turn.AbsSouthEast   = 0x0200;
Turn.AbsSouth       = 0x0400;
Turn.AbsSouthWest   = 0x0800;

var RelTurnDelta                  = [];
RelTurnDelta[Turn.RelBackward]    =  3;
RelTurnDelta[Turn.RelDoubleLeft]  = -2;
RelTurnDelta[Turn.RelLeft]        = -1;
RelTurnDelta[Turn.RelForward]     =  0;
RelTurnDelta[Turn.RelRight]       =  1;
RelTurnDelta[Turn.RelDoubleRight] =  2;

var AbsTurnDir                = [];
AbsTurnDir[Turn.AbsSouthEast] = 0;
AbsTurnDir[Turn.AbsSouth]     = 1;
AbsTurnDir[Turn.AbsSouthWest] = 2;
AbsTurnDir[Turn.AbsNorthWest] = 3;
AbsTurnDir[Turn.AbsNorth]     = 4;
AbsTurnDir[Turn.AbsNorthEast] = 5;

var RelTurnSymbols                  = [];
RelTurnSymbols[Turn.RelBackward]    = 'B';
RelTurnSymbols[Turn.RelDoubleLeft]  = 'BL';
RelTurnSymbols[Turn.RelLeft]        = 'L';
RelTurnSymbols[Turn.RelForward]     = 'F';
RelTurnSymbols[Turn.RelRight]       = 'R';
RelTurnSymbols[Turn.RelDoubleRight] = 'BR';

var RelSymbolTurns = {};
RelSymbolTurns.B   = Turn.RelBackward;
RelSymbolTurns.P   = Turn.RelDoubleLeft;
RelSymbolTurns.L   = Turn.RelLeft;
RelSymbolTurns.F   = Turn.RelForward;
RelSymbolTurns.R   = Turn.RelRight;
RelSymbolTurns.S   = Turn.RelDoubleRight;

module.exports.Turn           = Turn;
module.exports.RelTurnDelta   = RelTurnDelta;
module.exports.AbsTurnDir     = AbsTurnDir;
module.exports.RelTurnSymbols = RelTurnSymbols;
module.exports.RelSymbolTurns = RelSymbolTurns;
