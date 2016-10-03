"use strict";

module.exports = function translateGLSL(module) {
    var i = module.filename.lastIndexOf('.');
    var name = normalizeName(module.filename.slice(0, i));
    var type = module.filename.slice(i + 1);

    var lines = escapeLines(module.text);
    var src =
        '"use strict";\n' +
        '\n' +
        'var GLSLShader = require(\'./glslshader.js\');\n' +
        'module.exports = new GLSLShader(' +
            JSON.stringify(name) + ', ' +
            JSON.stringify(type) + ',\n  ' +
            lines[0];
    for (i = 1; i < lines.length; i++) {
        src += ' +\n  ' + lines[i];
    }
    src += ');\n';

    module.text = src;
};

function escapeLines(src) {
    var lines = src.split('\n');
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];
        if (line.length === 0 && i === lines.length - 1 && i > 0) {
            lines.length = i;
            break;
        }
        line = line.replace(/\\/g, '\\\\');
        line = line.replace(/'/g, "\\'");
        line = "'" + line + "\\n'";
        lines[i] = line;
    }
    return lines;
}

function normalizeName(name) {
    name = name.split(/[#\/]/g).map(word).map(ucfirst).join('');
    if (!/[A-Z]/.test(name[0])) {
        name = "_" + name;
    }
    return name;
}

function word(str) {
    return str.replace(/[^a-zA-Z0-9]/g, '');
}

function ucfirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
