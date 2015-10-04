'use strict';

module.exports.iter = iter;
module.exports.collect = collect;

function iter(root, visit) {
    each(root);

    function each(node) {
        visit(node, next);

        function next() {
            proc(node);
        }
    }

    function proc(node) {
        switch (node.type) {
            case 'spec':
                var i;
                for (i = 0; i < node.assigns.length; i++) {
                    each(node.assigns[i]);
                }
                for (i = 0; i < node.rules.length; i++) {
                    each(node.rules[i]);
                }
                break;

            case 'assign':
                each(node.value);
                break;

            case 'rule':
                each(node.when);
                each(node.then);
                break;

            case 'when':
                each(node.state);
                each(node.color);
                break;

            case 'then':
                each(node.state);
                each(node.color);
                each(node.turn);
                break;

            case 'member':
                each(node.value);
                each(node.item);
                break;

            case 'expr':
                each(node.arg1);
                each(node.arg2);
                break;

            case 'identifier':
            case 'number':
            case 'symbol':
            case 'turn':
            case 'turns':
                break;

            default:
                throw new Error('unimplemnted walk type ' + node.type);
        }
    }
}

function collect(node, filter) {
    var syms = [];
    iter(node, function each(child, next) {
        if (filter(child)) {
            syms.push(child);
        }
        next();
    });
    return syms;
}
