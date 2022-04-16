'use strict';

module.exports = GLPalette;

function GLPalette(gl, unit, srgb, colors) {
    this.gl = gl;
    this.unit = unit;
    this.extSRGB = this.gl.getExtension('EXT_sRGB');
    this.format = srgb && this.extSRGB ? this.extSRGB.SRGB_EXT : this.gl.RGB;
    this.data = new Uint8Array(256 * 3);
    this.tex = this.gl.createTexture();

    this.gl.activeTexture(this.gl.TEXTURE0 + this.unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    if (Array.isArray(colors)) {
        this.setColorsRGB(colors);
    }
}

GLPalette.prototype.use =
function use(uSampler) {
    this.gl.activeTexture(this.gl.TEXTURE0 + this.unit);
    this.gl.uniform1i(uSampler, this.unit);
};

GLPalette.prototype.setColorsRGB =
function setColorsRGB(colors) {
    for (var i = 0, j = 0; i < colors.length; ++i) {
        var color = colors[i];
        this.data[j++] = Math.round(255 * color[0]);
        this.data[j++] = Math.round(255 * color[1]);
        this.data[j++] = Math.round(255 * color[2]);
    }
    while (j < this.data.length) {
        this.data[j++] = 0;
    }
    this.gl.activeTexture(this.gl.TEXTURE0 + this.unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex);
    this.gl.texImage2D(
        this.gl.TEXTURE_2D, 0, this.format,
        256, 1, 0,
        this.format, this.gl.UNSIGNED_BYTE, this.data);
};
