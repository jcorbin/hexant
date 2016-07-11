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

}],["animator.js","blick","animator.js",{"raf":40},function (require, exports, module, __filename, __dirname){

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

}],["document.js","gutentag","document.js",{"koerper":37},function (require, exports, module, __filename, __dirname){

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

}],["text.html","gutentag","text.html",{"./text":7},function (require, exports, module, __filename, __dirname){

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

}],["index.js","hashbind","index.js",{"rezult":41},function (require, exports, module, __filename, __dirname){

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

}],["colorgen.js","hexant","colorgen.js",{"rezult":41,"husl":36},function (require, exports, module, __filename, __dirname){

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
                r.push(husl.toHex(h, sat, l));
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
        var ss = (sat + satDelta * intensity).toFixed(1) + '%';
        var sl = (light + lightDelta * intensity).toFixed(1) + '%';

        var suffix = ', ' + ss + ', ' + sl + ')';
        return function wheelGen(ncolors) {
            var scale = 360 / ncolors;
            var r = [];
            for (var i = 0; i < ncolors; i++) {
                var sh = Math.round(i * scale).toString();
                r.push('hsl(' + sh + suffix);
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
CubePoint.prototype.sub = function sub(other) {
    if (other.type !== this.type) {
        other = other.toCube();
    }
    this.x -= other.x;
    this.y -= other.y;
    this.z -= other.z;
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
        return this.copyFrom(other.toOddQOffset());
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
OddQOffset.prototype.sub = function sub(other) {
    if (other.type !== this.type) {
        other = other.toOddQOffset();
    }
    this.q -= other.q;
    this.r -= other.r;
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

}],["hexant.html","hexant","hexant.html",{"./hexant.js":12,"./prompt.html":20},function (require, exports, module, __filename, __dirname){

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
        component.setAttribute("id", "view_mchyw6");
    }
    if (scope.componentsFor["view"]) {
       scope.componentsFor["view"].setAttribute("for", "view_mchyw6")
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
        component.setAttribute("id", "prompt_7ola80");
    }
    if (scope.componentsFor["prompt"]) {
       scope.componentsFor["prompt"].setAttribute("for", "prompt_7ola80")
    }
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

}],["hexant.js","hexant","hexant.js",{"hashbind":8,"Base64":0,"rezult":41,"./colorgen.js":9,"./world.js":35,"./view.js":34,"./turmite/index.js":23,"./coord.js":10,"./hextiletree.js":15},function (require, exports, module, __filename, __dirname){

// hexant/hexant.js
// ----------------

'use strict';

module.exports = Hexant;

var Hash = require('hashbind');
var Base64 = require('Base64');
var Result = require('rezult');
var colorGen = require('./colorgen.js');
var World = require('./world.js');
var View = require('./view.js');
var Turmite = require('./turmite/index.js');
var OddQOffset = require('./coord.js').OddQOffset;
var HexTileTree = require('./hextiletree.js');

var BatchLimit = 512;

function Hexant(body, scope) {
    var self = this;
    var atob = scope.window.atob || Base64.atob;
    var btoa = scope.window.btoa || Base64.btoa;

    this.el = null;
    this.world = null;
    this.view = null;

    this.window = scope.window;
    this.hash = new Hash(this.window, {
        decode: decodeHash
    });
    this.animator = scope.animator.add(this);
    this.lastFrameTime = null;
    this.frameRate = 0;
    this.frameInterval = 0;
    this.paused = true;
    this.prompt = null;

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

    this.titleBase = this.window.document.title;
    this.world = new World();
    this.view = this.world.addView(
        new View(this.world, this.el));

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

    this.hash.bind('frameRate')
        .setParse(Result.lift(parseInt))
        .setDefault(4)
        .addListener(function onFrameRateChange(rate) {
            self.setFrameRate(rate);
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
            self.view.drawUnvisited = !!drawUnvisited;
        });

    this.hash.bind('drawTrace')
        .setDefault(false)
        .addListener(function onDrawTraceChange(drawTrace) {
            self.view.drawTrace = !!drawTrace;
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
        this.hash.set('frameRate', this.frameRate * 2);
        break;
    case 0x2d: // -
        this.hash.set('frameRate', Math.max(1, Math.floor(this.frameRate / 2)));
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

    case 0x54:
    case 0x74:
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
    this.world.tile = new HexTileTree(OddQOffset(0, 0), 2, 2);

    this.view.hexGrid.bounds = this.world.tile.boundingBox().copy();
    this.view.hexGrid.updateSize();

    var ent = this.world.ents[0];
    ent.state = 0;
    ent.dir = 0;
    this.world.tile.centerPoint().toCubeInto(ent.pos);
    var data = this.world.tile.get(ent.pos);
    this.world.tile.set(ent.pos, World.FlagVisited | data);

    this.el.width = this.el.width;
    this.view.redraw();
};

Hexant.prototype.animate =
function animate(time) {
    var frames = 1;
    if (!this.lastFrameTime) {
        this.lastFrameTime = time;
    } else {
        var progress = time - this.lastFrameTime;
        frames = Math.min(BatchLimit, progress / this.frameInterval);
    }

    this.world.stepn(frames);
    this.lastFrameTime += frames * this.frameInterval;
};

Hexant.prototype.play =
function play() {
    this.lastFrameTime = null;
    this.animator.requestAnimation();
    this.paused = false;
};

Hexant.prototype.pause =
function pause() {
    this.lastFrameTime = null;
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

Hexant.prototype.setFrameRate =
function setFrameRate(rate) {
    this.frameRate = rate;
    this.frameInterval = 1000 / this.frameRate;
};

Hexant.prototype.toggleLabeled =
function toggleLabeled() {
    this.hash.set('labeled', !this.view.labeled);
};

Hexant.prototype.resize =
function resize(width, height) {
    this.view.resize(width, height);
};

}],["hexgrid.js","hexant","hexgrid.js",{"./coord.js":10},function (require, exports, module, __filename, __dirname){

// hexant/hexgrid.js
// -----------------

'use strict';

var Coord = require('./coord.js');
var OddQBox = Coord.OddQBox;
var ScreenPoint = Coord.ScreenPoint;

// TODO: perhaps this whole module would be better done as a thinner
// NGonContext wrapper.  Essentially an equally-radius'd equally-spaced
// NGonContext.  This would force us to explicate the vertical-orientation
// assumption spread throughout HexGrid and its consumers.

var HexAspect = Math.sqrt(3) / 2;

module.exports = HexGrid;

// TODO: support horizontal orientation

function HexGrid(canvas, ctxHex, bounds) {
    this.canvas = canvas;
    this.ctxHex = ctxHex;
    this.bounds = bounds || OddQBox();
    this.view = ScreenPoint();
    this.cell = ScreenPoint();
    this.origin = ScreenPoint();
    this.avail = ScreenPoint();
    this.cellSize = 0;
    this.scratchPoint = ScreenPoint();
    this.boundTopLeft = ScreenPoint();
    this.cellXYs = new Float64Array(12);
}

HexGrid.prototype.internalize =
function internalize(point) {
    // TODO: hack, better compromise than the broken-ness of doing the sub in
    // odd-q space
    return point
        .toScreenInto(this.scratchPoint)
        // .copy()
        // .toOddQOffset()
        .sub(this.boundTopLeft)
        ;
};

HexGrid.prototype.toScreen =
function toScreen(point) {
    return this.internalize(point)
        .scale(this.cellSize)
        .add(this.origin)
        ;
};

HexGrid.prototype.circCellPath =
function circCellPath(point) {
    var screenPoint = this.toScreen(point);
    this.ctxHex.ctx2d.arc(screenPoint.x, screenPoint.y,
                          this.cellSize, 0, 2 * Math.PI);
    return screenPoint;
};

HexGrid.prototype.cellPath =
HexGrid.prototype.hexCellPath =
function hexCellPath(point) {
    var screenPoint = this.toScreen(point);
    this.ctxHex.fullWith(screenPoint.x, screenPoint.y, this.cellXYs);
    return screenPoint;
};

HexGrid.prototype.resize =
function resize(width, height) {
    this.avail.x = width;
    this.avail.y = height;
    this.updateSize();
};

// TODO: need this?
// this.canvas.width = this.avail.x;
// this.canvas.height = this.avail.y;

HexGrid.prototype.updateSize =
function updateSize() {
    this.bounds.topLeft.toScreenInto(this.boundTopLeft);
    this.bounds.screenCountInto(this.view);
    this.cell.x = this.avail.x / this.view.x;
    this.cell.y = this.avail.y / this.view.y;
    var widthSize = this.cell.x / 2;
    var heightSize = this.cell.y / 2 / HexAspect;
    if (widthSize < heightSize) {
        this.cellSize = widthSize;
        this.cell.y = this.cell.x * HexAspect;
    } else {
        this.cellSize = heightSize;
        this.cell.x = 2 * this.cellSize;
    }

    if (this.cellSize <= 2) {
        this.cellPath = this.circCellPath;
    } else {
        this.cellPath = this.hexCellPath;
        this.ctxHex.buildFor(this.cellSize, this.cellXYs);
    }

    // align top-left
    this.origin.copyFrom(this.cell).scale(0.5);

    this.canvas.width = this.cell.x * this.view.x;
    this.canvas.height = this.cell.y * this.view.y;
    this.canvas.style.width = this.canvas.width + 'px';
    this.canvas.style.height = this.canvas.height + 'px';
};

}],["hextile.js","hexant","hextile.js",{"./coord.js":10},function (require, exports, module, __filename, __dirname){

// hexant/hextile.js
// -----------------

'use strict';

var Coord = require('./coord.js');
var OddQOffset = Coord.OddQOffset;
var OddQBox = Coord.OddQBox;

module.exports = OddQHexTile;

function OddQHexTile(origin, width, height) {
    this.origin = origin.toOddQOffset();
    this.width = width;
    this.height = height;
    this.data = new Uint16Array(this.width * this.height);
}

OddQHexTile.prototype.boundingBox = function boundingBox() {
    return OddQBox(this.origin, OddQOffset(this.width, this.height));
};

OddQHexTile.prototype.centerPoint = function centerPoint() {
    return OddQOffset(
        this.origin.q + Math.floor(this.width / 2),
        this.origin.r + Math.floor(this.height / 2)
    );
};

OddQHexTile.prototype.pointToIndex = function pointToIndex(point) {
    var offsetPoint = point.toOddQOffset();
    return (offsetPoint.r - this.origin.r) * this.width +
           (offsetPoint.q - this.origin.q);
};

OddQHexTile.prototype.get = function get(point) {
    return this.data[this.pointToIndex(point)];
};

OddQHexTile.prototype.set = function set(point, datum) {
    this.data[this.pointToIndex(point)] = datum;
    return datum;
};

OddQHexTile.prototype.eachDataPoint = function eachDataPoint(each) {
    var loQ = this.origin.q;
    var loR = this.origin.r;
    var hiQ = loQ + this.width;
    var hiR = loR + this.height;
    var point = OddQOffset(loQ, loR);
    var i;
    for (i = 0, point.r = loR; point.r < hiR; point.r++) {
        for (point.q = loQ; point.q < hiQ; point.q++, i++) {
            each(point, this.data[i]);
        }
    }
};

}],["hextiletree.js","hexant","hextiletree.js",{"./coord.js":10,"./hextile.js":14},function (require, exports, module, __filename, __dirname){

// hexant/hextiletree.js
// ---------------------

'use strict';

var Coord = require('./coord.js');
var OddQHexTile = require('./hextile.js');
var OddQOffset = Coord.OddQOffset;
var OddQBox = Coord.OddQBox;

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

function HexTileTree(origin, tileWidth, tileHeight) {
    this.root = new HexTileTreeNode(origin, tileWidth, tileHeight);
}

HexTileTree.prototype.dump = function dump() {
    return this.root.dump();
};

HexTileTreeNode.prototype.dump = function dump() {
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

OddQHexTile.prototype.dump = function dump() {
    var parts = ['Tile @' + this.origin.toString()];
    var row = [];
    for (var i = 0; i < this.data.length; i++) {
        if (i && i % this.width === 0) {
            parts.push(row.join(' '));
            row = [];
        }
        row.push(this.data[i].toString());
    }
    parts.push(row.join(' '));
    return parts.join('\n');
};

HexTileTree.prototype.boundingBox = function boundingBox() {
    return this.root.boundingBox();
};

HexTileTree.prototype.eachDataPoint = function eachDataPoint(each) {
    this.root.eachDataPoint(each);
};

HexTileTree.prototype.centerPoint = function centerPoint() {
    return this.root.centerPoint();
};

HexTileTree.prototype.get = function get(point) {
    return this.root.get(point);
};

HexTileTree.prototype.set = function set(point, datum) {
    var offsetPoint = point.toOddQOffset();

    while (!this.root.box.contains(offsetPoint)) {
        this.root = this.root.expand();
    }

    return this.root._set(offsetPoint, datum);
};

function HexTileTreeNode(origin, width, height) {
    this.origin = origin;
    this.width = width;
    this.height = height;
    this.tileWidth = Math.floor(this.width / 2);
    this.tileHeight = Math.floor(this.height / 2);
    this.tiles = [null, null, null, null];
    var topLeft = OddQOffset(this.origin.q - this.tileWidth,
                             this.origin.r - this.tileHeight);
    var bottomRight = OddQOffset(this.origin.q + this.tileWidth,
                                 this.origin.r + this.tileHeight);
    this.box = OddQBox(topLeft, bottomRight);
}

HexTileTreeNode.prototype.expand = function expand() {
    var node = new HexTileTreeNode(
        this.origin.copy(), this.width * 2, this.height * 2);
    for (var i = 0; i < this.tiles.length; i++) {
        node.tiles[i] = this.growTile(i);
    }
    return node;
};

HexTileTreeNode.prototype.growTile = function growTile(i) {
    var tile = this.tiles[i];
    if (!tile) {
        return null;
    }
    return tile.grow(i);
};

OddQHexTile.prototype.grow = function grow(i) {
    var offset = tileOriginOffset[i].copy()
        .mulBy(this.width, this.height);
    var origin = this.origin.copy().add(offset);
    var node = new HexTileTreeNode(
        origin, 2 * this.width, 2 * this.height);
    node.tiles[zoomPerm[i]] = this;
    return node;
};

HexTileTreeNode.prototype.grow = function grow(i) {
    var offset = nodeOriginOffset[i].copy()
        .mulBy(this.tileWidth, this.tileHeight);
    var origin = this.origin.copy().add(offset);
    var node = new HexTileTreeNode(
        origin, 2 * this.width, 2 * this.height);
    node.tiles[zoomPerm[i]] = this;
    return node;
};

HexTileTreeNode.prototype.boundingBox = function boundingBox() {
    return this.box;
};

HexTileTreeNode.prototype.eachDataPoint = function eachDataPoint(each) {
    for (var i = 0; i < this.tiles.length; i++) {
        var tile = this.tiles[i];
        if (tile) {
            tile.eachDataPoint(each);
        } else {
            this._fakeDataPoints(i, each);
        }
    }
};

HexTileTreeNode.prototype._fakeDataPoints = function _fakeDataPoints(i, each) {
    var tileCol = i & 1;
    var tileRow = i >> 1;

    var loQ = this.origin.q + (tileCol ? 0 : -this.tileWidth);
    var loR = this.origin.r + (tileRow ? 0 : -this.tileHeight);
    var hiQ = loQ + this.tileWidth;
    var hiR = loR + this.tileHeight;

    var point = OddQOffset(loQ, loR);
    for (point.r = loR; point.r < hiR; point.r++) {
        for (point.q = loQ; point.q < hiQ; point.q++) {
            each(point, 0);
        }
    }
};

HexTileTreeNode.prototype.centerPoint = function centerPoint() {
    return this.origin;
};

HexTileTreeNode.prototype.get = function get(point) {
    var offsetPoint = point.toOddQOffset();
    if (!this.box.contains(offsetPoint)) {
        return NaN;
    }

    // TODO: assert
    // - origin.q - tileWidth <= offsetPoint.q <= origin.q + tileWidth
    // - origin.r - tileHeight <= offsetPoint.r <= origin.r + tileHeight

    // TODO: bit hack: negated sign-bit of subtraction
    var tileCol = offsetPoint.q < this.origin.q ? 0 : 1;
    var tileRow = offsetPoint.r < this.origin.r ? 0 : 1;

    var i = tileRow * 2 + tileCol;
    var tile = this.tiles[i];
    if (tile) {
        return tile.get(point);
    }
    return 0;
};

HexTileTreeNode.prototype.set = function set(point, datum) {
    var offsetPoint = point.toOddQOffset();
    if (!this.box.contains(offsetPoint)) {
        throw new Error('set out of bounds');
    }
    return this._set(offsetPoint, datum);
};

HexTileTreeNode.prototype._set = function _set(point, datum) {
    // point known to be in bounds and correct type

    var tileCol = point.q < this.origin.q ? 0 : 1;
    var tileRow = point.r < this.origin.r ? 0 : 1;
    var i = tileRow * 2 + tileCol;

    var tile = this.tiles[i];
    if (!tile) {
        var origin = OddQOffset(this.origin.q, this.origin.r);
        if (point.q < origin.q) {
            origin.q -= this.tileWidth;
        }
        if (point.r < origin.r) {
            origin.r -= this.tileHeight;
        }
        // TODO: assert offset point in range

        // TODO: heuristic for when to create a sparse node instead
        tile = new OddQHexTile(origin, this.tileWidth, this.tileHeight);
        this.tiles[i] = tile;
    }

    return tile.set(point, datum);
};

}],["index.js","hexant","index.js",{"domready":2,"global/window":3,"gutentag/scope":5,"gutentag/document":4,"blick":1,"./main.html":17},function (require, exports, module, __filename, __dirname){

// hexant/index.js
// ---------------

'use strict';

var domready = require('domready');
var window = require('global/window');
var document = window.document;

var Scope = require('gutentag/scope');
var Document = require('gutentag/document');
var Animator = require('blick');
var Main = require('./main.html');

domready(setup);

function setup() {
    var scope = new Scope();
    scope.window = window;
    scope.animator = new Animator();
    var bodyDocument = new Document(window.document.body);
    window.hexant = new Main(bodyDocument.documentElement, scope);

    window.addEventListener('resize', onResize);
    onResize();
}

function onResize() {
    var width = Math.max(
        document.documentElement.clientWidth,
        window.innerWidth || 0);
    var height = Math.max(
        document.documentElement.clientHeight,
        window.innerHeight || 0);
    window.hexant.resize(width, height);
}

}],["main.html","hexant","main.html",{"./main.js":18,"./hexant.html":11},function (require, exports, module, __filename, __dirname){

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
        component.setAttribute("id", "view_u9fj6y");
    }
    if (scope.componentsFor["view"]) {
       scope.componentsFor["view"].setAttribute("for", "view_u9fj6y")
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

}],["ngoncontext.js","hexant","ngoncontext.js",{},function (require, exports, module, __filename, __dirname){

// hexant/ngoncontext.js
// ---------------------

'use strict';

module.exports = NGonContext;

function NGonContext(degree, ctx2d) {
    this.ctx2d = ctx2d;
    this.degree = degree;
    this.offset = 0;
    this.step = 2 * Math.PI / this.degree;
    this.cos = null;
    this.sin = null;

    this.setOffset(0);
}

NGonContext.prototype.setOffset =
function setOffset(offset) {
    this.offset = offset;
    this.cos = new Float64Array(this.degree);
    this.sin = new Float64Array(this.degree);
    var r = offset;
    for (var i = 0; i < this.degree; i++) {
        this.cos[i] = Math.cos(r);
        this.sin[i] = Math.sin(r);
        r += this.step;
    }
};

NGonContext.prototype.buildFor =
function buildFor(radius, xys) {
    for (var i = 0, j = 0; i < this.degree; i++) {
        xys[j++] = radius * this.cos[i];
        xys[j++] = radius * this.sin[i];
    }
};

NGonContext.prototype.fullWith =
function fullWith(x, y, xys) {
    this.ctx2d.moveTo(x + xys[0], y + xys[1]);
    for (var i = 1, j = 2; i < this.degree; i++) {
        this.ctx2d.lineTo(x + xys[j++], y + xys[j++]);
    }
};

NGonContext.prototype.full =
function full(x, y, radius) {
    if (radius <= 2) {
        this.ctx2d.arc(x, y, radius, 0, 2 * Math.PI);
    } else {
        this.ctx2d.moveTo(
            x + radius * this.cos[0],
            y + radius * this.sin[0]);
        for (var i = 1; i < this.degree; i++) {
            this.ctx2d.lineTo(
                x + radius * this.cos[i],
                y + radius * this.sin[i]);
        }
    }
};

NGonContext.prototype.arc =
function arc(x, y, radius, startArg, endArg, complement) {
    var start = 0;
    var end = 0;
    if (typeof startArg === 'number') {
        start = startArg % this.degree;
    }
    if (typeof endArg === 'number') {
        end = endArg % this.degree;
    }
    if (start === end) {
        this.full(x, y, radius);
        return;
    }
    if (complement) {
        // degree := 6
        // 0, 4, false --> 0, 1, 2, 3 ,4
        // 0, 4, true  --> 0, 5 ,4
        // 4, 6, false --> 4, 5, 6
        this.arc(x, y, radius, end, this.degree - start, false);
        return;
    }

    var n = this.degree + end - start;
    if (n > this.degree) {
        n -= this.degree;
    }

    var j = start;
    var px = x + radius * this.cos[j];
    var py = y + radius * this.sin[j];
    this.ctx2d.moveTo(px, py);

    for (var i = 1; i <= n; i++) {
        j = (j + 1) % this.degree;
        px = x + radius * this.cos[j];
        py = y + radius * this.sin[j];
        this.ctx2d.lineTo(px, py);
    }
};

NGonContext.prototype.wedge =
function wedge(x, y, radius, startArg, endArg, complement) {
    var start = 0;
    var end = 0;
    if (typeof startArg === 'number') {
        start = startArg % this.degree;
    }
    if (typeof endArg === 'number') {
        end = endArg % this.degree;
    }
    if (start === end) {
        this.full(x, y, radius);
        return;
    }
    if (complement) {
        // degree := 6
        // 0, 4, false --> 0, 1, 2, 3 ,4
        // 0, 4, true  --> 0, 5 ,4
        // 4, 6, false --> 4, 5, 6
        this.wedge(x, y, radius, end, start, false);
        return;
    }

    var n = this.degree + end - start;
    if (n > this.degree) {
        n -= this.degree;
    }

    this.ctx2d.moveTo(x, y);

    var j = start;
    for (var i = 0; i <= n; i++) {
        var px = x + radius * this.cos[j];
        var py = y + radius * this.sin[j];
        this.ctx2d.lineTo(px, py);
        j = (j + 1) % this.degree;
    }
};


}],["prompt.html","hexant","prompt.html",{"./prompt.js":21,"gutentag/text.html":6},function (require, exports, module, __filename, __dirname){

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
        component.setAttribute("id", "box_7ece2z");
    }
    if (scope.componentsFor["box"]) {
       scope.componentsFor["box"].setAttribute("for", "box_7ece2z")
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
            component.setAttribute("id", "help_f721s1");
        }
        if (scope.componentsFor["help"]) {
           scope.componentsFor["help"].setAttribute("for", "help_f721s1")
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
            component.setAttribute("id", "text_vla9up");
        }
        if (scope.componentsFor["text"]) {
           scope.componentsFor["text"].setAttribute("for", "text_vla9up")
        }
        parents[parents.length] = parent; parent = node;
        // TEXTAREA
        node = parent; parent = parents[parents.length - 1]; parents.length--;
        node = document.createElement("DIV");
        parent.appendChild(node);
        component = node.actualNode;
        scope.hookup("error", component);
        if (component.setAttribute) {
            component.setAttribute("id", "error_z2mpmu");
        }
        if (scope.componentsFor["error"]) {
           scope.componentsFor["error"].setAttribute("for", "error_z2mpmu")
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

}],["turmite/index.js","hexant/turmite","index.js",{"../coord.js":10,"./constants.js":22,"./parse.js":32},function (require, exports, module, __filename, __dirname){

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
    this.oldDir = 0;

    this.pos = CubePoint(0, 0, 0);
    this.oldPos = CubePoint(0, 0, 0);

    this.state = 0;
    this.stateKey = 0;

    this.size = 0.5;
    this.index = 0;
}

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
    var tile = world.tile;
    var data = tile.get(this.pos);
    var color = data & 0x00ff;
    var flags = data & 0xff00;

    var ruleIndex = this.stateKey | color;
    var rule = this.rules[ruleIndex];
    var turn = rule & 0x0000ffff;
    var write = (rule & 0x00ff0000) >> 16;
    var nextState = (rule & 0xff000000) >> 24;

    flags |= 0x0100; // TODO: World constant
    data = flags | write;
    tile.set(this.pos, data);

    this.oldDir = this.dir;
    this.oldPos.copyFrom(this.pos);

    if (nextState !== this.state) {
        this.state = nextState;
        this.stateKey = nextState << 8;
    }

    turn = this.executeTurn(turn);
    this.pos.add(CubePoint.basis[this.dir]);
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
    //     turn = self.executeTurn(turn);
    //     self.pos.add(CubePoint.basis[self.dir]);
    // }
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
//     self.stateKey = this.stateKey;
//     self.size = this.size;
//     self.index = this.index;

//     // TODO: add to world

//     return self;
// };

Turmite.prototype.executeTurn =
function executeTurn(turn) {
    var t = 1;
    for (; t <= 0x0020; t <<= 1) {
        if (turn & t) {
            this.dir = (6 + this.oldDir + constants.RelTurnDelta[t]) % 6;
            return turn & ~t;
        }
    }
    for (; t <= 0x0800; t <<= 1) {
        if (turn & t) {
            this.dir = constants.AbsTurnDir[t];
            return turn & ~t;
        }
    }
    if (turn !== 0) {
        throw new Error('unrecognized turning constant ' + turn);
    }
    return 0;
};

}],["turmite/lang/analyze.js","hexant/turmite/lang","analyze.js",{"./walk.js":31},function (require, exports, module, __filename, __dirname){

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

}],["turmite/lang/compile.js","hexant/turmite/lang","compile.js",{"../constants.js":22,"./analyze.js":24,"./tostring.js":30,"./solve.js":29,"./walk.js":31},function (require, exports, module, __filename, __dirname){

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

}],["turmite/lang/grammar.js","hexant/turmite/lang","grammar.js",{"./build.js":25},function (require, exports, module, __filename, __dirname){

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

}],["turmite/lang/parse.js","hexant/turmite/lang","parse.js",{"nearley":38,"rezult":41,"./grammar.js":27,"./compile.js":26},function (require, exports, module, __filename, __dirname){

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

}],["turmite/lang/solve.js","hexant/turmite/lang","solve.js",{"./compile.js":26,"./walk.js":31},function (require, exports, module, __filename, __dirname){

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

}],["turmite/lang/tostring.js","hexant/turmite/lang","tostring.js",{"../rle-builder.js":33,"./walk.js":31},function (require, exports, module, __filename, __dirname){

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

}],["turmite/parse.js","hexant/turmite","parse.js",{"rezult":41,"../world.js":35,"./rle-builder.js":33,"./constants.js":22,"./lang/parse.js":28},function (require, exports, module, __filename, __dirname){

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

}],["view.js","hexant","view.js",{"./hexgrid.js":13,"./ngoncontext.js":19,"./world.js":35},function (require, exports, module, __filename, __dirname){

// hexant/view.js
// --------------

'use strict';

var HexGrid = require('./hexgrid.js');
var NGonContext = require('./ngoncontext.js');
var World = require('./world.js');

module.exports = View;

function View(world, canvas) {
    if (!(this instanceof View)) {
        return new View(world, canvas);
    }
    this.world = world;
    this.canvas = canvas;

    this.ctx2d = this.canvas.getContext('2d');
    this.ctxHex = new NGonContext(6, this.ctx2d);

    this.labeled = false;
    this.drawUnvisited = false;
    this.drawTrace = false;

    this.antCellColorGen = null;
    this.emptyCellColorGen = null;
    this.bodyColorGen = null;
    this.headColorGen = null;

    this.antCellColors = [];
    this.emptyCellColors = [];
    this.bodyColors = [];
    this.headColors = [];
    this.lastEntPos = [];

    this.hexGrid = new HexGrid(
        this.canvas, this.ctxHex,
        this.world.tile.boundingBox().copy());

    this.needsRedraw = false;
}

View.prototype.resize =
function resize(width, height) {
    this.hexGrid.resize(width, height);
    this.redraw();
};

View.prototype.redraw =
function redraw() {
    var self = this;
    var ents = self.world.ents;
    var colors = this.drawTrace ? this.emptyCellColors : this.antCellColors;

    self.world.tile.eachDataPoint(this.drawUnvisited
    ? function drawEachCell(point, data) {
        self.drawCell(point,
                      data & World.MaskColor,
                      colors);
    }
    : function maybeDrawEachCell(point, data) {
        if (data & World.FlagVisited) {
            self.drawCell(point,
                          data & World.MaskColor,
                          colors);
        }
    });

    for (var i = 0; i < ents.length; i++) {
        self.drawEnt(ents[i]);
        for (i = 0; i < ents.length; i++) {
            this.lastEntPos[i].copyFrom(ents[i].pos);
        }
    }
};

View.prototype.updateEnts =
function updateEnts() {
    var i;
    for (i = 0; i < this.world.ents.length; i++) {
        var ent = this.world.ents[i];
        if (i < this.lastEntPos.length) {
            this.lastEntPos[i].copyFrom(ent.pos);
        } else {
            this.lastEntPos.push(ent.pos.copy());
        }
    }
    while (i < this.lastEntPos.length) {
        this.lastEntPos.pop();
    }
    this.updateColors(false);
};

View.prototype.addEnt =
function addEnt(ent) {
    this.lastEntPos.push(ent.pos.copy());
    this.updateColors(false);
};

View.prototype.updateEnt =
function updateEnt(ent) {
    this.lastEntPos[ent.index].copyFrom(ent.pos);
    this.updateColors(false);
};

View.prototype.removeEnt =
function removeEnt(ent) {
    swapout(this.lastEntPos, ent.index);
    this.lastEntPos.pop();
    this.updateColors(false);
};

View.prototype.setColorGen =
function setColorGen(colorGen) {
    this.emptyCellColorGen = colorGen(0);
    this.antCellColorGen = colorGen(1);
    this.bodyColorGen = colorGen(2);
    this.headColorGen = colorGen(3);
    this.updateColors(true);
};

View.prototype.updateColors = function updateColors(regen) {
    var N = this.world.numColors;
    var M = this.world.ents.length;

    if (this.emptyCellColorGen &&
        (regen || this.emptyCellColors.length !== N)
    ) {
        this.emptyCellColors = this.emptyCellColorGen(N);
        while (this.emptyCellColors.length <= World.MaxColor) {
            this.emptyCellColors.push(
                this.emptyCellColors[this.emptyCellColors.length % N]
            );
        }
    }

    if (this.antCellColorGen &&
        (regen || this.antCellColors.length !== N)
    ) {
        this.antCellColors = this.antCellColorGen(N);
        while (this.antCellColors.length <= World.MaxColor) {
            this.antCellColors.push(
                this.antCellColors[this.antCellColors.length % N]
            );
        }
    }

    if (this.bodyColorGen &&
        (regen || this.bodyColors.length !== M)
    ) {
        this.bodyColors = this.bodyColorGen(M);
    }

    if (this.headColorGen &&
        (regen || this.headColors.length !== M)
    ) {
        this.headColors = this.headColorGen(M);
    }
};

View.prototype.setLabeled =
function setLabeled(labeled) {
    this.labeled = labeled;
    if (this.labeled) {
        this.drawCell = this.drawLabeledCell;
    } else {
        this.drawCell = this.drawUnlabeledCell;
    }
};

View.prototype.drawUnlabeledCell =
function drawUnlabeledCell(point, color, colors) {
    this.ctx2d.beginPath();
    var screenPoint = this.hexGrid.cellPath(point);
    this.ctx2d.closePath();
    this.ctx2d.fillStyle = colors[color];
    this.ctx2d.fill();
    return screenPoint;
};

View.prototype.drawLabeledCell =
function drawLabeledCell(point, color, colors) {
    var screenPoint = this.drawUnlabeledCell(point, color, colors);
    this.drawCellLabel(point, screenPoint);
};

View.prototype.drawCellLabel =
function drawCellLabel(point, screenPoint) {
    if (!screenPoint) {
        screenPoint = this.hexGrid.toScreen(point);
    }

    var ctx2d = this.ctx2d;
    ctx2d.lineWidth = 1;
    ctx2d.strokeStyle = '#fff';
    write(point.toCube().toString(), 0);
    write(point.toOddQOffset().toString(), 14);

    function write(mess, yoff) {
        var textWidth = ctx2d.measureText(mess).width;
        ctx2d.strokeText(
            mess,
            screenPoint.x - textWidth / 2,
            screenPoint.y + yoff);
    }
};

View.prototype.drawCell =
View.prototype.drawUnlabeledCell;

View.prototype.step =
function step() {
    var ents = this.world.ents;
    var i;

    var expanded = false;
    for (i = 0; i < ents.length; i++) {
        expanded = this.hexGrid.bounds.expandTo(ents[i].pos) || expanded;
    }

    if (expanded) {
        this.needsRedraw = true;
        this.hexGrid.updateSize();
    }

    if (this.needsRedraw) {
        return;
    }

    for (i = 0; i < ents.length; i++) {
        var data = this.world.tile.get(this.lastEntPos[i]);
        this.drawCell(this.lastEntPos[i],
                      data & World.MaskColor,
                      this.antCellColors);
    }

    for (i = 0; i < ents.length; i++) {
        this.drawEnt(ents[i]);
        this.lastEntPos[i].copyFrom(ents[i].pos);
    }
};

View.prototype.drawEnt =
function drawEnt(ent) {
    var data = this.world.tile.get(ent.pos);
    if (!(data & World.FlagVisited)) {
        data = this.world.tile.set(ent.pos, data | World.FlagVisited);
        this.drawCell(ent.pos,
                      data & World.MaskColor,
                      this.antCellColors);
    }

    var screenPoint = this.hexGrid.toScreen(ent.pos);
    var size = this.hexGrid.cellSize * ent.size;

    if (size <= 5) {
        this.drawSmallEnt(ent, screenPoint, size);
    } else {
        this.drawFullEnt(ent, screenPoint, size);
    }

    if (this.labeled) {
        this.drawCellLabel(ent.pos, screenPoint);
    }
};

View.prototype.drawFullEnt =
function drawFullEnt(ent, screenPoint, size) {
    var ctxHex = this.hexGrid.ctxHex;
    var ctx2d = ctxHex.ctx2d;

    var start = ent.dir;
    var end = ent.dir + 1;

    // head
    ctx2d.fillStyle = this.headColors[ent.index];
    ctx2d.strokeStyle = this.headColors[ent.index];
    ctx2d.lineWidth = size / 2;
    ctx2d.beginPath();
    ctxHex.wedge(screenPoint.x, screenPoint.y, size, start, end, false);
    ctx2d.closePath();
    ctx2d.fill();
    ctx2d.stroke();

    // body
    ctx2d.fillStyle = this.bodyColors[ent.index];
    ctx2d.beginPath();
    ctxHex.wedge(screenPoint.x, screenPoint.y, size, start, end, true);
    ctx2d.closePath();
    ctx2d.fill();
};

View.prototype.drawSmallEnt =
function drawSmallEnt(ent, screenPoint, size) {
    var ctxHex = this.hexGrid.ctxHex;
    var ctx2d = ctxHex.ctx2d;

    ctx2d.fillStyle = this.headColors[ent.index];
    ctx2d.beginPath();
    ctxHex.full(screenPoint.x, screenPoint.y, size);
    ctx2d.closePath();
    ctx2d.fill();
};

function swapout(ar, i) {
    var j = i;
    var old = ar[i];
    for (j = i++; i < ar.length; i++, j++) {
        ar[j] = ar[i];
    }
    ar[j] = old;
    return j;
}

}],["world.js","hexant","world.js",{"./coord.js":10,"./hextiletree.js":15},function (require, exports, module, __filename, __dirname){

// hexant/world.js
// ---------------

'use strict';

var Coord = require('./coord.js');
var HexTileTree = require('./hextiletree.js');

var OddQOffset = Coord.OddQOffset;

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
    this.tile = new HexTileTree(OddQOffset(0, 0), 2, 2);
    this.ents = [];
    this.views = [];
}

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
    for (var i = 0; i < this.views.length; i++) {
        var view = this.views[i];
        if (view.needsRedraw) {
            view.redraw();
            view.needsRedraw = false;
            didredraw = true;
        }
    }
    return didredraw;
};

World.prototype.addEnt =
function addEnt(ent) {
    this.numColors = Math.max(this.numColors, ent.numColors);
    this.numStates = Math.max(this.numStates, ent.numStates);
    ent.index = this.ents.length;
    this.ents.push(ent);

    var data = this.tile.get(ent.pos);
    if (!(data & World.FlagVisited)) {
        data = this.tile.set(ent.pos, data | World.FlagVisited);
    }

    for (var i = 0; i < this.views.length; i++) {
        this.views[i].addEnt(ent);
    }

    return ent;
};

World.prototype.updateEnt =
function updateEnt(ent, i) {
    if (i === undefined) {
        i = ent.index;
    } else {
        ent.index = i;
    }

    if (this.ents[i] !== ent) {
        this.ents[i] = ent;
    }

    this.numColors = 0;
    this.numStates = 0;
    for (i = 0; i < this.ents.length; i++) {
        this.numColors = Math.max(this.numColors, this.ents[i].numColors);
        this.numStates = Math.max(this.numStates, this.ents[i].numStates);
    }

    for (i = 0; i < this.views.length; i++) {
        this.views[i].updateEnt(ent);
    }

    return ent;
};

World.prototype.removeEnt =
function removeEnt(ent) {
    if (this.ents[ent.index] !== ent) {
        throw new Error('removeEnt mismatch');
    }

    var i = ent.index;
    var j = i++;
    for (; j < this.ents.length; i++, j++) {
        this.ents[i] = this.ents[j];
        this.ents[i].index = i;
    }
    this.ents.pop();

    for (i = 0; i < this.views.length; i++) {
        this.views[i].removeEnt(ent);
    }

    return ent;
};

World.prototype.pruneEnts =
function pruneEnts(n) {
    if (n >= this.ents.length) {
        return;
    }
    for (var i = n; i < this.ents.length; i++) {
        for (var j = 0; j < this.views.length; ++j) {
            this.views[j].removeEnt(this.ents[i]);
        }
    }
    this.ents = this.ents.silce(0, n);
};

World.prototype.setEnts =
function setEnts(ents) {
    this.pruneEnts(ents.length);
    for (var i = 0; i < ents.length; ++i) {
        var ent = ents[i];
        if (i < this.ents.length) {
            this.updateEnt(ent, i);
        } else {
            this.addEnt(ent);
        }
    }
};

World.prototype.addView =
function addView(view) {
    this.views.push(view);
    view.updateEnts();
    return view;
};

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

}],["koerper.js","koerper","koerper.js",{"wizdom":42},function (require, exports, module, __filename, __dirname){

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

}],["index.js","raf","index.js",{"performance-now":39},function (require, exports, module, __filename, __dirname){

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
