/* eslint no-try-catch:0 no-eval:0 */

'use strict';

var nearley = require('nearley');
var Result = require('rezult');
var grammar = require('./grammar.js');
var compile = require('./compile.js');

module.exports = parseTurmite;

function parseTurmite(str, World) {
    var res = parseLang(str, World);
    if (!res.err) {
        res = compileGrammarResult(res.value, World);
    }
    return res;
}

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

function compileGrammarResult(value, World) {
    var str = compile.init(value).join('\n');
    var func = eval(str);
    return new Result(null, func);
}
