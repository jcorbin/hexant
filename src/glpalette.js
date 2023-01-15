// @ts-check

// TODO merge with view_gl.js

/** @typedef {import("./colorgen.js").ColorTuple} ColorTuple */

export class GLPalette {

  /**
   * @param {WebGLRenderingContext} gl
   * @param {object} options
   * @param {number} options.unit
   * @param {"rgb"|"srgb"} [options.format]
   * @param {Iterable<ColorTuple>} [options.colors]
   */
  constructor(gl, { unit, format: formatArg = 'rgb', colors }) {
    const format = function() {
      if (formatArg == 'srgb') {
        const extSRGB = gl.getExtension('EXT_sRGB');
        if (extSRGB) {
          return extSRGB.SRGB_EXT;
        } else {
          console.warn('sRGB Gl extension not available, falling back to RGB colorspace')
        }
      }
      return gl.RGB;
    }();
    const data = new Uint8Array(256 * 3);
    const tex = gl.createTexture();

    this.gl = gl;
    this.unit = unit;
    this.format = format;
    this.data = data;
    this.tex = tex;
    this.length = 0;

    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    if (colors) {
      this.setColorsRGB(colors);
    }
  }

  /** @param {WebGLUniformLocation} uSampler */
  use(uSampler) {
    const { gl, unit } = this;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.uniform1i(uSampler, unit);
  }

  /** @param {Iterable<ColorTuple>} [rgbColors] */
  setColorsRGB(rgbColors = []) {
    const { gl, unit, tex, format, data } = this;
    this.length = 0;
    data.fill(0);

    let i = 0;
    for (const [r, g, b] of rgbColors) {
      data[i++] = Math.round(255 * r);
      data[i++] = Math.round(255 * g);
      data[i++] = Math.round(255 * b);
      ++this.length;
      if (i >= data.length) break;
    }

    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, format,
      256, 1, 0,
      format, gl.UNSIGNED_BYTE, data);
  }
}
