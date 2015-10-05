'use strict';

var RLEBuilder = require('../rle-builder.js');
var walk = require('./walk.js');

module.exports = toSpecString;

var TurnSyms = {
    RelLeft: 'L',
    RelRight: 'R',
    RelForward: 'F',
    RelBackward: 'B',
    RelDoubleLeft: 'P',
    RelDoubleRight: 'S',
    AbsNorth: 'NO',
    AbsNorthWest: 'NW',
    AbsNorthEast: 'NE',
    AbsSouth: 'SO',
    AbsSouthEast: 'SE',
    AbsSouthWest: 'SW'
};

// TODO: de-dupe
var opPrec = [
    '+',
    '-',
    '*',
    '/',
    '%'
];

function toSpecString(root, emit) {
    var precs = [0];
    var stack = [];

    walk.iter(root, each);
    if (stack.length) {
        throw new Error('leftover spec string parts');
    }

    function each(node, next) {
        switch (node.type) {
            case 'spec':
                next();
                break;

            case 'assign':
                stack.push(node.id.name);
                next();
                join(' = ');
                emit(stack.pop());
                break;

            case 'rule':
                next();
                join(' => ');
                emit(stack.pop());
                break;

            case 'when':
                next();
                join(', ');
                break;

            case 'then':
                next();
                join(', ');
                join(', ');
                break;

            case 'member':
                next();
                wrap('[', ']');
                join('');
                break;

            case 'expr':
                precs.push(opPrec.indexOf(node.op));
                next();
                join(' ' + node.op + ' ');
                if (precs.pop() < precs[precs.length - 1]) {
                    wrap('(', ')');
                }
                break;

            case 'identifier':
            case 'symbol':
                stack.push(node.name);
                next();
                break;

            case 'turns':
                var rle = RLEBuilder('turns(', ' ', ')');
                for (var i = 0; i < node.value.length; i++) {
                    var turn = node.value[i];
                    rle(turn.count.value, TurnSyms[turn.turn]);
                }
                stack.push(rle(0, ''));
                next();
                break;

            case 'turn':
                stack.push(node.names.map(function eachTurnName(name) {
                    return TurnSyms[name];
                }).join('|'));
                break;

            case 'number':
                stack.push(node.value.toString());
                next();
                break;

            default:
                stack.push('/* unsupported ' + JSON.stringify(node) + ' */');
                next();
        }
    }

    function join(sep) {
        var b = stack.pop();
        var a = stack.pop();
        var c = a + sep + b;
        stack.push(c);
    }

    function wrap(pre, post) {
        var i = stack.length - 1;
        stack[i] = pre + stack[i] + post;
    }
}
