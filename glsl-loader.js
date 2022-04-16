"use strict";

const {basename, extname} = require('path');
const fs = require('fs').promises;

module.exports = function (_snowpackConfig, _pluginOptions) {
    return {
        name: 'my-glsl-loader',
        resolve: {
            input: ['.frag', '.vert'],
            output: ['.js'],
        },

        async load({filePath}) {
            const ext = extname(filePath);
            const name = basename(filePath, ext);
            const type = ext.slice(1);
            const fileContents = await fs.readFile(filePath, 'utf-8');
            return wrapCode(name, type, fileContents);
        },
    };
};

function wrapCode(name, type, code) {
    const lines = escapeLines(code);
    return [
        '"use strict";',
        '',
        'const GLSLShader = require(\'./glslshader.js\');',
        'module.exports = new GLSLShader(' +
            JSON.stringify(name) + ', ' +
            JSON.stringify(type) + ',',
        lines.map(line => `  ${line}`).join(' +\n'),
        ');',
    ].join('\n');
}

function escapeLines(src) {
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; ++i) {
        let line = lines[i];
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
