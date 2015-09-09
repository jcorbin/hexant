'use strict';

module.exports.parse = parseRule;
module.exports.toString = ruleToString;

module.exports.help = 'W=West, L=Left, A=Ahead, R=Right, E=East, F=Flip';

var Rules = {
    W: -2,
    L: -1,
    A: 0,
    R: 1,
    E: 2,
    F: 3
};

function parseRule(rule) {
    rule = rule.toUpperCase();
    var parts = rule.split('');
    var rules = [];
    for (var i = 0; i < parts.length; i++) {
        var r = Rules[parts[i]];
        if (r !== undefined) {
            rules.push(r);
        }
    }
    return rules;
}

function ruleToString(rules) {
    var rule = '';
    var ruleKeys = Object.keys(Rules);
    for (var i = 0; i < rules.length; i++) {
        for (var j = 0; j < ruleKeys.length; j++) {
            if (rules[i] === Rules[ruleKeys[j]]) {
                rule += ruleKeys[j];
            }
        }
    }
    return rule;
}

