'use strict';

var walk = require('./walk.js');

// pre-processing step for compilation
module.exports = analyze;

function analyze(spec, scope) {
    walk.iter(spec, function _each(node, next) {
        each(node, spec, scope);
        next();
    });
}

function each(node, spec, scope) {
    switch (node.type) {
    case 'assign':
        scope[node.id.name] = node.value;
        break;

    case 'member':
        if (node.value.type !== 'symbol' &&
            node.value.type !== 'identifier') {
            node.value = hoist(
                gensym(node.value.type, scope),
                node.value,
                spec, scope);
        }
        break;

    case 'turns':
        scope.numColors = Math.max(scope.numColors, node.value.length);
        break;

    case 'then':
        if (node.turn.type === 'turns') {
            var colorSyms = walk.collect(node.color, isSymOrId);
            if (colorSyms.length === 1) {
                node.turn = {
                    type: 'member',
                    value: node.turn,
                    item: colorSyms[0]
                };
            }
            // TODO: else error
        }
        break;
    }
}

function hoist(name, value, spec, scope) {
    scope[name] = value;
    spec.assigns.push({
        type: 'assign',
        id: {
            type: 'identifier',
            name: name
        },
        value: value
    });
    each(value, spec, scope);
    return {
        type: 'identifier',
        name: name
    };
}

function gensym(kind, scope) {
    var sym = kind[0].toUpperCase() +
        kind.slice(1);
    var i = 1;
    while (scope[sym + i]) {
        i++;
    }
    return sym + i;
}

function isSymOrId(child) {
    return child.type === 'symbol' ||
           child.type === 'identifier';
}
