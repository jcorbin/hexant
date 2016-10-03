global = this;
(function (modules) {

    // Bundle allows the run-time to extract already-loaded modules from the
    // boot bundle.
    var bundle = {};
    var main;

    // Unpack module tuples into module objects.
    for (var i = 0; i < modules.length; i++) {
        var module = modules[i];
        module = modules[i] = new Module(
            module[0],
            module[1],
            module[2],
            module[3],
            module[4]
        );
        bundle[module.filename] = module;
    }

    function Module(id, dirname, basename, dependencies, factory) {
        this.id = id;
        this.dirname = dirname;
        this.filename = dirname + "/" + basename;
        // Dependency map and factory are used to instantiate bundled modules.
        this.dependencies = dependencies;
        this.factory = factory;
    }

    Module.prototype._require = function () {
        var module = this;
        if (module.exports === void 0) {
            module.exports = {};
            var require = function (id) {
                var index = module.dependencies[id];
                var dependency = modules[index];
                if (!dependency)
                    throw new Error("Bundle is missing a dependency: " + id);
                return dependency._require();
            };
            require.main = main;
            module.exports = module.factory(
                require,
                module.exports,
                module,
                module.filename,
                module.dirname
            ) || module.exports;
        }
        return module.exports;
    };

    // Communicate the bundle to all bundled modules
    Module.prototype.modules = bundle;

    return function require(filename) {
        main = bundle[filename];
        main._require();
    }
})([["base64.js","Base64","base64.js",{},function (require, exports, module, __filename, __dirname){

// Base64/base64.js
// ----------------

;(function () {

  var object = typeof exports != 'undefined' ? exports : this; // #8: web workers
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  function InvalidCharacterError(message) {
    this.message = message;
  }
  InvalidCharacterError.prototype = new Error;
  InvalidCharacterError.prototype.name = 'InvalidCharacterError';

  // encoder
  // [https://gist.github.com/999166] by [https://github.com/nignag]
  object.btoa || (
  object.btoa = function (input) {
    var str = String(input);
    for (
      // initialize result and counter
      var block, charCode, idx = 0, map = chars, output = '';
      // if the next str index does not exist:
      //   change the mapping table to "="
      //   check if d has no fractional digits
      str.charAt(idx | 0) || (map = '=', idx % 1);
      // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
      output += map.charAt(63 & block >> 8 - idx % 1 * 8)
    ) {
      charCode = str.charCodeAt(idx += 3/4);
      if (charCode > 0xFF) {
        throw new InvalidCharacterError("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
      }
      block = block << 8 | charCode;
    }
    return output;
  });

  // decoder
  // [https://gist.github.com/1020396] by [https://github.com/atk]
  object.atob || (
  object.atob = function (input) {
    var str = String(input).replace(/=+$/, '');
    if (str.length % 4 == 1) {
      throw new InvalidCharacterError("'atob' failed: The string to be decoded is not correctly encoded.");
    }
    for (
      // initialize result and counters
      var bc = 0, bs, buffer, idx = 0, output = '';
      // get next character
      buffer = str.charAt(idx++);
      // character found in table? initialize bit storage and add its ascii value;
      ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
        // and if not first of each 4 characters,
        // convert the first 8 bits to one ascii character
        bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
      // try to find character in table (0-63, not found => -1)
      buffer = chars.indexOf(buffer);
    }
    return output;
  });

}());

}],["animator.js","blick","animator.js",{"raf":57},function (require, exports, module, __filename, __dirname){

// blick/animator.js
// -----------------

"use strict";

var defaultRequestAnimation = require("raf");

module.exports = Animator;

function Animator(requestAnimation) {
    var self = this;
    self._requestAnimation = requestAnimation || defaultRequestAnimation;
    self.controllers = [];
    // This thunk is doomed to deoptimization for multiple reasons, but passes
    // off as quickly as possible to the unrolled animation loop.
    self._animate = function () {
        try {
            self.animate(Date.now());
        } catch (error) {
            self.requestAnimation();
            throw error;
        }
    };
}

Animator.prototype.requestAnimation = function () {
    if (!this.requested) {
        this._requestAnimation(this._animate);
    }
    this.requested = true;
};

Animator.prototype.animate = function (now) {
    var node, temp;

    this.requested = false;

    // Measure
    for (var index = 0; index < this.controllers.length; index++) {
        var controller = this.controllers[index];
        if (controller.measure) {
            controller.component.measure(now);
            controller.measure = false;
        }
    }

    // Transition
    for (var index = 0; index < this.controllers.length; index++) {
        var controller = this.controllers[index];
        // Unlke others, skipped if draw or redraw are scheduled and left on
        // the schedule for the next animation frame.
        if (controller.transition) {
            if (!controller.draw && !controller.redraw) {
                controller.component.transition(now);
                controller.transition = false;
            } else {
                this.requestAnimation();
            }
        }
    }

    // Animate
    // If any components have animation set, continue animation.
    for (var index = 0; index < this.controllers.length; index++) {
        var controller = this.controllers[index];
        if (controller.animate) {
            controller.component.animate(now);
            this.requestAnimation();
            // Unlike others, not reset implicitly.
        }
    }

    // Draw
    for (var index = 0; index < this.controllers.length; index++) {
        var controller = this.controllers[index];
        if (controller.draw) {
            controller.component.draw(now);
            controller.draw = false;
        }
    }

    // Redraw
    for (var index = 0; index < this.controllers.length; index++) {
        var controller = this.controllers[index];
        if (controller.redraw) {
            controller.component.redraw(now);
            controller.redraw = false;
        }
    }
};

Animator.prototype.add = function (component) {
    var controller = new AnimationController(component, this);
    this.controllers.push(controller);
    return controller;
};

function AnimationController(component, controller) {
    this.component = component;
    this.controller = controller;

    this.measure = false;
    this.transition = false;
    this.animate = false;
    this.draw = false;
    this.redraw = false;
}

AnimationController.prototype.destroy = function () {
};

AnimationController.prototype.requestMeasure = function () {
    if (!this.component.measure) {
        throw new Error("Can't requestMeasure because component does not implement measure");
    }
    this.measure = true;
    this.controller.requestAnimation();
};

AnimationController.prototype.cancelMeasure = function () {
    this.measure = false;
};

AnimationController.prototype.requestTransition = function () {
    if (!this.component.transition) {
        throw new Error("Can't requestTransition because component does not implement transition");
    }
    this.transition = true;
    this.controller.requestAnimation();
};

AnimationController.prototype.cancelTransition = function () {
    this.transition = false;
};

AnimationController.prototype.requestAnimation = function () {
    if (!this.component.animate) {
        throw new Error("Can't requestAnimation because component does not implement animate");
    }
    this.animate = true;
    this.controller.requestAnimation();
};

AnimationController.prototype.cancelAnimation = function () {
    this.animate = false;
};

AnimationController.prototype.requestDraw = function () {
    if (!this.component.draw) {
        throw new Error("Can't requestDraw because component does not implement draw");
    }
    this.draw = true;
    this.controller.requestAnimation();
};

AnimationController.prototype.cancelDraw = function () {
    this.draw = false;
};

AnimationController.prototype.requestRedraw = function () {
    if (!this.component.redraw) {
        throw new Error("Can't requestRedraw because component does not implement redraw");
    }
    this.redraw = true;
    this.controller.requestAnimation();
};

AnimationController.prototype.cancelRedraw = function () {
    this.redraw = false;
};

}],["ready.js","domready","ready.js",{},function (require, exports, module, __filename, __dirname){

// domready/ready.js
// -----------------

/*!
  * domready (c) Dustin Diaz 2014 - License MIT
  */
!function (name, definition) {

  if (typeof module != 'undefined') module.exports = definition()
  else if (typeof define == 'function' && typeof define.amd == 'object') define(definition)
  else this[name] = definition()

}('domready', function () {

  var fns = [], listener
    , doc = document
    , hack = doc.documentElement.doScroll
    , domContentLoaded = 'DOMContentLoaded'
    , loaded = (hack ? /^loaded|^c/ : /^loaded|^i|^c/).test(doc.readyState)


  if (!loaded)
  doc.addEventListener(domContentLoaded, listener = function () {
    doc.removeEventListener(domContentLoaded, listener)
    loaded = 1
    while (listener = fns.shift()) listener()
  })

  return function (fn) {
    loaded ? setTimeout(fn, 0) : fns.push(fn)
  }

});

}],["src/gl-matrix.js","gl-matrix/src","gl-matrix.js",{"./gl-matrix/common.js":4,"./gl-matrix/mat2.js":5,"./gl-matrix/mat2d.js":6,"./gl-matrix/mat3.js":7,"./gl-matrix/mat4.js":8,"./gl-matrix/quat.js":9,"./gl-matrix/vec2.js":10,"./gl-matrix/vec3.js":11,"./gl-matrix/vec4.js":12},function (require, exports, module, __filename, __dirname){

// gl-matrix/src/gl-matrix.js
// --------------------------

/**
 * @fileoverview gl-matrix - High performance matrix and vector operations
 * @author Brandon Jones
 * @author Colin MacKenzie IV
 * @version 2.3.2
 */

/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. */
// END HEADER

exports.glMatrix = require("./gl-matrix/common.js");
exports.mat2 = require("./gl-matrix/mat2.js");
exports.mat2d = require("./gl-matrix/mat2d.js");
exports.mat3 = require("./gl-matrix/mat3.js");
exports.mat4 = require("./gl-matrix/mat4.js");
exports.quat = require("./gl-matrix/quat.js");
exports.vec2 = require("./gl-matrix/vec2.js");
exports.vec3 = require("./gl-matrix/vec3.js");
exports.vec4 = require("./gl-matrix/vec4.js");
}],["src/gl-matrix/common.js","gl-matrix/src/gl-matrix","common.js",{},function (require, exports, module, __filename, __dirname){

// gl-matrix/src/gl-matrix/common.js
// ---------------------------------

/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. */

/**
 * @class Common utilities
 * @name glMatrix
 */
var glMatrix = {};

// Configuration Constants
glMatrix.EPSILON = 0.000001;
glMatrix.ARRAY_TYPE = (typeof Float32Array !== 'undefined') ? Float32Array : Array;
glMatrix.RANDOM = Math.random;
glMatrix.ENABLE_SIMD = false;

// Capability detection
glMatrix.SIMD_AVAILABLE = (glMatrix.ARRAY_TYPE === Float32Array) && ('SIMD' in this);
glMatrix.USE_SIMD = glMatrix.ENABLE_SIMD && glMatrix.SIMD_AVAILABLE;

/**
 * Sets the type of array used when creating new vectors and matrices
 *
 * @param {Type} type Array type, such as Float32Array or Array
 */
glMatrix.setMatrixArrayType = function(type) {
    glMatrix.ARRAY_TYPE = type;
}

var degree = Math.PI / 180;

/**
* Convert Degree To Radian
*
* @param {Number} Angle in Degrees
*/
glMatrix.toRadian = function(a){
     return a * degree;
}

/**
 * Tests whether or not the arguments have approximately the same value, within an absolute
 * or relative tolerance of glMatrix.EPSILON (an absolute tolerance is used for values less 
 * than or equal to 1.0, and a relative tolerance is used for larger values)
 * 
 * @param {Number} a The first number to test.
 * @param {Number} b The second number to test.
 * @returns {Boolean} True if the numbers are approximately equal, false otherwise.
 */
glMatrix.equals = function(a, b) {
	return Math.abs(a - b) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a), Math.abs(b));
}

module.exports = glMatrix;

}],["src/gl-matrix/mat2.js","gl-matrix/src/gl-matrix","mat2.js",{"./common.js":4},function (require, exports, module, __filename, __dirname){

// gl-matrix/src/gl-matrix/mat2.js
// -------------------------------

/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. */

var glMatrix = require("./common.js");

/**
 * @class 2x2 Matrix
 * @name mat2
 */
var mat2 = {};

/**
 * Creates a new identity mat2
 *
 * @returns {mat2} a new 2x2 matrix
 */
mat2.create = function() {
    var out = new glMatrix.ARRAY_TYPE(4);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Creates a new mat2 initialized with values from an existing matrix
 *
 * @param {mat2} a matrix to clone
 * @returns {mat2} a new 2x2 matrix
 */
mat2.clone = function(a) {
    var out = new glMatrix.ARRAY_TYPE(4);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Copy the values from one mat2 to another
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Set a mat2 to the identity matrix
 *
 * @param {mat2} out the receiving matrix
 * @returns {mat2} out
 */
mat2.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Create a new mat2 with the given values
 *
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m10 Component in column 1, row 0 position (index 2)
 * @param {Number} m11 Component in column 1, row 1 position (index 3)
 * @returns {mat2} out A new 2x2 matrix
 */
mat2.fromValues = function(m00, m01, m10, m11) {
    var out = new glMatrix.ARRAY_TYPE(4);
    out[0] = m00;
    out[1] = m01;
    out[2] = m10;
    out[3] = m11;
    return out;
};

/**
 * Set the components of a mat2 to the given values
 *
 * @param {mat2} out the receiving matrix
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m10 Component in column 1, row 0 position (index 2)
 * @param {Number} m11 Component in column 1, row 1 position (index 3)
 * @returns {mat2} out
 */
mat2.set = function(out, m00, m01, m10, m11) {
    out[0] = m00;
    out[1] = m01;
    out[2] = m10;
    out[3] = m11;
    return out;
};


/**
 * Transpose the values of a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.transpose = function(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a1 = a[1];
        out[1] = a[2];
        out[2] = a1;
    } else {
        out[0] = a[0];
        out[1] = a[2];
        out[2] = a[1];
        out[3] = a[3];
    }
    
    return out;
};

/**
 * Inverts a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.invert = function(out, a) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],

        // Calculate the determinant
        det = a0 * a3 - a2 * a1;

    if (!det) {
        return null;
    }
    det = 1.0 / det;
    
    out[0] =  a3 * det;
    out[1] = -a1 * det;
    out[2] = -a2 * det;
    out[3] =  a0 * det;

    return out;
};

/**
 * Calculates the adjugate of a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.adjoint = function(out, a) {
    // Caching this value is nessecary if out == a
    var a0 = a[0];
    out[0] =  a[3];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] =  a0;

    return out;
};

/**
 * Calculates the determinant of a mat2
 *
 * @param {mat2} a the source matrix
 * @returns {Number} determinant of a
 */
mat2.determinant = function (a) {
    return a[0] * a[3] - a[2] * a[1];
};

/**
 * Multiplies two mat2's
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the first operand
 * @param {mat2} b the second operand
 * @returns {mat2} out
 */
mat2.multiply = function (out, a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = a0 * b0 + a2 * b1;
    out[1] = a1 * b0 + a3 * b1;
    out[2] = a0 * b2 + a2 * b3;
    out[3] = a1 * b2 + a3 * b3;
    return out;
};

/**
 * Alias for {@link mat2.multiply}
 * @function
 */
mat2.mul = mat2.multiply;

/**
 * Rotates a mat2 by the given angle
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2} out
 */
mat2.rotate = function (out, a, rad) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
        s = Math.sin(rad),
        c = Math.cos(rad);
    out[0] = a0 *  c + a2 * s;
    out[1] = a1 *  c + a3 * s;
    out[2] = a0 * -s + a2 * c;
    out[3] = a1 * -s + a3 * c;
    return out;
};

/**
 * Scales the mat2 by the dimensions in the given vec2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the matrix to rotate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat2} out
 **/
mat2.scale = function(out, a, v) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
        v0 = v[0], v1 = v[1];
    out[0] = a0 * v0;
    out[1] = a1 * v0;
    out[2] = a2 * v1;
    out[3] = a3 * v1;
    return out;
};

/**
 * Creates a matrix from a given angle
 * This is equivalent to (but much faster than):
 *
 *     mat2.identity(dest);
 *     mat2.rotate(dest, dest, rad);
 *
 * @param {mat2} out mat2 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2} out
 */
mat2.fromRotation = function(out, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad);
    out[0] = c;
    out[1] = s;
    out[2] = -s;
    out[3] = c;
    return out;
}

/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat2.identity(dest);
 *     mat2.scale(dest, dest, vec);
 *
 * @param {mat2} out mat2 receiving operation result
 * @param {vec2} v Scaling vector
 * @returns {mat2} out
 */
mat2.fromScaling = function(out, v) {
    out[0] = v[0];
    out[1] = 0;
    out[2] = 0;
    out[3] = v[1];
    return out;
}

/**
 * Returns a string representation of a mat2
 *
 * @param {mat2} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat2.str = function (a) {
    return 'mat2(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};

/**
 * Returns Frobenius norm of a mat2
 *
 * @param {mat2} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */
mat2.frob = function (a) {
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2)))
};

/**
 * Returns L, D and U matrices (Lower triangular, Diagonal and Upper triangular) by factorizing the input matrix
 * @param {mat2} L the lower triangular matrix 
 * @param {mat2} D the diagonal matrix 
 * @param {mat2} U the upper triangular matrix 
 * @param {mat2} a the input matrix to factorize
 */

mat2.LDU = function (L, D, U, a) { 
    L[2] = a[2]/a[0]; 
    U[0] = a[0]; 
    U[1] = a[1]; 
    U[3] = a[3] - L[2] * U[1]; 
    return [L, D, U];       
}; 

/**
 * Adds two mat2's
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the first operand
 * @param {mat2} b the second operand
 * @returns {mat2} out
 */
mat2.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    return out;
};

/**
 * Subtracts matrix b from matrix a
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the first operand
 * @param {mat2} b the second operand
 * @returns {mat2} out
 */
mat2.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    return out;
};

/**
 * Alias for {@link mat2.subtract}
 * @function
 */
mat2.sub = mat2.subtract;

/**
 * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
 *
 * @param {mat2} a The first matrix.
 * @param {mat2} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */
mat2.exactEquals = function (a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
};

/**
 * Returns whether or not the matrices have approximately the same elements in the same position.
 *
 * @param {mat2} a The first matrix.
 * @param {mat2} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */
mat2.equals = function (a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    return (Math.abs(a0 - b0) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
            Math.abs(a1 - b1) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
            Math.abs(a2 - b2) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a2), Math.abs(b2)) &&
            Math.abs(a3 - b3) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a3), Math.abs(b3)));
};

/**
 * Multiply each element of the matrix by a scalar.
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the matrix to scale
 * @param {Number} b amount to scale the matrix's elements by
 * @returns {mat2} out
 */
mat2.multiplyScalar = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    return out;
};

/**
 * Adds two mat2's after multiplying each element of the second operand by a scalar value.
 *
 * @param {mat2} out the receiving vector
 * @param {mat2} a the first operand
 * @param {mat2} b the second operand
 * @param {Number} scale the amount to scale b's elements by before adding
 * @returns {mat2} out
 */
mat2.multiplyScalarAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    out[2] = a[2] + (b[2] * scale);
    out[3] = a[3] + (b[3] * scale);
    return out;
};

module.exports = mat2;

}],["src/gl-matrix/mat2d.js","gl-matrix/src/gl-matrix","mat2d.js",{"./common.js":4},function (require, exports, module, __filename, __dirname){

// gl-matrix/src/gl-matrix/mat2d.js
// --------------------------------

/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. */

var glMatrix = require("./common.js");

/**
 * @class 2x3 Matrix
 * @name mat2d
 * 
 * @description 
 * A mat2d contains six elements defined as:
 * <pre>
 * [a, c, tx,
 *  b, d, ty]
 * </pre>
 * This is a short form for the 3x3 matrix:
 * <pre>
 * [a, c, tx,
 *  b, d, ty,
 *  0, 0, 1]
 * </pre>
 * The last row is ignored so the array is shorter and operations are faster.
 */
var mat2d = {};

/**
 * Creates a new identity mat2d
 *
 * @returns {mat2d} a new 2x3 matrix
 */
mat2d.create = function() {
    var out = new glMatrix.ARRAY_TYPE(6);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = 0;
    out[5] = 0;
    return out;
};

/**
 * Creates a new mat2d initialized with values from an existing matrix
 *
 * @param {mat2d} a matrix to clone
 * @returns {mat2d} a new 2x3 matrix
 */
mat2d.clone = function(a) {
    var out = new glMatrix.ARRAY_TYPE(6);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    return out;
};

/**
 * Copy the values from one mat2d to another
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the source matrix
 * @returns {mat2d} out
 */
mat2d.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    return out;
};

/**
 * Set a mat2d to the identity matrix
 *
 * @param {mat2d} out the receiving matrix
 * @returns {mat2d} out
 */
mat2d.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = 0;
    out[5] = 0;
    return out;
};

/**
 * Create a new mat2d with the given values
 *
 * @param {Number} a Component A (index 0)
 * @param {Number} b Component B (index 1)
 * @param {Number} c Component C (index 2)
 * @param {Number} d Component D (index 3)
 * @param {Number} tx Component TX (index 4)
 * @param {Number} ty Component TY (index 5)
 * @returns {mat2d} A new mat2d
 */
mat2d.fromValues = function(a, b, c, d, tx, ty) {
    var out = new glMatrix.ARRAY_TYPE(6);
    out[0] = a;
    out[1] = b;
    out[2] = c;
    out[3] = d;
    out[4] = tx;
    out[5] = ty;
    return out;
};

/**
 * Set the components of a mat2d to the given values
 *
 * @param {mat2d} out the receiving matrix
 * @param {Number} a Component A (index 0)
 * @param {Number} b Component B (index 1)
 * @param {Number} c Component C (index 2)
 * @param {Number} d Component D (index 3)
 * @param {Number} tx Component TX (index 4)
 * @param {Number} ty Component TY (index 5)
 * @returns {mat2d} out
 */
mat2d.set = function(out, a, b, c, d, tx, ty) {
    out[0] = a;
    out[1] = b;
    out[2] = c;
    out[3] = d;
    out[4] = tx;
    out[5] = ty;
    return out;
};

/**
 * Inverts a mat2d
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the source matrix
 * @returns {mat2d} out
 */
mat2d.invert = function(out, a) {
    var aa = a[0], ab = a[1], ac = a[2], ad = a[3],
        atx = a[4], aty = a[5];

    var det = aa * ad - ab * ac;
    if(!det){
        return null;
    }
    det = 1.0 / det;

    out[0] = ad * det;
    out[1] = -ab * det;
    out[2] = -ac * det;
    out[3] = aa * det;
    out[4] = (ac * aty - ad * atx) * det;
    out[5] = (ab * atx - aa * aty) * det;
    return out;
};

/**
 * Calculates the determinant of a mat2d
 *
 * @param {mat2d} a the source matrix
 * @returns {Number} determinant of a
 */
mat2d.determinant = function (a) {
    return a[0] * a[3] - a[1] * a[2];
};

/**
 * Multiplies two mat2d's
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the first operand
 * @param {mat2d} b the second operand
 * @returns {mat2d} out
 */
mat2d.multiply = function (out, a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
        b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5];
    out[0] = a0 * b0 + a2 * b1;
    out[1] = a1 * b0 + a3 * b1;
    out[2] = a0 * b2 + a2 * b3;
    out[3] = a1 * b2 + a3 * b3;
    out[4] = a0 * b4 + a2 * b5 + a4;
    out[5] = a1 * b4 + a3 * b5 + a5;
    return out;
};

/**
 * Alias for {@link mat2d.multiply}
 * @function
 */
mat2d.mul = mat2d.multiply;

/**
 * Rotates a mat2d by the given angle
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2d} out
 */
mat2d.rotate = function (out, a, rad) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
        s = Math.sin(rad),
        c = Math.cos(rad);
    out[0] = a0 *  c + a2 * s;
    out[1] = a1 *  c + a3 * s;
    out[2] = a0 * -s + a2 * c;
    out[3] = a1 * -s + a3 * c;
    out[4] = a4;
    out[5] = a5;
    return out;
};

/**
 * Scales the mat2d by the dimensions in the given vec2
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to translate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat2d} out
 **/
mat2d.scale = function(out, a, v) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
        v0 = v[0], v1 = v[1];
    out[0] = a0 * v0;
    out[1] = a1 * v0;
    out[2] = a2 * v1;
    out[3] = a3 * v1;
    out[4] = a4;
    out[5] = a5;
    return out;
};

/**
 * Translates the mat2d by the dimensions in the given vec2
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to translate
 * @param {vec2} v the vec2 to translate the matrix by
 * @returns {mat2d} out
 **/
mat2d.translate = function(out, a, v) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
        v0 = v[0], v1 = v[1];
    out[0] = a0;
    out[1] = a1;
    out[2] = a2;
    out[3] = a3;
    out[4] = a0 * v0 + a2 * v1 + a4;
    out[5] = a1 * v0 + a3 * v1 + a5;
    return out;
};

/**
 * Creates a matrix from a given angle
 * This is equivalent to (but much faster than):
 *
 *     mat2d.identity(dest);
 *     mat2d.rotate(dest, dest, rad);
 *
 * @param {mat2d} out mat2d receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2d} out
 */
mat2d.fromRotation = function(out, rad) {
    var s = Math.sin(rad), c = Math.cos(rad);
    out[0] = c;
    out[1] = s;
    out[2] = -s;
    out[3] = c;
    out[4] = 0;
    out[5] = 0;
    return out;
}

/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat2d.identity(dest);
 *     mat2d.scale(dest, dest, vec);
 *
 * @param {mat2d} out mat2d receiving operation result
 * @param {vec2} v Scaling vector
 * @returns {mat2d} out
 */
mat2d.fromScaling = function(out, v) {
    out[0] = v[0];
    out[1] = 0;
    out[2] = 0;
    out[3] = v[1];
    out[4] = 0;
    out[5] = 0;
    return out;
}

/**
 * Creates a matrix from a vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat2d.identity(dest);
 *     mat2d.translate(dest, dest, vec);
 *
 * @param {mat2d} out mat2d receiving operation result
 * @param {vec2} v Translation vector
 * @returns {mat2d} out
 */
mat2d.fromTranslation = function(out, v) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = v[0];
    out[5] = v[1];
    return out;
}

/**
 * Returns a string representation of a mat2d
 *
 * @param {mat2d} a matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat2d.str = function (a) {
    return 'mat2d(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + 
                    a[3] + ', ' + a[4] + ', ' + a[5] + ')';
};

/**
 * Returns Frobenius norm of a mat2d
 *
 * @param {mat2d} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */
mat2d.frob = function (a) { 
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + 1))
}; 

/**
 * Adds two mat2d's
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the first operand
 * @param {mat2d} b the second operand
 * @returns {mat2d} out
 */
mat2d.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    out[4] = a[4] + b[4];
    out[5] = a[5] + b[5];
    return out;
};

/**
 * Subtracts matrix b from matrix a
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the first operand
 * @param {mat2d} b the second operand
 * @returns {mat2d} out
 */
mat2d.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    out[4] = a[4] - b[4];
    out[5] = a[5] - b[5];
    return out;
};

/**
 * Alias for {@link mat2d.subtract}
 * @function
 */
mat2d.sub = mat2d.subtract;

/**
 * Multiply each element of the matrix by a scalar.
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to scale
 * @param {Number} b amount to scale the matrix's elements by
 * @returns {mat2d} out
 */
mat2d.multiplyScalar = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    out[4] = a[4] * b;
    out[5] = a[5] * b;
    return out;
};

/**
 * Adds two mat2d's after multiplying each element of the second operand by a scalar value.
 *
 * @param {mat2d} out the receiving vector
 * @param {mat2d} a the first operand
 * @param {mat2d} b the second operand
 * @param {Number} scale the amount to scale b's elements by before adding
 * @returns {mat2d} out
 */
mat2d.multiplyScalarAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    out[2] = a[2] + (b[2] * scale);
    out[3] = a[3] + (b[3] * scale);
    out[4] = a[4] + (b[4] * scale);
    out[5] = a[5] + (b[5] * scale);
    return out;
};

/**
 * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
 *
 * @param {mat2d} a The first matrix.
 * @param {mat2d} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */
mat2d.exactEquals = function (a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5];
};

/**
 * Returns whether or not the matrices have approximately the same elements in the same position.
 *
 * @param {mat2d} a The first matrix.
 * @param {mat2d} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */
mat2d.equals = function (a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5];
    return (Math.abs(a0 - b0) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
            Math.abs(a1 - b1) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
            Math.abs(a2 - b2) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a2), Math.abs(b2)) &&
            Math.abs(a3 - b3) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a3), Math.abs(b3)) &&
            Math.abs(a4 - b4) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a4), Math.abs(b4)) &&
            Math.abs(a5 - b5) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a5), Math.abs(b5)));
};

module.exports = mat2d;

}],["src/gl-matrix/mat3.js","gl-matrix/src/gl-matrix","mat3.js",{"./common.js":4},function (require, exports, module, __filename, __dirname){

// gl-matrix/src/gl-matrix/mat3.js
// -------------------------------

/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. */

var glMatrix = require("./common.js");

/**
 * @class 3x3 Matrix
 * @name mat3
 */
var mat3 = {};

/**
 * Creates a new identity mat3
 *
 * @returns {mat3} a new 3x3 matrix
 */
mat3.create = function() {
    var out = new glMatrix.ARRAY_TYPE(9);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
};

/**
 * Copies the upper-left 3x3 values into the given mat3.
 *
 * @param {mat3} out the receiving 3x3 matrix
 * @param {mat4} a   the source 4x4 matrix
 * @returns {mat3} out
 */
mat3.fromMat4 = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[4];
    out[4] = a[5];
    out[5] = a[6];
    out[6] = a[8];
    out[7] = a[9];
    out[8] = a[10];
    return out;
};

/**
 * Creates a new mat3 initialized with values from an existing matrix
 *
 * @param {mat3} a matrix to clone
 * @returns {mat3} a new 3x3 matrix
 */
mat3.clone = function(a) {
    var out = new glMatrix.ARRAY_TYPE(9);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
};

/**
 * Copy the values from one mat3 to another
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
};

/**
 * Create a new mat3 with the given values
 *
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m10 Component in column 1, row 0 position (index 3)
 * @param {Number} m11 Component in column 1, row 1 position (index 4)
 * @param {Number} m12 Component in column 1, row 2 position (index 5)
 * @param {Number} m20 Component in column 2, row 0 position (index 6)
 * @param {Number} m21 Component in column 2, row 1 position (index 7)
 * @param {Number} m22 Component in column 2, row 2 position (index 8)
 * @returns {mat3} A new mat3
 */
mat3.fromValues = function(m00, m01, m02, m10, m11, m12, m20, m21, m22) {
    var out = new glMatrix.ARRAY_TYPE(9);
    out[0] = m00;
    out[1] = m01;
    out[2] = m02;
    out[3] = m10;
    out[4] = m11;
    out[5] = m12;
    out[6] = m20;
    out[7] = m21;
    out[8] = m22;
    return out;
};

/**
 * Set the components of a mat3 to the given values
 *
 * @param {mat3} out the receiving matrix
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m10 Component in column 1, row 0 position (index 3)
 * @param {Number} m11 Component in column 1, row 1 position (index 4)
 * @param {Number} m12 Component in column 1, row 2 position (index 5)
 * @param {Number} m20 Component in column 2, row 0 position (index 6)
 * @param {Number} m21 Component in column 2, row 1 position (index 7)
 * @param {Number} m22 Component in column 2, row 2 position (index 8)
 * @returns {mat3} out
 */
mat3.set = function(out, m00, m01, m02, m10, m11, m12, m20, m21, m22) {
    out[0] = m00;
    out[1] = m01;
    out[2] = m02;
    out[3] = m10;
    out[4] = m11;
    out[5] = m12;
    out[6] = m20;
    out[7] = m21;
    out[8] = m22;
    return out;
};

/**
 * Set a mat3 to the identity matrix
 *
 * @param {mat3} out the receiving matrix
 * @returns {mat3} out
 */
mat3.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
};

/**
 * Transpose the values of a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.transpose = function(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a01 = a[1], a02 = a[2], a12 = a[5];
        out[1] = a[3];
        out[2] = a[6];
        out[3] = a01;
        out[5] = a[7];
        out[6] = a02;
        out[7] = a12;
    } else {
        out[0] = a[0];
        out[1] = a[3];
        out[2] = a[6];
        out[3] = a[1];
        out[4] = a[4];
        out[5] = a[7];
        out[6] = a[2];
        out[7] = a[5];
        out[8] = a[8];
    }
    
    return out;
};

/**
 * Inverts a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.invert = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b01 = a22 * a11 - a12 * a21,
        b11 = -a22 * a10 + a12 * a20,
        b21 = a21 * a10 - a11 * a20,

        // Calculate the determinant
        det = a00 * b01 + a01 * b11 + a02 * b21;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = b01 * det;
    out[1] = (-a22 * a01 + a02 * a21) * det;
    out[2] = (a12 * a01 - a02 * a11) * det;
    out[3] = b11 * det;
    out[4] = (a22 * a00 - a02 * a20) * det;
    out[5] = (-a12 * a00 + a02 * a10) * det;
    out[6] = b21 * det;
    out[7] = (-a21 * a00 + a01 * a20) * det;
    out[8] = (a11 * a00 - a01 * a10) * det;
    return out;
};

/**
 * Calculates the adjugate of a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.adjoint = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8];

    out[0] = (a11 * a22 - a12 * a21);
    out[1] = (a02 * a21 - a01 * a22);
    out[2] = (a01 * a12 - a02 * a11);
    out[3] = (a12 * a20 - a10 * a22);
    out[4] = (a00 * a22 - a02 * a20);
    out[5] = (a02 * a10 - a00 * a12);
    out[6] = (a10 * a21 - a11 * a20);
    out[7] = (a01 * a20 - a00 * a21);
    out[8] = (a00 * a11 - a01 * a10);
    return out;
};

/**
 * Calculates the determinant of a mat3
 *
 * @param {mat3} a the source matrix
 * @returns {Number} determinant of a
 */
mat3.determinant = function (a) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8];

    return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
};

/**
 * Multiplies two mat3's
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the first operand
 * @param {mat3} b the second operand
 * @returns {mat3} out
 */
mat3.multiply = function (out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b00 = b[0], b01 = b[1], b02 = b[2],
        b10 = b[3], b11 = b[4], b12 = b[5],
        b20 = b[6], b21 = b[7], b22 = b[8];

    out[0] = b00 * a00 + b01 * a10 + b02 * a20;
    out[1] = b00 * a01 + b01 * a11 + b02 * a21;
    out[2] = b00 * a02 + b01 * a12 + b02 * a22;

    out[3] = b10 * a00 + b11 * a10 + b12 * a20;
    out[4] = b10 * a01 + b11 * a11 + b12 * a21;
    out[5] = b10 * a02 + b11 * a12 + b12 * a22;

    out[6] = b20 * a00 + b21 * a10 + b22 * a20;
    out[7] = b20 * a01 + b21 * a11 + b22 * a21;
    out[8] = b20 * a02 + b21 * a12 + b22 * a22;
    return out;
};

/**
 * Alias for {@link mat3.multiply}
 * @function
 */
mat3.mul = mat3.multiply;

/**
 * Translate a mat3 by the given vector
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to translate
 * @param {vec2} v vector to translate by
 * @returns {mat3} out
 */
mat3.translate = function(out, a, v) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],
        x = v[0], y = v[1];

    out[0] = a00;
    out[1] = a01;
    out[2] = a02;

    out[3] = a10;
    out[4] = a11;
    out[5] = a12;

    out[6] = x * a00 + y * a10 + a20;
    out[7] = x * a01 + y * a11 + a21;
    out[8] = x * a02 + y * a12 + a22;
    return out;
};

/**
 * Rotates a mat3 by the given angle
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat3} out
 */
mat3.rotate = function (out, a, rad) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        s = Math.sin(rad),
        c = Math.cos(rad);

    out[0] = c * a00 + s * a10;
    out[1] = c * a01 + s * a11;
    out[2] = c * a02 + s * a12;

    out[3] = c * a10 - s * a00;
    out[4] = c * a11 - s * a01;
    out[5] = c * a12 - s * a02;

    out[6] = a20;
    out[7] = a21;
    out[8] = a22;
    return out;
};

/**
 * Scales the mat3 by the dimensions in the given vec2
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to rotate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat3} out
 **/
mat3.scale = function(out, a, v) {
    var x = v[0], y = v[1];

    out[0] = x * a[0];
    out[1] = x * a[1];
    out[2] = x * a[2];

    out[3] = y * a[3];
    out[4] = y * a[4];
    out[5] = y * a[5];

    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
};

/**
 * Creates a matrix from a vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat3.identity(dest);
 *     mat3.translate(dest, dest, vec);
 *
 * @param {mat3} out mat3 receiving operation result
 * @param {vec2} v Translation vector
 * @returns {mat3} out
 */
mat3.fromTranslation = function(out, v) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = v[0];
    out[7] = v[1];
    out[8] = 1;
    return out;
}

/**
 * Creates a matrix from a given angle
 * This is equivalent to (but much faster than):
 *
 *     mat3.identity(dest);
 *     mat3.rotate(dest, dest, rad);
 *
 * @param {mat3} out mat3 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat3} out
 */
mat3.fromRotation = function(out, rad) {
    var s = Math.sin(rad), c = Math.cos(rad);

    out[0] = c;
    out[1] = s;
    out[2] = 0;

    out[3] = -s;
    out[4] = c;
    out[5] = 0;

    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
}

/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat3.identity(dest);
 *     mat3.scale(dest, dest, vec);
 *
 * @param {mat3} out mat3 receiving operation result
 * @param {vec2} v Scaling vector
 * @returns {mat3} out
 */
mat3.fromScaling = function(out, v) {
    out[0] = v[0];
    out[1] = 0;
    out[2] = 0;

    out[3] = 0;
    out[4] = v[1];
    out[5] = 0;

    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
}

/**
 * Copies the values from a mat2d into a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat2d} a the matrix to copy
 * @returns {mat3} out
 **/
mat3.fromMat2d = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = 0;

    out[3] = a[2];
    out[4] = a[3];
    out[5] = 0;

    out[6] = a[4];
    out[7] = a[5];
    out[8] = 1;
    return out;
};

/**
* Calculates a 3x3 matrix from the given quaternion
*
* @param {mat3} out mat3 receiving operation result
* @param {quat} q Quaternion to create matrix from
*
* @returns {mat3} out
*/
mat3.fromQuat = function (out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        yx = y * x2,
        yy = y * y2,
        zx = z * x2,
        zy = z * y2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - yy - zz;
    out[3] = yx - wz;
    out[6] = zx + wy;

    out[1] = yx + wz;
    out[4] = 1 - xx - zz;
    out[7] = zy - wx;

    out[2] = zx - wy;
    out[5] = zy + wx;
    out[8] = 1 - xx - yy;

    return out;
};

/**
* Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
*
* @param {mat3} out mat3 receiving operation result
* @param {mat4} a Mat4 to derive the normal matrix from
*
* @returns {mat3} out
*/
mat3.normalFromMat4 = function (out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;

    out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;

    out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;

    return out;
};

/**
 * Returns a string representation of a mat3
 *
 * @param {mat3} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat3.str = function (a) {
    return 'mat3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + 
                    a[3] + ', ' + a[4] + ', ' + a[5] + ', ' + 
                    a[6] + ', ' + a[7] + ', ' + a[8] + ')';
};

/**
 * Returns Frobenius norm of a mat3
 *
 * @param {mat3} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */
mat3.frob = function (a) {
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2)))
};

/**
 * Adds two mat3's
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the first operand
 * @param {mat3} b the second operand
 * @returns {mat3} out
 */
mat3.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    out[4] = a[4] + b[4];
    out[5] = a[5] + b[5];
    out[6] = a[6] + b[6];
    out[7] = a[7] + b[7];
    out[8] = a[8] + b[8];
    return out;
};

/**
 * Subtracts matrix b from matrix a
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the first operand
 * @param {mat3} b the second operand
 * @returns {mat3} out
 */
mat3.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    out[4] = a[4] - b[4];
    out[5] = a[5] - b[5];
    out[6] = a[6] - b[6];
    out[7] = a[7] - b[7];
    out[8] = a[8] - b[8];
    return out;
};

/**
 * Alias for {@link mat3.subtract}
 * @function
 */
mat3.sub = mat3.subtract;

/**
 * Multiply each element of the matrix by a scalar.
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to scale
 * @param {Number} b amount to scale the matrix's elements by
 * @returns {mat3} out
 */
mat3.multiplyScalar = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    out[4] = a[4] * b;
    out[5] = a[5] * b;
    out[6] = a[6] * b;
    out[7] = a[7] * b;
    out[8] = a[8] * b;
    return out;
};

/**
 * Adds two mat3's after multiplying each element of the second operand by a scalar value.
 *
 * @param {mat3} out the receiving vector
 * @param {mat3} a the first operand
 * @param {mat3} b the second operand
 * @param {Number} scale the amount to scale b's elements by before adding
 * @returns {mat3} out
 */
mat3.multiplyScalarAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    out[2] = a[2] + (b[2] * scale);
    out[3] = a[3] + (b[3] * scale);
    out[4] = a[4] + (b[4] * scale);
    out[5] = a[5] + (b[5] * scale);
    out[6] = a[6] + (b[6] * scale);
    out[7] = a[7] + (b[7] * scale);
    out[8] = a[8] + (b[8] * scale);
    return out;
};

/*
 * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
 *
 * @param {mat3} a The first matrix.
 * @param {mat3} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */
mat3.exactEquals = function (a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && 
           a[3] === b[3] && a[4] === b[4] && a[5] === b[5] &&
           a[6] === b[6] && a[7] === b[7] && a[8] === b[8];
};

/**
 * Returns whether or not the matrices have approximately the same elements in the same position.
 *
 * @param {mat3} a The first matrix.
 * @param {mat3} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */
mat3.equals = function (a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5], a6 = a[6], a7 = a[7], a8 = a[8];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = a[6], b7 = b[7], b8 = b[8];
    return (Math.abs(a0 - b0) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
            Math.abs(a1 - b1) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
            Math.abs(a2 - b2) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a2), Math.abs(b2)) &&
            Math.abs(a3 - b3) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a3), Math.abs(b3)) &&
            Math.abs(a4 - b4) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a4), Math.abs(b4)) &&
            Math.abs(a5 - b5) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a5), Math.abs(b5)) &&
            Math.abs(a6 - b6) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a6), Math.abs(b6)) &&
            Math.abs(a7 - b7) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a7), Math.abs(b7)) &&
            Math.abs(a8 - b8) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a8), Math.abs(b8)));
};


module.exports = mat3;

}],["src/gl-matrix/mat4.js","gl-matrix/src/gl-matrix","mat4.js",{"./common.js":4},function (require, exports, module, __filename, __dirname){

// gl-matrix/src/gl-matrix/mat4.js
// -------------------------------

/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. */

var glMatrix = require("./common.js");

/**
 * @class 4x4 Matrix
 * @name mat4
 */
var mat4 = {
  scalar: {},
  SIMD: {},
};

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */
mat4.create = function() {
    var out = new glMatrix.ARRAY_TYPE(16);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {mat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */
mat4.clone = function(a) {
    var out = new glMatrix.ARRAY_TYPE(16);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Copy the values from one mat4 to another
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Create a new mat4 with the given values
 *
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m03 Component in column 0, row 3 position (index 3)
 * @param {Number} m10 Component in column 1, row 0 position (index 4)
 * @param {Number} m11 Component in column 1, row 1 position (index 5)
 * @param {Number} m12 Component in column 1, row 2 position (index 6)
 * @param {Number} m13 Component in column 1, row 3 position (index 7)
 * @param {Number} m20 Component in column 2, row 0 position (index 8)
 * @param {Number} m21 Component in column 2, row 1 position (index 9)
 * @param {Number} m22 Component in column 2, row 2 position (index 10)
 * @param {Number} m23 Component in column 2, row 3 position (index 11)
 * @param {Number} m30 Component in column 3, row 0 position (index 12)
 * @param {Number} m31 Component in column 3, row 1 position (index 13)
 * @param {Number} m32 Component in column 3, row 2 position (index 14)
 * @param {Number} m33 Component in column 3, row 3 position (index 15)
 * @returns {mat4} A new mat4
 */
mat4.fromValues = function(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
    var out = new glMatrix.ARRAY_TYPE(16);
    out[0] = m00;
    out[1] = m01;
    out[2] = m02;
    out[3] = m03;
    out[4] = m10;
    out[5] = m11;
    out[6] = m12;
    out[7] = m13;
    out[8] = m20;
    out[9] = m21;
    out[10] = m22;
    out[11] = m23;
    out[12] = m30;
    out[13] = m31;
    out[14] = m32;
    out[15] = m33;
    return out;
};

/**
 * Set the components of a mat4 to the given values
 *
 * @param {mat4} out the receiving matrix
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m03 Component in column 0, row 3 position (index 3)
 * @param {Number} m10 Component in column 1, row 0 position (index 4)
 * @param {Number} m11 Component in column 1, row 1 position (index 5)
 * @param {Number} m12 Component in column 1, row 2 position (index 6)
 * @param {Number} m13 Component in column 1, row 3 position (index 7)
 * @param {Number} m20 Component in column 2, row 0 position (index 8)
 * @param {Number} m21 Component in column 2, row 1 position (index 9)
 * @param {Number} m22 Component in column 2, row 2 position (index 10)
 * @param {Number} m23 Component in column 2, row 3 position (index 11)
 * @param {Number} m30 Component in column 3, row 0 position (index 12)
 * @param {Number} m31 Component in column 3, row 1 position (index 13)
 * @param {Number} m32 Component in column 3, row 2 position (index 14)
 * @param {Number} m33 Component in column 3, row 3 position (index 15)
 * @returns {mat4} out
 */
mat4.set = function(out, m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
    out[0] = m00;
    out[1] = m01;
    out[2] = m02;
    out[3] = m03;
    out[4] = m10;
    out[5] = m11;
    out[6] = m12;
    out[7] = m13;
    out[8] = m20;
    out[9] = m21;
    out[10] = m22;
    out[11] = m23;
    out[12] = m30;
    out[13] = m31;
    out[14] = m32;
    out[15] = m33;
    return out;
};


/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */
mat4.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

/**
 * Transpose the values of a mat4 not using SIMD
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.scalar.transpose = function(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a01 = a[1], a02 = a[2], a03 = a[3],
            a12 = a[6], a13 = a[7],
            a23 = a[11];

        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a01;
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a02;
        out[9] = a12;
        out[11] = a[14];
        out[12] = a03;
        out[13] = a13;
        out[14] = a23;
    } else {
        out[0] = a[0];
        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a[1];
        out[5] = a[5];
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a[2];
        out[9] = a[6];
        out[10] = a[10];
        out[11] = a[14];
        out[12] = a[3];
        out[13] = a[7];
        out[14] = a[11];
        out[15] = a[15];
    }

    return out;
};

/**
 * Transpose the values of a mat4 using SIMD
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.SIMD.transpose = function(out, a) {
    var a0, a1, a2, a3,
        tmp01, tmp23,
        out0, out1, out2, out3;

    a0 = SIMD.Float32x4.load(a, 0);
    a1 = SIMD.Float32x4.load(a, 4);
    a2 = SIMD.Float32x4.load(a, 8);
    a3 = SIMD.Float32x4.load(a, 12);

    tmp01 = SIMD.Float32x4.shuffle(a0, a1, 0, 1, 4, 5);
    tmp23 = SIMD.Float32x4.shuffle(a2, a3, 0, 1, 4, 5);
    out0  = SIMD.Float32x4.shuffle(tmp01, tmp23, 0, 2, 4, 6);
    out1  = SIMD.Float32x4.shuffle(tmp01, tmp23, 1, 3, 5, 7);
    SIMD.Float32x4.store(out, 0,  out0);
    SIMD.Float32x4.store(out, 4,  out1);

    tmp01 = SIMD.Float32x4.shuffle(a0, a1, 2, 3, 6, 7);
    tmp23 = SIMD.Float32x4.shuffle(a2, a3, 2, 3, 6, 7);
    out2  = SIMD.Float32x4.shuffle(tmp01, tmp23, 0, 2, 4, 6);
    out3  = SIMD.Float32x4.shuffle(tmp01, tmp23, 1, 3, 5, 7);
    SIMD.Float32x4.store(out, 8,  out2);
    SIMD.Float32x4.store(out, 12, out3);

    return out;
};

/**
 * Transpse a mat4 using SIMD if available and enabled
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.transpose = glMatrix.USE_SIMD ? mat4.SIMD.transpose : mat4.scalar.transpose;

/**
 * Inverts a mat4 not using SIMD
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.scalar.invert = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) {
        return null;
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
};

/**
 * Inverts a mat4 using SIMD
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.SIMD.invert = function(out, a) {
  var row0, row1, row2, row3,
      tmp1,
      minor0, minor1, minor2, minor3,
      det,
      a0 = SIMD.Float32x4.load(a, 0),
      a1 = SIMD.Float32x4.load(a, 4),
      a2 = SIMD.Float32x4.load(a, 8),
      a3 = SIMD.Float32x4.load(a, 12);

  // Compute matrix adjugate
  tmp1 = SIMD.Float32x4.shuffle(a0, a1, 0, 1, 4, 5);
  row1 = SIMD.Float32x4.shuffle(a2, a3, 0, 1, 4, 5);
  row0 = SIMD.Float32x4.shuffle(tmp1, row1, 0, 2, 4, 6);
  row1 = SIMD.Float32x4.shuffle(row1, tmp1, 1, 3, 5, 7);
  tmp1 = SIMD.Float32x4.shuffle(a0, a1, 2, 3, 6, 7);
  row3 = SIMD.Float32x4.shuffle(a2, a3, 2, 3, 6, 7);
  row2 = SIMD.Float32x4.shuffle(tmp1, row3, 0, 2, 4, 6);
  row3 = SIMD.Float32x4.shuffle(row3, tmp1, 1, 3, 5, 7);

  tmp1   = SIMD.Float32x4.mul(row2, row3);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
  minor0 = SIMD.Float32x4.mul(row1, tmp1);
  minor1 = SIMD.Float32x4.mul(row0, tmp1);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
  minor0 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row1, tmp1), minor0);
  minor1 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor1);
  minor1 = SIMD.Float32x4.swizzle(minor1, 2, 3, 0, 1);

  tmp1   = SIMD.Float32x4.mul(row1, row2);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
  minor0 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor0);
  minor3 = SIMD.Float32x4.mul(row0, tmp1);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
  minor0 = SIMD.Float32x4.sub(minor0, SIMD.Float32x4.mul(row3, tmp1));
  minor3 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor3);
  minor3 = SIMD.Float32x4.swizzle(minor3, 2, 3, 0, 1);

  tmp1   = SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(row1, 2, 3, 0, 1), row3);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
  row2   = SIMD.Float32x4.swizzle(row2, 2, 3, 0, 1);
  minor0 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row2, tmp1), minor0);
  minor2 = SIMD.Float32x4.mul(row0, tmp1);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
  minor0 = SIMD.Float32x4.sub(minor0, SIMD.Float32x4.mul(row2, tmp1));
  minor2 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor2);
  minor2 = SIMD.Float32x4.swizzle(minor2, 2, 3, 0, 1);

  tmp1   = SIMD.Float32x4.mul(row0, row1);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
  minor2 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor2);
  minor3 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row2, tmp1), minor3);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
  minor2 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row3, tmp1), minor2);
  minor3 = SIMD.Float32x4.sub(minor3, SIMD.Float32x4.mul(row2, tmp1));

  tmp1   = SIMD.Float32x4.mul(row0, row3);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
  minor1 = SIMD.Float32x4.sub(minor1, SIMD.Float32x4.mul(row2, tmp1));
  minor2 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row1, tmp1), minor2);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
  minor1 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row2, tmp1), minor1);
  minor2 = SIMD.Float32x4.sub(minor2, SIMD.Float32x4.mul(row1, tmp1));

  tmp1   = SIMD.Float32x4.mul(row0, row2);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
  minor1 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor1);
  minor3 = SIMD.Float32x4.sub(minor3, SIMD.Float32x4.mul(row1, tmp1));
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
  minor1 = SIMD.Float32x4.sub(minor1, SIMD.Float32x4.mul(row3, tmp1));
  minor3 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row1, tmp1), minor3);

  // Compute matrix determinant
  det   = SIMD.Float32x4.mul(row0, minor0);
  det   = SIMD.Float32x4.add(SIMD.Float32x4.swizzle(det, 2, 3, 0, 1), det);
  det   = SIMD.Float32x4.add(SIMD.Float32x4.swizzle(det, 1, 0, 3, 2), det);
  tmp1  = SIMD.Float32x4.reciprocalApproximation(det);
  det   = SIMD.Float32x4.sub(
               SIMD.Float32x4.add(tmp1, tmp1),
               SIMD.Float32x4.mul(det, SIMD.Float32x4.mul(tmp1, tmp1)));
  det   = SIMD.Float32x4.swizzle(det, 0, 0, 0, 0);
  if (!det) {
      return null;
  }

  // Compute matrix inverse
  SIMD.Float32x4.store(out, 0,  SIMD.Float32x4.mul(det, minor0));
  SIMD.Float32x4.store(out, 4,  SIMD.Float32x4.mul(det, minor1));
  SIMD.Float32x4.store(out, 8,  SIMD.Float32x4.mul(det, minor2));
  SIMD.Float32x4.store(out, 12, SIMD.Float32x4.mul(det, minor3));
  return out;
}

/**
 * Inverts a mat4 using SIMD if available and enabled
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.invert = glMatrix.USE_SIMD ? mat4.SIMD.invert : mat4.scalar.invert;

/**
 * Calculates the adjugate of a mat4 not using SIMD
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.scalar.adjoint = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    out[0]  =  (a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22));
    out[1]  = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
    out[2]  =  (a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12));
    out[3]  = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
    out[4]  = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
    out[5]  =  (a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22));
    out[6]  = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
    out[7]  =  (a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12));
    out[8]  =  (a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21));
    out[9]  = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
    out[10] =  (a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11));
    out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
    out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
    out[13] =  (a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21));
    out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
    out[15] =  (a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11));
    return out;
};

/**
 * Calculates the adjugate of a mat4 using SIMD
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.SIMD.adjoint = function(out, a) {
  var a0, a1, a2, a3;
  var row0, row1, row2, row3;
  var tmp1;
  var minor0, minor1, minor2, minor3;

  var a0 = SIMD.Float32x4.load(a, 0);
  var a1 = SIMD.Float32x4.load(a, 4);
  var a2 = SIMD.Float32x4.load(a, 8);
  var a3 = SIMD.Float32x4.load(a, 12);

  // Transpose the source matrix.  Sort of.  Not a true transpose operation
  tmp1 = SIMD.Float32x4.shuffle(a0, a1, 0, 1, 4, 5);
  row1 = SIMD.Float32x4.shuffle(a2, a3, 0, 1, 4, 5);
  row0 = SIMD.Float32x4.shuffle(tmp1, row1, 0, 2, 4, 6);
  row1 = SIMD.Float32x4.shuffle(row1, tmp1, 1, 3, 5, 7);

  tmp1 = SIMD.Float32x4.shuffle(a0, a1, 2, 3, 6, 7);
  row3 = SIMD.Float32x4.shuffle(a2, a3, 2, 3, 6, 7);
  row2 = SIMD.Float32x4.shuffle(tmp1, row3, 0, 2, 4, 6);
  row3 = SIMD.Float32x4.shuffle(row3, tmp1, 1, 3, 5, 7);

  tmp1   = SIMD.Float32x4.mul(row2, row3);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
  minor0 = SIMD.Float32x4.mul(row1, tmp1);
  minor1 = SIMD.Float32x4.mul(row0, tmp1);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
  minor0 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row1, tmp1), minor0);
  minor1 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor1);
  minor1 = SIMD.Float32x4.swizzle(minor1, 2, 3, 0, 1);

  tmp1   = SIMD.Float32x4.mul(row1, row2);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
  minor0 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor0);
  minor3 = SIMD.Float32x4.mul(row0, tmp1);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
  minor0 = SIMD.Float32x4.sub(minor0, SIMD.Float32x4.mul(row3, tmp1));
  minor3 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor3);
  minor3 = SIMD.Float32x4.swizzle(minor3, 2, 3, 0, 1);

  tmp1   = SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(row1, 2, 3, 0, 1), row3);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
  row2   = SIMD.Float32x4.swizzle(row2, 2, 3, 0, 1);
  minor0 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row2, tmp1), minor0);
  minor2 = SIMD.Float32x4.mul(row0, tmp1);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
  minor0 = SIMD.Float32x4.sub(minor0, SIMD.Float32x4.mul(row2, tmp1));
  minor2 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor2);
  minor2 = SIMD.Float32x4.swizzle(minor2, 2, 3, 0, 1);

  tmp1   = SIMD.Float32x4.mul(row0, row1);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
  minor2 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor2);
  minor3 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row2, tmp1), minor3);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
  minor2 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row3, tmp1), minor2);
  minor3 = SIMD.Float32x4.sub(minor3, SIMD.Float32x4.mul(row2, tmp1));

  tmp1   = SIMD.Float32x4.mul(row0, row3);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
  minor1 = SIMD.Float32x4.sub(minor1, SIMD.Float32x4.mul(row2, tmp1));
  minor2 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row1, tmp1), minor2);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
  minor1 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row2, tmp1), minor1);
  minor2 = SIMD.Float32x4.sub(minor2, SIMD.Float32x4.mul(row1, tmp1));

  tmp1   = SIMD.Float32x4.mul(row0, row2);
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
  minor1 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor1);
  minor3 = SIMD.Float32x4.sub(minor3, SIMD.Float32x4.mul(row1, tmp1));
  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
  minor1 = SIMD.Float32x4.sub(minor1, SIMD.Float32x4.mul(row3, tmp1));
  minor3 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row1, tmp1), minor3);

  SIMD.Float32x4.store(out, 0,  minor0);
  SIMD.Float32x4.store(out, 4,  minor1);
  SIMD.Float32x4.store(out, 8,  minor2);
  SIMD.Float32x4.store(out, 12, minor3);
  return out;
};

/**
 * Calculates the adjugate of a mat4 using SIMD if available and enabled
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
 mat4.adjoint = glMatrix.USE_SIMD ? mat4.SIMD.adjoint : mat4.scalar.adjoint;

/**
 * Calculates the determinant of a mat4
 *
 * @param {mat4} a the source matrix
 * @returns {Number} determinant of a
 */
mat4.determinant = function (a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32;

    // Calculate the determinant
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
};

/**
 * Multiplies two mat4's explicitly using SIMD
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand, must be a Float32Array
 * @param {mat4} b the second operand, must be a Float32Array
 * @returns {mat4} out
 */
mat4.SIMD.multiply = function (out, a, b) {
    var a0 = SIMD.Float32x4.load(a, 0);
    var a1 = SIMD.Float32x4.load(a, 4);
    var a2 = SIMD.Float32x4.load(a, 8);
    var a3 = SIMD.Float32x4.load(a, 12);

    var b0 = SIMD.Float32x4.load(b, 0);
    var out0 = SIMD.Float32x4.add(
                   SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b0, 0, 0, 0, 0), a0),
                   SIMD.Float32x4.add(
                       SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b0, 1, 1, 1, 1), a1),
                       SIMD.Float32x4.add(
                           SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b0, 2, 2, 2, 2), a2),
                           SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b0, 3, 3, 3, 3), a3))));
    SIMD.Float32x4.store(out, 0, out0);

    var b1 = SIMD.Float32x4.load(b, 4);
    var out1 = SIMD.Float32x4.add(
                   SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b1, 0, 0, 0, 0), a0),
                   SIMD.Float32x4.add(
                       SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b1, 1, 1, 1, 1), a1),
                       SIMD.Float32x4.add(
                           SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b1, 2, 2, 2, 2), a2),
                           SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b1, 3, 3, 3, 3), a3))));
    SIMD.Float32x4.store(out, 4, out1);

    var b2 = SIMD.Float32x4.load(b, 8);
    var out2 = SIMD.Float32x4.add(
                   SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b2, 0, 0, 0, 0), a0),
                   SIMD.Float32x4.add(
                       SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b2, 1, 1, 1, 1), a1),
                       SIMD.Float32x4.add(
                               SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b2, 2, 2, 2, 2), a2),
                               SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b2, 3, 3, 3, 3), a3))));
    SIMD.Float32x4.store(out, 8, out2);

    var b3 = SIMD.Float32x4.load(b, 12);
    var out3 = SIMD.Float32x4.add(
                   SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b3, 0, 0, 0, 0), a0),
                   SIMD.Float32x4.add(
                        SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b3, 1, 1, 1, 1), a1),
                        SIMD.Float32x4.add(
                            SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b3, 2, 2, 2, 2), a2),
                            SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b3, 3, 3, 3, 3), a3))));
    SIMD.Float32x4.store(out, 12, out3);

    return out;
};

/**
 * Multiplies two mat4's explicitly not using SIMD
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */
mat4.scalar.multiply = function (out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    // Cache only the current line of the second matrix
    var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    return out;
};

/**
 * Multiplies two mat4's using SIMD if available and enabled
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */
mat4.multiply = glMatrix.USE_SIMD ? mat4.SIMD.multiply : mat4.scalar.multiply;

/**
 * Alias for {@link mat4.multiply}
 * @function
 */
mat4.mul = mat4.multiply;

/**
 * Translate a mat4 by the given vector not using SIMD
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to translate
 * @param {vec3} v vector to translate by
 * @returns {mat4} out
 */
mat4.scalar.translate = function (out, a, v) {
    var x = v[0], y = v[1], z = v[2],
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23;

    if (a === out) {
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
        a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
        a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
        a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

        out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
        out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
        out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;

        out[12] = a00 * x + a10 * y + a20 * z + a[12];
        out[13] = a01 * x + a11 * y + a21 * z + a[13];
        out[14] = a02 * x + a12 * y + a22 * z + a[14];
        out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }

    return out;
};

/**
 * Translates a mat4 by the given vector using SIMD
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to translate
 * @param {vec3} v vector to translate by
 * @returns {mat4} out
 */
mat4.SIMD.translate = function (out, a, v) {
    var a0 = SIMD.Float32x4.load(a, 0),
        a1 = SIMD.Float32x4.load(a, 4),
        a2 = SIMD.Float32x4.load(a, 8),
        a3 = SIMD.Float32x4.load(a, 12),
        vec = SIMD.Float32x4(v[0], v[1], v[2] , 0);

    if (a !== out) {
        out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
        out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
        out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
    }

    a0 = SIMD.Float32x4.mul(a0, SIMD.Float32x4.swizzle(vec, 0, 0, 0, 0));
    a1 = SIMD.Float32x4.mul(a1, SIMD.Float32x4.swizzle(vec, 1, 1, 1, 1));
    a2 = SIMD.Float32x4.mul(a2, SIMD.Float32x4.swizzle(vec, 2, 2, 2, 2));

    var t0 = SIMD.Float32x4.add(a0, SIMD.Float32x4.add(a1, SIMD.Float32x4.add(a2, a3)));
    SIMD.Float32x4.store(out, 12, t0);

    return out;
};

/**
 * Translates a mat4 by the given vector using SIMD if available and enabled
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to translate
 * @param {vec3} v vector to translate by
 * @returns {mat4} out
 */
mat4.translate = glMatrix.USE_SIMD ? mat4.SIMD.translate : mat4.scalar.translate;

/**
 * Scales the mat4 by the dimensions in the given vec3 not using vectorization
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to scale
 * @param {vec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/
mat4.scalar.scale = function(out, a, v) {
    var x = v[0], y = v[1], z = v[2];

    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Scales the mat4 by the dimensions in the given vec3 using vectorization
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to scale
 * @param {vec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/
mat4.SIMD.scale = function(out, a, v) {
    var a0, a1, a2;
    var vec = SIMD.Float32x4(v[0], v[1], v[2], 0);

    a0 = SIMD.Float32x4.load(a, 0);
    SIMD.Float32x4.store(
        out, 0, SIMD.Float32x4.mul(a0, SIMD.Float32x4.swizzle(vec, 0, 0, 0, 0)));

    a1 = SIMD.Float32x4.load(a, 4);
    SIMD.Float32x4.store(
        out, 4, SIMD.Float32x4.mul(a1, SIMD.Float32x4.swizzle(vec, 1, 1, 1, 1)));

    a2 = SIMD.Float32x4.load(a, 8);
    SIMD.Float32x4.store(
        out, 8, SIMD.Float32x4.mul(a2, SIMD.Float32x4.swizzle(vec, 2, 2, 2, 2)));

    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Scales the mat4 by the dimensions in the given vec3 using SIMD if available and enabled
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to scale
 * @param {vec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 */
mat4.scale = glMatrix.USE_SIMD ? mat4.SIMD.scale : mat4.scalar.scale;

/**
 * Rotates a mat4 by the given angle around the given axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {vec3} axis the axis to rotate around
 * @returns {mat4} out
 */
mat4.rotate = function (out, a, rad, axis) {
    var x = axis[0], y = axis[1], z = axis[2],
        len = Math.sqrt(x * x + y * y + z * z),
        s, c, t,
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23,
        b00, b01, b02,
        b10, b11, b12,
        b20, b21, b22;

    if (Math.abs(len) < glMatrix.EPSILON) { return null; }

    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;

    a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
    a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
    a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

    // Construct the elements of the rotation matrix
    b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
    b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
    b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

    // Perform rotation-specific matrix multiplication
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    return out;
};

/**
 * Rotates a matrix by the given angle around the X axis not using SIMD
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.scalar.rotateX = function (out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[0]  = a[0];
        out[1]  = a[1];
        out[2]  = a[2];
        out[3]  = a[3];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
};

/**
 * Rotates a matrix by the given angle around the X axis using SIMD
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.SIMD.rotateX = function (out, a, rad) {
    var s = SIMD.Float32x4.splat(Math.sin(rad)),
        c = SIMD.Float32x4.splat(Math.cos(rad));

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
      out[0]  = a[0];
      out[1]  = a[1];
      out[2]  = a[2];
      out[3]  = a[3];
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    var a_1 = SIMD.Float32x4.load(a, 4);
    var a_2 = SIMD.Float32x4.load(a, 8);
    SIMD.Float32x4.store(out, 4,
                         SIMD.Float32x4.add(SIMD.Float32x4.mul(a_1, c), SIMD.Float32x4.mul(a_2, s)));
    SIMD.Float32x4.store(out, 8,
                         SIMD.Float32x4.sub(SIMD.Float32x4.mul(a_2, c), SIMD.Float32x4.mul(a_1, s)));
    return out;
};

/**
 * Rotates a matrix by the given angle around the X axis using SIMD if availabe and enabled
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.rotateX = glMatrix.USE_SIMD ? mat4.SIMD.rotateX : mat4.scalar.rotateX;

/**
 * Rotates a matrix by the given angle around the Y axis not using SIMD
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.scalar.rotateY = function (out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[4]  = a[4];
        out[5]  = a[5];
        out[6]  = a[6];
        out[7]  = a[7];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
};

/**
 * Rotates a matrix by the given angle around the Y axis using SIMD
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.SIMD.rotateY = function (out, a, rad) {
    var s = SIMD.Float32x4.splat(Math.sin(rad)),
        c = SIMD.Float32x4.splat(Math.cos(rad));

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[4]  = a[4];
        out[5]  = a[5];
        out[6]  = a[6];
        out[7]  = a[7];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    var a_0 = SIMD.Float32x4.load(a, 0);
    var a_2 = SIMD.Float32x4.load(a, 8);
    SIMD.Float32x4.store(out, 0,
                         SIMD.Float32x4.sub(SIMD.Float32x4.mul(a_0, c), SIMD.Float32x4.mul(a_2, s)));
    SIMD.Float32x4.store(out, 8,
                         SIMD.Float32x4.add(SIMD.Float32x4.mul(a_0, s), SIMD.Float32x4.mul(a_2, c)));
    return out;
};

/**
 * Rotates a matrix by the given angle around the Y axis if SIMD available and enabled
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
 mat4.rotateY = glMatrix.USE_SIMD ? mat4.SIMD.rotateY : mat4.scalar.rotateY;

/**
 * Rotates a matrix by the given angle around the Z axis not using SIMD
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.scalar.rotateZ = function (out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[8]  = a[8];
        out[9]  = a[9];
        out[10] = a[10];
        out[11] = a[11];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
};

/**
 * Rotates a matrix by the given angle around the Z axis using SIMD
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.SIMD.rotateZ = function (out, a, rad) {
    var s = SIMD.Float32x4.splat(Math.sin(rad)),
        c = SIMD.Float32x4.splat(Math.cos(rad));

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[8]  = a[8];
        out[9]  = a[9];
        out[10] = a[10];
        out[11] = a[11];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    var a_0 = SIMD.Float32x4.load(a, 0);
    var a_1 = SIMD.Float32x4.load(a, 4);
    SIMD.Float32x4.store(out, 0,
                         SIMD.Float32x4.add(SIMD.Float32x4.mul(a_0, c), SIMD.Float32x4.mul(a_1, s)));
    SIMD.Float32x4.store(out, 4,
                         SIMD.Float32x4.sub(SIMD.Float32x4.mul(a_1, c), SIMD.Float32x4.mul(a_0, s)));
    return out;
};

/**
 * Rotates a matrix by the given angle around the Z axis if SIMD available and enabled
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
 mat4.rotateZ = glMatrix.USE_SIMD ? mat4.SIMD.rotateZ : mat4.scalar.rotateZ;

/**
 * Creates a matrix from a vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, dest, vec);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {vec3} v Translation vector
 * @returns {mat4} out
 */
mat4.fromTranslation = function(out, v) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
}

/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.scale(dest, dest, vec);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {vec3} v Scaling vector
 * @returns {mat4} out
 */
mat4.fromScaling = function(out, v) {
    out[0] = v[0];
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = v[1];
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = v[2];
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
}

/**
 * Creates a matrix from a given angle around a given axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotate(dest, dest, rad, axis);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @param {vec3} axis the axis to rotate around
 * @returns {mat4} out
 */
mat4.fromRotation = function(out, rad, axis) {
    var x = axis[0], y = axis[1], z = axis[2],
        len = Math.sqrt(x * x + y * y + z * z),
        s, c, t;

    if (Math.abs(len) < glMatrix.EPSILON) { return null; }

    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;

    // Perform rotation-specific matrix multiplication
    out[0] = x * x * t + c;
    out[1] = y * x * t + z * s;
    out[2] = z * x * t - y * s;
    out[3] = 0;
    out[4] = x * y * t - z * s;
    out[5] = y * y * t + c;
    out[6] = z * y * t + x * s;
    out[7] = 0;
    out[8] = x * z * t + y * s;
    out[9] = y * z * t - x * s;
    out[10] = z * z * t + c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
}

/**
 * Creates a matrix from the given angle around the X axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateX(dest, dest, rad);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.fromXRotation = function(out, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad);

    // Perform axis-specific matrix multiplication
    out[0]  = 1;
    out[1]  = 0;
    out[2]  = 0;
    out[3]  = 0;
    out[4] = 0;
    out[5] = c;
    out[6] = s;
    out[7] = 0;
    out[8] = 0;
    out[9] = -s;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
}

/**
 * Creates a matrix from the given angle around the Y axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateY(dest, dest, rad);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.fromYRotation = function(out, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad);

    // Perform axis-specific matrix multiplication
    out[0]  = c;
    out[1]  = 0;
    out[2]  = -s;
    out[3]  = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = s;
    out[9] = 0;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
}

/**
 * Creates a matrix from the given angle around the Z axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateZ(dest, dest, rad);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.fromZRotation = function(out, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad);

    // Perform axis-specific matrix multiplication
    out[0]  = c;
    out[1]  = s;
    out[2]  = 0;
    out[3]  = 0;
    out[4] = -s;
    out[5] = c;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
}

/**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     var quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {vec3} v Translation vector
 * @returns {mat4} out
 */
mat4.fromRotationTranslation = function (out, q, v) {
    // Quaternion math
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;

    return out;
};

/**
 * Returns the translation vector component of a transformation
 *  matrix. If a matrix is built with fromRotationTranslation,
 *  the returned vector will be the same as the translation vector
 *  originally supplied.
 * @param  {vec3} out Vector to receive translation component
 * @param  {mat4} mat Matrix to be decomposed (input)
 * @return {vec3} out
 */
mat4.getTranslation = function (out, mat) {
  out[0] = mat[12];
  out[1] = mat[13];
  out[2] = mat[14];

  return out;
};

/**
 * Returns a quaternion representing the rotational component
 *  of a transformation matrix. If a matrix is built with
 *  fromRotationTranslation, the returned quaternion will be the
 *  same as the quaternion originally supplied.
 * @param {quat} out Quaternion to receive the rotation component
 * @param {mat4} mat Matrix to be decomposed (input)
 * @return {quat} out
 */
mat4.getRotation = function (out, mat) {
  // Algorithm taken from http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm
  var trace = mat[0] + mat[5] + mat[10];
  var S = 0;

  if (trace > 0) { 
    S = Math.sqrt(trace + 1.0) * 2;
    out[3] = 0.25 * S;
    out[0] = (mat[6] - mat[9]) / S;
    out[1] = (mat[8] - mat[2]) / S; 
    out[2] = (mat[1] - mat[4]) / S; 
  } else if ((mat[0] > mat[5])&(mat[0] > mat[10])) { 
    S = Math.sqrt(1.0 + mat[0] - mat[5] - mat[10]) * 2;
    out[3] = (mat[6] - mat[9]) / S;
    out[0] = 0.25 * S;
    out[1] = (mat[1] + mat[4]) / S; 
    out[2] = (mat[8] + mat[2]) / S; 
  } else if (mat[5] > mat[10]) { 
    S = Math.sqrt(1.0 + mat[5] - mat[0] - mat[10]) * 2;
    out[3] = (mat[8] - mat[2]) / S;
    out[0] = (mat[1] + mat[4]) / S; 
    out[1] = 0.25 * S;
    out[2] = (mat[6] + mat[9]) / S; 
  } else { 
    S = Math.sqrt(1.0 + mat[10] - mat[0] - mat[5]) * 2;
    out[3] = (mat[1] - mat[4]) / S;
    out[0] = (mat[8] + mat[2]) / S;
    out[1] = (mat[6] + mat[9]) / S;
    out[2] = 0.25 * S;
  }

  return out;
};

/**
 * Creates a matrix from a quaternion rotation, vector translation and vector scale
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     var quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *     mat4.scale(dest, scale)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {vec3} v Translation vector
 * @param {vec3} s Scaling vector
 * @returns {mat4} out
 */
mat4.fromRotationTranslationScale = function (out, q, v, s) {
    // Quaternion math
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2,
        sx = s[0],
        sy = s[1],
        sz = s[2];

    out[0] = (1 - (yy + zz)) * sx;
    out[1] = (xy + wz) * sx;
    out[2] = (xz - wy) * sx;
    out[3] = 0;
    out[4] = (xy - wz) * sy;
    out[5] = (1 - (xx + zz)) * sy;
    out[6] = (yz + wx) * sy;
    out[7] = 0;
    out[8] = (xz + wy) * sz;
    out[9] = (yz - wx) * sz;
    out[10] = (1 - (xx + yy)) * sz;
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;

    return out;
};

/**
 * Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the given origin
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     mat4.translate(dest, origin);
 *     var quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *     mat4.scale(dest, scale)
 *     mat4.translate(dest, negativeOrigin);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {vec3} v Translation vector
 * @param {vec3} s Scaling vector
 * @param {vec3} o The origin vector around which to scale and rotate
 * @returns {mat4} out
 */
mat4.fromRotationTranslationScaleOrigin = function (out, q, v, s, o) {
  // Quaternion math
  var x = q[0], y = q[1], z = q[2], w = q[3],
      x2 = x + x,
      y2 = y + y,
      z2 = z + z,

      xx = x * x2,
      xy = x * y2,
      xz = x * z2,
      yy = y * y2,
      yz = y * z2,
      zz = z * z2,
      wx = w * x2,
      wy = w * y2,
      wz = w * z2,

      sx = s[0],
      sy = s[1],
      sz = s[2],

      ox = o[0],
      oy = o[1],
      oz = o[2];

  out[0] = (1 - (yy + zz)) * sx;
  out[1] = (xy + wz) * sx;
  out[2] = (xz - wy) * sx;
  out[3] = 0;
  out[4] = (xy - wz) * sy;
  out[5] = (1 - (xx + zz)) * sy;
  out[6] = (yz + wx) * sy;
  out[7] = 0;
  out[8] = (xz + wy) * sz;
  out[9] = (yz - wx) * sz;
  out[10] = (1 - (xx + yy)) * sz;
  out[11] = 0;
  out[12] = v[0] + ox - (out[0] * ox + out[4] * oy + out[8] * oz);
  out[13] = v[1] + oy - (out[1] * ox + out[5] * oy + out[9] * oz);
  out[14] = v[2] + oz - (out[2] * ox + out[6] * oy + out[10] * oz);
  out[15] = 1;

  return out;
};

/**
 * Calculates a 4x4 matrix from the given quaternion
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat} q Quaternion to create matrix from
 *
 * @returns {mat4} out
 */
mat4.fromQuat = function (out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        yx = y * x2,
        yy = y * y2,
        zx = z * x2,
        zy = z * y2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;

    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;

    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;

    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;

    return out;
};

/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {mat4} out
 */
mat4.frustum = function (out, left, right, bottom, top, near, far) {
    var rl = 1 / (right - left),
        tb = 1 / (top - bottom),
        nf = 1 / (near - far);
    out[0] = (near * 2) * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = (near * 2) * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (far * near * 2) * nf;
    out[15] = 0;
    return out;
};

/**
 * Generates a perspective projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
mat4.perspective = function (out, fovy, aspect, near, far) {
    var f = 1.0 / Math.tan(fovy / 2),
        nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) * nf;
    out[15] = 0;
    return out;
};

/**
 * Generates a perspective projection matrix with the given field of view.
 * This is primarily useful for generating projection matrices to be used
 * with the still experiemental WebVR API.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Object} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
mat4.perspectiveFromFieldOfView = function (out, fov, near, far) {
    var upTan = Math.tan(fov.upDegrees * Math.PI/180.0),
        downTan = Math.tan(fov.downDegrees * Math.PI/180.0),
        leftTan = Math.tan(fov.leftDegrees * Math.PI/180.0),
        rightTan = Math.tan(fov.rightDegrees * Math.PI/180.0),
        xScale = 2.0 / (leftTan + rightTan),
        yScale = 2.0 / (upTan + downTan);

    out[0] = xScale;
    out[1] = 0.0;
    out[2] = 0.0;
    out[3] = 0.0;
    out[4] = 0.0;
    out[5] = yScale;
    out[6] = 0.0;
    out[7] = 0.0;
    out[8] = -((leftTan - rightTan) * xScale * 0.5);
    out[9] = ((upTan - downTan) * yScale * 0.5);
    out[10] = far / (near - far);
    out[11] = -1.0;
    out[12] = 0.0;
    out[13] = 0.0;
    out[14] = (far * near) / (near - far);
    out[15] = 0.0;
    return out;
}

/**
 * Generates a orthogonal projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
mat4.ortho = function (out, left, right, bottom, top, near, far) {
    var lr = 1 / (left - right),
        bt = 1 / (bottom - top),
        nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
};

/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {vec3} eye Position of the viewer
 * @param {vec3} center Point the viewer is looking at
 * @param {vec3} up vec3 pointing up
 * @returns {mat4} out
 */
mat4.lookAt = function (out, eye, center, up) {
    var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
        eyex = eye[0],
        eyey = eye[1],
        eyez = eye[2],
        upx = up[0],
        upy = up[1],
        upz = up[2],
        centerx = center[0],
        centery = center[1],
        centerz = center[2];

    if (Math.abs(eyex - centerx) < glMatrix.EPSILON &&
        Math.abs(eyey - centery) < glMatrix.EPSILON &&
        Math.abs(eyez - centerz) < glMatrix.EPSILON) {
        return mat4.identity(out);
    }

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;

    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
        x0 = 0;
        x1 = 0;
        x2 = 0;
    } else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;

    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
        y0 = 0;
        y1 = 0;
        y2 = 0;
    } else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }

    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;

    return out;
};

/**
 * Returns a string representation of a mat4
 *
 * @param {mat4} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat4.str = function (a) {
    return 'mat4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' +
                    a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' +
                    a[8] + ', ' + a[9] + ', ' + a[10] + ', ' + a[11] + ', ' +
                    a[12] + ', ' + a[13] + ', ' + a[14] + ', ' + a[15] + ')';
};

/**
 * Returns Frobenius norm of a mat4
 *
 * @param {mat4} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */
mat4.frob = function (a) {
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2) + Math.pow(a[9], 2) + Math.pow(a[10], 2) + Math.pow(a[11], 2) + Math.pow(a[12], 2) + Math.pow(a[13], 2) + Math.pow(a[14], 2) + Math.pow(a[15], 2) ))
};

/**
 * Adds two mat4's
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */
mat4.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    out[4] = a[4] + b[4];
    out[5] = a[5] + b[5];
    out[6] = a[6] + b[6];
    out[7] = a[7] + b[7];
    out[8] = a[8] + b[8];
    out[9] = a[9] + b[9];
    out[10] = a[10] + b[10];
    out[11] = a[11] + b[11];
    out[12] = a[12] + b[12];
    out[13] = a[13] + b[13];
    out[14] = a[14] + b[14];
    out[15] = a[15] + b[15];
    return out;
};

/**
 * Subtracts matrix b from matrix a
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */
mat4.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    out[4] = a[4] - b[4];
    out[5] = a[5] - b[5];
    out[6] = a[6] - b[6];
    out[7] = a[7] - b[7];
    out[8] = a[8] - b[8];
    out[9] = a[9] - b[9];
    out[10] = a[10] - b[10];
    out[11] = a[11] - b[11];
    out[12] = a[12] - b[12];
    out[13] = a[13] - b[13];
    out[14] = a[14] - b[14];
    out[15] = a[15] - b[15];
    return out;
};

/**
 * Alias for {@link mat4.subtract}
 * @function
 */
mat4.sub = mat4.subtract;

/**
 * Multiply each element of the matrix by a scalar.
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to scale
 * @param {Number} b amount to scale the matrix's elements by
 * @returns {mat4} out
 */
mat4.multiplyScalar = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    out[4] = a[4] * b;
    out[5] = a[5] * b;
    out[6] = a[6] * b;
    out[7] = a[7] * b;
    out[8] = a[8] * b;
    out[9] = a[9] * b;
    out[10] = a[10] * b;
    out[11] = a[11] * b;
    out[12] = a[12] * b;
    out[13] = a[13] * b;
    out[14] = a[14] * b;
    out[15] = a[15] * b;
    return out;
};

/**
 * Adds two mat4's after multiplying each element of the second operand by a scalar value.
 *
 * @param {mat4} out the receiving vector
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @param {Number} scale the amount to scale b's elements by before adding
 * @returns {mat4} out
 */
mat4.multiplyScalarAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    out[2] = a[2] + (b[2] * scale);
    out[3] = a[3] + (b[3] * scale);
    out[4] = a[4] + (b[4] * scale);
    out[5] = a[5] + (b[5] * scale);
    out[6] = a[6] + (b[6] * scale);
    out[7] = a[7] + (b[7] * scale);
    out[8] = a[8] + (b[8] * scale);
    out[9] = a[9] + (b[9] * scale);
    out[10] = a[10] + (b[10] * scale);
    out[11] = a[11] + (b[11] * scale);
    out[12] = a[12] + (b[12] * scale);
    out[13] = a[13] + (b[13] * scale);
    out[14] = a[14] + (b[14] * scale);
    out[15] = a[15] + (b[15] * scale);
    return out;
};

/**
 * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
 *
 * @param {mat4} a The first matrix.
 * @param {mat4} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */
mat4.exactEquals = function (a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && 
           a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && 
           a[8] === b[8] && a[9] === b[9] && a[10] === b[10] && a[11] === b[11] &&
           a[12] === b[12] && a[13] === b[13] && a[14] === b[14] && a[15] === b[15];
};

/**
 * Returns whether or not the matrices have approximately the same elements in the same position.
 *
 * @param {mat4} a The first matrix.
 * @param {mat4} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */
mat4.equals = function (a, b) {
    var a0  = a[0],  a1  = a[1],  a2  = a[2],  a3  = a[3],
        a4  = a[4],  a5  = a[5],  a6  = a[6],  a7  = a[7], 
        a8  = a[8],  a9  = a[9],  a10 = a[10], a11 = a[11], 
        a12 = a[12], a13 = a[13], a14 = a[14], a15 = a[15];

    var b0  = b[0],  b1  = b[1],  b2  = b[2],  b3  = b[3],
        b4  = b[4],  b5  = b[5],  b6  = b[6],  b7  = b[7], 
        b8  = b[8],  b9  = b[9],  b10 = b[10], b11 = b[11], 
        b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];

    return (Math.abs(a0 - b0) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
            Math.abs(a1 - b1) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
            Math.abs(a2 - b2) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a2), Math.abs(b2)) &&
            Math.abs(a3 - b3) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a3), Math.abs(b3)) &&
            Math.abs(a4 - b4) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a4), Math.abs(b4)) &&
            Math.abs(a5 - b5) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a5), Math.abs(b5)) &&
            Math.abs(a6 - b6) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a6), Math.abs(b6)) &&
            Math.abs(a7 - b7) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a7), Math.abs(b7)) &&
            Math.abs(a8 - b8) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a8), Math.abs(b8)) &&
            Math.abs(a9 - b9) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a9), Math.abs(b9)) &&
            Math.abs(a10 - b10) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a10), Math.abs(b10)) &&
            Math.abs(a11 - b11) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a11), Math.abs(b11)) &&
            Math.abs(a12 - b12) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a12), Math.abs(b12)) &&
            Math.abs(a13 - b13) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a13), Math.abs(b13)) &&
            Math.abs(a14 - b14) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a14), Math.abs(b14)) &&
            Math.abs(a15 - b15) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a15), Math.abs(b15)));
};



module.exports = mat4;

}],["src/gl-matrix/quat.js","gl-matrix/src/gl-matrix","quat.js",{"./common.js":4,"./mat3.js":7,"./vec3.js":11,"./vec4.js":12},function (require, exports, module, __filename, __dirname){

// gl-matrix/src/gl-matrix/quat.js
// -------------------------------

/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. */

var glMatrix = require("./common.js");
var mat3 = require("./mat3.js");
var vec3 = require("./vec3.js");
var vec4 = require("./vec4.js");

/**
 * @class Quaternion
 * @name quat
 */
var quat = {};

/**
 * Creates a new identity quat
 *
 * @returns {quat} a new quaternion
 */
quat.create = function() {
    var out = new glMatrix.ARRAY_TYPE(4);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Sets a quaternion to represent the shortest rotation from one
 * vector to another.
 *
 * Both vectors are assumed to be unit length.
 *
 * @param {quat} out the receiving quaternion.
 * @param {vec3} a the initial vector
 * @param {vec3} b the destination vector
 * @returns {quat} out
 */
quat.rotationTo = (function() {
    var tmpvec3 = vec3.create();
    var xUnitVec3 = vec3.fromValues(1,0,0);
    var yUnitVec3 = vec3.fromValues(0,1,0);

    return function(out, a, b) {
        var dot = vec3.dot(a, b);
        if (dot < -0.999999) {
            vec3.cross(tmpvec3, xUnitVec3, a);
            if (vec3.length(tmpvec3) < 0.000001)
                vec3.cross(tmpvec3, yUnitVec3, a);
            vec3.normalize(tmpvec3, tmpvec3);
            quat.setAxisAngle(out, tmpvec3, Math.PI);
            return out;
        } else if (dot > 0.999999) {
            out[0] = 0;
            out[1] = 0;
            out[2] = 0;
            out[3] = 1;
            return out;
        } else {
            vec3.cross(tmpvec3, a, b);
            out[0] = tmpvec3[0];
            out[1] = tmpvec3[1];
            out[2] = tmpvec3[2];
            out[3] = 1 + dot;
            return quat.normalize(out, out);
        }
    };
})();

/**
 * Sets the specified quaternion with values corresponding to the given
 * axes. Each axis is a vec3 and is expected to be unit length and
 * perpendicular to all other specified axes.
 *
 * @param {vec3} view  the vector representing the viewing direction
 * @param {vec3} right the vector representing the local "right" direction
 * @param {vec3} up    the vector representing the local "up" direction
 * @returns {quat} out
 */
quat.setAxes = (function() {
    var matr = mat3.create();

    return function(out, view, right, up) {
        matr[0] = right[0];
        matr[3] = right[1];
        matr[6] = right[2];

        matr[1] = up[0];
        matr[4] = up[1];
        matr[7] = up[2];

        matr[2] = -view[0];
        matr[5] = -view[1];
        matr[8] = -view[2];

        return quat.normalize(out, quat.fromMat3(out, matr));
    };
})();

/**
 * Creates a new quat initialized with values from an existing quaternion
 *
 * @param {quat} a quaternion to clone
 * @returns {quat} a new quaternion
 * @function
 */
quat.clone = vec4.clone;

/**
 * Creates a new quat initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {quat} a new quaternion
 * @function
 */
quat.fromValues = vec4.fromValues;

/**
 * Copy the values from one quat to another
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the source quaternion
 * @returns {quat} out
 * @function
 */
quat.copy = vec4.copy;

/**
 * Set the components of a quat to the given values
 *
 * @param {quat} out the receiving quaternion
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {quat} out
 * @function
 */
quat.set = vec4.set;

/**
 * Set a quat to the identity quaternion
 *
 * @param {quat} out the receiving quaternion
 * @returns {quat} out
 */
quat.identity = function(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Sets a quat from the given angle and rotation axis,
 * then returns it.
 *
 * @param {quat} out the receiving quaternion
 * @param {vec3} axis the axis around which to rotate
 * @param {Number} rad the angle in radians
 * @returns {quat} out
 **/
quat.setAxisAngle = function(out, axis, rad) {
    rad = rad * 0.5;
    var s = Math.sin(rad);
    out[0] = s * axis[0];
    out[1] = s * axis[1];
    out[2] = s * axis[2];
    out[3] = Math.cos(rad);
    return out;
};

/**
 * Gets the rotation axis and angle for a given
 *  quaternion. If a quaternion is created with
 *  setAxisAngle, this method will return the same
 *  values as providied in the original parameter list
 *  OR functionally equivalent values.
 * Example: The quaternion formed by axis [0, 0, 1] and
 *  angle -90 is the same as the quaternion formed by
 *  [0, 0, 1] and 270. This method favors the latter.
 * @param  {vec3} out_axis  Vector receiving the axis of rotation
 * @param  {quat} q     Quaternion to be decomposed
 * @return {Number}     Angle, in radians, of the rotation
 */
quat.getAxisAngle = function(out_axis, q) {
    var rad = Math.acos(q[3]) * 2.0;
    var s = Math.sin(rad / 2.0);
    if (s != 0.0) {
        out_axis[0] = q[0] / s;
        out_axis[1] = q[1] / s;
        out_axis[2] = q[2] / s;
    } else {
        // If s is zero, return any axis (no rotation - axis does not matter)
        out_axis[0] = 1;
        out_axis[1] = 0;
        out_axis[2] = 0;
    }
    return rad;
};

/**
 * Adds two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @returns {quat} out
 * @function
 */
quat.add = vec4.add;

/**
 * Multiplies two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @returns {quat} out
 */
quat.multiply = function(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = b[0], by = b[1], bz = b[2], bw = b[3];

    out[0] = ax * bw + aw * bx + ay * bz - az * by;
    out[1] = ay * bw + aw * by + az * bx - ax * bz;
    out[2] = az * bw + aw * bz + ax * by - ay * bx;
    out[3] = aw * bw - ax * bx - ay * by - az * bz;
    return out;
};

/**
 * Alias for {@link quat.multiply}
 * @function
 */
quat.mul = quat.multiply;

/**
 * Scales a quat by a scalar number
 *
 * @param {quat} out the receiving vector
 * @param {quat} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {quat} out
 * @function
 */
quat.scale = vec4.scale;

/**
 * Rotates a quaternion by the given angle about the X axis
 *
 * @param {quat} out quat receiving operation result
 * @param {quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */
quat.rotateX = function (out, a, rad) {
    rad *= 0.5; 

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw + aw * bx;
    out[1] = ay * bw + az * bx;
    out[2] = az * bw - ay * bx;
    out[3] = aw * bw - ax * bx;
    return out;
};

/**
 * Rotates a quaternion by the given angle about the Y axis
 *
 * @param {quat} out quat receiving operation result
 * @param {quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */
quat.rotateY = function (out, a, rad) {
    rad *= 0.5; 

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        by = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw - az * by;
    out[1] = ay * bw + aw * by;
    out[2] = az * bw + ax * by;
    out[3] = aw * bw - ay * by;
    return out;
};

/**
 * Rotates a quaternion by the given angle about the Z axis
 *
 * @param {quat} out quat receiving operation result
 * @param {quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */
quat.rotateZ = function (out, a, rad) {
    rad *= 0.5; 

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bz = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw + ay * bz;
    out[1] = ay * bw - ax * bz;
    out[2] = az * bw + aw * bz;
    out[3] = aw * bw - az * bz;
    return out;
};

/**
 * Calculates the W component of a quat from the X, Y, and Z components.
 * Assumes that quaternion is 1 unit in length.
 * Any existing W component will be ignored.
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate W component of
 * @returns {quat} out
 */
quat.calculateW = function (out, a) {
    var x = a[0], y = a[1], z = a[2];

    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
    return out;
};

/**
 * Calculates the dot product of two quat's
 *
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @returns {Number} dot product of a and b
 * @function
 */
quat.dot = vec4.dot;

/**
 * Performs a linear interpolation between two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {quat} out
 * @function
 */
quat.lerp = vec4.lerp;

/**
 * Performs a spherical linear interpolation between two quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {quat} out
 */
quat.slerp = function (out, a, b, t) {
    // benchmarks:
    //    http://jsperf.com/quaternion-slerp-implementations

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = b[0], by = b[1], bz = b[2], bw = b[3];

    var        omega, cosom, sinom, scale0, scale1;

    // calc cosine
    cosom = ax * bx + ay * by + az * bz + aw * bw;
    // adjust signs (if necessary)
    if ( cosom < 0.0 ) {
        cosom = -cosom;
        bx = - bx;
        by = - by;
        bz = - bz;
        bw = - bw;
    }
    // calculate coefficients
    if ( (1.0 - cosom) > 0.000001 ) {
        // standard case (slerp)
        omega  = Math.acos(cosom);
        sinom  = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
    } else {        
        // "from" and "to" quaternions are very close 
        //  ... so we can do a linear interpolation
        scale0 = 1.0 - t;
        scale1 = t;
    }
    // calculate final values
    out[0] = scale0 * ax + scale1 * bx;
    out[1] = scale0 * ay + scale1 * by;
    out[2] = scale0 * az + scale1 * bz;
    out[3] = scale0 * aw + scale1 * bw;
    
    return out;
};

/**
 * Performs a spherical linear interpolation with two control points
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @param {quat} c the third operand
 * @param {quat} d the fourth operand
 * @param {Number} t interpolation amount
 * @returns {quat} out
 */
quat.sqlerp = (function () {
  var temp1 = quat.create();
  var temp2 = quat.create();
  
  return function (out, a, b, c, d, t) {
    quat.slerp(temp1, a, d, t);
    quat.slerp(temp2, b, c, t);
    quat.slerp(out, temp1, temp2, 2 * t * (1 - t));
    
    return out;
  };
}());

/**
 * Calculates the inverse of a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate inverse of
 * @returns {quat} out
 */
quat.invert = function(out, a) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
        dot = a0*a0 + a1*a1 + a2*a2 + a3*a3,
        invDot = dot ? 1.0/dot : 0;
    
    // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

    out[0] = -a0*invDot;
    out[1] = -a1*invDot;
    out[2] = -a2*invDot;
    out[3] = a3*invDot;
    return out;
};

/**
 * Calculates the conjugate of a quat
 * If the quaternion is normalized, this function is faster than quat.inverse and produces the same result.
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate conjugate of
 * @returns {quat} out
 */
quat.conjugate = function (out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = a[3];
    return out;
};

/**
 * Calculates the length of a quat
 *
 * @param {quat} a vector to calculate length of
 * @returns {Number} length of a
 * @function
 */
quat.length = vec4.length;

/**
 * Alias for {@link quat.length}
 * @function
 */
quat.len = quat.length;

/**
 * Calculates the squared length of a quat
 *
 * @param {quat} a vector to calculate squared length of
 * @returns {Number} squared length of a
 * @function
 */
quat.squaredLength = vec4.squaredLength;

/**
 * Alias for {@link quat.squaredLength}
 * @function
 */
quat.sqrLen = quat.squaredLength;

/**
 * Normalize a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quaternion to normalize
 * @returns {quat} out
 * @function
 */
quat.normalize = vec4.normalize;

/**
 * Creates a quaternion from the given 3x3 rotation matrix.
 *
 * NOTE: The resultant quaternion is not normalized, so you should be sure
 * to renormalize the quaternion yourself where necessary.
 *
 * @param {quat} out the receiving quaternion
 * @param {mat3} m rotation matrix
 * @returns {quat} out
 * @function
 */
quat.fromMat3 = function(out, m) {
    // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
    // article "Quaternion Calculus and Fast Animation".
    var fTrace = m[0] + m[4] + m[8];
    var fRoot;

    if ( fTrace > 0.0 ) {
        // |w| > 1/2, may as well choose w > 1/2
        fRoot = Math.sqrt(fTrace + 1.0);  // 2w
        out[3] = 0.5 * fRoot;
        fRoot = 0.5/fRoot;  // 1/(4w)
        out[0] = (m[5]-m[7])*fRoot;
        out[1] = (m[6]-m[2])*fRoot;
        out[2] = (m[1]-m[3])*fRoot;
    } else {
        // |w| <= 1/2
        var i = 0;
        if ( m[4] > m[0] )
          i = 1;
        if ( m[8] > m[i*3+i] )
          i = 2;
        var j = (i+1)%3;
        var k = (i+2)%3;
        
        fRoot = Math.sqrt(m[i*3+i]-m[j*3+j]-m[k*3+k] + 1.0);
        out[i] = 0.5 * fRoot;
        fRoot = 0.5 / fRoot;
        out[3] = (m[j*3+k] - m[k*3+j]) * fRoot;
        out[j] = (m[j*3+i] + m[i*3+j]) * fRoot;
        out[k] = (m[k*3+i] + m[i*3+k]) * fRoot;
    }
    
    return out;
};

/**
 * Returns a string representation of a quatenion
 *
 * @param {quat} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
quat.str = function (a) {
    return 'quat(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};

/**
 * Returns whether or not the quaternions have exactly the same elements in the same position (when compared with ===)
 *
 * @param {quat} a The first quaternion.
 * @param {quat} b The second quaternion.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */
quat.exactEquals = vec4.exactEquals;

/**
 * Returns whether or not the quaternions have approximately the same elements in the same position.
 *
 * @param {quat} a The first vector.
 * @param {quat} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */
quat.equals = vec4.equals;

module.exports = quat;

}],["src/gl-matrix/vec2.js","gl-matrix/src/gl-matrix","vec2.js",{"./common.js":4},function (require, exports, module, __filename, __dirname){

// gl-matrix/src/gl-matrix/vec2.js
// -------------------------------

/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. */

var glMatrix = require("./common.js");

/**
 * @class 2 Dimensional Vector
 * @name vec2
 */
var vec2 = {};

/**
 * Creates a new, empty vec2
 *
 * @returns {vec2} a new 2D vector
 */
vec2.create = function() {
    var out = new glMatrix.ARRAY_TYPE(2);
    out[0] = 0;
    out[1] = 0;
    return out;
};

/**
 * Creates a new vec2 initialized with values from an existing vector
 *
 * @param {vec2} a vector to clone
 * @returns {vec2} a new 2D vector
 */
vec2.clone = function(a) {
    var out = new glMatrix.ARRAY_TYPE(2);
    out[0] = a[0];
    out[1] = a[1];
    return out;
};

/**
 * Creates a new vec2 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} a new 2D vector
 */
vec2.fromValues = function(x, y) {
    var out = new glMatrix.ARRAY_TYPE(2);
    out[0] = x;
    out[1] = y;
    return out;
};

/**
 * Copy the values from one vec2 to another
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the source vector
 * @returns {vec2} out
 */
vec2.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    return out;
};

/**
 * Set the components of a vec2 to the given values
 *
 * @param {vec2} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} out
 */
vec2.set = function(out, x, y) {
    out[0] = x;
    out[1] = y;
    return out;
};

/**
 * Adds two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    return out;
};

/**
 * Subtracts vector b from vector a
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    return out;
};

/**
 * Alias for {@link vec2.subtract}
 * @function
 */
vec2.sub = vec2.subtract;

/**
 * Multiplies two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.multiply = function(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    return out;
};

/**
 * Alias for {@link vec2.multiply}
 * @function
 */
vec2.mul = vec2.multiply;

/**
 * Divides two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.divide = function(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    return out;
};

/**
 * Alias for {@link vec2.divide}
 * @function
 */
vec2.div = vec2.divide;

/**
 * Math.ceil the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to ceil
 * @returns {vec2} out
 */
vec2.ceil = function (out, a) {
    out[0] = Math.ceil(a[0]);
    out[1] = Math.ceil(a[1]);
    return out;
};

/**
 * Math.floor the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to floor
 * @returns {vec2} out
 */
vec2.floor = function (out, a) {
    out[0] = Math.floor(a[0]);
    out[1] = Math.floor(a[1]);
    return out;
};

/**
 * Returns the minimum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.min = function(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    return out;
};

/**
 * Returns the maximum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.max = function(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    return out;
};

/**
 * Math.round the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to round
 * @returns {vec2} out
 */
vec2.round = function (out, a) {
    out[0] = Math.round(a[0]);
    out[1] = Math.round(a[1]);
    return out;
};

/**
 * Scales a vec2 by a scalar number
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec2} out
 */
vec2.scale = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    return out;
};

/**
 * Adds two vec2's after scaling the second operand by a scalar value
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec2} out
 */
vec2.scaleAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    return out;
};

/**
 * Calculates the euclidian distance between two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} distance between a and b
 */
vec2.distance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1];
    return Math.sqrt(x*x + y*y);
};

/**
 * Alias for {@link vec2.distance}
 * @function
 */
vec2.dist = vec2.distance;

/**
 * Calculates the squared euclidian distance between two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} squared distance between a and b
 */
vec2.squaredDistance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1];
    return x*x + y*y;
};

/**
 * Alias for {@link vec2.squaredDistance}
 * @function
 */
vec2.sqrDist = vec2.squaredDistance;

/**
 * Calculates the length of a vec2
 *
 * @param {vec2} a vector to calculate length of
 * @returns {Number} length of a
 */
vec2.length = function (a) {
    var x = a[0],
        y = a[1];
    return Math.sqrt(x*x + y*y);
};

/**
 * Alias for {@link vec2.length}
 * @function
 */
vec2.len = vec2.length;

/**
 * Calculates the squared length of a vec2
 *
 * @param {vec2} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
vec2.squaredLength = function (a) {
    var x = a[0],
        y = a[1];
    return x*x + y*y;
};

/**
 * Alias for {@link vec2.squaredLength}
 * @function
 */
vec2.sqrLen = vec2.squaredLength;

/**
 * Negates the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to negate
 * @returns {vec2} out
 */
vec2.negate = function(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    return out;
};

/**
 * Returns the inverse of the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to invert
 * @returns {vec2} out
 */
vec2.inverse = function(out, a) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  return out;
};

/**
 * Normalize a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to normalize
 * @returns {vec2} out
 */
vec2.normalize = function(out, a) {
    var x = a[0],
        y = a[1];
    var len = x*x + y*y;
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len);
        out[0] = a[0] * len;
        out[1] = a[1] * len;
    }
    return out;
};

/**
 * Calculates the dot product of two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} dot product of a and b
 */
vec2.dot = function (a, b) {
    return a[0] * b[0] + a[1] * b[1];
};

/**
 * Computes the cross product of two vec2's
 * Note that the cross product must by definition produce a 3D vector
 *
 * @param {vec3} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec3} out
 */
vec2.cross = function(out, a, b) {
    var z = a[0] * b[1] - a[1] * b[0];
    out[0] = out[1] = 0;
    out[2] = z;
    return out;
};

/**
 * Performs a linear interpolation between two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec2} out
 */
vec2.lerp = function (out, a, b, t) {
    var ax = a[0],
        ay = a[1];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    return out;
};

/**
 * Generates a random vector with the given scale
 *
 * @param {vec2} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec2} out
 */
vec2.random = function (out, scale) {
    scale = scale || 1.0;
    var r = glMatrix.RANDOM() * 2.0 * Math.PI;
    out[0] = Math.cos(r) * scale;
    out[1] = Math.sin(r) * scale;
    return out;
};

/**
 * Transforms the vec2 with a mat2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat2} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat2 = function(out, a, m) {
    var x = a[0],
        y = a[1];
    out[0] = m[0] * x + m[2] * y;
    out[1] = m[1] * x + m[3] * y;
    return out;
};

/**
 * Transforms the vec2 with a mat2d
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat2d} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat2d = function(out, a, m) {
    var x = a[0],
        y = a[1];
    out[0] = m[0] * x + m[2] * y + m[4];
    out[1] = m[1] * x + m[3] * y + m[5];
    return out;
};

/**
 * Transforms the vec2 with a mat3
 * 3rd vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat3} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat3 = function(out, a, m) {
    var x = a[0],
        y = a[1];
    out[0] = m[0] * x + m[3] * y + m[6];
    out[1] = m[1] * x + m[4] * y + m[7];
    return out;
};

/**
 * Transforms the vec2 with a mat4
 * 3rd vector component is implicitly '0'
 * 4th vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat4 = function(out, a, m) {
    var x = a[0], 
        y = a[1];
    out[0] = m[0] * x + m[4] * y + m[12];
    out[1] = m[1] * x + m[5] * y + m[13];
    return out;
};

/**
 * Perform some operation over an array of vec2s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
vec2.forEach = (function() {
    var vec = vec2.create();

    return function(a, stride, offset, count, fn, arg) {
        var i, l;
        if(!stride) {
            stride = 2;
        }

        if(!offset) {
            offset = 0;
        }
        
        if(count) {
            l = Math.min((count * stride) + offset, a.length);
        } else {
            l = a.length;
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i]; vec[1] = a[i+1];
            fn(vec, vec, arg);
            a[i] = vec[0]; a[i+1] = vec[1];
        }
        
        return a;
    };
})();

/**
 * Returns a string representation of a vector
 *
 * @param {vec2} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
vec2.str = function (a) {
    return 'vec2(' + a[0] + ', ' + a[1] + ')';
};

/**
 * Returns whether or not the vectors exactly have the same elements in the same position (when compared with ===)
 *
 * @param {vec2} a The first vector.
 * @param {vec2} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */
vec2.exactEquals = function (a, b) {
    return a[0] === b[0] && a[1] === b[1];
};

/**
 * Returns whether or not the vectors have approximately the same elements in the same position.
 *
 * @param {vec2} a The first vector.
 * @param {vec2} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */
vec2.equals = function (a, b) {
    var a0 = a[0], a1 = a[1];
    var b0 = b[0], b1 = b[1];
    return (Math.abs(a0 - b0) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
            Math.abs(a1 - b1) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a1), Math.abs(b1)));
};

module.exports = vec2;

}],["src/gl-matrix/vec3.js","gl-matrix/src/gl-matrix","vec3.js",{"./common.js":4},function (require, exports, module, __filename, __dirname){

// gl-matrix/src/gl-matrix/vec3.js
// -------------------------------

/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. */

var glMatrix = require("./common.js");

/**
 * @class 3 Dimensional Vector
 * @name vec3
 */
var vec3 = {};

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */
vec3.create = function() {
    var out = new glMatrix.ARRAY_TYPE(3);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return out;
};

/**
 * Creates a new vec3 initialized with values from an existing vector
 *
 * @param {vec3} a vector to clone
 * @returns {vec3} a new 3D vector
 */
vec3.clone = function(a) {
    var out = new glMatrix.ARRAY_TYPE(3);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
};

/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */
vec3.fromValues = function(x, y, z) {
    var out = new glMatrix.ARRAY_TYPE(3);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
};

/**
 * Copy the values from one vec3 to another
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the source vector
 * @returns {vec3} out
 */
vec3.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
};

/**
 * Set the components of a vec3 to the given values
 *
 * @param {vec3} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} out
 */
vec3.set = function(out, x, y, z) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
};

/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
};

/**
 * Subtracts vector b from vector a
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
};

/**
 * Alias for {@link vec3.subtract}
 * @function
 */
vec3.sub = vec3.subtract;

/**
 * Multiplies two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.multiply = function(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    return out;
};

/**
 * Alias for {@link vec3.multiply}
 * @function
 */
vec3.mul = vec3.multiply;

/**
 * Divides two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.divide = function(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    return out;
};

/**
 * Alias for {@link vec3.divide}
 * @function
 */
vec3.div = vec3.divide;

/**
 * Math.ceil the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to ceil
 * @returns {vec3} out
 */
vec3.ceil = function (out, a) {
    out[0] = Math.ceil(a[0]);
    out[1] = Math.ceil(a[1]);
    out[2] = Math.ceil(a[2]);
    return out;
};

/**
 * Math.floor the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to floor
 * @returns {vec3} out
 */
vec3.floor = function (out, a) {
    out[0] = Math.floor(a[0]);
    out[1] = Math.floor(a[1]);
    out[2] = Math.floor(a[2]);
    return out;
};

/**
 * Returns the minimum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.min = function(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    return out;
};

/**
 * Returns the maximum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.max = function(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    return out;
};

/**
 * Math.round the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to round
 * @returns {vec3} out
 */
vec3.round = function (out, a) {
    out[0] = Math.round(a[0]);
    out[1] = Math.round(a[1]);
    out[2] = Math.round(a[2]);
    return out;
};

/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */
vec3.scale = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    return out;
};

/**
 * Adds two vec3's after scaling the second operand by a scalar value
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec3} out
 */
vec3.scaleAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    out[2] = a[2] + (b[2] * scale);
    return out;
};

/**
 * Calculates the euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} distance between a and b
 */
vec3.distance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2];
    return Math.sqrt(x*x + y*y + z*z);
};

/**
 * Alias for {@link vec3.distance}
 * @function
 */
vec3.dist = vec3.distance;

/**
 * Calculates the squared euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} squared distance between a and b
 */
vec3.squaredDistance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2];
    return x*x + y*y + z*z;
};

/**
 * Alias for {@link vec3.squaredDistance}
 * @function
 */
vec3.sqrDist = vec3.squaredDistance;

/**
 * Calculates the length of a vec3
 *
 * @param {vec3} a vector to calculate length of
 * @returns {Number} length of a
 */
vec3.length = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2];
    return Math.sqrt(x*x + y*y + z*z);
};

/**
 * Alias for {@link vec3.length}
 * @function
 */
vec3.len = vec3.length;

/**
 * Calculates the squared length of a vec3
 *
 * @param {vec3} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
vec3.squaredLength = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2];
    return x*x + y*y + z*z;
};

/**
 * Alias for {@link vec3.squaredLength}
 * @function
 */
vec3.sqrLen = vec3.squaredLength;

/**
 * Negates the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to negate
 * @returns {vec3} out
 */
vec3.negate = function(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    return out;
};

/**
 * Returns the inverse of the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to invert
 * @returns {vec3} out
 */
vec3.inverse = function(out, a) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  out[2] = 1.0 / a[2];
  return out;
};

/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to normalize
 * @returns {vec3} out
 */
vec3.normalize = function(out, a) {
    var x = a[0],
        y = a[1],
        z = a[2];
    var len = x*x + y*y + z*z;
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len);
        out[0] = a[0] * len;
        out[1] = a[1] * len;
        out[2] = a[2] * len;
    }
    return out;
};

/**
 * Calculates the dot product of two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} dot product of a and b
 */
vec3.dot = function (a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
};

/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.cross = function(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2],
        bx = b[0], by = b[1], bz = b[2];

    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;
    return out;
};

/**
 * Performs a linear interpolation between two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec3} out
 */
vec3.lerp = function (out, a, b, t) {
    var ax = a[0],
        ay = a[1],
        az = a[2];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    return out;
};

/**
 * Performs a hermite interpolation with two control points
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {vec3} c the third operand
 * @param {vec3} d the fourth operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec3} out
 */
vec3.hermite = function (out, a, b, c, d, t) {
  var factorTimes2 = t * t,
      factor1 = factorTimes2 * (2 * t - 3) + 1,
      factor2 = factorTimes2 * (t - 2) + t,
      factor3 = factorTimes2 * (t - 1),
      factor4 = factorTimes2 * (3 - 2 * t);
  
  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
  
  return out;
};

/**
 * Performs a bezier interpolation with two control points
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {vec3} c the third operand
 * @param {vec3} d the fourth operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec3} out
 */
vec3.bezier = function (out, a, b, c, d, t) {
  var inverseFactor = 1 - t,
      inverseFactorTimesTwo = inverseFactor * inverseFactor,
      factorTimes2 = t * t,
      factor1 = inverseFactorTimesTwo * inverseFactor,
      factor2 = 3 * t * inverseFactorTimesTwo,
      factor3 = 3 * factorTimes2 * inverseFactor,
      factor4 = factorTimes2 * t;
  
  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
  
  return out;
};

/**
 * Generates a random vector with the given scale
 *
 * @param {vec3} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec3} out
 */
vec3.random = function (out, scale) {
    scale = scale || 1.0;

    var r = glMatrix.RANDOM() * 2.0 * Math.PI;
    var z = (glMatrix.RANDOM() * 2.0) - 1.0;
    var zScale = Math.sqrt(1.0-z*z) * scale;

    out[0] = Math.cos(r) * zScale;
    out[1] = Math.sin(r) * zScale;
    out[2] = z * scale;
    return out;
};

/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec3} out
 */
vec3.transformMat4 = function(out, a, m) {
    var x = a[0], y = a[1], z = a[2],
        w = m[3] * x + m[7] * y + m[11] * z + m[15];
    w = w || 1.0;
    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
    return out;
};

/**
 * Transforms the vec3 with a mat3.
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m the 3x3 matrix to transform with
 * @returns {vec3} out
 */
vec3.transformMat3 = function(out, a, m) {
    var x = a[0], y = a[1], z = a[2];
    out[0] = x * m[0] + y * m[3] + z * m[6];
    out[1] = x * m[1] + y * m[4] + z * m[7];
    out[2] = x * m[2] + y * m[5] + z * m[8];
    return out;
};

/**
 * Transforms the vec3 with a quat
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {quat} q quaternion to transform with
 * @returns {vec3} out
 */
vec3.transformQuat = function(out, a, q) {
    // benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations

    var x = a[0], y = a[1], z = a[2],
        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z;

    // calculate result * inverse quat
    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return out;
};

/**
 * Rotate a 3D vector around the x-axis
 * @param {vec3} out The receiving vec3
 * @param {vec3} a The vec3 point to rotate
 * @param {vec3} b The origin of the rotation
 * @param {Number} c The angle of rotation
 * @returns {vec3} out
 */
vec3.rotateX = function(out, a, b, c){
   var p = [], r=[];
	  //Translate point to the origin
	  p[0] = a[0] - b[0];
	  p[1] = a[1] - b[1];
  	p[2] = a[2] - b[2];

	  //perform rotation
	  r[0] = p[0];
	  r[1] = p[1]*Math.cos(c) - p[2]*Math.sin(c);
	  r[2] = p[1]*Math.sin(c) + p[2]*Math.cos(c);

	  //translate to correct position
	  out[0] = r[0] + b[0];
	  out[1] = r[1] + b[1];
	  out[2] = r[2] + b[2];

  	return out;
};

/**
 * Rotate a 3D vector around the y-axis
 * @param {vec3} out The receiving vec3
 * @param {vec3} a The vec3 point to rotate
 * @param {vec3} b The origin of the rotation
 * @param {Number} c The angle of rotation
 * @returns {vec3} out
 */
vec3.rotateY = function(out, a, b, c){
  	var p = [], r=[];
  	//Translate point to the origin
  	p[0] = a[0] - b[0];
  	p[1] = a[1] - b[1];
  	p[2] = a[2] - b[2];
  
  	//perform rotation
  	r[0] = p[2]*Math.sin(c) + p[0]*Math.cos(c);
  	r[1] = p[1];
  	r[2] = p[2]*Math.cos(c) - p[0]*Math.sin(c);
  
  	//translate to correct position
  	out[0] = r[0] + b[0];
  	out[1] = r[1] + b[1];
  	out[2] = r[2] + b[2];
  
  	return out;
};

/**
 * Rotate a 3D vector around the z-axis
 * @param {vec3} out The receiving vec3
 * @param {vec3} a The vec3 point to rotate
 * @param {vec3} b The origin of the rotation
 * @param {Number} c The angle of rotation
 * @returns {vec3} out
 */
vec3.rotateZ = function(out, a, b, c){
  	var p = [], r=[];
  	//Translate point to the origin
  	p[0] = a[0] - b[0];
  	p[1] = a[1] - b[1];
  	p[2] = a[2] - b[2];
  
  	//perform rotation
  	r[0] = p[0]*Math.cos(c) - p[1]*Math.sin(c);
  	r[1] = p[0]*Math.sin(c) + p[1]*Math.cos(c);
  	r[2] = p[2];
  
  	//translate to correct position
  	out[0] = r[0] + b[0];
  	out[1] = r[1] + b[1];
  	out[2] = r[2] + b[2];
  
  	return out;
};

/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
vec3.forEach = (function() {
    var vec = vec3.create();

    return function(a, stride, offset, count, fn, arg) {
        var i, l;
        if(!stride) {
            stride = 3;
        }

        if(!offset) {
            offset = 0;
        }
        
        if(count) {
            l = Math.min((count * stride) + offset, a.length);
        } else {
            l = a.length;
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2];
            fn(vec, vec, arg);
            a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2];
        }
        
        return a;
    };
})();

/**
 * Get the angle between two 3D vectors
 * @param {vec3} a The first operand
 * @param {vec3} b The second operand
 * @returns {Number} The angle in radians
 */
vec3.angle = function(a, b) {
   
    var tempA = vec3.fromValues(a[0], a[1], a[2]);
    var tempB = vec3.fromValues(b[0], b[1], b[2]);
 
    vec3.normalize(tempA, tempA);
    vec3.normalize(tempB, tempB);
 
    var cosine = vec3.dot(tempA, tempB);

    if(cosine > 1.0){
        return 0;
    } else {
        return Math.acos(cosine);
    }     
};

/**
 * Returns a string representation of a vector
 *
 * @param {vec3} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
vec3.str = function (a) {
    return 'vec3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ')';
};

/**
 * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
 *
 * @param {vec3} a The first vector.
 * @param {vec3} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */
vec3.exactEquals = function (a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
};

/**
 * Returns whether or not the vectors have approximately the same elements in the same position.
 *
 * @param {vec3} a The first vector.
 * @param {vec3} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */
vec3.equals = function (a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2];
    var b0 = b[0], b1 = b[1], b2 = b[2];
    return (Math.abs(a0 - b0) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
            Math.abs(a1 - b1) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
            Math.abs(a2 - b2) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a2), Math.abs(b2)));
};

module.exports = vec3;

}],["src/gl-matrix/vec4.js","gl-matrix/src/gl-matrix","vec4.js",{"./common.js":4},function (require, exports, module, __filename, __dirname){

// gl-matrix/src/gl-matrix/vec4.js
// -------------------------------

/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. */

var glMatrix = require("./common.js");

/**
 * @class 4 Dimensional Vector
 * @name vec4
 */
var vec4 = {};

/**
 * Creates a new, empty vec4
 *
 * @returns {vec4} a new 4D vector
 */
vec4.create = function() {
    var out = new glMatrix.ARRAY_TYPE(4);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    return out;
};

/**
 * Creates a new vec4 initialized with values from an existing vector
 *
 * @param {vec4} a vector to clone
 * @returns {vec4} a new 4D vector
 */
vec4.clone = function(a) {
    var out = new glMatrix.ARRAY_TYPE(4);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Creates a new vec4 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} a new 4D vector
 */
vec4.fromValues = function(x, y, z, w) {
    var out = new glMatrix.ARRAY_TYPE(4);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
};

/**
 * Copy the values from one vec4 to another
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the source vector
 * @returns {vec4} out
 */
vec4.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Set the components of a vec4 to the given values
 *
 * @param {vec4} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} out
 */
vec4.set = function(out, x, y, z, w) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
};

/**
 * Adds two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    return out;
};

/**
 * Subtracts vector b from vector a
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    return out;
};

/**
 * Alias for {@link vec4.subtract}
 * @function
 */
vec4.sub = vec4.subtract;

/**
 * Multiplies two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.multiply = function(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    out[3] = a[3] * b[3];
    return out;
};

/**
 * Alias for {@link vec4.multiply}
 * @function
 */
vec4.mul = vec4.multiply;

/**
 * Divides two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.divide = function(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    out[3] = a[3] / b[3];
    return out;
};

/**
 * Alias for {@link vec4.divide}
 * @function
 */
vec4.div = vec4.divide;

/**
 * Math.ceil the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to ceil
 * @returns {vec4} out
 */
vec4.ceil = function (out, a) {
    out[0] = Math.ceil(a[0]);
    out[1] = Math.ceil(a[1]);
    out[2] = Math.ceil(a[2]);
    out[3] = Math.ceil(a[3]);
    return out;
};

/**
 * Math.floor the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to floor
 * @returns {vec4} out
 */
vec4.floor = function (out, a) {
    out[0] = Math.floor(a[0]);
    out[1] = Math.floor(a[1]);
    out[2] = Math.floor(a[2]);
    out[3] = Math.floor(a[3]);
    return out;
};

/**
 * Returns the minimum of two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.min = function(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    out[3] = Math.min(a[3], b[3]);
    return out;
};

/**
 * Returns the maximum of two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.max = function(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    out[3] = Math.max(a[3], b[3]);
    return out;
};

/**
 * Math.round the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to round
 * @returns {vec4} out
 */
vec4.round = function (out, a) {
    out[0] = Math.round(a[0]);
    out[1] = Math.round(a[1]);
    out[2] = Math.round(a[2]);
    out[3] = Math.round(a[3]);
    return out;
};

/**
 * Scales a vec4 by a scalar number
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec4} out
 */
vec4.scale = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    return out;
};

/**
 * Adds two vec4's after scaling the second operand by a scalar value
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec4} out
 */
vec4.scaleAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    out[2] = a[2] + (b[2] * scale);
    out[3] = a[3] + (b[3] * scale);
    return out;
};

/**
 * Calculates the euclidian distance between two vec4's
 *
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {Number} distance between a and b
 */
vec4.distance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2],
        w = b[3] - a[3];
    return Math.sqrt(x*x + y*y + z*z + w*w);
};

/**
 * Alias for {@link vec4.distance}
 * @function
 */
vec4.dist = vec4.distance;

/**
 * Calculates the squared euclidian distance between two vec4's
 *
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {Number} squared distance between a and b
 */
vec4.squaredDistance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2],
        w = b[3] - a[3];
    return x*x + y*y + z*z + w*w;
};

/**
 * Alias for {@link vec4.squaredDistance}
 * @function
 */
vec4.sqrDist = vec4.squaredDistance;

/**
 * Calculates the length of a vec4
 *
 * @param {vec4} a vector to calculate length of
 * @returns {Number} length of a
 */
vec4.length = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    return Math.sqrt(x*x + y*y + z*z + w*w);
};

/**
 * Alias for {@link vec4.length}
 * @function
 */
vec4.len = vec4.length;

/**
 * Calculates the squared length of a vec4
 *
 * @param {vec4} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
vec4.squaredLength = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    return x*x + y*y + z*z + w*w;
};

/**
 * Alias for {@link vec4.squaredLength}
 * @function
 */
vec4.sqrLen = vec4.squaredLength;

/**
 * Negates the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to negate
 * @returns {vec4} out
 */
vec4.negate = function(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = -a[3];
    return out;
};

/**
 * Returns the inverse of the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to invert
 * @returns {vec4} out
 */
vec4.inverse = function(out, a) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  out[2] = 1.0 / a[2];
  out[3] = 1.0 / a[3];
  return out;
};

/**
 * Normalize a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to normalize
 * @returns {vec4} out
 */
vec4.normalize = function(out, a) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    var len = x*x + y*y + z*z + w*w;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
        out[0] = x * len;
        out[1] = y * len;
        out[2] = z * len;
        out[3] = w * len;
    }
    return out;
};

/**
 * Calculates the dot product of two vec4's
 *
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {Number} dot product of a and b
 */
vec4.dot = function (a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
};

/**
 * Performs a linear interpolation between two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec4} out
 */
vec4.lerp = function (out, a, b, t) {
    var ax = a[0],
        ay = a[1],
        az = a[2],
        aw = a[3];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    out[3] = aw + t * (b[3] - aw);
    return out;
};

/**
 * Generates a random vector with the given scale
 *
 * @param {vec4} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec4} out
 */
vec4.random = function (out, scale) {
    scale = scale || 1.0;

    //TODO: This is a pretty awful way of doing this. Find something better.
    out[0] = glMatrix.RANDOM();
    out[1] = glMatrix.RANDOM();
    out[2] = glMatrix.RANDOM();
    out[3] = glMatrix.RANDOM();
    vec4.normalize(out, out);
    vec4.scale(out, out, scale);
    return out;
};

/**
 * Transforms the vec4 with a mat4.
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec4} out
 */
vec4.transformMat4 = function(out, a, m) {
    var x = a[0], y = a[1], z = a[2], w = a[3];
    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
    out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
    return out;
};

/**
 * Transforms the vec4 with a quat
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the vector to transform
 * @param {quat} q quaternion to transform with
 * @returns {vec4} out
 */
vec4.transformQuat = function(out, a, q) {
    var x = a[0], y = a[1], z = a[2],
        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z;

    // calculate result * inverse quat
    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    out[3] = a[3];
    return out;
};

/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
vec4.forEach = (function() {
    var vec = vec4.create();

    return function(a, stride, offset, count, fn, arg) {
        var i, l;
        if(!stride) {
            stride = 4;
        }

        if(!offset) {
            offset = 0;
        }
        
        if(count) {
            l = Math.min((count * stride) + offset, a.length);
        } else {
            l = a.length;
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2]; vec[3] = a[i+3];
            fn(vec, vec, arg);
            a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2]; a[i+3] = vec[3];
        }
        
        return a;
    };
})();

/**
 * Returns a string representation of a vector
 *
 * @param {vec4} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
vec4.str = function (a) {
    return 'vec4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};

/**
 * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
 *
 * @param {vec4} a The first vector.
 * @param {vec4} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */
vec4.exactEquals = function (a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
};

/**
 * Returns whether or not the vectors have approximately the same elements in the same position.
 *
 * @param {vec4} a The first vector.
 * @param {vec4} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */
vec4.equals = function (a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    return (Math.abs(a0 - b0) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
            Math.abs(a1 - b1) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
            Math.abs(a2 - b2) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a2), Math.abs(b2)) &&
            Math.abs(a3 - b3) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a3), Math.abs(b3)));
};

module.exports = vec4;

}],["window.js","global","window.js",{},function (require, exports, module, __filename, __dirname){

// global/window.js
// ----------------

if (typeof window !== "undefined") {
    module.exports = window;
} else if (typeof global !== "undefined") {
    module.exports = global;
} else if (typeof self !== "undefined"){
    module.exports = self;
} else {
    module.exports = {};
}

}],["document.js","gutentag","document.js",{"koerper":54},function (require, exports, module, __filename, __dirname){

// gutentag/document.js
// --------------------

"use strict";
module.exports = require("koerper");

}],["scope.js","gutentag","scope.js",{},function (require, exports, module, __filename, __dirname){

// gutentag/scope.js
// -----------------

"use strict";

module.exports = Scope;
function Scope() {
    this.root = this;
    this.components = Object.create(null);
    this.componentsFor = Object.create(null);
}

Scope.prototype.nest = function () {
    var child = Object.create(this);
    child.parent = this;
    child.caller = this.caller && this.caller.nest();
    return child;
};

Scope.prototype.nestComponents = function () {
    var child = this.nest();
    child.components = Object.create(this.components);
    child.componentsFor = Object.create(this.componentsFor);
    return child;
};

// TODO deprecated
Scope.prototype.set = function (id, component) {
    console.log(new Error().stack);
    this.hookup(id, component);
};

Scope.prototype.hookup = function (id, component) {
    var scope = this;
    scope.components[id] = component;

    if (scope.this.hookup) {
        scope.this.hookup(id, component, scope);
    } else if (scope.this.add) {
        // TODO deprecated
        scope.this.add(component, id, scope);
    }

    var exportId = scope.this.exports && scope.this.exports[id];
    if (exportId) {
        var callerId = scope.caller.id;
        scope.caller.hookup(callerId + ":" + exportId, component);
    }
};

}],["text.html","gutentag","text.html",{"./text":17},function (require, exports, module, __filename, __dirname){

// gutentag/text.html
// ------------------

"use strict";
module.exports = (require)("./text");

}],["text.js","gutentag","text.js",{},function (require, exports, module, __filename, __dirname){

// gutentag/text.js
// ----------------

"use strict";

module.exports = Text;
function Text(body, scope) {
    var node = body.ownerDocument.createTextNode("");
    body.appendChild(node);
    this.node = node;
    this.defaultText = scope.argument.innerText;
    this._value = null;
}

Object.defineProperty(Text.prototype, "value", {
    get: function () {
        return this._value;
    },
    set: function (value) {
        this._value = value;
        if (value == null) {
            this.node.data = this.defaultText;
        } else {
            this.node.data = "" + value;
        }
    }
});

}],["index.js","hashbind","index.js",{"rezult":58},function (require, exports, module, __filename, __dirname){

// hashbind/index.js
// -----------------

'use strict';

var Result = require('rezult');

module.exports = Hash;

Hash.decodeUnescape =
function decodeUnescape(str) {
    var keyvals = [];
    var parts = str.split('&');
    for (var i = 0; i < parts.length; i++) {
        var keystr = parts[i].split('=');
        var key = unescape(keystr[0]);
        var val = unescape(keystr[1]) || '';
        keyvals.push([key, val]);
    }
    return keyvals;
};

Hash.encodeMinEscape =
function encodeMinEscape(keyvals) {
    var parts = [];
    for (var i = 0; i < keyvals.length; i++) {
        var key = keyvals[i][0];
        var val = keyvals[i][1];
        var part = '' + minEscape(key);
        if (val !== undefined && val !== '') {
            part += '=' + minEscape(val);
        }

        parts.push(part);
    }
    return parts.join('&');
};

Hash.encodeMaxEscape =
function encodeMaxEscape(keyvals) {
    var parts = [];
    for (var i = 0; i < keyvals.length; i++) {
        var key = keyvals[i][0];
        var val = keyvals[i][1];
        var part = '' + escape(key);
        if (val !== undefined && val !== '') {
            part += '=' + escape(val);
        }
        parts.push(part);
    }
    return parts.join('&');
};

function Hash(window, options) {
    var self = this;
    if (!options) {
        options = {};
    }

    this.window = window;
    this.last = '';
    this.cache = {};
    this.values = {};
    this.bound = {};
    // TODO: do we ever need to escape?
    this.decode = options.decode || Hash.decodeUnescape;
    this.encode = options.encode || (options.escape
        ? Hash.encodeMaxEscape
        : Hash.encodeMinEscape);

    this.window.addEventListener('hashchange', onHashChange);
    this.load();

    function onHashChange(e) {
        self.load();
    }
}

Hash.prototype.load =
function load() {
    if (this.window.location.hash === this.last) {
        return;
    }

    this.last = this.window.location.hash;
    var keystrs = this.decode(this.last.slice(1));

    var seen = {};
    for (var i = 0; i < keystrs.length; i++) {
        var key = keystrs[i][0];
        var str = keystrs[i][1];
        if (this.cache[key] !== str) {
            this.cache[key] = str;
            if (this.bound[key]) {
                this.bound[key].onChange();
            } else {
                var res = parseValue(str);
                if (!res.err) {
                    // intentional ignore parse error; best-effort load
                    this.values[key] = res.value;
                }
            }
        }
        seen[key] = true;
    }
    this.prune(seen);
};

Hash.prototype.prune =
function prune(except) {
    if (!except) {
        except = {};
    }
    var cacheKeys = Object.keys(this.cache);
    for (var i = 0; i < cacheKeys.length; i++) {
        var key = cacheKeys[i];
        if (!except[key]) {
            if (this.bound[key]) {
                this.bound[key].reset();
            } else {
                delete this.cache[key];
                delete this.values[key];
            }
        }
    }
};

Hash.prototype.save =
function save() {
    var keystrs = [];
    var keys = Object.keys(this.cache);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (!this.bound[key]) {
            this.cache[key] = valueToString(this.values[key]);
        }
        var str = this.cache[key];
        keystrs.push([key, str]);
    }

    var hash = this.encode(keystrs);
    if (hash) {
        hash = '#' + hash;
    }
    this.window.location.hash = this.last = hash;
};

Hash.prototype.bind =
function bind(key) {
    if (this.bound[key]) {
        throw new Error('key already bound');
    }
    var bound = new HashKeyBinding(this, key);
    this.bound[key] = bound;
    return bound;
};

Hash.prototype.getStr =
function getStr(key) {
    return this.cache[key];
};

Hash.prototype.get =
function get(key) {
    return this.values[key];
};

Hash.prototype.set =
function set(key, val, callback) {
    var bound = this.bound[key] || this.bind(key);
    return bound.set(val, callback);
};

function HashKeyBinding(hash, key) {
    this.hash = hash;
    this.key = key;
    this.def = undefined;
    this.value = hash.values[key];
    this.parse = parseValue;
    this.valToString = valueToString;
    this.listener = null;
    this.listeners = [];
    this.notify = this.notifyNoop;
}

HashKeyBinding.prototype.load =
function load() {
    var str = this.hash.cache[this.key];
    if (str !== undefined) {
        var res = this.parse(str);
        if (res.err) {
            // intentional ignore parse error; best-effort load
            return this;
        }
        var val = res.value;
        if (this.value !== val) {
            this.value = val;
            this.hash.values[this.key] = this.value;
            this.notify();
        }
    }
    return this;
};

HashKeyBinding.prototype.save =
function save() {
    this.hash.values[this.key] = this.value;
    var str = this.valToString(this.value);
    if (this.hash.cache[this.key] !== str) {
        this.hash.cache[this.key] = str;
        this.hash.save();
    }
    return this;
};

HashKeyBinding.prototype.notifyNoop =
function notifyNoop() {
    return this;
};

HashKeyBinding.prototype.notifyOne =
function notifyOne() {
    this.listener(this.value);
    return this;
};

HashKeyBinding.prototype.notifyAll =
function notifyAll() {
    for (var i = 0; i < this.listeners.length; i++) {
        this.listeners[i].call(this, this.value);
    }
    return this;
};

HashKeyBinding.prototype.setParse =
function setParse(parse, toString) {
    this.parse = parse || parseValue;
    this.load();
    if (toString) {
        this.setToString(toString);
    }
    return this;
};

HashKeyBinding.prototype.setToString =
function setToString(toString) {
    this.valToString = toString;
    if (this.value !== undefined) {
        this.save();
    }
    return this;
};

HashKeyBinding.prototype.addListener =
function addListener(listener) {
    if (this.listeners.length) {
        this.listeners.push(listener);
    } else if (this.listener) {
        this.listeners = [this.listener, listener];
        this.listener = null;
        this.notify = this.notifyAll;
    } else {
        this.listener = listener;
        this.notify = this.notifyOne;
    }
    if (this.value !== undefined) {
        this.notify();
    }
    return this;
};

HashKeyBinding.prototype.setDefault =
function setDefault(def) {
    var value = null;
    if (typeof def === 'string') {
        value = this.parse(def).toValue();
    } else {
        value = def;
    }

    this.def = value;
    if (this.value === undefined) {
        this.value = this.def;
        this.save();
    }

    return this;
};

HashKeyBinding.prototype.onChange =
function onChange() {
    this.load();
};

HashKeyBinding.prototype.get =
function get() {
    return this.value;
};

HashKeyBinding.prototype.reset =
function reset() {
    if (this.value !== this.def) {
        this.value = this.def;
        this.save();
    }
    return this;
};

HashKeyBinding.prototype.set =
function set(val, callback) {
    var value = null;
    if (typeof val === 'string') {
        var res = this.parse(val);
        if (callback) {
            callback(res.err, val, res.value);
            if (res.err) {
                return undefined;
            }
            value = res.value;
        } else {
            value = res.toValue();
        }
    } else {
        value = val;
    }

    if (this.value !== value) {
        this.value = value;
        this.notify();
        this.save();
    }

    return this.value;
};

function valueToString(val) {
    if (val === false) {
        return undefined;
    }
    if (val === true) {
        return '';
    }
    return '' + val;
}

function parseValue(str) {
    if (str === '' || str === 'true') {
        return new Result(null, true);
    }
    if (str === 'false') {
        return new Result(null, false);
    }
    if (str === 'null') {
        return new Result(null, null);
    }
    return new Result(null, str);
}

function minEscape(str) {
    return str.replace(/[#=&]/g, escapeMatch);
}

function escapeMatch(part) {
    return escape(part);
}

}],["colorgen.js","hexant","colorgen.js",{"rezult":58,"husl":53},function (require, exports, module, __filename, __dirname){

// hexant/colorgen.js
// ------------------

'use strict';

var Result = require('rezult');
var husl = require('husl');

var gens = {};
gens.light = LightWheelGenerator;
gens.hue = HueWheelGenerator;

function parse(str) {
    var match = /^(\w+)(?:\((.*)\))?$/.exec(str);
    if (!match) {
        return Result.error(new Error('invalid color spec'));
    }

    var name = match[1];
    var gen = gens[name];
    if (!gen) {
        var choices = Object.keys(gens).sort().join(', ');
        return Result.error(new Error(
            'no such color scheme ' + JSON.stringify(name) +
            ', valid choices: ' + choices
        ));
    }

    var args = match[2] ? match[2].split(/, */) : [];
    return Result.lift(gen).apply(null, args);
}

function toString(gen) {
    return gen.genString || 'hue';
}

// TODO: husl too

/* roles:
 * 0: empty cells
 * 1: ant traced cells
 * 2: ant body
 * 3: ant head
 */

function LightWheelGenerator(hue, sat) {
    hue = parseInt(hue, 10) || 0;
    sat = parseInt(sat, 10) || 100;

    if (hue === 0) {
        hue = 360;
    }

    wheelGenGen.genString = 'light(' +
                            hue.toString() + ', ' +
                            sat.toString() + ')';
    return wheelGenGen;

    function wheelGenGen(intensity) {
        var h = hue * (1 + (intensity - 1) / 3) % 360;
        return function wheelGen(ncolors) {
            var step = 100 / (ncolors + 1);
            var r = [];
            var l = step;
            for (var i = 0; i < ncolors; l += step, i++) {
                r.push(husl.toRGB(h, sat, l));
            }
            return r;
        };
    }
}

function HueWheelGenerator(sat, light) {
    sat = parseInt(sat, 10) || 70;
    light = parseInt(light, 10) || 40;
    var satDelta = sat > 70 ? -10 : 10;
    var lightDelta = light > 70 ? -10 : 10;

    hueWheelGenGen.genString = 'hue(' + sat + ', ' + light + ')';
    return hueWheelGenGen;

    function hueWheelGenGen(intensity) {
        var mySat = sat + satDelta * intensity;
        var myLight = light + lightDelta * intensity;

        var suffix = ', ' + ss + ', ' + sl + ')';
        return function wheelGen(ncolors) {
            var scale = 360 / ncolors;
            var r = [];
            for (var i = 0; i < ncolors; i++) {
                r.push([i * scale, mySat, myLight]);
            }
            return r;
        };
    }
}

module.exports.gens = gens;
module.exports.parse = parse;
module.exports.toString = toString;

}],["coord.js","hexant","coord.js",{},function (require, exports, module, __filename, __dirname){

// hexant/coord.js
// ---------------

'use strict';

module.exports.ScreenPoint = ScreenPoint;
module.exports.CubePoint = CubePoint;
module.exports.OddQOffset = OddQOffset;
module.exports.OddQBox = OddQBox;

function ScreenPoint(x, y) {
    if (!(this instanceof ScreenPoint)) {
        return new ScreenPoint(x, y);
    }
    this.x = x;
    this.y = y;
}
ScreenPoint.prototype.type = 'point.screen';
ScreenPoint.prototype.copy = function copy() {
    return ScreenPoint(this.x, this.y);
};
ScreenPoint.prototype.copyFrom = function copyFrom(other) {
    this.x = other.x;
    this.y = other.y;
    return this;
};
ScreenPoint.prototype.toString = function toString() {
    return 'ScreenPoint(' + this.x + ', ' + this.y + ')';
};
ScreenPoint.prototype.toScreenInto = function toScreenInto(screenPoint) {
    screenPoint.x = this.x;
    screenPoint.y = this.y;
    return screenPoint;
};
ScreenPoint.prototype.toScreen = function toScreen() {
    return this;
};
ScreenPoint.prototype.scale = function scale(n) {
    this.x *= n;
    this.y *= n;
    return this;
};
ScreenPoint.prototype.mulBy = function mulBy(x, y) {
    this.x *= x;
    this.y *= y;
    return this;
};
ScreenPoint.prototype.add = function add(other) {
    if (other.type !== this.type) {
        other = other.toScreen();
    }
    this.x += other.x;
    this.y += other.y;
    return this;
};
ScreenPoint.prototype.addTo = function addTo(x, y) {
    this.x += x;
    this.y += y;
    return this;
};
ScreenPoint.prototype.sub = function sub(other) {
    if (other.type !== this.type) {
        other = other.toScreen();
    }
    this.x -= other.x;
    this.y -= other.y;
    return this;
};

function CubePoint(x, y, z) {
    if (!(this instanceof CubePoint)) {
        return new CubePoint(x, y, z);
    }
    if (x + y + z !== 0) {
        throw new Error(
            'CubePoint invariant violated: ' +
            x + ' + ' +
            y + ' + ' +
            z + ' = ' +
            (x + y + z));
    }
    this.x = x;
    this.y = y;
    this.z = z;
}
CubePoint.basis = [
    CubePoint(1, -1, 0), // SE -- 0, 1
    CubePoint(0, -1, 1), // S  -- 1, 2
    CubePoint(-1, 0, 1), // SW -- 2, 3
    CubePoint(-1, 1, 0), // NW -- 3, 4
    CubePoint(0, 1, -1), // N  -- 4, 5
    CubePoint(1, 0, -1)  // NE -- 5, 0
];
CubePoint.prototype.type = 'point.cube';
CubePoint.prototype.toString = function toString() {
    return 'CubePoint(' + this.x + ', ' + this.y + ', ' + this.z + ')';
};
CubePoint.prototype.copy = function copy() {
    return CubePoint(this.x, this.y, this.z);
};
CubePoint.prototype.copyFrom = function copyFrom(other) {
    if (other.type !== this.type) {
        return other.toCubeInto(this);
    }
    this.x = other.x;
    this.y = other.y;
    this.z = other.z;
    return this;
};
CubePoint.prototype.add = function add(other) {
    if (other.type !== this.type) {
        other = other.toCube();
    }
    this.x += other.x;
    this.y += other.y;
    this.z += other.z;
    return this;
};
CubePoint.prototype.addTo = function addTo(x, y, z) {
    this.x += x;
    this.y += y;
    this.z += z;
    return this;
};
CubePoint.prototype.sub = function sub(other) {
    if (other.type !== this.type) {
        other = other.toCube();
    }
    this.x -= other.x;
    this.y -= other.y;
    this.z -= other.z;
    return this;
};
CubePoint.prototype.scale = function scale(n) {
    this.x *= n;
    this.y *= n;
    this.z *= n;
    return this;
};
CubePoint.prototype.mulBy = function mulBy(x, y, z) {
    this.x *= x;
    this.y *= y;
    this.z *= z;
    return this;
};
CubePoint.prototype.toScreenInto = function toScreenInto(screenPoint) {
    screenPoint.x = 3 / 2 * this.x;
    screenPoint.y = Math.sqrt(3) * (this.z + this.x / 2);
    return screenPoint;
};
CubePoint.prototype.toScreen = function toScreen() {
    return this.toScreenInto(ScreenPoint());
};
CubePoint.prototype.toCubeInto = function toCubeInto(other) {
    other.x = this.x;
    other.y = this.y;
    other.z = this.z;
    return other;
};
CubePoint.prototype.toCube = function toCube() {
    return this;
};
CubePoint.prototype.toOddQOffset = function toOddQOffset() {
    var q = this.x;
    var r = this.z + (this.x - (this.x & 1)) / 2;
    return OddQOffset(q, r);
};
CubePoint.prototype.toOddQOffsetInto = function toOddQOffsetInto(oqo) {
    oqo.q = this.x;
    oqo.r = this.z + (this.x - (this.x & 1)) / 2;
};

function OddQOffset(q, r) {
    if (!(this instanceof OddQOffset)) {
        return new OddQOffset(q, r);
    }
    this.q = q;
    this.r = r;
}
OddQOffset.prototype.type = 'offset.odd-q';
OddQOffset.prototype.toString = function toString() {
    return 'OddQOffset(' + this.q + ', ' + this.r + ')';
};
OddQOffset.prototype.copy = function copy() {
    return OddQOffset(this.q, this.r);
};
OddQOffset.prototype.copyFrom = function copyFrom(other) {
    if (other.type !== this.type) {
        return other.toOddQOffsetInto(this);
    }
    this.q = other.q;
    this.r = other.r;
    return this;
};
OddQOffset.prototype.add = function add(other) {
    if (other.type !== this.type) {
        other = other.toOddQOffset();
    }
    this.q += other.q;
    this.r += other.r;
    return this;
};
OddQOffset.prototype.addTo = function addTo(q, r) {
    this.q += q;
    this.r += r;
    return this;
};
OddQOffset.prototype.sub = function sub(other) {
    if (other.type !== this.type) {
        other = other.toOddQOffset();
    }
    this.q -= other.q;
    this.r -= other.r;
    return this;
};
OddQOffset.prototype.scale = function scale(n) {
    this.q *= n;
    this.r *= n;
    return this;
};
OddQOffset.prototype.mulBy = function mulBy(q, r) {
    this.q *= q;
    this.r *= r;
    return this;
};
OddQOffset.prototype.toScreenInto = function toScreenInto(screenPoint) {
    screenPoint.x = 3 / 2 * this.q;
    screenPoint.y = Math.sqrt(3) * (this.r + 0.5 * (this.q & 1));
    return screenPoint;
};
OddQOffset.prototype.toScreen = function toScreen() {
    return this.toScreenInto(ScreenPoint());
};
OddQOffset.prototype.toOddQOffset = function toOddQOffset() {
    return this;
};
OddQOffset.prototype.toOddQOffsetInto = function toOddQOffsetInto(oqo) {
    oqo.q = this.q;
    oqo.r = this.r;
};
OddQOffset.prototype.toCubeInto = function toCubeInto(other) {
    other.x = this.q;
    other.z = this.r - (this.q - (this.q & 1)) / 2;
    other.y = -other.x - other.z;
    return other;
};
OddQOffset.prototype.toCube = function toCube() {
    return this.toCubeInto(CubePoint());
};

function OddQBox(topLeft, bottomRight) {
    if (!(this instanceof OddQBox)) {
        return new OddQBox(topLeft, bottomRight);
    }
    this.topLeft = topLeft ? topLeft.toOddQOffset() : OddQOffset();
    this.bottomRight = bottomRight ? bottomRight.toOddQOffset() : OddQOffset();
}
OddQBox.prototype.copy = function copy() {
    return new OddQBox(this.topLeft.copy(), this.bottomRight.copy());
};
OddQBox.prototype.copyFrom = function copyFrom(other) {
    this.topLeft.copy(other.topLeft);
    this.bottomRight.copy(other.bottomRight);
    return this;
};
OddQBox.prototype.toString = function toString() {
    return 'OddQBox(' +
        this.topLeft.toString() + ', ' +
        this.bottomRight.toString() + ')';
};
OddQBox.prototype.screenCount = function screenCount(screenPoint) {
    return this.screenCountInto(ScreenPoint());
};
OddQBox.prototype.screenCountInto = function screenCountInto(screenPoint) {
    var W = this.bottomRight.q - this.topLeft.q;
    var H = this.bottomRight.r - this.topLeft.r;

    // return the count number of hexes needed in screen x space and screen y
    // space

    // first one is a unit, each successive column backs 1/4 with the last
    // var x = 1 + 3 / 4 * (W - 1);
    screenPoint.x = (3 * W + 1) / 4;

    // height backs directly, but we need an extra half cell except when we
    // have only one column
    screenPoint.y = H + (W > 1 ? 0.5 : 0);

    return screenPoint;
};
OddQBox.prototype.contains = function contains(pointArg) {
    var point = pointArg.toOddQOffset();
    return point.q >= this.topLeft.q && point.q < this.bottomRight.q &&
           point.r >= this.topLeft.r && point.r < this.bottomRight.r;
};
OddQBox.prototype.expandTo = function expandTo(pointArg) {
    var expanded = false;
    var point = pointArg.toOddQOffset();

    if (point.q < this.topLeft.q) {
        this.topLeft.q = point.q;
        expanded = true;
    } else if (point.q >= this.bottomRight.q) {
        this.bottomRight.q = point.q + 1;
        expanded = true;
    }

    if (point.r < this.topLeft.r) {
        this.topLeft.r = point.r;
        expanded = true;
    } else if (point.r >= this.bottomRight.r) {
        this.bottomRight.r = point.r + 1;
        expanded = true;
    }

    return expanded;
};

}],["glpalette.js","hexant","glpalette.js",{},function (require, exports, module, __filename, __dirname){

// hexant/glpalette.js
// -------------------

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

}],["glprogram.js","hexant","glprogram.js",{},function (require, exports, module, __filename, __dirname){

// hexant/glprogram.js
// -------------------

'use strict';

module.exports = GLProgram;

// TODO:
// - detect uniform and attr names by static analysis
// - pursue tighter integration with GLSLShader

function GLProgram(gl, shaderLoader, uniformNames, attrNames) {
    this.gl = gl;
    this.prog = shaderLoader.load(this.gl).toValue();
    this.attrs = [];
    this.uniform = {};
    this.attr = {};
    for (var i = 0; i < uniformNames.length; ++i) {
        var name = uniformNames[i];
        this.uniform[name] = this.gl.getUniformLocation(this.prog, name);
    }
    for (var i = 0; i < attrNames.length; ++i) {
        var name = attrNames[i];
        var attr = this.gl.getAttribLocation(this.prog, name);
        this.attr[name] = attr;
        this.attrs.push(attr);
    }
}

GLProgram.prototype.use =
function use() {
    this.gl.useProgram(this.prog);
};

GLProgram.prototype.enable =
function enable() {
    this.use();
    for (var i = 0; i < this.attrs.length; ++i) {
        this.gl.enableVertexAttribArray(this.attrs[i]);
    }
};

GLProgram.prototype.disable =
function disable() {
    for (var i = 0; i < this.attrs.length; ++i) {
        this.gl.disableVertexAttribArray(this.attrs[i]);
    }
};

}],["glslshader.js","hexant","glslshader.js",{"rezult":58},function (require, exports, module, __filename, __dirname){

// hexant/glslshader.js
// --------------------

"use strict";

var Result = require('rezult');

module.exports = GLSLShader;

function GLSLShader(name, type, source) {
    this.name = name;
    this.type = type;
    this.source = source;
    this.nextShader = null;
}

GLSLShader.prototype.linkWith =
function linkWith(nextShader) {
    var self = new GLSLShader(this.name, this.type, this.source);
    if (this.nextShader === null) {
        self.nextShader = nextShader;
    } else {
        self.nextShader = this.nextShader.linkWith(nextShader);
    }
    return self;
};

GLSLShader.prototype.compile =
function compile(gl) {
    var shader = null;
    switch (this.type) {
    case 'frag':
        shader = gl.createShader(gl.FRAGMENT_SHADER);
        break;
    case 'vert':
        shader = gl.createShader(gl.VERTEX_SHADER);
        break;
    default:
        throw new Error('invalid glsl shader type ' + JSON.stringify(this.type));
    }
    gl.shaderSource(shader, this.source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        var mess = gl.getShaderInfoLog(shader);
        mess = annotateCompileError(this.source, mess);
        mess = this.name + ' ' + this.type + ' shader compile error: ' + mess;
        return Result.error(new Error(mess));
    }

    return Result.just(shader);
};

GLSLShader.prototype.load =
function load(gl) {
    var prog = gl.createProgram();

    for (var shader = this; shader !== null; shader = shader.nextShader) {
        var res = shader.compile(gl);
        if (res.err) {
            return res;
        }
        gl.attachShader(prog, res.value);
    }

    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        var mess = gl.getProgramInfoLog(prog);
        mess = 'shader program link error: ' + mess;
        return Result.error(new Error(mess));
    }

    return Result.just(prog);
};

function annotateCompileError(src, mess) {
    var match = /^ERROR: \d+:(\d+):/.exec(mess);
    if (!match) {
        return mess;
    }
    var lines = src.split(/\n/);
    lines = numberLines(lines);
    var n = parseInt(match[1]);
    var w = lines.length.toString().length + 1;
    lines = annotateLine(
        lines, n, 3,
        rep(' ', w) + '^-- ' + mess);
    return lines.join('')
}

function annotateLine(lines, n, c, mess) {
    var out = [];
    for (var i = 0; i < lines.length; ++i) {
        var m = i + 1;
        if (Math.abs(n - m) <= c) {
            out.push(lines[i]);
        }
        if (m === n) {
            out.push(mess);
        }
    }
    return out;
}

function numberLines(lines) {
    var w = lines.length.toString().length;
    return lines.map(function(line, i) {
        var n = i + 1;
        return pad(n.toString(), w) + ':' + line + '\n';
    });
}

function pad(str, n) {
    return rep(' ', n - str.length) + str;
}

function rep(str, n) {
    var s = '';
    for (var i = 0; i < n; ++i) {
        s += str;
    }
    return s;
}

}],["hex.frag","hexant","hex.frag",{"./glslshader.js":23},function (require, exports, module, __filename, __dirname){

// hexant/hex.frag
// ---------------

"use strict";

var GLSLShader = require('./glslshader.js');
module.exports = new GLSLShader("HexantHex", "frag",
  '/* hex.frag is a fragment shader which draws flat-topped hexagonal point\n' +
  ' * sprites.\n' +
  ' */\n' +
  '\n' +
  'varying lowp float vertColor;\n' +
  'varying mediump vec2 varAng;\n' +
  '\n' +
  'const mediump float pi = 3.141592653589793;\n' +
  'const mediump float tau = 2.0 * pi;\n' +
  'const mediump vec2 off = vec2(0.5, 0.5);\n' +
  'const mediump vec2 P0 = vec2(1.0, 0.0) / 2.0;\n' +
  'const mediump vec2 P1 = vec2(0.5, sqrt(3.0)/2.0) / 2.0;\n' +
  'const mediump float M10 = (P1.y - P0.y) / (P1.x - P0.x);\n' +
  'const mediump float B10 = P1.y - M10 * P1.x;\n' +
  '\n' +
  'uniform sampler2D uSampler;\n' +
  '\n' +
  'void main(void) {\n' +
  '    mediump vec2 p = gl_PointCoord - off;\n' +
  '    if (varAng.x != varAng.y) {\n' +
  '        mediump float a = mod(atan(p.y, p.x), tau);\n' +
  '        if (varAng.x < varAng.y) {\n' +
  '            if (a < varAng.x || a > varAng.y) {\n' +
  '                discard;\n' +
  '            }\n' +
  '        } else {\n' +
  '            if (a >= varAng.y && a <= varAng.x) {\n' +
  '                discard;\n' +
  '            }\n' +
  '        }\n' +
  '    }\n' +
  '    p = abs(p);\n' +
  '    if (p.y > P1.y || p.y > M10 * p.x + B10) {\n' +
  '        discard;\n' +
  '    }\n' +
  '    gl_FragColor = texture2D(uSampler, vec2(vertColor, 0));\n' +
  '}\n');

}],["hexant.html","hexant","hexant.html",{"./hexant.js":26,"./prompt.html":34},function (require, exports, module, __filename, __dirname){

// hexant/hexant.html
// ------------------

"use strict";
var $SUPER = require("./hexant.js");
var $PROMPT = require("./prompt.html");
var $THIS = function HexantHexant(body, caller) {
    $SUPER.apply(this, arguments);
    var document = body.ownerDocument;
    var scope = this.scope = caller.root.nestComponents();
    scope.caller = caller;
    scope.this = this;
    var parent = body, parents = [], node, component, callee, argument;
    node = document.createElement("CANVAS");
    parent.appendChild(node);
    component = node.actualNode;
    scope.hookup("view", component);
    if (component.setAttribute) {
        component.setAttribute("id", "view_f4j6ug");
    }
    if (scope.componentsFor["view"]) {
       scope.componentsFor["view"].setAttribute("for", "view_f4j6ug")
    }
    if (component.setAttribute) {
    component.setAttribute("class", "hexant-canvas");
    }
    parents[parents.length] = parent; parent = node;
    // CANVAS
    node = parent; parent = parents[parents.length - 1]; parents.length--;
    node = document.createBody();
    parent.appendChild(node);
    parents[parents.length] = parent; parent = node;
    // PROMPT
        node = {tagName: "prompt"};
        node.component = $THIS$0;
        callee = scope.nest();
        callee.argument = node;
        callee.id = "prompt";
        component = new $PROMPT(parent, callee);
    node = parent; parent = parents[parents.length - 1]; parents.length--;
    scope.hookup("prompt", component);
    if (component.setAttribute) {
        component.setAttribute("id", "prompt_jsqm2s");
    }
    if (scope.componentsFor["prompt"]) {
       scope.componentsFor["prompt"].setAttribute("for", "prompt_jsqm2s")
    }
    node = document.createElement("DIV");
    parent.appendChild(node);
    component = node.actualNode;
    scope.hookup("fpsOverlay", component);
    if (component.setAttribute) {
    component.setAttribute("class", "overlay fps right");
    }
    if (component.setAttribute) {
        component.setAttribute("id", "fpsOverlay_u0diak");
    }
    if (scope.componentsFor["fpsOverlay"]) {
       scope.componentsFor["fpsOverlay"].setAttribute("for", "fpsOverlay_u0diak")
    }
    if (component.setAttribute) {
    component.setAttribute("style", "display: none");
    }
    parents[parents.length] = parent; parent = node;
    // DIV
        node = document.createElement("DIV");
        parent.appendChild(node);
        component = node.actualNode;
        scope.hookup("fps", component);
        if (component.setAttribute) {
            component.setAttribute("id", "fps_4v0v4t");
        }
        if (scope.componentsFor["fps"]) {
           scope.componentsFor["fps"].setAttribute("for", "fps_4v0v4t")
        }
        parents[parents.length] = parent; parent = node;
        // DIV
        node = parent; parent = parents[parents.length - 1]; parents.length--;
        node = document.createElement("DIV");
        parent.appendChild(node);
        component = node.actualNode;
        scope.hookup("sps", component);
        if (component.setAttribute) {
            component.setAttribute("id", "sps_fy6ud9");
        }
        if (scope.componentsFor["sps"]) {
           scope.componentsFor["sps"].setAttribute("for", "sps_fy6ud9")
        }
        parents[parents.length] = parent; parent = node;
        // DIV
        node = parent; parent = parents[parents.length - 1]; parents.length--;
        node = document.createElement("DIV");
        parent.appendChild(node);
        component = node.actualNode;
        scope.hookup("redrawTiming", component);
        if (component.setAttribute) {
            component.setAttribute("id", "redrawTiming_rtfl2o");
        }
        if (scope.componentsFor["redrawTiming"]) {
           scope.componentsFor["redrawTiming"].setAttribute("for", "redrawTiming_rtfl2o")
        }
        parents[parents.length] = parent; parent = node;
        // DIV
        node = parent; parent = parents[parents.length - 1]; parents.length--;
    node = parent; parent = parents[parents.length - 1]; parents.length--;
    this.scope.hookup("this", this);
};
$THIS.prototype = Object.create($SUPER.prototype);
$THIS.prototype.constructor = $THIS;
$THIS.prototype.exports = {};
module.exports = $THIS;
var $THIS$0 = function HexantHexant$0(body, caller) {
    var document = body.ownerDocument;
    var scope = this.scope = caller;
};

}],["hexant.js","hexant","hexant.js",{"hashbind":18,"Base64":0,"rezult":58,"./colorgen.js":19,"./world.js":52,"./view_gl.js":51,"./turmite/index.js":40,"./coord.js":20,"./hextiletree.js":28,"./sample.js":37},function (require, exports, module, __filename, __dirname){

// hexant/hexant.js
// ----------------

'use strict';

module.exports = Hexant;

var Hash = require('hashbind');
var Base64 = require('Base64');
var Result = require('rezult');
var colorGen = require('./colorgen.js');
var World = require('./world.js');
var ViewGL = require('./view_gl.js');
var Turmite = require('./turmite/index.js');
var OddQOffset = require('./coord.js').OddQOffset;
var HexTileTree = require('./hextiletree.js');
var Sample = require('./sample.js');

var FPSInterval = 3 * 1000;
var NumTimingSamples = FPSInterval / 1000 * 60;
var MinFPS = 20;

function Hexant(body, scope) {
    var self = this;
    var atob = scope.window.atob || Base64.atob;
    var btoa = scope.window.btoa || Base64.btoa;

    // components
    this.prompt = null;
    this.el = null;
    this.fpsOverlay = null;
    this.fps = null;
    this.sps = null;
    this.redrawTiming = null;

    this.world = null;
    this.view = null;

    this.window = scope.window;
    this.hash = new Hash(this.window, {
        decode: decodeHash
    });
    this.animator = scope.animator.add(this);
    this.lastStepTime = null;
    this.goalStepRate = 0;
    this.stepRate = 0;
    this.paused = true;
    this.showFPS = false;
    this.animTimes = [];
    this.stepTimes = [];
    this.animTiming = new Sample(NumTimingSamples);
    this.throtLog = false;

    this.boundPlaypause = playpause;
    this.boundOnKeyPress = onKeyPress;
    this.b64EncodeHash = encodeHash;

    function playpause() {
        self.playpause();
    }

    function onKeyPress(e) {
        self.onKeyPress(e);
    }

    function decodeHash(str) {
        if (/^b64:/.test(str)) {
            str = str.slice(4);
            str = atob(str);
        }
        return Hash.decodeUnescape(str);
    }

    function encodeHash(keyvals) {
        var str = Hash.encodeMinEscape(keyvals);
        str = 'b64:' + btoa(str);
        return str;
    }
}

Hexant.prototype.hookup =
function hookup(id, component, scope) {
    // Only one scope of interest
    if (id !== 'this') {
        return;
    }

    this.prompt = scope.components.prompt;
    this.el = scope.components.view;
    this.fpsOverlay = scope.components.fpsOverlay;
    this.fps = scope.components.fps;
    this.sps = scope.components.sps;
    this.redrawTiming = scope.components.redrawTiming;

    this.titleBase = this.window.document.title;
    this.world = new World();
    this.view = this.world.addView(
        new ViewGL(this.world, this.el));

    this.world.tile.maxTileArea = this.view.maxCellsPerTile;

    this.window.addEventListener('keypress', this.boundOnKeyPress);
    this.el.addEventListener('click', this.boundPlaypause);

    this.configure();
};

Hexant.prototype.configure =
function configure() {
    var self = this;

    this.hash.bind('colors')
        .setParse(colorGen.parse, colorGen.toString)
        .setDefault('light')
        .addListener(function onColorGenChange(gen) {
            self.onColorGenChange(gen);
        })
        ;

    this.hash.bind('rule')
        .setParse(Turmite.compile)
        .setDefault('ant(L R)')
        .addListener(function onRuleChange(ent) {
            self.onRuleChange(ent);
        });

    this.hash.bind('showFPS')
        .setDefault(false)
        .addListener(function onDrawFPSChange(showFPS) {
            self.showFPS = !! showFPS;
            self.fpsOverlay.style.display = self.showFPS ? '' : 'none';
        });


    this.hash.bind('stepRate')
        .setParse(Result.lift(parseInt))
        .setDefault(4)
        .addListener(function onStepRateChange(rate) {
            self.setStepRate(rate);
        });

    this.hash.bind('labeled')
        .setDefault(false)
        .addListener(function onLabeledChange(labeled) {
            self.view.setLabeled(labeled);
            self.view.redraw();
        });

    this.hash.bind('drawUnvisited')
        .setDefault(false)
        .addListener(function onDrawUnvisitedChange(drawUnvisited) {
            self.view.setDrawUnvisited(!!drawUnvisited);
        });

    this.hash.bind('drawTrace')
        .setDefault(false)
        .addListener(function onDrawTraceChange(drawTrace) {
            self.view.setDrawTrace(!!drawTrace);
            self.view.redraw();
        });

    var autoplay;
    var autorefresh;
    if (this.hash.get('fullauto')) {
        autoplay = true;
        autorefresh = 24 * 60 * 60;
    } else {
        autoplay = this.hash.get('autoplay');
        autorefresh = parseInt(this.hash.get('autorefresh'), 10);
    }

    if (!isNaN(autorefresh) && autorefresh) {
        this.window.setTimeout(function shipit() {
            this.window.location.reload();
        }, autorefresh * 1000);
    }

    if (autoplay) {
        this.play();
    }
};

Hexant.prototype.onColorGenChange =
function onColorGenChange(gen) {
    this.view.setColorGen(gen);
    this.view.redraw();
};

Hexant.prototype.onRuleChange =
function onRuleChange(ent) {
    this.window.document.title = this.titleBase + ': ' + ent;
    this.world.setEnts([ent]);
    this.reset();
};

Hexant.prototype.onKeyPress =
function onKeyPress(e) {
    if (e.target !== this.window.document.documentElement &&
        e.target !== this.window.document.body &&
        e.target !== this.el
    ) {
        return;
    }

    switch (e.keyCode) {
    case 0x20: // <Space>
        this.playpause();
        break;
    case 0x23: // #
        this.toggleLabeled();
        break;
    case 0x2a: // *
        this.pause();
        this.reset();
        break;
    case 0x2b: // +
        this.hash.set('stepRate', this.stepRate * 2);
        break;
    case 0x2d: // -
        this.hash.set('stepRate', Math.max(1, Math.floor(this.stepRate / 2)));
        break;
    case 0x2e: // .
        this.stepit();
        break;

    case 0x42: // B
    case 0x62: // b
        this.hash.encode =
            this.hash.encode === Hash.encodeMinEscape
            ? this.b64EncodeHash : Hash.encodeMinEscape;
        this.hash.save();
        break;

    case 0x43: // C
    case 0x63: // c
        this.promptFor('colors', 'New Colors:');
        e.preventDefault();
        break;

    case 0x46: // F
    case 0x66: // f
        this.hash.set('showFPS', !this.showFPS);
        break;

    case 0x55: // U
    case 0x75: // u
        this.hash.set('drawUnvisited', !this.view.drawUnvisited);
        break;

    case 0x54: // T
    case 0x74: // t
        this.hash.set('drawTrace', !this.view.drawTrace);
        break;

    case 0x2f: // /
        this.promptFor('rule', Turmite.ruleHelp);
        e.preventDefault();
        break;
    }
};

Hexant.prototype.promptFor =
function promptFor(name, desc) {
    var self = this;

    if (self.prompt.active()) {
        return;
    }

    var orig = self.hash.getStr(name);
    self.prompt.prompt(desc, orig, finish);

    function finish(canceled, value, callback) {
        if (canceled) {
            callback(null);
            return;
        }

        self.hash.set(name, value, function setDone(err) {
            // NOTE: we get two extra args, the string value entered, and  the
            // parsed value, so we cannot just pass callback in directly, whose
            // signature is callback(err, help, revalue)
            callback(err);
        });
    }
};

Hexant.prototype.reset =
function reset() {
    this.world.reset();
    this.el.width = this.el.width;
    this.view.redraw();
};

function markVisited(data) {
    return World.FlagVisited | data;
}

Hexant.prototype.animate =
function animate(time) {
    try {
        this._animate(time);
    } catch(err) {
        this.animator.cancelAnimation();
        throw err;
    }
};

Hexant.prototype._animate =
function _animate(time) {
    if (!this.lastStepTime) {
        this.lastStepTime = time;
        return;
    }

    var steps = 1;
    var sinceLast = time - this.lastStepTime;
    steps = Math.round(sinceLast / 1000 * this.stepRate);
    this.animTiming.collect(sinceLast);
    this.throttle()

    switch (steps) {
    case 0:
        break;
    case 1:
        this.world.step();
        this.stepTimes.push(time, 1);
        this.lastStepTime = time;
        break;
    default:
        this.stepTimes.push(time, steps);
        this.world.stepn(steps);
        this.lastStepTime = time;
        break;
    }
    this.animTimes.push(time);

    while ((time - this.animTimes[0]) > FPSInterval) {
        this.animTimes.shift();
    }
    while ((time - this.stepTimes[0]) > FPSInterval) {
        this.stepTimes.shift();
    }

    if (this.showFPS) {
        this.fps.innerText = this.computeFPS().toFixed(0) + 'fps';
        this.sps.innerText = toSI(this.computeSPS()) + 'sps';
        var stats = this.world.redrawTimingStats();
        if (stats) {
            this.redrawTiming.innerText = 'µ=' + toSI(stats.m1/1e3) + 's 𝜎=' + toSI(Math.sqrt(stats.m2/1e3)) + 's';
        } else {
            this.redrawTiming.innerText = '';
        }
    }
};

Hexant.prototype.throttle =
function throttle() {
    if (!this.animTiming.complete()) {
        return;
    }

    if (this.animTiming.sinceWeightedMark() <= 3) {
        return;
    }

    if (this.stepRate > 1) {
        var fps = this.computeFPS();
        if (fps < MinFPS) {
            this.animTiming.weightedMark(2);
            this.stepRate /= 2;
            if (this.throtLog) {
                console.log('FPS SLOW DOWN', fps, this.stepRate);
            }
            return;
        }
    }

    var as = this.animTiming.classifyAnomalies();
    var i = as.length-1;
    if (this.stepRate > 1 && as[i] > 0.5 && as[i-1] > 0.5 && as[i-2] > 0.5) {
        this.stepRate /= 2;
        if (this.throtLog) {
            console.log('SLOW DOWN', this.stepRate, this.animTiming.markWeight, this.animTiming.lastMark);
        }
        this.animTiming.weightedMark(2);
    } else if (
        this.stepRate < this.goalStepRate &&
        as[i] <= 0 && as[i-1] <= 0 && as[i-2] <= 0
    ) {
        this.stepRate *= 2;
        this.animTiming.weightedMark(0.5);
        if (this.throtLog) {
            console.log('SPEED UP', this.stepRate, this.animTiming.markWeight, this.animTiming.lastMark);
        }
    }
};

Hexant.prototype.computeFPS =
function computeFPS() {
    return this.animTimes.length / FPSInterval * 1000;
};

Hexant.prototype.computeSPS =
function computeSPS() {
    var totalSteps = 0;
    for (var i = 1; i < this.stepTimes.length; i += 2) {
        totalSteps += this.stepTimes[i];
    }
    return totalSteps / FPSInterval * 1000;
};

Hexant.prototype.play =
function play() {
    this.animTimes.length = 0;
    this.stepTimes.length = 0;
    this.animTiming.reset();
    this.fps.innerText = '';
    this.sps.innerText = '';
    this.redrawTiming.innerText = '';
    this.lastStepTime = null;
    this.animator.requestAnimation();
    this.paused = false;
};

Hexant.prototype.pause =
function pause() {
    this.fps.innerText = '<' + this.fps.innerText + '>';
    this.sps.innerText = '<' + this.sps.innerText + '>';
    this.redrawTiming.innerText = '<' + this.redrawTiming.innerText + '>';
    this.lastStepTime = null;
    this.animator.cancelAnimation();
    this.paused = true;
};

Hexant.prototype.playpause =
function playpause() {
    if (this.paused) {
        this.play();
    } else {
        this.pause();
    }
};

Hexant.prototype.stepit =
function stepit() {
    if (this.paused) {
        this.world.step();
    } else {
        this.pause();
    }
};

Hexant.prototype.setStepRate =
function setStepRate(rate) {
    if (this.stepRate === this.goalStepRate) {
        this.stepRate = rate;
    }
    this.goalStepRate = rate;
};

Hexant.prototype.toggleLabeled =
function toggleLabeled() {
    this.hash.set('labeled', !this.view.labeled);
};

Hexant.prototype.resize =
function resize(width, height) {
    this.view.resize(width, height);
};

var nsiSuffix = ['', 'm', 'µ', 'n'];
var siSuffix = ['K', 'M', 'G', 'T', 'E'];

function toSI(n) {
    if (n < 1) {
        for (var nsi = 0; nsi < nsiSuffix.length && n < 1; ++nsi, n *= 1e3) {
        }
        return n.toPrecision(3) + nsiSuffix[nsi];
    }
    if (n < 1e3) {
        return n.toFixed(0);
    }
    n /= 1e3;
    for (var si = 0; si < siSuffix.length && n > 1e3; ++si, n /= 1e3) {
    }
    return n.toPrecision(3) + siSuffix[si];
}

}],["hextile.js","hexant","hextile.js",{"./coord.js":20,"./pool.js":33},function (require, exports, module, __filename, __dirname){

// hexant/hextile.js
// -----------------

'use strict';

var Coord = require('./coord.js');
var OddQOffset = Coord.OddQOffset;
var OddQBox = Coord.OddQBox;
var installPool = require('./pool.js');

module.exports = OddQHexTile;

function OddQHexTile() {
    this.id = OddQHexTile.NextId++;
    this.origin = new Coord.OddQOffset(0, 0);
    this.oqo = new Coord.OddQOffset(0, 0);
    this.width = 0;
    this.height = 0;
    this.data = null;
    this.dirty = false;
}

OddQHexTile.NextId = 0;

OddQHexTile.prototype.init =
function init(origin, width, height) {
    var need = width * height;
    var needBytes = need * Uint16Array.BYTES_PER_ELEMENT;
    origin.toOddQOffsetInto(this.origin);
    this.width = width;
    this.height = height;
    if (this.data === null || this.data.buffer.byteLength < needBytes) {
        this.data = new Uint16Array(need);
    } else {
        if (this.data.length !== need) {
            this.data = new Uint16Array(this.data.buffer, 0, need);
        }
        for (var i = 0; i < this.data.length; ++i) {
            this.data[i] = 0;
        }
    }
    this.dirty = false;
    return this;
};

OddQHexTile.prototype.boundingBox =
function boundingBox() {
    return OddQBox(this.origin, this.origin.copy().addTo(this.width, this.height));
};

OddQHexTile.prototype.centerPoint =
function centerPoint() {
    return OddQOffset(
        this.origin.q + Math.floor(this.width / 2),
        this.origin.r + Math.floor(this.height / 2)
    );
};

OddQHexTile.prototype.pointToIndex =
function pointToIndex(point) {
    point.toOddQOffsetInto(this.oqo);
    return (this.oqo.r - this.origin.r) * this.width +
           (this.oqo.q - this.origin.q);
};

OddQHexTile.prototype.update =
function update(point, func) {
    var i = this.pointToIndex(point);
    this.data[i] = func(this.data[i], point);
};

OddQHexTile.prototype.get =
function get(point) {
    return this.data[this.pointToIndex(point)];
};

OddQHexTile.prototype.set =
function set(point, datum) {
    this.data[this.pointToIndex(point)] = datum;
    return datum;
};

OddQHexTile.prototype.eachTile =
function eachTile(each) {
    each(this);
};

OddQHexTile.prototype.eachDataPoint =
function eachDataPoint(each, fill, replace) {
    var point = this.oqo;
    var loQ = this.origin.q;
    var loR = this.origin.r;
    var hiQ = loQ + this.width;
    var hiR = loR + this.height;
    var i = 0;
    for (point.r = loR; point.r < hiR; point.r++) {
        for (point.q = loQ; point.q < hiQ; point.q++, i++) {
            each(point, this.data[i]);
        }
    }
};

OddQHexTile.prototype.expandBoxTo =
function expandBoxTo(tl, br, mask) {
    var tlq = this.origin.q;
    var tlr = this.origin.r;
    var brq = tlq + this.width;
    var brr = tlr + this.height;
    if (isNaN(tl.q) || isNaN(tl.r) || isNaN(br.q) || isNaN(br.r)) {
        tl.q = tlq;
        tl.r = tlr;
        br.q = brq;
        br.r = brr;
    } else {
        if (tlq < tl.q) tl.q = tlq;
        if (tlr < tl.r) tl.r = tlr;
        if (brq > br.q) br.q = brq;
        if (brr > br.r) br.r = brr;
    }
};

OddQHexTile.prototype.expandBoxToIf =
function expandBoxToIf(tl, br, mask) {
    var q = this.origin.q, r = this.origin.r, i = 0;

    // if any part of the box isn't defined, initialize from the first masked
    // point
    if (isNaN(tl.q) || isNaN(tl.r) || isNaN(br.q) || isNaN(br.r)) {
        while (i < this.data.length) {
            if (this.data[i] & mask) {
                tl.q = q;
                br.q = q;
                tl.r = r;
                br.r = r;
                break;
            }
            i++;
            q++;
            if (q >= this.origin.q + this.width) {
                q = this.origin.q;
                r++;
            }
        }
    }

    // now just expand to each masked point
    while (i < this.data.length) {
        if (this.data[i] & mask) {
            if (q < tl.q) {
                tl.q = q;
            } else if (q >= br.q) {
                br.q = q;
            }
            if (r < tl.r) {
                tl.r = r;
            } else if (r >= br.r) {
                br.r = r;
            }
        }
        i++;
        q++;
        if (q >= this.origin.q + this.width) {
            q = this.origin.q;
            r++;
        }
    }
};

installPool(OddQHexTile);

}],["hextiletree.js","hexant","hextiletree.js",{"./coord.js":20,"./hextile.js":27,"./pool.js":33},function (require, exports, module, __filename, __dirname){

// hexant/hextiletree.js
// ---------------------

'use strict';

var Coord = require('./coord.js');
var OddQHexTile = require('./hextile.js');
var OddQOffset = Coord.OddQOffset;
var OddQBox = Coord.OddQBox;
var installPool = require('./pool.js');

module.exports = HexTileTree;

var zoomPerm = [
    3, // 0 --> 3
    2, // 1 --> 2
    1, // 2 --> 1
    0  // 3 --> 0
];

var tileOriginOffset = [
    OddQOffset(0, 0),
    OddQOffset(1, 0),
    OddQOffset(0, 1),
    OddQOffset(1, 1)
];

var nodeOriginOffset = [
    OddQOffset(-1, -1),
    OddQOffset(1, -1),
    OddQOffset(-1, 1),
    OddQOffset(1, 1)
];

function HexTileTree() {
    this.minTileArea = 4;
    this.maxTileArea = 64;
    this.oqo = new OddQOffset(0, 0);
    this.root = null;
    this.tiles = {};
    this.dirtyTiles = [];
    this.tileRemoved = noop;
    this.tileAdded = noop;
}

function HexTileTreeNode() {
    var self = this;
    this.tree = null;
    this.origin = new OddQOffset(0, 0);
    this.oqo = new OddQOffset(0, 0);
    this.box = OddQBox(null, null);
    this.size = 0;
    this.tileSize = 0;
    this.tiles = [null, null, null, null];
    this.concrete = 0;
    this._replaceme = null;
    this._replace = [
        function replace0(tile) {self._setTile(0, tile);},
        function replace1(tile) {self._setTile(1, tile);},
        function replace2(tile) {self._setTile(2, tile);},
        function replace3(tile) {self._setTile(3, tile);},
    ];
}

HexTileTreeNode.prototype.init =
function init(tree, origin, size, replaceme) {
    this.tree = tree;
    this.concrete = 0;
    this._replaceme = replaceme;
    if (origin !== null) {
        origin.toOddQOffsetInto(this.origin);
    } else {
        this.origin.q = this.origin.r = 0;
    }
    this._setSize(size);
    return this;
};

HexTileTreeNode.prototype.reset =
function reset() {
    if (this.tiles[0] !== null) {
        this.tiles[0].free();
        this.tiles[0] = null;
    }
    if (this.tiles[1] !== null) {
        this.tiles[1].free();
        this.tiles[1] = null;
    }
    if (this.tiles[2] !== null) {
        this.tiles[2].free();
        this.tiles[2] = null;
    }
    if (this.tiles[3] !== null) {
        this.tiles[3].free();
        this.tiles[3] = null;
    }
};

HexTileTreeNode.prototype._setSize =
function _setSize(size) {
    this.size = size;
    this.tileSize = Math.floor(this.size / 2);
    this.box.topLeft.q = this.origin.q - this.tileSize;
    this.box.topLeft.r = this.origin.r - this.tileSize;
    this.box.bottomRight.q = this.origin.q + this.tileSize;
    this.box.bottomRight.r = this.origin.r + this.tileSize;
};

HexTileTree.prototype.getTile =
function getTile(id) {
    return this.tiles[id];
};

HexTileTree.prototype.addTile =
function addTile(tile) {
    this.tiles[tile.id] = tile;
    tile.dirty = true;
    this.dirtyTiles.push(tile);
    this.tileAdded(tile);
};

HexTileTree.prototype.removeTile =
function removeTile(tile) {
    if (tile.dirty) {
        var j = 0, k = 0;
        for (; k < this.dirtyTiles.length; ++j, ++k) {
            if (this.dirtyTiles[j] === tile) {
                ++k;
                break;
            }
        }
        while (k < this.dirtyTiles.length) {
            this.dirtyTiles[j++] = this.dirtyTiles[k++];
        }
        this.dirtyTiles.length = j;
    }
    this.tileRemoved(tile);
    delete this.tiles[tile.id];
    tile.free();
};

HexTileTree.prototype.reset =
function reset() {
    this.dirtyTiles.length = 0;
    this.tiles = {};
    this.root = null;
};

HexTileTree.prototype.dump =
function dump() {
    if (this.root !== null) {
        return this.root.dump();
    }
};

HexTileTreeNode.prototype.dump =
function dump() {
    var parts = [
        'TreeNode @' + this.origin.toString(),
        '  box: ' + this.box.toString()
    ];

    for (var i = 0; i < this.tiles.length; i++) {
        var tileparts = ['null'];
        var tile = this.tiles[i];
        if (tile) {
            tileparts = tile.dump().split(/\n/);
        }
        parts.push('[' + i + ']: ' + tileparts[0]);
        for (var j = 1; j < tileparts.length; j++) {
            parts.push('     ' + tileparts[j]);
        }
    }

    return parts.join('\n');
};

OddQHexTile.prototype.dump =
function dump() {
    var parts = ['Tile @' + this.origin.toString()];
    var row = [];
    for (var i = 0; i < this.data.length; i++) {
        if (i && i % this.size === 0) {
            parts.push(row.join(' '));
            row = [];
        }
        row.push(this.data[i].toString());
    }
    parts.push(row.join(' '));
    return parts.join('\n');
};

HexTileTree.prototype.boundingBox =
function boundingBox() {
    if (this.root === null) {
        return null;
    }
    return this.root.boundingBox();
};

HexTileTree.prototype.eachTile =
function eachTile(each) {
    if (this.root !== null) {
        this.root.eachTile(each);
    }
};

HexTileTreeNode.prototype.eachTile =
function eachTile(each) {
    var tile;
    if (this.replaceme && (tile = this._mayCompact())) {
        tile.eachTile(each);
        return;
    }
    if (this.tiles[0]) this.tiles[0].eachTile(each);
    if (this.tiles[1]) this.tiles[1].eachTile(each);
    if (this.tiles[2]) this.tiles[2].eachTile(each);
    if (this.tiles[3]) this.tiles[3].eachTile(each);
};

HexTileTree.prototype.eachTile =
function eachTile(each) {
    if (this.root !== null) {
        this.root.eachTile(each);
    }
};

HexTileTree.prototype.eachDataPoint =
function eachDataPoint(each) {
    if (this.root !== null) {
        this.root.eachDataPoint(each, null, null);
    }
};

HexTileTree.prototype.centerPoint =
function centerPoint() {
    if (this.root === null) {
        return null;
    }
    return this.root.centerPoint();
};

HexTileTree.prototype._ensureRoot =
function _ensureRoot() {
    if (this.root === null) {
        var s = Math.ceil(Math.sqrt(this.minTileArea))*2;
        this.root = HexTileTreeNode.alloc().init(this, null, s, null);
    }
};

HexTileTree.prototype.update =
function update(point, func) {
    this._ensureRoot();
    point.toOddQOffsetInto(this.oqo);
    while (!this.root.box.contains(this.oqo)) {
        this.root = this.root.expand();
    }
    this.root.oqo.copyFrom(this.oqo);
    var tile = this.root._getOrCreateTile();
    if (tile instanceof OddQHexTile && !tile.dirty) {
        tile.dirty = true;
        this.dirtyTiles.push(tile);
    }
    return tile.update(this.oqo, func);
};

HexTileTree.prototype.get =
function get(point) {
    this._ensureRoot();
    return this.root.get(point);
};

HexTileTree.prototype.set =
function set(point, datum) {
    this._ensureRoot();
    point.toOddQOffsetInto(this.oqo);
    while (!this.root.box.contains(this.oqo)) {
        this.root = this.root.expand();
    }
    this.root.oqo.copyFrom(this.oqo);
    var tile = this.root._getOrCreateTile();
    if (tile instanceof OddQHexTile && !tile.dirty) {
        tile.dirty = true;
        this.dirtyTiles.push(tile);
    }
    return tile.set(this.oqo, datum);
};

HexTileTreeNode.prototype.expand =
function expand() {
    this._setSize(this.size * 2);
    for (var i = 0; i < this.tiles.length; i++) {
        var tile = this.tiles[i];
        if (tile !== null) {
            var tileNode = HexTileTreeNode.alloc().init(
                this.tree, tile.growthOrigin(i), this.tileSize, this._replace[i]);
            tileNode._setTile(zoomPerm[i], tile);
            this.tiles[i] = tileNode;
        }
    }
    return this;
};

OddQHexTile.prototype.growthOrigin =
function growthOrigin(i) {
    return this.oqo
        .copyFrom(tileOriginOffset[i])
        .scale(this.width)
        .add(this.origin);
};

HexTileTreeNode.prototype.growthOrigin =
function growthOrigin(i) {
    return this.oqo
        .copyFrom(nodeOriginOffset[i])
        .scale(this.tileSize)
        .add(this.origin);
};

HexTileTreeNode.prototype.boundingBox =
function boundingBox() {
    return this.box;
};

HexTileTreeNode.prototype.eachTile =
function eachTile(each) {
    var tile;
    if (this.replaceme && (tile = this._mayCompact())) {
        tile.eachTile(each);
        return;
    }
    if (this.tiles[0]) this.tiles[0].eachTile(each);
    if (this.tiles[1]) this.tiles[1].eachTile(each);
    if (this.tiles[2]) this.tiles[2].eachTile(each);
    if (this.tiles[3]) this.tiles[3].eachTile(each);
};

HexTileTreeNode.prototype.eachDataPoint =
function eachDataPoint(each, fill) {
    var tile;
    if (this._replaceMe && (tile = this._mayCompact())) {
        tile.eachDataPoint(each, fill, null);
        return;
    }
    var self = this;

    if (this.tiles[0]) this.tiles[0].eachDataPoint(each, fill);
    else if (typeof fill === 'number') this._fakeDataPoints(0, each, fill);
    if (this.tiles[1]) this.tiles[1].eachDataPoint(each, fill);
    else if (typeof fill === 'number') this._fakeDataPoints(1, each, fill);
    if (this.tiles[2]) this.tiles[2].eachDataPoint(each, fill);
    else if (typeof fill === 'number') this._fakeDataPoints(2, each, fill);
    if (this.tiles[3]) this.tiles[3].eachDataPoint(each, fill);
    else if (typeof fill === 'number') this._fakeDataPoints(3, each, fill);
};

HexTileTreeNode.prototype._mayCompact =
function _mayCompact(replaceMe) {
    if (this.concrete != 4) {
        return null;
    }

    var tile = this.compact();
    if (tile === null) {
        this.concrete = 5;
        return null;
    }

    this._replaceme(tile);
    for (var i = 0; i < this.tiles.length; ++i) {
        this.tree.removeTile(this.tiles[i]);
    }
    if (tile instanceof OddQHexTile) {
        this.tree.addTile(tile);
    }
    return tile;
};

HexTileTreeNode.prototype.compact =
function compact() {
    if (this.size * this.size > this.tree.maxTileArea) {
        return null;
    }

    var newTile = OddQHexTile.alloc().init(
        this.box.topLeft, this.size, this.size);
    this.tiles[0].eachDataPoint(eachPoint, null, null);
    this.tiles[1].eachDataPoint(eachPoint, null, null);
    this.tiles[2].eachDataPoint(eachPoint, null, null);
    this.tiles[3].eachDataPoint(eachPoint, null, null);
    return newTile;

    function eachPoint(point, datum) {
        // newTile.data[i++] = datum; TODO: should be able to do something like thing
        newTile.set(point, datum);
    }
};

HexTileTreeNode.prototype._fakeDataPoints =
function _fakeDataPoints(i, each, fill) {
    var tileCol = i & 1;
    var tileRow = i >> 1;

    var loQ = this.origin.q + (tileCol ? 0 : -this.tileSize);
    var loR = this.origin.r + (tileRow ? 0 : -this.tileSize);
    var hiQ = loQ + this.tileSize;
    var hiR = loR + this.tileSize;

    var point = OddQOffset(loQ, loR);
    for (point.r = loR; point.r < hiR; point.r++) {
        for (point.q = loQ; point.q < hiQ; point.q++) {
            each(point, fill);
        }
    }
};

HexTileTreeNode.prototype.centerPoint =
function centerPoint() {
    return this.origin;
};

HexTileTreeNode.prototype.update =
function update(point, func) {
    point.toOddQOffsetInto(this.oqo);
    if (!this.box.contains(this.oqo)) {
        throw new Error('update out of bounds');
    }
    var tile = (this._replaceme && this._mayCompact()) || this._getOrCreateTile();
    if (tile instanceof OddQHexTile && !tile.dirty) {
        tile.dirty = true;
        this.tree.dirtyTiles.push(tile);
    }
    return tile.update(this.oqo, func);
};

HexTileTreeNode.prototype.get =
function get(point) {
    point.toOddQOffsetInto(this.oqo);
    if (!this.box.contains(this.oqo)) {
        return NaN;
    }
    var tile = this._getTile();
    if (tile) {
        return tile.get(this.oqo);
    }
    return 0;
};

HexTileTreeNode.prototype.set =
function set(point, datum) {
    point.toOddQOffsetInto(this.oqo);
    if (!this.box.contains(this.oqo)) {
        throw new Error('set out of bounds');
    }
    var tile = (this._replaceme && this._mayCompact()) || this._getOrCreateTile();
    if (tile instanceof OddQHexTile && !tile.dirty) {
        tile.dirty = true;
        this.tree.dirtyTiles.push(tile);
    }
    return tile.set(this.oqo, datum);
};

HexTileTreeNode.prototype._getTile =
function _getTile() {
    // TODO: bit hack: negated sign-bit of subtraction
    var tileCol = this.oqo.q < this.origin.q ? 0 : 1;
    var tileRow = this.oqo.r < this.origin.r ? 0 : 1;
    var i = tileRow * 2 + tileCol;
    return this.tiles[i];
};

HexTileTreeNode.prototype._getOrCreateTile =
function _getOrCreateTile() {
    var tileCol = this.oqo.q < this.origin.q ? 0 : 1;
    var tileRow = this.oqo.r < this.origin.r ? 0 : 1;
    var i = tileRow * 2 + tileCol;
    var tile = this.tiles[i];
    if (tile) {
        return tile;
    }
    if (this.tileSize * this.tileSize <= this.tree.minTileArea) {
        return this._allocTile(i);
    }
    return this._allocNode(i);
};

HexTileTreeNode.prototype._allocTile =
function _allocTile(i) {
    var origin = this.origin.copy();
    if (this.oqo.q < origin.q) origin.q -= this.tileSize;
    if (this.oqo.r < origin.r) origin.r -= this.tileSize;
    var tile = OddQHexTile.alloc().init(
        origin, this.tileSize, this.tileSize);
    this._setTile(i, tile);
    this.tree.addTile(tile);
    return tile;
};

HexTileTreeNode.prototype._allocNode =
function _allocNode(i) {
    var origin = this.origin.copy();
    origin.q += this.tileSize / (this.oqo.q < origin.q ? -2 : 2);
    origin.r += this.tileSize / (this.oqo.r < origin.r ? -2 : 2);
    var node = HexTileTreeNode.alloc().init(
        this.tree, origin, this.tileSize, this._replace[i]);
    this.tiles[i] = node;
    return node;
};

HexTileTreeNode.prototype._setTile =
function _setTile(i, tile) {
    this.tiles[i] = tile;
    if (tile instanceof OddQHexTile) {
        this.concrete++;
    } else if (tile instanceof HexTileTreeNode) {
        tile._replaceme = this._replace[i];
    }
};

installPool(HexTileTreeNode);

function noop() {
}

}],["index.js","hexant","index.js",{"domready":2,"global/window":13,"gutentag/scope":15,"gutentag/document":14,"blick":1,"./main.html":30},function (require, exports, module, __filename, __dirname){

// hexant/index.js
// ---------------

'use strict';

var domready = require('domready');
var window = require('global/window');

var Scope = require('gutentag/scope');
var Document = require('gutentag/document');
var Animator = require('blick');
var Main = require('./main.html');

domready(setup);

function setup() {
    var scope = new Scope();
    scope.window = window;
    scope.animator = new Animator();
    var document = window.document;
    var bodyDocument = new Document(document.body);
    window.hexant = new Main(bodyDocument.documentElement, scope);

    window.addEventListener('resize', onResize);
    onResize();

    function onResize() {
        var width = Math.max(
            document.documentElement.clientWidth,
            window.innerWidth || 0);
        var height = Math.max(
            document.documentElement.clientHeight,
            window.innerHeight || 0);
        window.hexant.resize(width, height);
    }
}

}],["main.html","hexant","main.html",{"./main.js":31,"./hexant.html":25},function (require, exports, module, __filename, __dirname){

// hexant/main.html
// ----------------

"use strict";
var $SUPER = require("./main.js");
var $HEXANT = require("./hexant.html");
var $THIS = function HexantMain(body, caller) {
    $SUPER.apply(this, arguments);
    var document = body.ownerDocument;
    var scope = this.scope = caller.root.nestComponents();
    scope.caller = caller;
    scope.this = this;
    var parent = body, parents = [], node, component, callee, argument;
    node = document.createBody();
    parent.appendChild(node);
    parents[parents.length] = parent; parent = node;
    // HEXANT
        node = {tagName: "hexant"};
        node.component = $THIS$0;
        callee = scope.nest();
        callee.argument = node;
        callee.id = "view";
        component = new $HEXANT(parent, callee);
    node = parent; parent = parents[parents.length - 1]; parents.length--;
    scope.hookup("view", component);
    if (component.setAttribute) {
        component.setAttribute("id", "view_lrf50y");
    }
    if (scope.componentsFor["view"]) {
       scope.componentsFor["view"].setAttribute("for", "view_lrf50y")
    }
    this.scope.hookup("this", this);
};
$THIS.prototype = Object.create($SUPER.prototype);
$THIS.prototype.constructor = $THIS;
$THIS.prototype.exports = {};
module.exports = $THIS;
var $THIS$0 = function HexantMain$0(body, caller) {
    var document = body.ownerDocument;
    var scope = this.scope = caller;
};

}],["main.js","hexant","main.js",{},function (require, exports, module, __filename, __dirname){

// hexant/main.js
// --------------

'use strict';

function Main() {
    this.view = null;
}

Main.prototype.hookup = function hookup(id, component) {
    if (id === 'view') {
        this.view = component;
    }
};

Main.prototype.resize = function resize(width, height) {
    this.view.resize(width, height);
};

module.exports = Main;

}],["oddq_point.vert","hexant","oddq_point.vert",{"./glslshader.js":23},function (require, exports, module, __filename, __dirname){

// hexant/oddq_point.vert
// ----------------------

"use strict";

var GLSLShader = require('./glslshader.js');
module.exports = new GLSLShader("HexantOddqpoint", "vert",
  '/* oddq_point.vert is a vertex shader for point vertices that are positioned\n' +
  ' * using odd-q hexagonal coordinates.\n' +
  ' *\n' +
  ' * The vert attribute is just a Q,R vec2.\n' +
  ' *\n' +
  ' * The shader converts the Q,R vert into X,Y space, and sets gl_PointSize based\n' +
  ' * on the viewport and radius uniforms.\n' +
  ' *\n' +
  ' * The color is simply passed along to the fragment shader\n' +
  ' * for palette resolution.\n' +
  ' *\n' +
  ' * The optional ang attribute makes the hex partial, its two components are\n' +
  ' * just a lo and hi value between 0 and 2*π.  If hi < lo, then the\n' +
  ' * complementing range is drawn.\n' +
  ' */\n' +
  '\n' +
  'uniform mat4 uPMatrix;\n' +
  'uniform vec2 uVP;\n' +
  'uniform float uRadius;\n' +
  '\n' +
  'attribute vec2 vert; // q, r\n' +
  'attribute vec2 ang; // aLo, aHi\n' +
  'attribute lowp float color; // i\n' +
  '\n' +
  'const vec2 scale = vec2(1.5, sqrt(3.0));\n' +
  '\n' +
  'varying lowp float vertColor;\n' +
  'varying mediump vec2 varAng;\n' +
  '\n' +
  'void main(void) {\n' +
  '    gl_PointSize = uVP.y * abs(uPMatrix[1][1]) * uRadius;\n' +
  '    gl_Position = uPMatrix * vec4(\n' +
  '        vec2(\n' +
  '            vert.x,\n' +
  '            vert.y + mod(vert.x, 2.0)/2.0\n' +
  '        ) * scale,\n' +
  '        0.0,\n' +
  '        1.0\n' +
  '    );\n' +
  '    vertColor = color + 1.0/512.0;\n' +
  '    varAng = ang;\n' +
  '}\n');

}],["pool.js","hexant","pool.js",{},function (require, exports, module, __filename, __dirname){

// hexant/pool.js
// --------------

'use strict';

module.exports = function installPool(cons) {
    var pool = [];
    cons.alloc = function alloc() {
        if (pool.length > 0) {
            return pool.shift();
        }
        return new cons();
    };
    cons.prototype.free = typeof cons.prototype.reset === 'function'
        ? function resetAndFree() {
            this.reset();
            pool.push(this);
        }
        : function justFree() {
            pool.push(this);
        };
    return cons;
};

}],["prompt.html","hexant","prompt.html",{"./prompt.js":35,"gutentag/text.html":16},function (require, exports, module, __filename, __dirname){

// hexant/prompt.html
// ------------------

"use strict";
var $SUPER = require("./prompt.js");
var $TEXT = require("gutentag/text.html");
var $THIS = function HexantPrompt(body, caller) {
    $SUPER.apply(this, arguments);
    var document = body.ownerDocument;
    var scope = this.scope = caller.root.nestComponents();
    scope.caller = caller;
    scope.this = this;
    var parent = body, parents = [], node, component, callee, argument;
    node = document.createElement("DIV");
    parent.appendChild(node);
    component = node.actualNode;
    scope.hookup("box", component);
    if (component.setAttribute) {
        component.setAttribute("id", "box_gyhlyc");
    }
    if (scope.componentsFor["box"]) {
       scope.componentsFor["box"].setAttribute("for", "box_gyhlyc")
    }
    if (component.setAttribute) {
    component.setAttribute("class", "prompt");
    }
    if (component.setAttribute) {
    component.setAttribute("style", "display: none");
    }
    parents[parents.length] = parent; parent = node;
    // DIV
        node = document.createElement("DIV");
        parent.appendChild(node);
        component = node.actualNode;
        scope.hookup("help", component);
        if (component.setAttribute) {
            component.setAttribute("id", "help_2zoh6z");
        }
        if (scope.componentsFor["help"]) {
           scope.componentsFor["help"].setAttribute("for", "help_2zoh6z")
        }
        if (component.setAttribute) {
        component.setAttribute("class", "help");
        }
        parents[parents.length] = parent; parent = node;
        // DIV
        node = parent; parent = parents[parents.length - 1]; parents.length--;
        node = document.createElement("TEXTAREA");
        parent.appendChild(node);
        component = node.actualNode;
        scope.hookup("text", component);
        if (component.setAttribute) {
            component.setAttribute("id", "text_1ze05a");
        }
        if (scope.componentsFor["text"]) {
           scope.componentsFor["text"].setAttribute("for", "text_1ze05a")
        }
        parents[parents.length] = parent; parent = node;
        // TEXTAREA
        node = parent; parent = parents[parents.length - 1]; parents.length--;
        node = document.createElement("DIV");
        parent.appendChild(node);
        component = node.actualNode;
        scope.hookup("error", component);
        if (component.setAttribute) {
            component.setAttribute("id", "error_ebvl9w");
        }
        if (scope.componentsFor["error"]) {
           scope.componentsFor["error"].setAttribute("for", "error_ebvl9w")
        }
        if (component.setAttribute) {
        component.setAttribute("class", "error");
        }
        if (component.setAttribute) {
        component.setAttribute("style", "display: none");
        }
        parents[parents.length] = parent; parent = node;
        // DIV
        node = parent; parent = parents[parents.length - 1]; parents.length--;
        parent.appendChild(document.createTextNode("Press <Ctrl>-Enter to submit."));
    node = parent; parent = parents[parents.length - 1]; parents.length--;
    this.scope.hookup("this", this);
};
$THIS.prototype = Object.create($SUPER.prototype);
$THIS.prototype.constructor = $THIS;
$THIS.prototype.exports = {};
module.exports = $THIS;

}],["prompt.js","hexant","prompt.js",{},function (require, exports, module, __filename, __dirname){

// hexant/prompt.js
// ----------------

'use strict';

module.exports = Prompt;

function Prompt(body, scope) {
    var self = this;

    this.box = null;
    this.help = null;
    this.error = null;
    this.text = null;
    this.callback = null;

    this.boundOnKeyDown = onKeyDown;
    this.boundOnKeyUp = onKeyUp;
    this.boundCancel = cancel;
    this.boundFinished = finished;
    this.lastEnter = 0;

    function onKeyDown(e) {
        self.onKeyDown(e);
    }

    function onKeyUp(e) {
        self.onKeyUp(e);
    }

    function cancel(e) {
        self.cancel();
    }

    function finished(err, help, revalue) {
        self.finished(err, help, revalue);
    }
}

Prompt.prototype.active =
function active() {
    return !!this.callback;
};

Prompt.prototype.prompt =
function prompt(help, value, callback) {
    this.help.innerText = help;
    this.text.value = value;
    this.callback = callback;
    this.box.style.display = '';
    this.resizeTextRows();
    this.text.select();
    this.text.focus();
};

Prompt.prototype.resizeTextRows =
function resizeTextRows() {
    var lines = this.text.value.split(/\n/);
    this.text.rows = lines.length + 1;
};

Prompt.prototype.finish =
function finish() {
    var value = this.text.value;
    var callback = this.callback;
    if (callback) {
        value = value.replace(/(?:\r?\n)+$/, '');
        callback(false, value, this.boundFinished);
    } else {
        this.boundFinished(null);
    }
};

Prompt.prototype.cancel =
function cancel() {
    var callback = this.callback;
    if (callback) {
        callback(true, null, this.boundFinished);
    }
};

Prompt.prototype.finished =
function finished(err, help, revalue) {
    if (err) {
        this.error.innerText = '' + err;
        this.error.style.display = '';
        if (help) {
            this.help.innerText = help;
        }
        if (revalue) {
            this.text.value = revalue;
        }
        return;
    }
    this.hide();
};

Prompt.prototype.hide =
function hide() {
    this.lastEnter = 0;
    this.box.style.display = 'none';
    this.callback = null;
    this.text.value = '';
    this.help.innerText = '';
    this.error.style.display = 'none';
    this.error.innerText = '';
};

Prompt.prototype.hookup =
function hookup(id, component, scope) {
    // Only one scope of interest
    if (id !== 'this') {
        return;
    }

    this.box = scope.components.box;
    this.help = scope.components.help;
    this.error = scope.components.error;
    this.text = scope.components.text;

    this.text.addEventListener('keydown', this.boundOnKeyDown);
    this.text.addEventListener('keyup', this.boundOnKeyUp);
    this.text.addEventListener('blur', this.boundCancel);
};

Prompt.prototype.onKeyDown =
function onKeyDown(e) {
    switch (e.keyCode) {
    case 0x0d: // <Enter>
        if (e.ctrlKey) {
            e.preventDefault();
        }
        break;
    case 0x1b: // <Esc>
        this.cancel();
        e.preventDefault();
        return;
    }
    this.resizeTextRows();
};

Prompt.prototype.onKeyUp =
function onKeyUp(e) {
    switch (e.keyCode) {
    case 0x0d: // <Enter>
        if (Date.now() - this.lastEnter < 1000 ||
            e.ctrlKey) {
            e.preventDefault();
            this.finish();
            return;
        }
        this.lastEnter = Date.now();
        break;
    default:
        this.lastEnter = 0;
    }
    this.resizeTextRows();
};

}],["rangelist.js","hexant","rangelist.js",{},function (require, exports, module, __filename, __dirname){

// hexant/rangelist.js
// -------------------

module.exports.add = add;

/* eslint-disable max-statements */

function add(rl, begin, end) {
    if (end < begin) {
        throw new Error("invalid range");
    }

    // won't add degenerate ranges
    if (end === begin) {
        return;
    }

    // find begin
    // TODO: use binary search
    var found = false;
    var i = 0;
    for (; i < rl.length; i += 2) {
        if (begin <= rl[i]-1) {
            // ... @i:[begin <= a-1 < b] ...
            rl[i] = begin;
            found = true;
            break;
        }
        if (begin <= rl[i+1]+1) {
            // ... @i:[a < begin <= b+1] ...
            found = true;
            break;
        }
    }
    // ... < [end < begin]
    if (!found) {
        rl.push(begin, end);
        return;
    }

    // seek end
    var j = i;
    found = false;
    for (; j < rl.length; j += 2) {
        if (end < rl[j]-1) {
            // ... @i:[a <= begin <= b] ... @j:[end < c-1 < d] ...
            if (j === i) {
                throw new Error("degenerate range detected"); // should not be possible
            }
            found = true;
            break;
        }
        if (end <= rl[j+1]+1) {
            // ... @i:[a <= begin <= b] ... @j:[c < end <= d+1] ...
            if (j === i) {
                // ... @i:[a <= begin < end <= b] ...
                return;
            }
            end = rl[j+1] + (end === rl[j+1]+1 ? 1 : 0);
            j += 2;
            found = true;
            break;
        }
    }
    // ... @i:[a-1 <= begin < b] ...coalesced... < end
    if (!found) {
        rl[i+1] = end;
        rl.length = i+2;
        return;
    }

    // coalesce
    // ... @i:[a-1 <= begin < end] ...coalesced... @j ...tail...
    rl[i+1] = end;
    i += 2;
    if (i == j) {
        return;
    }
    // TODO: rl.copyWithin
    while (j < rl.length) {
        rl[i++] = rl[j++];
        rl[i++] = rl[j++];
    }
    rl.length = i;
    return;
}

}],["sample.js","hexant","sample.js",{},function (require, exports, module, __filename, __dirname){

// hexant/sample.js
// ----------------

'use strict';

module.exports = Sample;

/* TODO:
 * - evaluate online sorting
 * - improve anomaly scoring
 * - better consider all the marking stuff in context of its use case
 * - maybe split out the marking stuff, and combine it with its use case
 *   around animation throttling into a separate subclass
 */

var TIGHT_TOL = 0.1;

function Sample(n) {
    this.n = n;
    this.data = [];
    this.lastMark = 0;
    this.markWeight = 1;
}

Sample.prototype.mark =
function mark() {
    this.markWeight = 1;
    this.lastMark = this.data.length;
};

Sample.prototype.weightedMark =
function weightedMark(weight) {
    if (this.lastMark > 0) {
        this.markWeight *= weight;
    }
    this.lastMark = this.data.length;
};

Sample.prototype.sinceWeightedMark =
function sinceWeightedMark() {
    return (this.data.length - this.lastMark) / this.markWeight;
};

Sample.prototype.sinceMark =
function sinceMark() {
    return this.data.length - this.lastMark;
};

Sample.prototype.reset =
function reset() {
    this.data.length = 0;
    this.lastMark = 0;
    this.markWeight = 1;
};

Sample.prototype.complete =
function complete() {
    return this.data.length >= this.n;
};

Sample.prototype.collect =
function collect(datum) {
    while (this.data.length >= this.n) {
        this.data.shift();
    }
    this.data.push(datum);
    if (this.lastMark > 0) {
        if (--this.lastMark === 0) {
            this.markWeight = 1;
        }
    }
};

Sample.prototype.classifyAnomalies =
function classifyAnomalies() {
    var cs = [];
    var qs = this.quantiles([0.25, 0.50, 0.75]);
    var iqr = qs[2] - qs[0];
    if (iqr / qs[1] < TIGHT_TOL) {
        for (var i = 0; i < this.data.length; ++i) {
            cs.push(this.data[i] / qs[1] - 1);
        }
    } else {
        // var lh = qs[1] - qs[0];
        // var rh = qs[2] - qs[1];
        // var skew = (rh - lh) / iqr;
        var tol = iqr * 1.5;
        var lo = qs[0] - tol;
        var hi = qs[2] + tol;
        for (var i = 0; i < this.data.length; ++i) {
            if (this.data[i] < lo) {
                cs.push((this.data[i] - lo) / iqr);
            } else if (this.data[i] > hi) {
                cs.push((this.data[i] - hi) / iqr);
            } else {
                cs.push(0);
            }
        }
    }
    return cs;
};

Sample.prototype.quantiles =
function quantiles(qs) {
    var S = this.data.slice(0);
    S.sort(numericCmp);
    var vs = [];
    for (var i = 0; i < qs.length; ++i) {
        vs.push(q(qs[i], S));
    }
    return vs;
};

function q(p, S) {
    var i = 0.5 * S.length;
    return S[Math.floor(i)] / 2 + S[Math.ceil(i)] / 2;
}

function numericCmp(a, b) {
    return a - b;
}

}],["tileglbuffer.js","hexant","tileglbuffer.js",{},function (require, exports, module, __filename, __dirname){

// hexant/tileglbuffer.js
// ----------------------

'use strict';

// TODO: take over more code, currently this module only has code to be tested

function placeTile(tiles, capacity, length) {
    var bestIndex = -1, bestOffset = -1, best = -1;
    var offset = 0, start = -1;

    var freeIndex = -1, freeOffset = -1, freeLength = 0;
    for (var i = 0; i < tiles.length; i+=2) {
        var tileId = tiles[i];
        var tileLength = tiles[i+1];
        if (tileId === null) {
            if (freeLength === 0) {
                freeIndex = i;
                freeOffset = offset;
            }
            freeLength += tileLength;
            if (length <= freeLength) {
                var waste = freeLength - length;
                if (best < 0 || waste < best) {
                    bestIndex = freeIndex;
                    bestOffset = freeOffset;
                    best = waste;
                }
            }
        } else if (freeLength !== 0) {
            freeIndex = -1;
            freeOffset = -1;
            freeLength = 0;
        }
        offset += tileLength;
    }

    var free = capacity - offset;
    if (length <= free) {
        var waste = free - length;
        if (best < 0 || waste < best) {
            bestIndex = tiles.length;
            bestOffset = offset;
            best = waste;
        }
    }

    return [bestIndex, bestOffset, best];
}

module.exports.placeTile = placeTile;

function collectTombstone(tiles, i, length) {
    if (tiles[i] !== null) {
        throw new Error('not a tombstone');
    }

    var tileLength = tiles[i+1];
    tiles[i+1] = length;

    // coalesce range; we assume that we've been told an index of a usable set
    // of tombstones, and so don't range check here
    var j = i + 2;
    var spare = 0;
    for (; tileLength < length; j += 2) {
        tileLength += tiles[j+1];
        spare += 2;
    }

    // truncate (finish any coalesce)
    if (spare > 0) {
        var k = i + 2;
        while (j < tiles.length) {
            tiles[k++] = tiles[j++];
        }
        j = i + 2;
    }

    // distribute leftover
    if (length < tileLength) {
        var remain = tileLength - length;
        if (tiles[j] === null) {
            // easy, give it to the next tombstone
            tiles[j+1] += remain;
        } else {
            // split into new tombstone
            var n = tiles.length - j;
            if (spare >= 2) {
                spare -= 2;
            } else {
                tiles.push(0, 0);
            }
            var k = tiles.length - 1;
            for (; n-- > 0; k--) tiles[k] = tiles[k - 2];
            tiles[j] = null;
            tiles[j+1] = remain;
        }
    }

    tiles.length -= spare;
}

module.exports.collectTombstone = collectTombstone;

}],["turmite/constants.js","hexant/turmite","constants.js",{},function (require, exports, module, __filename, __dirname){

// hexant/turmite/constants.js
// ---------------------------

'use strict';

/* relative turns
 *    F -- +0 -- no turn, forward
 *    B -- +3 -- u turn, backaward
 *    P -- -2 -- double left turn
 *    L -- -1 -- left turn
 *    R -- +1 -- right turn
 *    S -- +2 -- double right turn
 *
 * absolute turns (for "flat-top" (odd or even q)
 *   NW -- ? -- North West
 *   NO -- ? -- North
 *   NE -- ? -- North East
 *   SE -- ? -- South East
 *   SO -- ? -- South
 *   SW -- ? -- South West
 */

var Turn            = {};
Turn.RelForward     = 0x0001;
Turn.RelBackward    = 0x0002;
Turn.RelLeft        = 0x0004;
Turn.RelRight       = 0x0008;
Turn.RelDoubleLeft  = 0x0010;
Turn.RelDoubleRight = 0x0020;
Turn.AbsNorthWest   = 0x0040;
Turn.AbsNorth       = 0x0080;
Turn.AbsNorthEast   = 0x0100;
Turn.AbsSouthEast   = 0x0200;
Turn.AbsSouth       = 0x0400;
Turn.AbsSouthWest   = 0x0800;

var RelTurnDelta                  = [];
RelTurnDelta[Turn.RelBackward]    =  3;
RelTurnDelta[Turn.RelDoubleLeft]  = -2;
RelTurnDelta[Turn.RelLeft]        = -1;
RelTurnDelta[Turn.RelForward]     =  0;
RelTurnDelta[Turn.RelRight]       =  1;
RelTurnDelta[Turn.RelDoubleRight] =  2;

var AbsTurnDir                = [];
AbsTurnDir[Turn.AbsSouthEast] = 0;
AbsTurnDir[Turn.AbsSouth]     = 1;
AbsTurnDir[Turn.AbsSouthWest] = 2;
AbsTurnDir[Turn.AbsNorthWest] = 3;
AbsTurnDir[Turn.AbsNorth]     = 4;
AbsTurnDir[Turn.AbsNorthEast] = 5;

var RelTurnSymbols                  = [];
RelTurnSymbols[Turn.RelBackward]    = 'B';
RelTurnSymbols[Turn.RelDoubleLeft]  = 'BL';
RelTurnSymbols[Turn.RelLeft]        = 'L';
RelTurnSymbols[Turn.RelForward]     = 'F';
RelTurnSymbols[Turn.RelRight]       = 'R';
RelTurnSymbols[Turn.RelDoubleRight] = 'BR';

var RelSymbolTurns = {};
RelSymbolTurns.B   = Turn.RelBackward;
RelSymbolTurns.P   = Turn.RelDoubleLeft;
RelSymbolTurns.L   = Turn.RelLeft;
RelSymbolTurns.F   = Turn.RelForward;
RelSymbolTurns.R   = Turn.RelRight;
RelSymbolTurns.S   = Turn.RelDoubleRight;

var AbsSymbolTurns = {};
AbsSymbolTurns.NW  = Turn.AbsNorthWest;
AbsSymbolTurns.NO  = Turn.AbsNorth;
AbsSymbolTurns.NE  = Turn.AbsNorthEast;
AbsSymbolTurns.SE  = Turn.AbsSouthEast;
AbsSymbolTurns.SO  = Turn.AbsSouth;
AbsSymbolTurns.SW  = Turn.AbsSouthWest;

module.exports.Turn           = Turn;
module.exports.RelTurnDelta   = RelTurnDelta;
module.exports.AbsTurnDir     = AbsTurnDir;
module.exports.RelTurnSymbols = RelTurnSymbols;
module.exports.RelSymbolTurns = RelSymbolTurns;
module.exports.AbsSymbolTurns = AbsSymbolTurns;

}],["turmite/index.js","hexant/turmite","index.js",{"../coord.js":20,"./constants.js":39,"./parse.js":49},function (require, exports, module, __filename, __dirname){

// hexant/turmite/index.js
// -----------------------

'use strict';

var Coord = require('../coord.js');
var CubePoint = Coord.CubePoint;
var constants = require('./constants.js');
var parseTurmite = require('./parse.js');

module.exports = Turmite;

/*
 * state, color -> nextState, write, turn
 *
 * index struct {
 *     state u8
 *     color u8
 * }
 *
 * rule struct {
 *     nextState u8
 *     write     u8
 *     turn      u16 // bit-field
 * }
 */

Turmite.ruleHelp =
    'ant(<number>?<turn> ...) , turns:\n' +
    '  - L=left, R=right\n' +
    '  - B=back, F=forward\n' +
    '  - P=port, S=starboard (these are rear-facing left/right)\n' +
    '\n' +
    'See README for full turmite language details.'
    ;

function Turmite() {
    this.numStates = 0;
    this.numColors = 0;
    this.rules = new Uint32Array(64 * 1024);
    this.specString = '';

    this.dir = 0;
    this.pos = CubePoint(0, 0, 0);

    this.state = 0;

    this.index = 0;
}

Turmite.prototype.reset =
function reset() {
    this.state = 0;
};

Turmite.prototype.clearRules =
function clearRules() {
    for (var i = 0; i < this.rules.length; i++) {
        this.rules[i] = 0;
    }
};

Turmite.parse =
function parse(str) {
    return parseTurmite(str);
};

Turmite.compile =
function compile(str, ent) {
    var res = Turmite.parse(str);
    if (res.err) {
        return res;
    }
    var func = res.value;
    return func(ent || new Turmite());
};

Turmite.prototype.toString =
function toString() {
    if (this.specString) {
        return this.specString;
    }
    return '<UNKNOWN turmite>';
};

Turmite.prototype.step =
function step(world) {
    var self = this;
    var tile = world.tile;
    var pos = world.getEntPos(this.index);
    var turn = 0;

    tile.update(pos, update);
    world.turnEnt(this.index, executeTurn);
    if (turn !== 0) {
        throw new Error('turmite forking unimplemented');
    }

    // TODO: WIP
    // var self = null;
    // while (turn !== 0) {
    //     if (self) {
    //         self = self.fork();
    //     } else {
    //         self = this;
    //     }
    //     world.tuneEnt(self.index, executeTurn);
    // }

    function update(data) {
        var color = data & 0x00ff;
        var flags = data & 0xff00;
        var ruleIndex = self.state << 8 | color;
        var rule = self.rules[ruleIndex];
        turn = rule & 0x0000ffff;
        var write = (rule & 0x00ff0000) >> 16;
        self.state = (rule & 0xff000000) >> 24;
        return flags | write | 0x0100;
    }

    function executeTurn(dir) {
        var t = 1;
        for (; t <= 0x0020; t <<= 1) {
            if (turn & t) {
                turn &= ~t;
                return (6 + dir + constants.RelTurnDelta[t]) % 6;
            }
        }
        for (; t <= 0x0800; t <<= 1) {
            if (turn & t) {
                turn &= ~t;
                return constants.AbsTurnDir[t];
            }
        }
        if (turn !== 0) {
            throw new Error('unrecognized turning constant ' + turn);
        }
        return dir;
    }
};

// TODO: WIP
// Turmite.prototype.fork =
// function fork() {
//     // TODO: ability to steal an already allocated ant from world pool
//     var self = new Turmite(this.world, this.rules);

//     // self.world = this.world;
//     // self.rules = this.rules;

//     self.numStates = this.numStates;
//     self.numColors = this.numColors;
//     self.specString = this.specString;
//     self.dir = this.oldDir;
//     self.oldDir = this.oldDir;
//     self.pos.copyFrom(this.oldPos);
//     self.oldPos.copyFrom(this.oldPos);
//     self.state = this.state;
//     self.size = this.size;
//     self.index = this.index;

//     // TODO: add to world

//     return self;
// };

}],["turmite/lang/analyze.js","hexant/turmite/lang","analyze.js",{"./walk.js":48},function (require, exports, module, __filename, __dirname){

// hexant/turmite/lang/analyze.js
// ------------------------------

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

}],["turmite/lang/build.js","hexant/turmite/lang","build.js",{},function (require, exports, module, __filename, __dirname){

// hexant/turmite/lang/build.js
// ----------------------------

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

}],["turmite/lang/compile.js","hexant/turmite/lang","compile.js",{"../constants.js":39,"./analyze.js":41,"./tostring.js":47,"./solve.js":46,"./walk.js":48},function (require, exports, module, __filename, __dirname){

// hexant/turmite/lang/compile.js
// ------------------------------

'use strict';

var constants = require('../constants.js');
var analyze = require('./analyze.js');
var symToTstring = require('./tostring.js');
var solve = require('./solve.js');
var walk = require('./walk.js');

// TODO: de-dupe
var opPrec = [
    '+',
    '-',
    '*',
    '/',
    '%'
];

function compileInit(spec) {
    var scope = {
        _ent: 'turmite',
        numStates: 0,
        numColors: 0
    };

    analyze(spec, scope);

    var bodyLines = [
        'var numStates = ' + scope.numStates + ';',
        'var numColors = ' + scope.numColors + ';'
    ];
    bodyLines = compileSpec(spec, scope, bodyLines);
    bodyLines.push(
        '',
        scope._ent + '.numStates = numStates;',
        scope._ent + '.numColors = numColors;',
        '',
        'return new Result(null, ' + scope._ent + ');');

    var lines = [];
    lines.push('function init(' + scope._ent + ') {');
    pushWithIndent(lines, bodyLines);
    lines.push('}');

    return closeit(['World', 'Result'], 'init', lines);
}

function compileSpec(spec, scope, lines) {
    for (var i = 0; i < spec.assigns.length; i++) {
        var assign = spec.assigns[i];
        lines = lines.concat(compileAssign(assign, scope));
        lines.push('');
    }
    lines = lines.concat(compileRules('rules', spec.rules, scope));
    return lines;
}

function compileRules(myName, rules, scope) {
    scope._state  = '_state';
    scope._color  = '_color';
    scope._key    = '_key';
    scope._result = '_res';
    scope._states = '_states';

    var lines = [];

    lines.push(
        'var ' + scope._states + ' = {};',
        'function countState(state) {',
        '    if (!' + scope._states + '[state]) {',
        '        ' + scope._states + '[state] = true;',
        '        numStates++;',
        '    }',
        '}',
        'var ' + [
            scope._state,
            scope._color,
            scope._key,
            scope._result
        ].join(', ') + ';',
        scope._ent + '.clearRules();'
    );

    rules.forEach(function eachRule(rule, i) {
        symToTstring(rule, function each(line) {
            if (i < rules.length - 1) {
                line += '\n';
            }
            lines.push(
                '',
                scope._ent + '.specString += ' +
                JSON.stringify(line) + ';');
        });

        lines = lines.concat(compileRule(rule, scope));
    });

    return lines;
}

function compileRule(rule, scope) {
    // XXX: api shift
    return compileWhen([], rule.when, scope, function underWhen(innerLines) {
        return compileThen(innerLines, rule.then, scope, noop);
    });
}

function compileWhen(outerLines, when, scope, body) {
    return compileWhenMatch({
        sym: scope._state,
        max: 'World.MaxState',
        count: 'countState'
    }, when.state, outerLines, whenStateBody, scope);

    function whenStateBody(lines) {
        lines.push(scope._key + ' = ' + scope._state + ' << World.ColorShift;');

        return compileWhenMatch({
            sym: scope._color,
            max: 'World.MaxColor',
            count: null
        }, when.color, lines, whenColorBody, scope);
    }

    function whenColorBody(lines) {
        lines = body(lines);
        return lines;
    }
}

function compileWhenMatch(varSpec, node, lines, body, scope) {
    var matchBody = varSpec.count ? countedBody : body;

    switch (node.type) {
    case 'symbol':
    case 'expr':
        return compileWhenLoop(varSpec, node, lines, matchBody, scope);

    case 'number':
        lines.push(varSpec.sym + ' = ' + node.value + ';');
        return matchBody(lines);

    default:
        throw new Error('unsupported match type ' + node.type);
    }

    function countedBody(bodyLines) {
        bodyLines.push(varSpec.count + '(' + varSpec.sym + ');');
        return body(bodyLines);
    }
}

function compileWhenLoop(varSpec, node, lines, body, scope) {
    lines.push('for (' +
               varSpec.sym + ' = 0; ' +
               varSpec.sym + ' <= ' + varSpec.max + '; ' +
               varSpec.sym + '++' +
               ') {');
    var bodyLines = compileWhenExprMatch(varSpec, node, [], body, scope);
    pushWithIndent(lines, bodyLines);
    lines.push('}');
    return lines;
}

function compileWhenExprMatch(varSpec, node, lines, body, scope) {
    var syms = freeSymbols(node, scope);
    if (syms.length > 1) {
        throw new Error('matching more than one variable is unsupported');
    }
    var cap = syms[0];
    if (!cap) {
        throw new Error('no match variable');
    }

    var matchExpr = solve(cap, varSpec.sym, node, scope, 0);
    if (matchExpr === varSpec.sym) {
        lines.push('var ' + cap + ' = ' + matchExpr + ';');
        return body(lines);
    }

    matchExpr = varSpec.max + ' + ' + matchExpr + ' % ' + varSpec.max;
    lines.push('var ' + cap + ' = ' + matchExpr + ';');
    // TODO: gratuitous guard, only needed if division is involved
    lines.push('if (Math.floor(' + cap + ') === ' + cap + ') {');
    pushWithIndent(lines, body([]));
    lines.push('}');
    return lines;
}

function freeSymbols(node, scope) {
    var seen = {};
    var res = [];
    walk.iter(node, each);
    return res;

    function each(child, next) {
        if (child.type === 'symbol' &&
            scope[child.name] === undefined &&
            !seen[child.name]) {
            seen[child.name] = true;
            res.push(child.name);
        }
        next();
    }
}

function compileThen(lines, then, scope, body) {
    var before = lines.length;
    var mask = compileThenParts(lines, then, scope);
    var after = lines.length;

    var dest = scope._ent + '.rules[' +
        scope._key + ' | ' + scope._color +
    ']';

    if (mask) {
        lines.push(dest + ' &= ~' + mask + ';');
    }

    if (after > before) {
        lines.push(dest + ' |= ' + scope._result + ';');
    }

    return body(lines);
}

function compileThenParts(lines, then, scope) {
    var valMaxes = ['World.MaxState', 'World.MaxColor', 'World.MaxTurn'];
    var resMasks = ['World.MaskResultState',
                    'World.MaskResultColor',
                    'World.MaskResultTurn'];
    var shifts = ['World.ColorShift', 'World.TurnShift'];

    var allZero = true;
    var parts = [then.state, then.color, then.turn];
    var maskParts = [];

    for (var i = 0; i < parts.length; i++) {
        var mode = parts[i].mode;
        var value = parts[i].value;

        if (mode === '=') {
            maskParts.push(resMasks[i]);
        }

        var valStr = compileValue(value, scope);
        if (valStr !== '0') {
            if (value.type === 'expr') {
                valStr = '(' + valStr + ')';
            }
            valStr += ' & ' + valMaxes[i];

            if (allZero) {
                allZero = false;
                lines.push(scope._result + ' = ' + valStr + ';');
            } else {
                lines.push(scope._result + ' |= ' + valStr + ';');
            }
        }
        if (i < shifts.length && !allZero) {
            lines.push(scope._result + ' <<= ' + shifts[i] + ';');
        }
    }

    var mask = maskParts.join(' | ');
    if (maskParts.length > 1) {
        mask = '(' + mask + ')';
    }

    return mask;
}

function compileValue(node, scope, outerPrec) {
    if (!outerPrec) {
        outerPrec = 0;
    }

    switch (node.type) {

    case 'expr':
        var prec = opPrec.indexOf(node.op);
        var arg1 = compileValue(node.arg1, scope, prec);
        var arg2 = compileValue(node.arg2, scope, prec);
        var exprStr = arg1 + ' ' + node.op + ' ' + arg2;
        if (prec < outerPrec) {
            return '(' + exprStr + ')';
        }
        return exprStr;

    case 'member':
        // TODO error if scope[sym] === 'undefined'
        var valRepr = compileValue(node.value, scope, 0);
        var item = compileValue(node.item, scope, opPrec.length);
        item = item + ' % ' + valRepr + '.length';
        return valRepr + '[' + item + ']';

    case 'symbol':
    case 'identifier':
        return node.name;

    case 'turn':
        return node.names.reduce(
            function orEachTurn(turn, name) {
                return turn | constants.Turn[name];
            }, 0);

    case 'number':
        return node.value.toString();

    case 'turns':
        return compileTurns(node.value);

    default:
        return '/* ' + JSON.stringify(node) + ' */ undefined';
    }
}

function compileAssign(assign, scope) {
    var lines = [];
    symToTstring(assign, function each(line) {
        line += '\n';
        lines.push(
            '',
            scope._ent + '.specString += ' +
            JSON.stringify(line) + ';');
    });

    lines.push(
        'var ' + assign.id.name + ' = ' +
        compileValue(assign.value) + ';');

    return lines;
}

function compileTurns(turns) {
    var parts = [];
    for (var i = 0; i < turns.length; i++) {
        var item = turns[i];
        var turn = constants.Turn[item.turn];
        var turnStr = '0x' + zeropad(2, turn.toString(16));
        for (var j = 0; j < item.count.value; j++) {
            parts.push(turnStr);
        }
    }
    return '[' + parts.join(', ') + ']';
}

function zeropad(width, str) {
    while (str.length < width) {
        str = '0' + str;
    }
    return str;
}

function pushWithIndent(outer, inner) {
    for (var i = 0; i < inner.length; i++) {
        var line = inner[i];
        if (line) {
            line = '    ' + line;
        }
        outer.push(line);
    }
    return outer;
}

function closeit(args, ret, body) {
    var argStr = args.join(', ');
    var lines = [];
    lines.push('(function(' + argStr + ') {');
    lines = lines.concat(body);
    lines.push(
        '',
        'return ' + ret + ';',
        '})(' + argStr + ');');
    return lines;
}

function noop(lines) {
    return lines;
}

module.exports.assign        = compileAssign;
module.exports.init          = compileInit;
module.exports.rule          = compileRule;
module.exports.rules         = compileRules;
module.exports.spec          = compileSpec;
module.exports.then          = compileThen;
module.exports.turns         = compileTurns;
module.exports.value         = compileValue;
module.exports.when          = compileWhen;
module.exports.whenExprMatch = compileWhenExprMatch;
module.exports.whenLoop      = compileWhenLoop;
module.exports.whenMatch     = compileWhenMatch;

}],["turmite/lang/grammar.js","hexant/turmite/lang","grammar.js",{"./build.js":42},function (require, exports, module, __filename, __dirname){

// hexant/turmite/lang/grammar.js
// ------------------------------

// Generated automatically by nearley
// http://github.com/Hardmath123/nearley
(function () {
function id(x) {return x[0]; }
 var build = require('./build.js'); var grammar = {
    ParserRules: [
    {"name": "spec", "symbols": [" ebnf$1", "rules"], "postprocess":  build.spec },
    {"name": "assigns", "symbols": ["assign"]},
    {"name": "assigns", "symbols": ["assign", "newline", "assigns"], "postprocess":  build.rightConcat },
    {"name": "assign", "symbols": ["identifier", "_", {"literal":"="}, "_", "lit"], "postprocess":  build.assign },
    {"name": "rules", "symbols": ["rule"]},
    {"name": "rules", "symbols": ["rule", "newline", "rules"], "postprocess":  build.rightConcat },
    {"name": " string$2", "symbols": [{"literal":"="}, {"literal":">"}], "postprocess": function joiner(d) {
        return d.join('');
    }},
    {"name": "rule", "symbols": ["when", " string$2", "then"], "postprocess":  build.rule },
    {"name": "when", "symbols": ["expr", {"literal":","}, "expr"], "postprocess":  build.when },
    {"name": "then", "symbols": ["thenState", {"literal":","}, "thenColor", {"literal":","}, "thenTurn"], "postprocess":  build.then },
    {"name": "thenMode", "symbols": [], "postprocess":  build.just('|') },
    {"name": "thenMode", "symbols": [{"literal":"="}], "postprocess":  build.item(0) },
    {"name": "thenMode", "symbols": [{"literal":"|"}], "postprocess":  build.item(0) },
    {"name": "thenState", "symbols": ["_", "thenMode", "sum", "_"], "postprocess":  build.thenVal },
    {"name": "thenColor", "symbols": ["_", "thenMode", "sum", "_"], "postprocess":  build.thenVal },
    {"name": "thenTurn", "symbols": ["_", "thenMode", "sum", "_"], "postprocess":  build.thenVal },
    {"name": "thenTurn", "symbols": ["_", "thenMode", "turnExpr", "_"], "postprocess":  build.thenVal },
    {"name": "turnExpr", "symbols": ["turn"], "postprocess":  build.turn },
    {"name": "turnExpr", "symbols": ["turnExpr", {"literal":"|"}, "turnExpr"], "postprocess":  build.multiTurn },
    {"name": "expr", "symbols": ["_", "sum", "_"], "postprocess":  build.item(1) },
    {"name": "sumop", "symbols": ["_", {"literal":"+"}, "_"], "postprocess":  build.item(1) },
    {"name": "sumop", "symbols": ["_", {"literal":"-"}, "_"], "postprocess":  build.item(1) },
    {"name": "mulop", "symbols": ["_", {"literal":"*"}, "_"], "postprocess":  build.item(1) },
    {"name": "mulop", "symbols": ["_", {"literal":"/"}, "_"], "postprocess":  build.item(1) },
    {"name": "mulop", "symbols": ["_", {"literal":"%"}, "_"], "postprocess":  build.item(1) },
    {"name": "sum", "symbols": ["sum", "sumop", "mul"], "postprocess":  build.expr },
    {"name": "sum", "symbols": ["mul"], "postprocess":  build.item(0) },
    {"name": "mul", "symbols": ["mul", "mulop", "fac"], "postprocess":  build.expr },
    {"name": "mul", "symbols": ["fac"], "postprocess":  build.item(0) },
    {"name": "fac", "symbols": [{"literal":"("}, "expr", {"literal":")"}], "postprocess":  build.item(1) },
    {"name": "fac", "symbols": ["lit"], "postprocess":  build.item(0) },
    {"name": "fac", "symbols": ["member"], "postprocess":  build.item(0) },
    {"name": "fac", "symbols": ["symbol"], "postprocess":  build.item(0) },
    {"name": "fac", "symbols": ["identifier"], "postprocess":  build.item(0) },
    {"name": " string$3", "symbols": [{"literal":"t"}, {"literal":"u"}, {"literal":"r"}, {"literal":"n"}, {"literal":"s"}, {"literal":"("}], "postprocess": function joiner(d) {
        return d.join('');
    }},
    {"name": "turns", "symbols": [" string$3", "_", "countTurn", " ebnf$4", "_", {"literal":")"}], "postprocess":  build.turns },
    {"name": "turn", "symbols": [{"literal":"L"}], "postprocess":  function() {return 'RelLeft'}        },
    {"name": "turn", "symbols": [{"literal":"R"}], "postprocess":  function() {return 'RelRight'}       },
    {"name": "turn", "symbols": [{"literal":"F"}], "postprocess":  function() {return 'RelForward'}     },
    {"name": "turn", "symbols": [{"literal":"B"}], "postprocess":  function() {return 'RelBackward'}    },
    {"name": "turn", "symbols": [{"literal":"P"}], "postprocess":  function() {return 'RelDoubleLeft'}  },
    {"name": "turn", "symbols": [{"literal":"S"}], "postprocess":  function() {return 'RelDoubleRight'} },
    {"name": "turn", "symbols": [{"literal":"l"}], "postprocess":  function() {return 'RelLeft'}        },
    {"name": "turn", "symbols": [{"literal":"r"}], "postprocess":  function() {return 'RelRight'}       },
    {"name": "turn", "symbols": [{"literal":"f"}], "postprocess":  function() {return 'RelForward'}     },
    {"name": "turn", "symbols": [{"literal":"b"}], "postprocess":  function() {return 'RelBackward'}    },
    {"name": "turn", "symbols": [{"literal":"p"}], "postprocess":  function() {return 'RelDoubleLeft'}  },
    {"name": "turn", "symbols": [{"literal":"s"}], "postprocess":  function() {return 'RelDoubleRight'} },
    {"name": " string$5", "symbols": [{"literal":"N"}, {"literal":"W"}], "postprocess": function joiner(d) {
        return d.join('');
    }},
    {"name": "turn", "symbols": [" string$5"], "postprocess":  function() {return 'AbsNorthWest'}   },
    {"name": " string$6", "symbols": [{"literal":"N"}, {"literal":"O"}], "postprocess": function joiner(d) {
        return d.join('');
    }},
    {"name": "turn", "symbols": [" string$6"], "postprocess":  function() {return 'AbsNorth'}       },
    {"name": " string$7", "symbols": [{"literal":"N"}, {"literal":"E"}], "postprocess": function joiner(d) {
        return d.join('');
    }},
    {"name": "turn", "symbols": [" string$7"], "postprocess":  function() {return 'AbsNorthEast'}   },
    {"name": " string$8", "symbols": [{"literal":"S"}, {"literal":"E"}], "postprocess": function joiner(d) {
        return d.join('');
    }},
    {"name": "turn", "symbols": [" string$8"], "postprocess":  function() {return 'AbsSouthEast'}   },
    {"name": " string$9", "symbols": [{"literal":"S"}, {"literal":"O"}], "postprocess": function joiner(d) {
        return d.join('');
    }},
    {"name": "turn", "symbols": [" string$9"], "postprocess":  function() {return 'AbsSouth'}       },
    {"name": " string$10", "symbols": [{"literal":"S"}, {"literal":"W"}], "postprocess": function joiner(d) {
        return d.join('');
    }},
    {"name": "turn", "symbols": [" string$10"], "postprocess":  function() {return 'AbsSouthWest'}   },
    {"name": " string$11", "symbols": [{"literal":"n"}, {"literal":"w"}], "postprocess": function joiner(d) {
        return d.join('');
    }},
    {"name": "turn", "symbols": [" string$11"], "postprocess":  function() {return 'AbsNorthWest'}   },
    {"name": " string$12", "symbols": [{"literal":"n"}, {"literal":"o"}], "postprocess": function joiner(d) {
        return d.join('');
    }},
    {"name": "turn", "symbols": [" string$12"], "postprocess":  function() {return 'AbsNorth'}       },
    {"name": " string$13", "symbols": [{"literal":"n"}, {"literal":"e"}], "postprocess": function joiner(d) {
        return d.join('');
    }},
    {"name": "turn", "symbols": [" string$13"], "postprocess":  function() {return 'AbsNorthEast'}   },
    {"name": " string$14", "symbols": [{"literal":"s"}, {"literal":"e"}], "postprocess": function joiner(d) {
        return d.join('');
    }},
    {"name": "turn", "symbols": [" string$14"], "postprocess":  function() {return 'AbsSouthEast'}   },
    {"name": " string$15", "symbols": [{"literal":"s"}, {"literal":"o"}], "postprocess": function joiner(d) {
        return d.join('');
    }},
    {"name": "turn", "symbols": [" string$15"], "postprocess":  function() {return 'AbsSouth'}       },
    {"name": " string$16", "symbols": [{"literal":"s"}, {"literal":"w"}], "postprocess": function joiner(d) {
        return d.join('');
    }},
    {"name": "turn", "symbols": [" string$16"], "postprocess":  function() {return 'AbsSouthWest'}   },
    {"name": "countTurn", "symbols": ["turn"], "postprocess":  build.singleTurn },
    {"name": "countTurn", "symbols": ["decint", "turn"], "postprocess":  build.countTurn },
    {"name": "member", "symbols": [" subexpression$17", {"literal":"["}, "expr", {"literal":"]"}], "postprocess":  build.member },
    {"name": "symbol", "symbols": [/[a-z]/, " ebnf$18"], "postprocess":  build.symbol },
    {"name": "identifier", "symbols": [/[A-Z]/, " ebnf$19"], "postprocess":  build.identifier },
    {"name": "lit", "symbols": ["int"], "postprocess":  build.item(0) },
    {"name": "lit", "symbols": ["turns"], "postprocess":  build.item(0) },
    {"name": " string$20", "symbols": [{"literal":"0"}, {"literal":"x"}], "postprocess": function joiner(d) {
        return d.join('');
    }},
    {"name": "int", "symbols": [" string$20", "hexint"], "postprocess":  build.item(1) },
    {"name": "int", "symbols": ["decint"], "postprocess":  build.item(0) },
    {"name": "hexint", "symbols": [" ebnf$21"], "postprocess":  build.int(16) },
    {"name": "decint", "symbols": [" ebnf$22"], "postprocess":  build.int(10) },
    {"name": "_", "symbols": [" ebnf$23"], "postprocess":  build.noop },
    {"name": "__", "symbols": [" ebnf$24"], "postprocess":  build.noop },
    {"name": "newline", "symbols": [" ebnf$25", {"literal":"\n"}], "postprocess":  build.noop },
    {"name": " ebnf$1", "symbols": ["assigns"], "postprocess": id},
    {"name": " ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": " ebnf$4", "symbols": []},
    {"name": " ebnf$4", "symbols": [" subexpression$26", " ebnf$4"], "postprocess": function (d) {
                    return [d[0]].concat(d[1]);
                }},
    {"name": " subexpression$17", "symbols": ["member"]},
    {"name": " subexpression$17", "symbols": ["symbol"]},
    {"name": " subexpression$17", "symbols": ["identifier"]},
    {"name": " subexpression$17", "symbols": ["lit"]},
    {"name": " ebnf$18", "symbols": []},
    {"name": " ebnf$18", "symbols": [/[\w]/, " ebnf$18"], "postprocess": function (d) {
                    return [d[0]].concat(d[1]);
                }},
    {"name": " ebnf$19", "symbols": [/[\w]/]},
    {"name": " ebnf$19", "symbols": [/[\w]/, " ebnf$19"], "postprocess": function (d) {
                    return [d[0]].concat(d[1]);
                }},
    {"name": " ebnf$21", "symbols": [/[0-9a-fA-F]/]},
    {"name": " ebnf$21", "symbols": [/[0-9a-fA-F]/, " ebnf$21"], "postprocess": function (d) {
                    return [d[0]].concat(d[1]);
                }},
    {"name": " ebnf$22", "symbols": [/[0-9]/]},
    {"name": " ebnf$22", "symbols": [/[0-9]/, " ebnf$22"], "postprocess": function (d) {
                    return [d[0]].concat(d[1]);
                }},
    {"name": " ebnf$23", "symbols": []},
    {"name": " ebnf$23", "symbols": [/[\s]/, " ebnf$23"], "postprocess": function (d) {
                    return [d[0]].concat(d[1]);
                }},
    {"name": " ebnf$24", "symbols": [/[\s]/]},
    {"name": " ebnf$24", "symbols": [/[\s]/, " ebnf$24"], "postprocess": function (d) {
                    return [d[0]].concat(d[1]);
                }},
    {"name": " ebnf$25", "symbols": [{"literal":"\r"}], "postprocess": id},
    {"name": " ebnf$25", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": " subexpression$26", "symbols": ["__", "countTurn"]}
]
  , ParserStart: "spec"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();

}],["turmite/lang/parse.js","hexant/turmite/lang","parse.js",{"nearley":55,"rezult":58,"./grammar.js":44,"./compile.js":43},function (require, exports, module, __filename, __dirname){

// hexant/turmite/lang/parse.js
// ----------------------------

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

}],["turmite/lang/solve.js","hexant/turmite/lang","solve.js",{"./compile.js":43,"./walk.js":48},function (require, exports, module, __filename, __dirname){

// hexant/turmite/lang/solve.js
// ----------------------------

'use strict';

var compile = require('./compile.js');
var walk = require('./walk.js');

module.exports = solve;

// TODO: de-dupe
var opPrec = [
    '+',
    '-',
    '*',
    '/',
    '%'
];

var invOp = {
    '+': '-',
    '*': '/',
    '-': '+',
    '/': '*'
};

function solve(cap, sym, node, scope, outerPrec) {
    switch (node.type) {
    case 'expr':
        var leftHasSym = hasSym(node.arg1, cap);
        var rightHasSym = hasSym(node.arg2, cap);
        if (!leftHasSym && !rightHasSym) {
            return compile.value(node, scope, outerPrec);
        }
        if (leftHasSym && rightHasSym) {
            // TODO: solve each side to intermediate values
            throw new Error('matching complex expressions not supported');
        }

        if (!invOp[node.op]) {
            throw new Error('unsupported match operator ' + node.op);
        }

        var prec = opPrec.indexOf(node.op);
        var arg1 = solve(cap, sym, node.arg1, scope, prec);
        var arg2 = solve(cap, sym, node.arg2, scope, prec);
        var str = '';

        if (node.op === '+' || node.op === '*') {
            // color = c [*+] 6 = 6 [*+] c
            // c = color [/-] 6
            if (rightHasSym) {
                var tmp = arg1;
                arg1 = arg2;
                arg2 = tmp;
            }
            str += arg1 + ' ' + invOp[node.op] + ' ' + arg2;
        }

        if (node.op === '-' || node.op === '/') {
            if (leftHasSym) {
                // color = c [-/] 6
                // c = color [+*] 6
                str += arg1 + ' ' + invOp[node.op] + ' ' + arg2;
            } else if (rightHasSym) {
                // color = 6 [-/] c
                // c = 6 [-/] color
                str += arg2 + ' ' + node.op + ' ' + arg1;
            }
            str += arg1 + ' ' + invOp[node.op] + ' ' + arg2;
        }

        if (prec < outerPrec) {
            str = '(' + str + ')';
        }

        return str;

    case 'symbol':
        if (node.name === cap) {
            return sym;
        }
        return node.name;

    default:
        return compile.value(node, scope);
    }
}

function hasSym(node, name) {
    var has = false;
    walk.iter(node, function each(child, next) {
        if (child.type === 'symbol' &&
            child.name === name) {
            has = true;
            // next not called, stop here
        } else {
            next();
        }
    });
    return has;
}

}],["turmite/lang/tostring.js","hexant/turmite/lang","tostring.js",{"../rle-builder.js":50,"./walk.js":48},function (require, exports, module, __filename, __dirname){

// hexant/turmite/lang/tostring.js
// -------------------------------

'use strict';

var RLEBuilder = require('../rle-builder.js');
var walk = require('./walk.js');

module.exports = toSpecString;

var TurnSyms = {
    RelLeft: 'L',
    RelRight: 'R',
    RelForward: 'F',
    RelBackward: 'B',
    RelDoubleLeft: 'P',
    RelDoubleRight: 'S',
    AbsNorth: 'NO',
    AbsNorthWest: 'NW',
    AbsNorthEast: 'NE',
    AbsSouth: 'SO',
    AbsSouthEast: 'SE',
    AbsSouthWest: 'SW'
};

// TODO: de-dupe
var opPrec = [
    '+',
    '-',
    '*',
    '/',
    '%'
];

function toSpecString(root, emit) {
    var precs = [0];
    var stack = [];

    walk.iter(root, each);
    if (stack.length) {
        throw new Error('leftover spec string parts');
    }

    function each(node, next) {
        switch (node.type) {
            case 'spec':
                next();
                break;

            case 'assign':
                stack.push(node.id.name);
                next();
                join(' = ');
                emit(stack.pop());
                break;

            case 'rule':
                next();
                join(' => ');
                emit(stack.pop());
                break;

            case 'when':
                next();
                join(', ');
                break;

            case 'then':
                next();
                join(', ');
                join(', ');
                break;

            case 'thenVal':
                if (node.mode === '|') {
                    next();
                } else {
                    stack.push(node.mode);
                    next();
                    join('');
                }
                break;

            case 'member':
                next();
                wrap('[', ']');
                join('');
                break;

            case 'expr':
                precs.push(opPrec.indexOf(node.op));
                next();
                join(' ' + node.op + ' ');
                if (precs.pop() < precs[precs.length - 1]) {
                    wrap('(', ')');
                }
                break;

            case 'identifier':
            case 'symbol':
                stack.push(node.name);
                next();
                break;

            case 'turns':
                var rle = RLEBuilder('turns(', ' ', ')');
                for (var i = 0; i < node.value.length; i++) {
                    var turn = node.value[i];
                    rle(turn.count.value, TurnSyms[turn.turn]);
                }
                stack.push(rle(0, ''));
                next();
                break;

            case 'turn':
                stack.push(node.names.map(function eachTurnName(name) {
                    return TurnSyms[name];
                }).join('|'));
                break;

            case 'number':
                stack.push(node.value.toString());
                next();
                break;

            default:
                stack.push('/* unsupported ' + JSON.stringify(node) + ' */');
                next();
        }
    }

    function join(sep) {
        var b = stack.pop();
        var a = stack.pop();
        var c = a + sep + b;
        stack.push(c);
    }

    function wrap(pre, post) {
        var i = stack.length - 1;
        stack[i] = pre + stack[i] + post;
    }
}

}],["turmite/lang/walk.js","hexant/turmite/lang","walk.js",{},function (require, exports, module, __filename, __dirname){

// hexant/turmite/lang/walk.js
// ---------------------------

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

            case 'thenVal':
                each(node.value);
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

}],["turmite/parse.js","hexant/turmite","parse.js",{"rezult":58,"../world.js":52,"./rle-builder.js":50,"./constants.js":39,"./lang/parse.js":45},function (require, exports, module, __filename, __dirname){

// hexant/turmite/parse.js
// -----------------------

'use strict';

module.exports = parseTurmite;

var Result = require('rezult');
var World = require('../world.js');
var RLEBuilder = require('./rle-builder.js');
var constants = require('./constants.js');
var parseLang = require('./lang/parse.js');

function parseTurmite(str) {
    var parsers = [
        parseAnt,
        parseLang
    ];
    for (var i = 0; i < parsers.length; i++) {
        var res = parsers[i](str, World);
        if (res.err || res.value) {
            return res;
        }
    }
    return new Result(new Error('invalid spec string'), null);
}

var antCompatPattern = /^\s*([lrwefaLRWEFA]+)\s*$/;
var antPattern = /^\s*ant\(\s*(.+?)\s*\)\s*$/;

var antCompatMap = {
    L: 'L',
    R: 'R',
    W: 'P',
    E: 'S',
    F: 'B',
    A: 'F'
};

function antCompatConvert(str) {
    str = str.toUpperCase();
    var equivMoves = [];
    for (var i = 0; i < str.length; i++) {
        var equivMove = antCompatMap[str[i]];
        if (equivMove === undefined) {
            return undefined;
        }
        equivMoves.push(equivMove);
    }
    return 'ant(' + equivMoves.join(' ') + ')';
}

function parseAnt(str) {
    var match = antCompatPattern.exec(str);
    if (match) {
        str = antCompatConvert(match[1]);
    }

    match = antPattern.exec(str);
    if (!match) {
        return new Result(null, null);
    }
    str = match[1];

    // we'll also build the canonical version of the parsed rule string in the
    // same pass as parsing it; rulestr will be that string, and we'll need
    // some state between arg matches
    var numColors = 0;
    var multurns  = [];

    var re = /\s*\b(\d+)?(?:(B|P|L|F|R|S)|(NW|NO|NE|SE|SO|SW))\b\s*/g;
    str = str.toUpperCase();

    var i = 0;
    for (
        match = re.exec(str);
        match && i === match.index;
        i += match[0].length, match = re.exec(str)
    ) {
        var multurn = {
            mult: 0,
            turn: 0,
            sym: ''
        };
        multurn.mult = match[1] ? parseInt(match[1], 10) : 1;

        if (match[2]) {
            multurn.sym = match[2];
            multurn.turn = constants.RelSymbolTurns[match[2]];
        } else if (match[3]) {
            multurn.sym = match[3];
            multurn.turn = constants.AbsSymbolTurns[match[3]];
        }

        numColors += multurn.mult;
        if (numColors > World.MaxColor) {
            return new Result(
                new Error('too many colors needed for ant ruleset'),
                null);
        }
        multurns.push(multurn);
    }
    // TODO: check if didn't match full input

    return new Result(null, boundCompileAnt);

    function boundCompileAnt(turmite) {
        return compileAnt(multurns, turmite);
    }
}

function compileAnt(multurns, turmite) {
    // TODO: describe
    var numColors    = 0;
    var buildRuleStr = RLEBuilder('ant(', ' ', ')');
    var turns        = [];

    for (var i = 0; i < multurns.length; i++) {
        var mult = multurns[i].mult;
        for (var j = 0; j < mult; j++) {
            turns.push(multurns[i].turn);
        }
        numColors += multurns[i].mult;
        buildRuleStr(multurns[i].mult, multurns[i].sym);
    }

    turmite.clearRules();
    for (var c = 0; c <= World.MaxColor; c++) {
        var turn = turns[c % turns.length];
        var color = c + 1 & World.MaxColor;
        turmite.rules[c] = color << World.TurnShift | turn;
    }

    turmite.state      = 0;
    turmite.specString = buildRuleStr(0, '');
    turmite.numColors  = numColors;
    turmite.numStates  = 1;

    return new Result(null, turmite);
}

}],["turmite/rle-builder.js","hexant/turmite","rle-builder.js",{},function (require, exports, module, __filename, __dirname){

// hexant/turmite/rle-builder.js
// -----------------------------

'use strict';

module.exports = RLEBuilder;

function RLEBuilder(prefix, sep, suffix) {
    build.prefix = prefix;
    build.sep    = sep;
    build.suffix = suffix;
    build.cur    = '';
    build.count  = 0;
    build.str    = build.prefix;
    build.init   = true;
    return build;

    function build(mult, sym) {
        if (build.cur !== sym) {
            if (build.cur && build.count) {
                if (build.init) {
                    build.init = false;
                } else {
                    build.str += build.sep;
                }
                if (build.count > 1) {
                    build.str += build.count.toString();
                }
                build.str += build.cur;
            }
            build.cur = sym || '';
            build.count = 0;
        }
        if (mult === 0 && !sym) {
            var ret     = build.str + build.suffix;
            build.cur   = '';
            build.count = 0;
            build.str   = build.prefix;
            build.init  = false;
            return ret;
        }
        build.count += mult;
        return '';
    }
}

}],["view_gl.js","hexant","view_gl.js",{"./world.js":52,"./coord.js":20,"gl-matrix":3,"./glprogram.js":22,"./glpalette.js":21,"./oddq_point.vert":32,"./hex.frag":24,"./rangelist.js":36,"./tileglbuffer.js":38},function (require, exports, module, __filename, __dirname){

// hexant/view_gl.js
// -----------------

'use strict';

var World = require('./world.js');
var Coord = require('./coord.js');
var vec3 = require('gl-matrix').vec3;
var mat4 = require('gl-matrix').mat4;

var GLProgram = require('./glprogram.js');
var GLPalette = require('./glpalette.js');
var oddqPointShader = require('./oddq_point.vert');
var hexFragShader = require('./hex.frag');
var rangeListAdd = require('./rangelist.js').add;
var collectTombstone = require('./tileglbuffer.js').collectTombstone;
var placeTile = require('./tileglbuffer.js').placeTile;
var Coord = require('./coord.js');

module.exports = ViewGL;

// TODO:
// - in redraw lazily only draw dirty tiles, expand permitting
// - switch to uint32 elements array if supported by extension
// - switch to uint32 for q,r, use a highp in the shader

/* eslint-disable max-statements */

var tau = 2 * Math.PI;
var hexAngStep = tau / 6;
var float2 = 2 * Float32Array.BYTES_PER_ELEMENT;

function ViewGL(world, canvas) {
    this.world = world;
    this.canvas = canvas;

    this.topLeftQ = new Coord.OddQOffset();
    this.bottomRightQ = new Coord.OddQOffset();
    this.topLeft = new Coord.ScreenPoint();
    this.bottomRight = new Coord.ScreenPoint();

    // max uint16 value for elements:
    // TODO: may be able to use uint32 extension
    // TODO: platform may define max in that case? (i.e. it would seem unlikely
    // that we can actually use a full 4Gi vert attribute, let alone that we
    // really don't want to allocate the 224GiB vert + color arrays that it
    // would imply
    this.maxElement = 0xffff;

    this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl') || null;
    if (!this.gl) {
        throw new Error('no webgl support');
    }

    this.perspectiveMatrix = mat4.identity(new Float32Array(16));
    this.hexShader = new GLProgram(this.gl,
        oddqPointShader.linkWith(hexFragShader),
        ['uPMatrix', 'uVP', 'uRadius'],
        ['vert', 'ang', 'color']
    );
    this.uSampler = this.gl.getUniformLocation(this.hexShader.prog, 'uSampler'); // TODO: GLProgram borg

    this.tileWriter = new TileWriter(this.maxElement + 1);
    this.tileBufferer = new TileBufferer(this.gl, this.world, this.tileWriter);
    this.entBuffer = new EntGLBuffer(this.gl, this.hexShader);
    this.maxCellsPerTile = Math.floor((this.maxElement + 1) / this.tileWriter.cellSize);

    this.cellPallete = new GLPalette(this.gl, 0, false);
    this.bodyPallete = new GLPalette(this.gl, 1, false);
    this.headPallete = new GLPalette(this.gl, 2, false);

    // TODO: subsume into GLPalette
    this.colorGen = null;
    this.antCellColorGen = null;
    this.emptyCellColorGen = null;
    this.bodyColorGen = null;
    this.headColorGen = null;

    this.needsRedraw = false;

    this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
    this.hexShader.use();

    this.gl.uniform1f(this.hexShader.uniform.uRadius, 1);

    this.updateSize(); // XXX: drop?
}

ViewGL.prototype.reset =
function reset() {
    var self = this;

    this.tileBufferer.reset();

    this.topLeftQ.q = 0;
    this.topLeftQ.r = 0;
    this.bottomRightQ.q = 0;
    this.bottomRightQ.r = 0;
    this.world.tile.eachTile(this.tileBufferer.drawUnvisited ? eachExpandTo : eachExpandToIf);

    this.updateSize();

    function eachExpandTo(tile) {
        tile.expandBoxTo(self.topLeftQ, self.bottomRightQ);
    }

    function eachExpandToIf(tile) {
        tile.expandBoxToIf(self.topLeftQ, self.bottomRightQ, World.FlagVisited);
    }
};

ViewGL.prototype.expandTo =
function expandTo(pointArg) {
    var expanded = false;
    var point = pointArg.toOddQOffset();

    if (point.q < this.topLeftQ.q) {
        this.topLeftQ.q = point.q;
        expanded = true;
    } else if (point.q >= this.bottomRightQ.q) {
        this.bottomRightQ.q = point.q;
        expanded = true;
    }

    if (point.r < this.topLeftQ.r) {
        this.topLeftQ.r = point.r;
        expanded = true;
    } else if (point.r >= this.bottomRightQ.r) {
        this.bottomRightQ.r = point.r;
        expanded = true;
    }

    return expanded;
};

ViewGL.prototype.updateSize =
function updateSize() {
    this.qrToScreen(this.tileWriter.cellHalfWidth, this.tileWriter.cellHalfHeight);
    fixAspectRatio(
        this.gl.drawingBufferWidth / this.gl.drawingBufferHeight,
        this.topLeft, this.bottomRight);
    mat4.ortho(this.perspectiveMatrix,
        this.topLeft.x, this.bottomRight.x,
        this.bottomRight.y, this.topLeft.y,
        -1, 1);
    this.gl.uniformMatrix4fv(this.hexShader.uniform.uPMatrix, false, this.perspectiveMatrix);
};

ViewGL.prototype.qrToScreen =
function qrToScreen(rx, ry) {
    this.topLeftQ.toScreenInto(this.topLeft);
    this.bottomRightQ.toScreenInto(this.bottomRight);

    this.topLeft.x -= rx;
    this.topLeft.y -= ry;
    this.bottomRight.x += rx;
    this.bottomRight.y += ry;

    // TODO: sometimes over tweaks, but only noticable at small scale
    var oddEnough = (this.bottomRightQ.q - this.topLeftQ.q) > 0;
    if (this.topLeftQ.q & 1) {
        this.topLeft.y -= ry;
    }
    if (this.bottomRightQ.q & 1 || oddEnough) {
        this.bottomRight.y += ry;
    }
};

function fixAspectRatio(aspectRatio, topLeft, bottomRight) {
    var gridWidth = bottomRight.x - topLeft.x;
    var gridHeight = bottomRight.y - topLeft.y;
    var ratio = gridWidth / gridHeight;
    if (ratio < aspectRatio) {
        var dx = gridHeight * aspectRatio / 2 - gridWidth / 2;
        topLeft.x -= dx;
        bottomRight.x += dx;
    } else if (ratio > aspectRatio) {
        var dy = gridWidth / aspectRatio / 2 - gridHeight / 2;
        topLeft.y -= dy;
        bottomRight.y += dy;
    }
}

ViewGL.prototype.setDrawTrace =
function setDrawTrace(dt) {
    this.drawTrace = !!dt;
    this.updateColors();
};

ViewGL.prototype.resize =
function resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
    this.gl.uniform2f(this.hexShader.uniform.uVP, this.canvas.width, this.canvas.height);

    this.updateSize();
    this.redraw();
};

ViewGL.prototype.redraw =
function redraw() {
    // TODO: partial redraws in the non-expanded case

    this.tileBufferer.flush();

    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.hexShader.enable();

    // tiles
    this.cellPallete.use(this.uSampler);
    this.gl.uniform1f(this.hexShader.uniform.uRadius, 1.0);
    this.drawTiles();

    this.gl.enableVertexAttribArray(this.hexShader.attr.ang);

    // ents bodies
    this.bodyPallete.use(this.uSampler);
    this.gl.uniform1f(this.hexShader.uniform.uRadius, 0.5);
    this.entBuffer.drawBodies(this.world);

    // ents heads
    this.headPallete.use(this.uSampler);
    this.gl.uniform1f(this.hexShader.uniform.uRadius, 0.75);
    this.entBuffer.drawHeads(this.world);

    this.hexShader.disable();
    this.gl.finish();

    this.needsRedraw = false;
};

ViewGL.prototype.drawTiles =
function drawTiles() {
    this.gl.disableVertexAttribArray(this.hexShader.attr.ang);
    for (var i = 0; i < this.tileBufferer.tileBuffers.length; ++i) {
        var tileBuffer = this.tileBufferer.tileBuffers[i];
        if (!tileBuffer.tiles.length) {
            continue;
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, tileBuffer.verts.buf);
        this.gl.vertexAttribPointer(this.hexShader.attr.vert, tileBuffer.verts.width, this.gl.FLOAT, false, 0, 0);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, tileBuffer.colors.buf);
        this.gl.vertexAttribPointer(this.hexShader.attr.color, tileBuffer.colors.width, this.gl.UNSIGNED_BYTE, true, 0, 0);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, tileBuffer.elements.buf);
        this.gl.drawElements(this.gl.POINTS, tileBuffer.usedElements, this.gl.UNSIGNED_SHORT, 0);
    }
};

ViewGL.prototype.updateEnts =
function updateEnts() {
    this.updateColors();
};

ViewGL.prototype.addEnt =
function addEnt(i) {
    this.updateColors();
};

ViewGL.prototype.updateEnt =
function updateEnt(i) {
    this.updateColors();
};

ViewGL.prototype.removeEnt =
function removeEnt(i) {
    this.updateColors();
};

ViewGL.prototype.setColorGen =
function setColorGen(colorGen) {
    this.colorGen = colorGen;
    this.emptyCellColorGen = extendColorGen(colorGen(0), World.MaxColor);
    this.antCellColorGen = extendColorGen(colorGen(1), World.MaxColor);
    this.bodyColorGen = colorGen(2);
    this.headColorGen = colorGen(3);
    this.updateColors();
};

ViewGL.prototype.updateColors =
function updateColors() {
    if (this.colorGen == null) return;
    this.cellPallete.setColorsRGB(this.drawTrace
        ? this.emptyCellColorGen(this.world.numColors)
        : this.antCellColorGen(this.world.numColors));
    this.bodyPallete.setColorsRGB(this.bodyColorGen(this.world.ents.length));
    this.headPallete.setColorsRGB(this.headColorGen(this.world.ents.length));
};

ViewGL.prototype.setLabeled =
function setLabeled(labeled) {
    // noop
};

ViewGL.prototype.setDrawUnvisited =
function setDrawUnvisited(drawUnvisited) {
    this.tileBufferer.drawUnvisited = drawUnvisited;
};

ViewGL.prototype.step =
function step() {
    var expanded = false;
    for (var i = 0; i < this.world.ents.length; i++) {
        expanded = this.expandTo(this.world.getEntPos(i)) || expanded;
    }
    if (expanded) {
        this.updateSize();
    }
    this.needsRedraw = true;

    // TODO: consider restoring partial updates
};

function EntGLBuffer(gl, hexShader) {
    this.gl = gl;
    this.hexShader = hexShader;
    this.len = 0;
    this.cap = 0;
    this.verts = null;
    this.colors = null;
    this.bodyVertsBuf = null;
    this.bodyColorsBuf = null;
    this.headVertsBuf = null;
    this.headColorsBuf = null;
}

EntGLBuffer.prototype.free =
function free() {
    this.gl.deleteBuffer(this.bodyVertsBuf);
    this.gl.deleteBuffer(this.bodyColorsBuf);
    this.gl.deleteBuffer(this.headVertsBuf);
    this.gl.deleteBuffer(this.headColorsBuf);
};

EntGLBuffer.prototype.alloc =
function alloc(cap) {
    this.cap = cap;
    this.verts = new Float32Array(this.cap * 4);
    this.colors = new Uint8Array(this.cap * 1);
    this.bodyVertsBuf = this.gl.createBuffer();
    this.bodyColorsBuf = this.gl.createBuffer();
    this.headVertsBuf = this.gl.createBuffer();
    this.headColorsBuf = this.gl.createBuffer();
};

EntGLBuffer.prototype.draw =
function draw(hexShader, vertBuf, colorBuf) {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertBuf);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.verts, this.gl.STATIC_DRAW);
    this.gl.vertexAttribPointer(hexShader.attr.vert, 2, this.gl.FLOAT, false, float2, 0);
    this.gl.vertexAttribPointer(hexShader.attr.ang, 2, this.gl.FLOAT, false, float2, float2);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBuf);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.colors, this.gl.STATIC_DRAW);
    this.gl.vertexAttribPointer(hexShader.attr.color, 1, this.gl.UNSIGNED_BYTE, true, 0, 0);
    this.gl.drawArrays(this.gl.POINTS, 0, this.len);
};

EntGLBuffer.prototype.drawBodies =
function drawBodies(world) {
    var n = world.ents.length;
    if (n > this.len) {
        if (this.len > 0) {
            this.free();
        }
        this.alloc(n);
    }
    var pos = new Coord.OddQOffset(0, 0);
    var i = 0, j = 0, k = 0;
    while (i < n) {
        world.getEntPos(i).toOddQOffsetInto(pos);
        var ang = world.getEntDir(i) * hexAngStep;
        this.verts[j++] = pos.q;
        this.verts[j++] = pos.r;
        this.verts[j++] = ang + hexAngStep;
        this.verts[j++] = ang;
        this.colors[k++] = i;
        i++;
    }
    this.len = n;
    this.draw(this.hexShader, this.bodyVertsBuf, this.bodyColorsBuf);
};

EntGLBuffer.prototype.drawHeads =
function drawHeads(world) {
    var i = 0, j = 0, k = 0;
    while (i < this.len) {
        j += 2;
        var tmp = this.verts[j];
        this.verts[j] = this.verts[j+1];
        this.verts[j+1] = tmp;
        j += 2;
        this.colors[k++] = i;
        i++;
    }
    this.draw(this.hexShader, this.headVertsBuf, this.headColorsBuf);
};

function TileWriter(bufferSize) {
    this.bufferSize = bufferSize;
    this.vertSize = 2;
    this.colorSize = 1;
    this.cellSize = 1;
    this.maxCells = Math.floor(this.bufferSize / this.cellSize);
    if (this.maxCells < 1) {
        throw new Error("can't fit any tiles in that bufferSize");
    }
    this.elementsSize = this.cellSize * this.maxCells + 2 * (this.maxCells - 1);
    this.colors = null;

    /* The vertex order in cellXYs is:
     *       2 1
     *     3     0
     *       4 5
     * So that means:
     * - the n-th x coord is at 2*n
     * - the n-th y coord is at 2*n+1
     */
    this.cellXYs = new Float32Array(12);
    for (var r = 0, i = 0, j = 0; i < 6; i++) {
        this.cellXYs[j++] = Math.cos(r);
        this.cellXYs[j++] = Math.sin(r);
        r += 2 * Math.PI / 6;
    }
    this.cellWidth  = this.cellXYs[2*0]   - this.cellXYs[2*3];
    this.cellHeight = this.cellXYs[2*1+1] - this.cellXYs[2*5+1];
    this.cellHalfWidth = this.cellWidth / 2;
    this.cellHalfHeight = this.cellHeight / 2;
}

TileWriter.prototype.newTileBuffer =
function newTileBuffer(id, gl) {
    var tileBuffer = new TileGLBuffer(id, this);
    tileBuffer.verts = new LazyGLBuffer(gl, gl.ARRAY_BUFFER, this.vertSize, new Float32Array(this.bufferSize * this.vertSize));
    tileBuffer.colors = new LazyGLBuffer(gl, gl.ARRAY_BUFFER, this.colorSize, new Uint8Array(this.bufferSize * this.colorSize));
    tileBuffer.elements = new GLBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, 1, new Uint16Array(this.elementsSize));
    tileBuffer.reset();
    return tileBuffer;
};

TileWriter.prototype.writeTileVerts =
function writeTileVerts(tile, tileBuffer, start) {
    // TODO: maybe use set/copyWithin to stamp out cellXYs
    var glData = tileBuffer.verts.data;
    var loQ = tile.origin.q;
    var loR = tile.origin.r;
    var hiQ = loQ + tile.width;
    var hiR = loR + tile.height;
    var vi = start * this.vertSize;
    var end = start;
    for (var r = loR; r < hiR; r++) {
        for (var q = loQ; q < hiQ; q++) {
            glData[vi++] = q;
            glData[vi++] = r;
            end++;
        }
    }
    tileBuffer.verts.invalidate(start, end);
    return end;
};

TileWriter.prototype.writeTileColors =
function writeTileColors(tile, tileBuffer, start) {
    var glData = tileBuffer.colors.data;
    var ci = start * this.colorSize;
    var end = start;
    for (var i = 0; i < tile.data.length; ++i) {
        glData[ci++] = tile.data[i] & World.MaskColor;
        end++;
    }
    tileBuffer.colors.invalidate(start, end);
    return end;
};

TileWriter.prototype.writeTileElements =
function writeTileElements(tileBuffer, tile, offset) {
    var glData = tileBuffer.elements.data;
    var ei = tileBuffer.usedElements;
    for (var i = 0; i < tile.data.length; ++i) {
        if (this.drawUnvisited || tile.data[i] & World.FlagVisited) {
            glData[ei++] = offset;
        }
        offset++;
    }
    tileBuffer.usedElements = ei;
};

function TileBufferer(gl, world, tileWriter) {
    var self = this;

    this.gl = gl;
    this.world = world;
    this.tileWriter = tileWriter;
    this.drawUnvisited = false;

    this.tileBuffers = [];
    this.bufferForTileId = {};
    this.dirtyTileBuffers = [];

    this.world.tile.tileRemoved = function onWorldTileRemoved(tile) {
        self.onWorldTileRemoved(tile);
    };
}

TileBufferer.prototype.reset =
function reset() {
    this.bufferForTileId = {};
    this.dirtyTileBuffers.length = 0;
    for (var i = 0; i < this.tileBuffers.length; ++i) {
        var tileBuffer = this.tileBuffers[i];
        tileBuffer.reset();
    }
};

TileBufferer.prototype.onWorldTileRemoved =
function onWorldTileRemoved(tile) {
    var bufferId = this.bufferForTileId[tile.id];
    if (bufferId !== undefined) {
        var tileBuffer = this.tileBuffers[bufferId];
        if (!tileBuffer) {
            throw new Error('got tileRemoved for an unknown tile');
        }
        tileBuffer.removeTile(tile.id);
        delete this.bufferForTileId[tile.id];
    }
};

TileBufferer.prototype.flush =
function flush() {
    for (var i = 0; i < this.world.tile.dirtyTiles.length; ++i) {
        var tile = this.world.tile.dirtyTiles[i];
        this.flushTile(tile);
    }
    this.world.tile.dirtyTiles.length = 0;
    for (var i = 0; i < this.dirtyTileBuffers.length; ++i) {
        var tileBuffer = this.dirtyTileBuffers[i];
        this.flushTileBuffer(tileBuffer);
    }
    this.dirtyTileBuffers.length = 0;
};

TileBufferer.prototype.flushTile =
function flushTile(tile) {
    var offset = -1;
    var tileBuffer = null;
    var bufferId = this.bufferForTileId[tile.id];
    if (bufferId !== undefined) {
        tileBuffer = this.tileBuffers[bufferId];
    }
    if (!tileBuffer) {
        for (var i = 0; i < this.tileBuffers.length; ++i) {
            tileBuffer = this.tileBuffers[i];
            offset = tileBuffer.addTile(tile.id, tile.data.length * this.tileWriter.cellSize);
            if (offset >= 0) {
                break;
            }
            tileBuffer = null;
        }
        if (!tileBuffer) {
            tileBuffer = this.tileWriter.newTileBuffer(this.tileBuffers.length, this.gl);
            this.tileBuffers.push(tileBuffer);
            offset = tileBuffer.addTile(tile.id, tile.data.length * this.tileWriter.cellSize);
            if (offset < 0) {
                throw new Error('unable to add tile to new tileBuffer');
            }
        }
        this.bufferForTileId[tile.id] = tileBuffer.id;

        this.tileWriter.writeTileVerts(tile, tileBuffer, offset);
    } else {
        offset = tileBuffer.tileOffset(tile.id);
        if (offset < 0) {
            throw new Error('dissociated tileBuffer.tiles -> tile');
        }
    }
    this.tileWriter.writeTileColors(tile, tileBuffer, offset);
    if (!tileBuffer.dirty) {
        tileBuffer.dirty = true;
        this.dirtyTileBuffers.push(tileBuffer);
    }
    tile.dirty = false;
};

TileBufferer.prototype.flushTileBuffer =
function flushTileBuffer(tileBuffer) {
    tileBuffer.verts.flush();
    tileBuffer.colors.flush();

    tileBuffer.usedElements = 0;
    for (var i = 0; i < tileBuffer.tiles.length; i+=2) {
        var tileId = tileBuffer.tiles[i];
        var tileLength = tileBuffer.tiles[i+1];
        if (tileId !== null) {
            var tile = this.world.tile.getTile(tileId);
            if (!tile) {
                throw new Error('missing tile');
            }
            this.tileWriter.writeTileElements(tileBuffer, tile, tileBuffer.tileOffset(tile.id));
        }
    }

    tileBuffer.elements.ship(0, tileBuffer.usedElements);
    tileBuffer.dirty = false;
};

function TileGLBuffer(id, tileWriter) {
    this.id = id;
    this.tileWriter = tileWriter;
    this.tiles = [];
    this.tileRanges = {};
    this.dirty = false;
    this.verts = null;
    this.colors = null;
    this.elements = null;
    this.usedElements = 0;
    this.capacity = 0;
}

TileGLBuffer.prototype.reset =
function reset() {
    this.tiles.length = 0;
    this.tileRanges = {};
    this.dirty = false;
    this.usedElements = 0;
    this.capacity = this.verts.data.length / this.verts.width;
};

TileGLBuffer.prototype.addTile =
function addTile(id, length) {
    var place = placeTile(this.tiles, this.capacity, length);
    var i = place[0], j = place[1]; // w = place[2]
    if (i < 0) {
        return -1;
    }
    if (i < this.tiles.length) {
        collectTombstone(this.tiles, i, length);
        this.tiles[i] = id;
    } else {
        this.tiles.push(id, length);
    }
    this.tileRanges[id] = [j, j + length];
    return j;
};

TileGLBuffer.prototype.removeTile =
function removeTile(id) {
    delete this.tileRanges[id];
    var i = 0, end = 0;
    for (; i < this.tiles.length; i += 2) {
        end += this.tiles[i+1];
        if (this.tiles[i] === id) {
            // set tombstone...
            this.tiles[i] = null;
            // ...prune trailing tombstones
            while (this.tiles[this.tiles.length - 2] === null) {
                this.tiles.length -= 2;
            }
            break;
        }
    }
};

TileGLBuffer.prototype.tileOffset =
function tileOffset(id) {
    var range = this.tileRanges[id];
    return range ? range[0] : -1;
};

function GLBuffer(gl, type, width, data) {
    this.gl = gl;
    this.type = type;
    this.width = width;
    this.data = data;
    this.buf = this.gl.createBuffer();
    this.gl.bindBuffer(this.type, this.buf);
    this.gl.bufferData(this.type, this.data.byteLength, this.gl.STATIC_DRAW);
}

GLBuffer.prototype.ship =
function ship(lo, hi) {
    var bytesOffset = this.data.BYTES_PER_ELEMENT * lo * this.width;
    var byteLength = (hi - lo) * this.width;
    var subData = new this.data.constructor(this.data.buffer, bytesOffset, byteLength);
    this.gl.bindBuffer(this.type, this.buf);
    this.gl.bufferSubData(this.type, bytesOffset, subData);
};

function LazyGLBuffer(gl, type, width, data) {
    this.inval = [];
    GLBuffer.call(this, gl, type, width, data);
}

LazyGLBuffer.prototype.invalidate =
function invalidate(lo, hi) {
    rangeListAdd(this.inval, lo, hi);
};

LazyGLBuffer.prototype.flush =
function flush() {
    if (!this.inval.length) {
        return;
    }
    this.gl.bindBuffer(this.type, this.buf);
    var i = 0;
    while (i < this.inval.length) {
        var lo = this.inval[i++] * this.width;
        var hi = this.inval[i++] * this.width;
        var bytesOffset = this.data.BYTES_PER_ELEMENT * lo;
        var subData = new this.data.constructor(this.data.buffer, bytesOffset, hi - lo);
        this.gl.bufferSubData(this.type, bytesOffset, subData);
    }
    this.inval.length = 0;
};

function extendColorGen(gen, n) {
    return function extendedColorGen(m) {
        var ar = gen(m);
        m = ar.length;
        if (!m) return ar;
        while (ar.length <= n) ar.push(ar[ar.length % m]);
        return ar;
    };
}

}],["world.js","hexant","world.js",{"./coord.js":20,"./hextiletree.js":28},function (require, exports, module, __filename, __dirname){

// hexant/world.js
// ---------------

'use strict';

var Coord = require('./coord.js');
var HexTileTree = require('./hextiletree.js');
var CubePoint = Coord.CubePoint;

var OddQOffset = Coord.OddQOffset;

var REDRAW_TIMING_WINDOW = 5000;

module.exports = World;

World.StateShift      = 8;
World.ColorShift      = 8;
World.TurnShift       = 16;
World.FlagVisited     = 0x0100;
World.MaskFlags       = 0xff00;
World.MaskColor       = 0x00ff;
World.MaxState        = 0xff;
World.MaxColor        = 0xff;
World.MaxTurn         = 0xffff;
World.MaskResultState = 0xff000000;
World.MaskResultColor = 0x00ff0000;
World.MaskResultTurn  = 0x0000ffff;

function World() {
    this.numColors = 0;
    this.numStates = 0;
    this.tile = new HexTileTree();
    this.ents = [];
    this.views = [];
    this.redrawTiming = [];
}

World.prototype.getEntPos =
function getEntPos(i) {
    // TODO: take ownership of these
    return this.ents[i].pos;
};

World.prototype.getEntDir =
function getEntDir(i) {
    // TODO: take ownership of these
    return this.ents[i].dir;
};

World.prototype.reset =
function reset() {
    this.resetEnt(0);
    this.tile.reset();
    for (var i = 0; i < this.views.length; ++i) {
        this.views[i].reset();
    }
    this.tile.update(this.getEntPos(0), markVisited);
};

World.prototype.resetEnt =
function resetEnt(i) {
    this.ents[i].reset();
    this.ents[i].pos.scale(0); // reset to 0,0
    this.ents[i].dir = 0;
};

World.prototype.turnEnt =
function turnEnt(i, turnFunc) {
    var dir = turnFunc(this.ents[i].dir);
    this.ents[i].dir = dir;
    this.tile.update(
        this.ents[i].pos.add(CubePoint.basis[dir]),
        markVisited);
};

World.prototype.step =
function step() {
    var i;
    for (i = 0; i < this.ents.length; i++) {
        this.ents[i].step(this);
    }
    for (i = 0; i < this.views.length; i++) {
        this.views[i].step();
    }
    this.redraw();
};

World.prototype.stepn =
function stepn(n) {
    for (var i = 0; i < n; i++) {
        var j;
        for (j = 0; j < this.ents.length; j++) {
            this.ents[j].step(this);
        }
        for (j = 0; j < this.views.length; j++) {
            this.views[j].step();
        }
    }
    return this.redraw();
};

World.prototype.redraw =
function redraw() {
    var didredraw = false;
    var t0 = Date.now();
    for (var i = 0; i < this.views.length; i++) {
        var view = this.views[i];
        if (view.needsRedraw) {
            view.redraw();
            didredraw = true;
        }
    }
    var t1 = Date.now();
    if (didredraw) {
        while (t0 - this.redrawTiming[0] > REDRAW_TIMING_WINDOW) {
            this.redrawTiming.shift();
            this.redrawTiming.shift();
        }
        this.redrawTiming.push(t0, t1);
    }
    return didredraw;
};

World.prototype.redrawTimingStats =
function redrawTimingStats() {
    var n = 0, m1 = 0, m2 = 0;
    for (var i = 0; i < this.redrawTiming.length;) {
        var t0 = this.redrawTiming[i++];
        var t1 = this.redrawTiming[i++];
        var dur = t1 - t0;
        var delta = dur - m1;
        m1 += delta / ++n;
        m2 += delta * (dur - m1);
    }
    if (n < 2) {
        return null;
    }
    m2 /= n - 1;
    return {
        n: n,
        m1: m1,
        m2: m2
    };
};

World.prototype.removeEnt =
function removeEnt(ent) {
    if (this.ents[ent.index] !== ent) {
        throw new Error('removeEnt mismatch');
    }
    this._removeEnt(ent.index);
    return ent;
};

World.prototype._removeEnt =
function _removeEnt(i) {
    var j = i++;
    for (; j < this.ents.length; i++, j++) {
        this.ents[i] = this.ents[j];
        this.ents[i].index = i;
    }
    this.ents.pop();

    for (i = 0; i < this.views.length; i++) {
        this.views[i].removeEnt(i);
    }
};

World.prototype.setEnts =
function setEnts(ents) {
    var cons = ents[0].constructor;
    var i;
    var j;
    for (i = 1; i < ents.length; ++i) {
        if (ents[i].constructor !== cons) {
            throw new Error('setEnts must get a list of same-type ents');
        }
    }

    if (ents.length < this.ents.length) {
        for (i = ents.length; i < this.ents.length; i++) {
            for (j = 0; j < this.views.length; j++) {
                this.views[j].removeEnt(i);
            }
        }
        this.ents.length = ents.length;
    }

    var n = this.ents.length;
    for (i = 0; i < ents.length; i++) {
        var ent = ents[i];
        ent.index = i;
        this.ents[i] = ent;
        this.tile.update(ent.pos, markVisited);
    }

    this.numColors = 0;
    this.numStates = 0;
    for (j = 0; j < this.ents.length; j++) {
        this.numColors = Math.max(this.numColors, this.ents[j].numColors);
        this.numStates = Math.max(this.numStates, this.ents[j].numStates);
    }

    for (i = 0; i < n; ++i) {
        for (var j = 0; j < this.views.length; j++) {
            this.views[j].updateEnt(j);
        }
    }
    for (; i < ents.length; ++i) {
        for (var j = 0; j < this.views.length; j++) {
            this.views[j].addEnt(j);
        }
    }

};

World.prototype.addView =
function addView(view) {
    this.views.push(view);
    view.updateEnts();
    return view;
};

function markVisited(data) {
    return World.FlagVisited | data;
}

}],["husl.js","husl","husl.js",{},function (require, exports, module, __filename, __dirname){

// husl/husl.js
// ------------

// Generated by CoffeeScript 1.9.3
(function() {
  var L_to_Y, Y_to_L, conv, distanceFromPole, dotProduct, epsilon, fromLinear, getBounds, intersectLineLine, kappa, lengthOfRayUntilIntersect, m, m_inv, maxChromaForLH, maxSafeChromaForL, refU, refV, root, toLinear;

  m = {
    R: [3.2409699419045214, -1.5373831775700935, -0.49861076029300328],
    G: [-0.96924363628087983, 1.8759675015077207, 0.041555057407175613],
    B: [0.055630079696993609, -0.20397695888897657, 1.0569715142428786]
  };

  m_inv = {
    X: [0.41239079926595948, 0.35758433938387796, 0.18048078840183429],
    Y: [0.21263900587151036, 0.71516867876775593, 0.072192315360733715],
    Z: [0.019330818715591851, 0.11919477979462599, 0.95053215224966058]
  };

  refU = 0.19783000664283681;

  refV = 0.468319994938791;

  kappa = 903.2962962962963;

  epsilon = 0.0088564516790356308;

  getBounds = function(L) {
    var bottom, channel, j, k, len1, len2, m1, m2, m3, ref, ref1, ref2, ret, sub1, sub2, t, top1, top2;
    sub1 = Math.pow(L + 16, 3) / 1560896;
    sub2 = sub1 > epsilon ? sub1 : L / kappa;
    ret = [];
    ref = ['R', 'G', 'B'];
    for (j = 0, len1 = ref.length; j < len1; j++) {
      channel = ref[j];
      ref1 = m[channel], m1 = ref1[0], m2 = ref1[1], m3 = ref1[2];
      ref2 = [0, 1];
      for (k = 0, len2 = ref2.length; k < len2; k++) {
        t = ref2[k];
        top1 = (284517 * m1 - 94839 * m3) * sub2;
        top2 = (838422 * m3 + 769860 * m2 + 731718 * m1) * L * sub2 - 769860 * t * L;
        bottom = (632260 * m3 - 126452 * m2) * sub2 + 126452 * t;
        ret.push([top1 / bottom, top2 / bottom]);
      }
    }
    return ret;
  };

  intersectLineLine = function(line1, line2) {
    return (line1[1] - line2[1]) / (line2[0] - line1[0]);
  };

  distanceFromPole = function(point) {
    return Math.sqrt(Math.pow(point[0], 2) + Math.pow(point[1], 2));
  };

  lengthOfRayUntilIntersect = function(theta, line) {
    var b1, len, m1;
    m1 = line[0], b1 = line[1];
    len = b1 / (Math.sin(theta) - m1 * Math.cos(theta));
    if (len < 0) {
      return null;
    }
    return len;
  };

  maxSafeChromaForL = function(L) {
    var b1, j, len1, lengths, m1, ref, ref1, x;
    lengths = [];
    ref = getBounds(L);
    for (j = 0, len1 = ref.length; j < len1; j++) {
      ref1 = ref[j], m1 = ref1[0], b1 = ref1[1];
      x = intersectLineLine([m1, b1], [-1 / m1, 0]);
      lengths.push(distanceFromPole([x, b1 + x * m1]));
    }
    return Math.min.apply(Math, lengths);
  };

  maxChromaForLH = function(L, H) {
    var hrad, j, l, len1, lengths, line, ref;
    hrad = H / 360 * Math.PI * 2;
    lengths = [];
    ref = getBounds(L);
    for (j = 0, len1 = ref.length; j < len1; j++) {
      line = ref[j];
      l = lengthOfRayUntilIntersect(hrad, line);
      if (l !== null) {
        lengths.push(l);
      }
    }
    return Math.min.apply(Math, lengths);
  };

  dotProduct = function(a, b) {
    var i, j, ref, ret;
    ret = 0;
    for (i = j = 0, ref = a.length - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
      ret += a[i] * b[i];
    }
    return ret;
  };

  fromLinear = function(c) {
    if (c <= 0.0031308) {
      return 12.92 * c;
    } else {
      return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    }
  };

  toLinear = function(c) {
    var a;
    a = 0.055;
    if (c > 0.04045) {
      return Math.pow((c + a) / (1 + a), 2.4);
    } else {
      return c / 12.92;
    }
  };

  conv = {
    'xyz': {},
    'luv': {},
    'lch': {},
    'husl': {},
    'huslp': {},
    'rgb': {},
    'hex': {}
  };

  conv.xyz.rgb = function(tuple) {
    var B, G, R;
    R = fromLinear(dotProduct(m.R, tuple));
    G = fromLinear(dotProduct(m.G, tuple));
    B = fromLinear(dotProduct(m.B, tuple));
    return [R, G, B];
  };

  conv.rgb.xyz = function(tuple) {
    var B, G, R, X, Y, Z, rgbl;
    R = tuple[0], G = tuple[1], B = tuple[2];
    rgbl = [toLinear(R), toLinear(G), toLinear(B)];
    X = dotProduct(m_inv.X, rgbl);
    Y = dotProduct(m_inv.Y, rgbl);
    Z = dotProduct(m_inv.Z, rgbl);
    return [X, Y, Z];
  };

  Y_to_L = function(Y) {
    if (Y <= epsilon) {
      return Y * kappa;
    } else {
      return 116 * Math.pow(Y, 1 / 3) - 16;
    }
  };

  L_to_Y = function(L) {
    if (L <= 8) {
      return L / kappa;
    } else {
      return Math.pow((L + 16) / 116, 3);
    }
  };

  conv.xyz.luv = function(tuple) {
    var L, U, V, X, Y, Z, varU, varV;
    X = tuple[0], Y = tuple[1], Z = tuple[2];
    if (Y === 0) {
      return [0, 0, 0];
    }
    L = Y_to_L(Y);
    varU = (4 * X) / (X + (15 * Y) + (3 * Z));
    varV = (9 * Y) / (X + (15 * Y) + (3 * Z));
    U = 13 * L * (varU - refU);
    V = 13 * L * (varV - refV);
    return [L, U, V];
  };

  conv.luv.xyz = function(tuple) {
    var L, U, V, X, Y, Z, varU, varV;
    L = tuple[0], U = tuple[1], V = tuple[2];
    if (L === 0) {
      return [0, 0, 0];
    }
    varU = U / (13 * L) + refU;
    varV = V / (13 * L) + refV;
    Y = L_to_Y(L);
    X = 0 - (9 * Y * varU) / ((varU - 4) * varV - varU * varV);
    Z = (9 * Y - (15 * varV * Y) - (varV * X)) / (3 * varV);
    return [X, Y, Z];
  };

  conv.luv.lch = function(tuple) {
    var C, H, Hrad, L, U, V;
    L = tuple[0], U = tuple[1], V = tuple[2];
    C = Math.sqrt(Math.pow(U, 2) + Math.pow(V, 2));
    if (C < 0.00000001) {
      H = 0;
    } else {
      Hrad = Math.atan2(V, U);
      H = Hrad * 360 / 2 / Math.PI;
      if (H < 0) {
        H = 360 + H;
      }
    }
    return [L, C, H];
  };

  conv.lch.luv = function(tuple) {
    var C, H, Hrad, L, U, V;
    L = tuple[0], C = tuple[1], H = tuple[2];
    Hrad = H / 360 * 2 * Math.PI;
    U = Math.cos(Hrad) * C;
    V = Math.sin(Hrad) * C;
    return [L, U, V];
  };

  conv.husl.lch = function(tuple) {
    var C, H, L, S, max;
    H = tuple[0], S = tuple[1], L = tuple[2];
    if (L > 99.9999999 || L < 0.00000001) {
      C = 0;
    } else {
      max = maxChromaForLH(L, H);
      C = max / 100 * S;
    }
    return [L, C, H];
  };

  conv.lch.husl = function(tuple) {
    var C, H, L, S, max;
    L = tuple[0], C = tuple[1], H = tuple[2];
    if (L > 99.9999999 || L < 0.00000001) {
      S = 0;
    } else {
      max = maxChromaForLH(L, H);
      S = C / max * 100;
    }
    return [H, S, L];
  };

  conv.huslp.lch = function(tuple) {
    var C, H, L, S, max;
    H = tuple[0], S = tuple[1], L = tuple[2];
    if (L > 99.9999999 || L < 0.00000001) {
      C = 0;
    } else {
      max = maxSafeChromaForL(L);
      C = max / 100 * S;
    }
    return [L, C, H];
  };

  conv.lch.huslp = function(tuple) {
    var C, H, L, S, max;
    L = tuple[0], C = tuple[1], H = tuple[2];
    if (L > 99.9999999 || L < 0.00000001) {
      S = 0;
    } else {
      max = maxSafeChromaForL(L);
      S = C / max * 100;
    }
    return [H, S, L];
  };

  conv.rgb.hex = function(tuple) {
    var ch, hex, j, len1;
    hex = "#";
    for (j = 0, len1 = tuple.length; j < len1; j++) {
      ch = tuple[j];
      ch = Math.round(ch * 1e6) / 1e6;
      if (ch < 0 || ch > 1) {
        throw new Error("Illegal rgb value: " + ch);
      }
      ch = Math.round(ch * 255).toString(16);
      if (ch.length === 1) {
        ch = "0" + ch;
      }
      hex += ch;
    }
    return hex;
  };

  conv.hex.rgb = function(hex) {
    var b, g, j, len1, n, r, ref, results;
    if (hex.charAt(0) === "#") {
      hex = hex.substring(1, 7);
    }
    r = hex.substring(0, 2);
    g = hex.substring(2, 4);
    b = hex.substring(4, 6);
    ref = [r, g, b];
    results = [];
    for (j = 0, len1 = ref.length; j < len1; j++) {
      n = ref[j];
      results.push(parseInt(n, 16) / 255);
    }
    return results;
  };

  conv.lch.rgb = function(tuple) {
    return conv.xyz.rgb(conv.luv.xyz(conv.lch.luv(tuple)));
  };

  conv.rgb.lch = function(tuple) {
    return conv.luv.lch(conv.xyz.luv(conv.rgb.xyz(tuple)));
  };

  conv.husl.rgb = function(tuple) {
    return conv.lch.rgb(conv.husl.lch(tuple));
  };

  conv.rgb.husl = function(tuple) {
    return conv.lch.husl(conv.rgb.lch(tuple));
  };

  conv.huslp.rgb = function(tuple) {
    return conv.lch.rgb(conv.huslp.lch(tuple));
  };

  conv.rgb.huslp = function(tuple) {
    return conv.lch.huslp(conv.rgb.lch(tuple));
  };

  root = {};

  root.fromRGB = function(R, G, B) {
    return conv.rgb.husl([R, G, B]);
  };

  root.fromHex = function(hex) {
    return conv.rgb.husl(conv.hex.rgb(hex));
  };

  root.toRGB = function(H, S, L) {
    return conv.husl.rgb([H, S, L]);
  };

  root.toHex = function(H, S, L) {
    return conv.rgb.hex(conv.husl.rgb([H, S, L]));
  };

  root.p = {};

  root.p.toRGB = function(H, S, L) {
    return conv.xyz.rgb(conv.luv.xyz(conv.lch.luv(conv.huslp.lch([H, S, L]))));
  };

  root.p.toHex = function(H, S, L) {
    return conv.rgb.hex(conv.xyz.rgb(conv.luv.xyz(conv.lch.luv(conv.huslp.lch([H, S, L])))));
  };

  root.p.fromRGB = function(R, G, B) {
    return conv.lch.huslp(conv.luv.lch(conv.xyz.luv(conv.rgb.xyz([R, G, B]))));
  };

  root.p.fromHex = function(hex) {
    return conv.lch.huslp(conv.luv.lch(conv.xyz.luv(conv.rgb.xyz(conv.hex.rgb(hex)))));
  };

  root._conv = conv;

  root._getBounds = getBounds;

  root._maxChromaForLH = maxChromaForLH;

  root._maxSafeChromaForL = maxSafeChromaForL;

  if (!((typeof module !== "undefined" && module !== null) || (typeof jQuery !== "undefined" && jQuery !== null) || (typeof requirejs !== "undefined" && requirejs !== null))) {
    this.HUSL = root;
  }

  if (typeof module !== "undefined" && module !== null) {
    module.exports = root;
  }

  if (typeof jQuery !== "undefined" && jQuery !== null) {
    jQuery.husl = root;
  }

  if ((typeof requirejs !== "undefined" && requirejs !== null) && (typeof define !== "undefined" && define !== null)) {
    define(root);
  }

}).call(this);

}],["koerper.js","koerper","koerper.js",{"wizdom":59},function (require, exports, module, __filename, __dirname){

// koerper/koerper.js
// ------------------

"use strict";

var BaseDocument = require("wizdom");
var BaseNode = BaseDocument.prototype.Node;
var BaseElement = BaseDocument.prototype.Element;
var BaseTextNode = BaseDocument.prototype.TextNode;

module.exports = Document;
function Document(actualNode) {
    Node.call(this, this);
    this.actualNode = actualNode;
    this.actualDocument = actualNode.ownerDocument;

    this.documentElement = this.createBody();
    this.documentElement.parentNode = this;
    actualNode.appendChild(this.documentElement.actualNode);

    this.firstChild = this.documentElement;
    this.lastChild = this.documentElement;
}

Document.prototype = Object.create(BaseDocument.prototype);
Document.prototype.Node = Node;
Document.prototype.Element = Element;
Document.prototype.TextNode = TextNode;
Document.prototype.Body = Body;
Document.prototype.OpaqueHtml = OpaqueHtml;

Document.prototype.createBody = function (label) {
    return new this.Body(this, label);
};

Document.prototype.getActualParent = function () {
    return this.actualNode;
};

function Node(document) {
    BaseNode.call(this, document);
    this.actualNode = null;
}

Node.prototype = Object.create(BaseNode.prototype);
Node.prototype.constructor = Node;

Node.prototype.insertBefore = function insertBefore(childNode, nextSibling) {
    if (nextSibling && nextSibling.parentNode !== this) {
        throw new Error("Can't insert before node that is not a child of parent");
    }
    BaseNode.prototype.insertBefore.call(this, childNode, nextSibling);
    var actualParentNode = this.getActualParent();
    var actualNextSibling;
    if (nextSibling) {
        actualNextSibling = nextSibling.getActualFirstChild();
    }
    if (!actualNextSibling) {
        actualNextSibling = this.getActualNextSibling();
    }
    if (actualNextSibling && actualNextSibling.parentNode !== actualParentNode) {
        actualNextSibling = null;
    }
    actualParentNode.insertBefore(childNode.actualNode, actualNextSibling || null);
    childNode.inject();
    return childNode;
};

Node.prototype.removeChild = function removeChild(childNode) {
    if (!childNode) {
        throw new Error("Can't remove child " + childNode);
    }
    childNode.extract();
    this.getActualParent().removeChild(childNode.actualNode);
    BaseNode.prototype.removeChild.call(this, childNode);
};

Node.prototype.setAttribute = function setAttribute(key, value) {
    this.actualNode.setAttribute(key, value);
};

Node.prototype.getAttribute = function getAttribute(key) {
    this.actualNode.getAttribute(key);
};

Node.prototype.hasAttribute = function hasAttribute(key) {
    this.actualNode.hasAttribute(key);
};

Node.prototype.removeAttribute = function removeAttribute(key) {
    this.actualNode.removeAttribute(key);
};

Node.prototype.addEventListener = function addEventListener(name, handler, capture) {
    this.actualNode.addEventListener(name, handler, capture);
};

Node.prototype.removeEventListener = function removeEventListener(name, handler, capture) {
    this.actualNode.removeEventListener(name, handler, capture);
};

Node.prototype.inject = function injectNode() { };

Node.prototype.extract = function extractNode() { };

Node.prototype.getActualParent = function () {
    return this.actualNode;
};

Node.prototype.getActualFirstChild = function () {
    return this.actualNode;
};

Node.prototype.getActualNextSibling = function () {
    return null;
};

Object.defineProperty(Node.prototype, "innerHTML", {
    get: function () {
        return this.actualNode.innerHTML;
    }//,
    //set: function (html) {
    //    // TODO invalidate any subcontained child nodes
    //    this.actualNode.innerHTML = html;
    //}
});

function Element(document, type, namespace) {
    BaseNode.call(this, document, namespace);
    if (namespace) {
        this.actualNode = document.actualDocument.createElementNS(namespace, type);
    } else {
        this.actualNode = document.actualDocument.createElement(type);
    }
    this.attributes = this.actualNode.attributes;
}

Element.prototype = Object.create(Node.prototype);
Element.prototype.constructor = Element;
Element.prototype.nodeType = 1;

function TextNode(document, text) {
    Node.call(this, document);
    this.actualNode = document.actualDocument.createTextNode(text);
}

TextNode.prototype = Object.create(Node.prototype);
TextNode.prototype.constructor = TextNode;
TextNode.prototype.nodeType = 3;

Object.defineProperty(TextNode.prototype, "data", {
    set: function (data) {
        this.actualNode.data = data;
    },
    get: function () {
        return this.actualNode.data;
    }
});

// if parentNode is null, the body is extracted
// if parentNode is non-null, the body is inserted
function Body(document, label) {
    Node.call(this, document);
    this.actualNode = document.actualDocument.createTextNode("");
    //this.actualNode = document.actualDocument.createComment(label || "");
    this.actualFirstChild = null;
    this.actualBody = document.actualDocument.createElement("BODY");
}

Body.prototype = Object.create(Node.prototype);
Body.prototype.constructor = Body;
Body.prototype.nodeType = 13;

Body.prototype.extract = function extract() {
    var body = this.actualBody;
    var lastChild = this.actualNode;
    var parentNode = this.parentNode.getActualParent();
    var at = this.getActualFirstChild();
    var next;
    while (at && at !== lastChild) {
        next = at.nextSibling;
        if (body) {
            body.appendChild(at);
        } else {
            parentNode.removeChild(at);
        }
        at = next;
    }
};

Body.prototype.inject = function inject() {
    if (!this.parentNode) {
        throw new Error("Can't inject without a parent node");
    }
    var body = this.actualBody;
    var lastChild = this.actualNode;
    var parentNode = this.parentNode.getActualParent();
    var at = body.firstChild;
    var next;
    while (at) {
        next = at.nextSibling;
        parentNode.insertBefore(at, lastChild);
        at = next;
    }
};

Body.prototype.getActualParent = function () {
    if (this.parentNode) {
        return this.parentNode.getActualParent();
    } else {
        return this.actualBody;
    }
};

Body.prototype.getActualFirstChild = function () {
    if (this.firstChild) {
        return this.firstChild.getActualFirstChild();
    } else {
        return this.actualNode;
    }
};

Body.prototype.getActualNextSibling = function () {
    return this.actualNode;
};

Object.defineProperty(Body.prototype, "innerHTML", {
    get: function () {
        if (this.parentNode) {
            this.extract();
            var html = this.actualBody.innerHTML;
            this.inject();
            return html;
        } else {
            return this.actualBody.innerHTML;
        }
    },
    set: function (html) {
        if (this.parentNode) {
            this.extract();
            this.actualBody.innerHTML = html;
            this.firstChild = this.lastChild = new OpaqueHtml(
                this.ownerDocument,
                this.actualBody
            );
            this.inject();
        } else {
            this.actualBody.innerHTML = html;
            this.firstChild = this.lastChild = new OpaqueHtml(
                this.ownerDocument,
                this.actualBody
            );
        }
        return html;
    }
});

function OpaqueHtml(ownerDocument, body) {
    Node.call(this, ownerDocument);
    this.actualFirstChild = body.firstChild;
}

OpaqueHtml.prototype = Object.create(Node.prototype);
OpaqueHtml.prototype.constructor = OpaqueHtml;

OpaqueHtml.prototype.getActualFirstChild = function getActualFirstChild() {
    return this.actualFirstChild;
};

}],["lib/nearley.js","nearley/lib","nearley.js",{},function (require, exports, module, __filename, __dirname){

// nearley/lib/nearley.js
// ----------------------

(function () {
function Rule(name, symbols, postprocess) {
    this.name = name;
    this.symbols = symbols;        // a list of literal | regex class | nonterminal
    this.postprocess = postprocess;
    return this;
}

Rule.prototype.toString = function(withCursorAt) {
    function stringifySymbolSequence (e) {
        return (e.literal) ? JSON.stringify(e.literal)
                           : e.toString();
    }
    var symbolSequence = (typeof withCursorAt === "undefined")
                         ? this.symbols.map(stringifySymbolSequence).join(' ')
                         : (   this.symbols.slice(0, withCursorAt).map(stringifySymbolSequence).join(' ')
                             + " ● "
                             + this.symbols.slice(withCursorAt).map(stringifySymbolSequence).join(' ')     );
    return this.name + " → " + symbolSequence;
}


// a State is a rule at a position from a given starting point in the input stream (reference)
function State(rule, expect, reference) {
    this.rule = rule;
    this.expect = expect;
    this.reference = reference;
    this.data = [];
}

State.prototype.toString = function() {
    return "{" + this.rule.toString(this.expect) + "}, from: " + (this.reference || 0);
};

State.prototype.nextState = function(data) {
    var state = new State(this.rule, this.expect + 1, this.reference);
    state.data = this.data.slice(0);  // make a cheap copy of currentState's data
    state.data.push(data);            // append the passed data
    return state;
};

State.prototype.consumeTerminal = function(inp) {
    var val = false;
    if (this.rule.symbols[this.expect]) {                  // is there a symbol to test?
       if (this.rule.symbols[this.expect].test) {          // is the symbol a regex?
          if (this.rule.symbols[this.expect].test(inp)) {  // does the regex match
             val = this.nextState(inp);  // nextState on a successful regex match
          }
       } else {   // not a regex, must be a literal
          if (this.rule.symbols[this.expect].literal === inp) {
             val = this.nextState(inp);  // nextState on a successful literal match
          }
       }
    }
    return val;
};

State.prototype.consumeNonTerminal = function(inp) {
    if (this.rule.symbols[this.expect] === inp) {
        return this.nextState(inp);
    }
    return false;
};

State.prototype.process = function(location, table, rules, addedRules) {
    if (this.expect === this.rule.symbols.length) {
        // I have completed a rule
        if (this.rule.postprocess) {
            this.data = this.rule.postprocess(this.data, this.reference, Parser.fail);
        }
        if (!(this.data === Parser.fail)) {
            var w = 0;
            // We need a while here because the empty rule will
            // modify table[reference]. (when location === reference)
            var s,x;
            while (w < table[this.reference].length) {
                s = table[this.reference][w];
                x = s.consumeNonTerminal(this.rule.name);
                if (x) {
                    x.data[x.data.length-1] = this.data;
                    table[location].push(x);
                }
                w++;
            }

            // --- The comment below is OUTDATED. It's left so that future
            // editors know not to try and do that.

            // Remove this rule from "addedRules" so that another one can be
            // added if some future added rule requires it.
            // Note: I can be optimized by someone clever and not-lazy. Somehow
            // queue rules so that everything that this completion "spawns" can
            // affect the rest of the rules yet-to-be-added-to-the-table.
            // Maybe.

            // I repeat, this is a *bad* idea.

            // var i = addedRules.indexOf(this.rule);
            // if (i !== -1) {
            //     addedRules.splice(i, 1);
            // }
        }
    } else {
        // In case I missed an older nullable's sweep, update yourself. See
        // above context for why this makes sense.

        var ind = table[location].indexOf(this);
        for (var i=0; i<ind; i++) {
            var state = table[location][i];
            if (state.rule.symbols.length === state.expect && state.reference === location) {
                var x = this.consumeNonTerminal(state.rule.name);
                if (x) {
                    x.data[x.data.length-1] = state.data;
                    table[location].push(x);
                }
            }
        }

        // I'm not done, but I can predict something
        var exp = this.rule.symbols[this.expect];

        // for each rule
        var me = this;
        rules.forEach(function(r) {
            // if I expect it, and it hasn't been added already
            if (r.name === exp && addedRules.indexOf(r) === -1) {
                // Make a note that you've added it already, and don't need to
                // add it again; otherwise left recursive rules are going to go
                // into an infinite loop by adding themselves over and over
                // again.

                // If it's the null rule, however, you don't do this because it
                // affects the current table row, so you might need it to be
                // called again later. Instead, I just insert a copy whose
                // state has been advanced one position (since that's all the
                // null rule means anyway)

                if (r.symbols.length > 0) {
                    addedRules.push(r);
                    table[location].push(new State(r, 0, location));
                } else {
                    // Empty rule
                    // This is special
                    var copy = me.consumeNonTerminal(r.name);
                    if (r.postprocess) {
                        copy.data[copy.data.length-1] = r.postprocess([], this.reference);
                    } else {
                        copy.data[copy.data.length-1] = [];
                    }
                    table[location].push(copy);
                }
            }
        });
    }
};



function Parser(rules, start) {
    var table = this.table = [];
    this.rules = rules.map(function (r) { return (new Rule(r.name, r.symbols, r.postprocess)); });
    this.start = start = start || this.rules[0].name;
    // Setup a table
    var addedRules = [];
    this.table.push([]);
    // I could be expecting anything.
    this.rules.forEach(function (r) {
        if (r.name === start) {  // add all rules named start
            addedRules.push(r);
            table[0].push(new State(r, 0, 0));
        }});  // this should refer to this object, not each rule inside the forEach
    this.advanceTo(0, addedRules);
    this.current = 0;
}

// create a reserved token for indicating a parse fail
Parser.fail = {};

Parser.prototype.advanceTo = function(n, addedRules) {
    // Advance a table, take the closure of .process for location n in the input stream
    var w = 0;
    while (w < this.table[n].length) {
        (this.table[n][w]).process(n, this.table, this.rules, addedRules);
        w++;
    }
}

Parser.prototype.feed = function(chunk) {
    for (var chunkPos = 0; chunkPos < chunk.length; chunkPos++) {
        // We add new states to table[current+1]
        this.table.push([]);

        // Advance all tokens that expect the symbol
        // So for each state in the previous row,

        for (var w = 0; w < this.table[this.current + chunkPos].length; w++) {
            var s = this.table[this.current + chunkPos][w];
            var x = s.consumeTerminal(chunk[chunkPos]);      // Try to consume the token
            if (x) {
                // And then add it
                this.table[this.current + chunkPos + 1].push(x);
            }
        }

        // Next, for each of the rules, we either
        // (a) complete it, and try to see if the reference row expected that
        //     rule
        // (b) predict the next nonterminal it expects by adding that
        //     nonterminal's start state
        // To prevent duplication, we also keep track of rules we have already
        // added

        var addedRules = [];
        this.advanceTo(this.current + chunkPos + 1, addedRules);

        // If needed, throw an error:
        if (this.table[this.table.length-1].length === 0) {
            // No states at all! This is not good.
            var err = new Error(
                "nearley: No possible parsings (@" + (this.current + chunkPos)
                    + ": '" + chunk[chunkPos] + "')."
            );
            err.offset = this.current + chunkPos;
            throw err;
        }
    }

    this.current += chunkPos;
    // Incrementally keep track of results
    this.results = this.finish();

    // Allow chaining, for whatever it's worth
    return this;
};

Parser.prototype.finish = function() {
    // Return the possible parsings
    var considerations = [];
    var myself = this;
    this.table[this.table.length-1].forEach(function (t) {
        if (t.rule.name === myself.start
                && t.expect === t.rule.symbols.length
                && t.reference === 0
                && t.data !== Parser.fail) {
            considerations.push(t);
        }
    });
    return considerations.map(function(c) {return c.data; });
};

var nearley = {
    Parser: Parser,
    Rule: Rule
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
   module.exports = nearley;
} else {
   window.nearley = nearley;
}
})();

}],["lib/performance-now.js","performance-now/lib","performance-now.js",{},function (require, exports, module, __filename, __dirname){

// performance-now/lib/performance-now.js
// --------------------------------------

// Generated by CoffeeScript 1.6.3
(function() {
  var getNanoSeconds, hrtime, loadTime;

  if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
    module.exports = function() {
      return performance.now();
    };
  } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
    module.exports = function() {
      return (getNanoSeconds() - loadTime) / 1e6;
    };
    hrtime = process.hrtime;
    getNanoSeconds = function() {
      var hr;
      hr = hrtime();
      return hr[0] * 1e9 + hr[1];
    };
    loadTime = getNanoSeconds();
  } else if (Date.now) {
    module.exports = function() {
      return Date.now() - loadTime;
    };
    loadTime = Date.now();
  } else {
    module.exports = function() {
      return new Date().getTime() - loadTime;
    };
    loadTime = new Date().getTime();
  }

}).call(this);

/*
//@ sourceMappingURL=performance-now.map
*/

}],["index.js","raf","index.js",{"performance-now":56},function (require, exports, module, __filename, __dirname){

// raf/index.js
// ------------

var now = require('performance-now')
  , global = typeof window === 'undefined' ? {} : window
  , vendors = ['moz', 'webkit']
  , suffix = 'AnimationFrame'
  , raf = global['request' + suffix]
  , caf = global['cancel' + suffix] || global['cancelRequest' + suffix]
  , isNative = true

for(var i = 0; i < vendors.length && !raf; i++) {
  raf = global[vendors[i] + 'Request' + suffix]
  caf = global[vendors[i] + 'Cancel' + suffix]
      || global[vendors[i] + 'CancelRequest' + suffix]
}

// Some versions of FF have rAF but not cAF
if(!raf || !caf) {
  isNative = false

  var last = 0
    , id = 0
    , queue = []
    , frameDuration = 1000 / 60

  raf = function(callback) {
    if(queue.length === 0) {
      var _now = now()
        , next = Math.max(0, frameDuration - (_now - last))
      last = next + _now
      setTimeout(function() {
        var cp = queue.slice(0)
        // Clear queue here to prevent
        // callbacks from appending listeners
        // to the current frame's queue
        queue.length = 0
        for(var i = 0; i < cp.length; i++) {
          if(!cp[i].cancelled) {
            try{
              cp[i].callback(last)
            } catch(e) {
              setTimeout(function() { throw e }, 0)
            }
          }
        }
      }, Math.round(next))
    }
    queue.push({
      handle: ++id,
      callback: callback,
      cancelled: false
    })
    return id
  }

  caf = function(handle) {
    for(var i = 0; i < queue.length; i++) {
      if(queue[i].handle === handle) {
        queue[i].cancelled = true
      }
    }
  }
}

module.exports = function(fn) {
  // Wrap in a new function to prevent
  // `cancel` potentially being assigned
  // to the native rAF function
  if(!isNative) {
    return raf.call(global, fn)
  }
  return raf.call(global, function() {
    try{
      fn.apply(this, arguments)
    } catch(e) {
      setTimeout(function() { throw e }, 0)
    }
  })
}
module.exports.cancel = function() {
  caf.apply(global, arguments)
}

}],["index.js","rezult","index.js",{},function (require, exports, module, __filename, __dirname){

// rezult/index.js
// ---------------

"use strict";

module.exports = Result;

function Result(err, value) {
    var self = this;
    self.err = err || null;
    self.value = value;
}

Result.prototype.toValue = function toValue() {
    var self = this;
    if (self.err) {
        throw self.err;
    } else {
        return self.value;
    }
};

Result.prototype.toCallback = function toCallback(callback) {
    var self = this;
    callback(self.err, self.value);
};

Result.just = function just(value) {
    return new Result(null, value);
};

Result.error = function error(err) {
    return new Result(err, null);
};

Result.lift = function lift(func) {
    return function rezultLifted() {
        try {
            return Result.just(func.apply(this, arguments));
        } catch(err) {
            return Result.error(err);
        }
    };
};

}],["dom.js","wizdom","dom.js",{},function (require, exports, module, __filename, __dirname){

// wizdom/dom.js
// -------------

"use strict";

module.exports = Document;
function Document(namespace) {
    this.doctype = null;
    this.documentElement = null;
    this.namespaceURI = namespace || "";
}

Document.prototype.nodeType = 9;
Document.prototype.Node = Node;
Document.prototype.Element = Element;
Document.prototype.TextNode = TextNode;
Document.prototype.Comment = Comment;
Document.prototype.Attr = Attr;
Document.prototype.NamedNodeMap = NamedNodeMap;

Document.prototype.createTextNode = function (text) {
    return new this.TextNode(this, text);
};

Document.prototype.createComment = function (text) {
    return new this.Comment(this, text);
};

Document.prototype.createElement = function (type, namespace) {
    return new this.Element(this, type, namespace || this.namespaceURI);
};

Document.prototype.createElementNS = function (namespace, type) {
    return new this.Element(this, type, namespace || this.namespaceURI);
};

Document.prototype.createAttribute = function (name, namespace) {
    return new this.Attr(this, name, namespace || this.namespaceURI);
};

Document.prototype.createAttributeNS = function (namespace, name) {
    return new this.Attr(this, name, namespace || this.namespaceURI);
};

function Node(document) {
    this.ownerDocument = document;
    this.parentNode = null;
    this.firstChild = null;
    this.lastChild = null;
    this.previousSibling = null;
    this.nextSibling = null;
}

Node.prototype.appendChild = function appendChild(childNode) {
    return this.insertBefore(childNode, null);
};

Node.prototype.insertBefore = function insertBefore(childNode, nextSibling) {
    if (!childNode) {
        throw new Error("Can't insert null child");
    }
    if (childNode.ownerDocument !== this.ownerDocument) {
        throw new Error("Can't insert child from foreign document");
    }
    if (childNode.parentNode) {
        childNode.parentNode.removeChild(childNode);
    }
    var previousSibling;
    if (nextSibling) {
        previousSibling = nextSibling.previousSibling;
    } else {
        previousSibling = this.lastChild;
    }
    if (previousSibling) {
        previousSibling.nextSibling = childNode;
    }
    if (nextSibling) {
        nextSibling.previousSibling = childNode;
    }
    childNode.nextSibling = nextSibling;
    childNode.previousSibling = previousSibling;
    childNode.parentNode = this;
    if (!nextSibling) {
        this.lastChild = childNode;
    }
    if (!previousSibling) {
        this.firstChild = childNode;
    }
};

Node.prototype.removeChild = function removeChild(childNode) {
    if (!childNode) {
        throw new Error("Can't remove null child");
    }
    var parentNode = childNode.parentNode;
    if (parentNode !== this) {
        throw new Error("Can't remove node that is not a child of parent");
    }
    if (childNode === parentNode.firstChild) {
        parentNode.firstChild = childNode.nextSibling;
    }
    if (childNode === parentNode.lastChild) {
        parentNode.lastChild = childNode.previousSibling;
    }
    if (childNode.previousSibling) {
        childNode.previousSibling.nextSibling = childNode.nextSibling;
    }
    if (childNode.nextSibling) {
        childNode.nextSibling.previousSibling = childNode.previousSibling;
    }
    childNode.previousSibling = null;
    childNode.parentNode = null;
    childNode.nextSibling = null;
    return childNode;
};

function TextNode(document, text) {
    Node.call(this, document);
    this.data = text;
}

TextNode.prototype = Object.create(Node.prototype);
TextNode.prototype.constructor = TextNode;
TextNode.prototype.nodeType = 3;

function Comment(document, text) {
    Node.call(this, document);
    this.data = text;
}

Comment.prototype = Object.create(Node.prototype);
Comment.prototype.constructor = Comment;
Comment.prototype.nodeType = 8;

function Element(document, type, namespace) {
    Node.call(this, document);
    this.tagName = type;
    this.namespaceURI = namespace;
    this.attributes = new this.ownerDocument.NamedNodeMap();
}

Element.prototype = Object.create(Node.prototype);
Element.prototype.constructor = Element;
Element.prototype.nodeType = 1;

Element.prototype.hasAttribute = function (name, namespace) {
    var attr = this.attributes.getNamedItem(name, namespace);
    return !!attr;
};

Element.prototype.getAttribute = function (name, namespace) {
    var attr = this.attributes.getNamedItem(name, namespace);
    return attr ? attr.value : null;
};

Element.prototype.setAttribute = function (name, value, namespace) {
    var attr = this.ownerDocument.createAttribute(name, namespace);
    attr.value = value;
    this.attributes.setNamedItem(attr, namespace);
};

Element.prototype.removeAttribute = function (name, namespace) {
    this.attributes.removeNamedItem(name, namespace);
};

Element.prototype.hasAttributeNS = function (namespace, name) {
    return this.hasAttribute(name, namespace);
};

Element.prototype.getAttributeNS = function (namespace, name) {
    return this.getAttribute(name, namespace);
};

Element.prototype.setAttributeNS = function (namespace, name, value) {
    this.setAttribute(name, value, namespace);
};

Element.prototype.removeAttributeNS = function (namespace, name) {
    this.removeAttribute(name, namespace);
};

function Attr(ownerDocument, name, namespace) {
    this.ownerDocument = ownerDocument;
    this.name = name;
    this.value = null;
    this.namespaceURI = namespace;
}

Attr.prototype.nodeType = 2;

function NamedNodeMap() {
    this.length = 0;
}

NamedNodeMap.prototype.getNamedItem = function (name, namespace) {
    namespace = namespace || "";
    var key = encodeURIComponent(namespace) + ":" + encodeURIComponent(name);
    return this[key];
};

NamedNodeMap.prototype.setNamedItem = function (attr) {
    var namespace = attr.namespaceURI || "";
    var name = attr.name;
    var key = encodeURIComponent(namespace) + ":" + encodeURIComponent(name);
    var previousAttr = this[key];
    if (!previousAttr) {
        this[this.length] = attr;
        this.length++;
        previousAttr = null;
    }
    this[key] = attr;
    return previousAttr;
};

NamedNodeMap.prototype.removeNamedItem = function (name, namespace) {
    namespace = namespace || "";
    var key = encodeURIComponent(namespace) + ":" + encodeURIComponent(name);
    var attr = this[key];
    if (!attr) {
        throw new Error("Not found");
    }
    var index = Array.prototype.indexOf.call(this, attr);
    delete this[key];
    delete this[index];
    this.length--;
};

NamedNodeMap.prototype.item = function (index) {
    return this[index];
};

NamedNodeMap.prototype.getNamedItemNS = function (namespace, name) {
    return this.getNamedItem(name, namespace);
};

NamedNodeMap.prototype.setNamedItemNS = function (attr) {
    return this.setNamedItem(attr);
};

NamedNodeMap.prototype.removeNamedItemNS = function (namespace, name) {
    return this.removeNamedItem(name, namespace);
};

}]])("hexant/index.js")
