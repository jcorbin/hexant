/* eslint no-try-catch:0 */

'use strict';

var nearley = require('nearley');
var Result = require('rezult');
var grammar = require('./grammar.js');

module.exports = parseLang;

function parseLang(str, World) {
    if (typeof str !== 'string') {
        return new Result(new Error('invalid argument, not a string'), null);
    }
    var res = parseResult(grammar, str);
    if (res.err) {
        return res;
    }
    if (!res.value.length) {
        return new Result(new Error('no parse result'), null);
    } else if (res.value.length > 1) {
        return new Result(new Error('ambiguous parse'), null);
    }
    return new Result(null, res.value[0] || null);
}

function parseResult(gram, str) {
    var parser = new nearley.Parser(gram.ParserRules, gram.ParserStart);
    try {
        parser.feed(str);
        return new Result(null, parser.results);
    } catch(err) {
        return new Result(err, null);
    }
}
