'use strict';

module.exports.spec = function parseSpec(d) {
    // TODO: prototype'd object
    return {
        type: 'spec',
        assigns: d[0] || [],
        rules: d[1]
    };
};

module.exports.assign = function parseAssign(d) {
    // TODO: prototype'd object
    return {
        type: 'assign',
        id: d[0],
        value: d[4]
    };
};

module.exports.rule = function parseRule(d) {
    // TODO: prototype'd object
    return {
        type: 'rule',
        when: d[0],
        then: d[2]
    };
};

module.exports.turns = function parseTurns(d) {
    var first = d[2];
    var rest = d[3];
    var r = [first];
    if (rest) {
        for (var i = 0; i < rest.length; i++) {
            r.push(rest[i][1]);
        }
    }
    return {
        type: 'turns',
        value: r
    };
};

module.exports.turn = function parseTurn(d) {
    return {
        type: 'turn',
        names: [d[0]]
    };
};

module.exports.multiTurn = function multiTurn(d) {
    var a = d[0];
    var b = d[2];
    return {
        type: 'turn',
        names: a.names.concat(b.names)
    };
};

module.exports.singleTurn = function parseSingleTurn(d) {
    return {
        count: {
            type: 'number',
            value: 1
        },
        turn: d[0]
    };
};

module.exports.countTurn = function parseCountTurn(d) {
    return {
        count: d[0],
        turn: d[1]
    };
};

module.exports.when = function parseWhen(d) {
    // TODO: prototype'd object
    return {
        type: 'when',
        state: d[0],
        color: d[2]
    };
};

module.exports.then = function parseThen(d) {
    // TODO: prototype'd object
    return {
        type: 'then',
        state: d[0],
        color: d[2],
        turn: d[4]
    };
};

module.exports.thenVal = function parseThenVal(d) {
    // TODO: prototype'd object
    return {
        type: 'thenVal',
        mode: d[1],
        value: d[2]
    };
};

module.exports.member = function parseMember(d) {
    return {
        type: 'member',
        value: d[0][0],
        item: d[2]
    };
};

module.exports.expr = function expr(d) {
    // TODO: prototype'd object
    return {
        type: 'expr',
        op: d[1],
        arg1: d[0],
        arg2: d[2]
    };
};

module.exports.symbol = function parseSymbol(d) {
    return {
        type: 'symbol',
        name: d[0] + d[1].join('')
    };
};

module.exports.identifier = function parseIdentifier(d) {
    return {
        type: 'identifier',
        name: d[0] + d[1].join('')
    };
};

module.exports.rightConcat = function rightConcat(d) {
    return [d[0]].concat(d[2]);
};

module.exports.noop = function noop() {
    return null;
};

module.exports.join = function join(d) {
    return d.join('');
};

module.exports.int = function int(base) {
    return function intParser(d) {
        var str = d[0].join('');
        return {
            type: 'number',
            value: parseInt(str, base)
        };
    };
};

module.exports.item = function item(i) {
    return function itemn(d) {
        return d[i];
    };
};

module.exports.just = function just(val) {
    return function justVal() {
        return val;
    };
};
