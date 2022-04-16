'use strict';

var compile = require('./compile.js');
var walk = require('./walk.js');

module.exports = solve;

// TODO: de-dupe
var opPrec = [
    '+',
    '-',
    '*',
    '/',
    '%'
];

var invOp = {
    '+': '-',
    '*': '/',
    '-': '+',
    '/': '*'
};

function solve(cap, sym, node, scope, outerPrec) {
    switch (node.type) {
    case 'expr':
        var leftHasSym = hasSym(node.arg1, cap);
        var rightHasSym = hasSym(node.arg2, cap);
        if (!leftHasSym && !rightHasSym) {
            return compile.value(node, scope, outerPrec);
        }
        if (leftHasSym && rightHasSym) {
            // TODO: solve each side to intermediate values
            throw new Error('matching complex expressions not supported');
        }

        if (!invOp[node.op]) {
            throw new Error('unsupported match operator ' + node.op);
        }

        var prec = opPrec.indexOf(node.op);
        var arg1 = solve(cap, sym, node.arg1, scope, prec);
        var arg2 = solve(cap, sym, node.arg2, scope, prec);
        var str = '';

        if (node.op === '+' || node.op === '*') {
            // color = c [*+] 6 = 6 [*+] c
            // c = color [/-] 6
            if (rightHasSym) {
                var tmp = arg1;
                arg1 = arg2;
                arg2 = tmp;
            }
            str += arg1 + ' ' + invOp[node.op] + ' ' + arg2;
        }

        if (node.op === '-' || node.op === '/') {
            if (leftHasSym) {
                // color = c [-/] 6
                // c = color [+*] 6
                str += arg1 + ' ' + invOp[node.op] + ' ' + arg2;
            } else if (rightHasSym) {
                // color = 6 [-/] c
                // c = 6 [-/] color
                str += arg2 + ' ' + node.op + ' ' + arg1;
            }
            str += arg1 + ' ' + invOp[node.op] + ' ' + arg2;
        }

        if (prec < outerPrec) {
            str = '(' + str + ')';
        }

        return str;

    case 'symbol':
        if (node.name === cap) {
            return sym;
        }
        return node.name;

    default:
        return compile.value(node, scope);
    }
}

function hasSym(node, name) {
    var has = false;
    walk.iter(node, function each(child, next) {
        if (child.type === 'symbol' &&
            child.name === name) {
            has = true;
            // next not called, stop here
        } else {
            next();
        }
    });
    return has;
}
