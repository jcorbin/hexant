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
})([["animator.js","blick","animator.js",{"raf":23},function (require, exports, module, __filename, __dirname){

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

}],["document.js","gutentag","document.js",{"koerper":21},function (require, exports, module, __filename, __dirname){

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

}],["ant.js","hexant","ant.js",{"./coord.js":7},function (require, exports, module, __filename, __dirname){

// hexant/ant.js
// -------------

'use strict';

var Coord = require('./coord.js');
var CubePoint = Coord.CubePoint;

module.exports = Ant;

function Ant(world) {
    this.index = 0;
    this.world = world;
    this.pos = CubePoint(0, 0, 0);
    this.dir = 0;
    this.size = 0.5;
    this.rules = [-1, 1];
}

Ant.prototype.step = function step() {
    var tile = this.world.tile;
    var c = tile.get(this.pos) || 1;
    var rule = this.rules[(c - 1) % this.rules.length];
    c = tile.set(this.pos, 1 + c % this.world.numStates);
    this.dir = (CubePoint.basis.length + this.dir + rule
               ) % CubePoint.basis.length;
    this.pos.add(CubePoint.basis[this.dir]);
};

}],["colorgen.js","hexant","colorgen.js",{},function (require, exports, module, __filename, __dirname){

// hexant/colorgen.js
// ------------------

'use strict';

var gens = {};
module.exports.gens = gens;
module.exports.parse = parse;
module.exports.toString = toString;

function parse(str) {
    var match = /^(\w+)(?:\((.+)\))?$/.exec(str);
    if (!match) {
        return HueWheelGenerator;
    }

    var name = match[1];
    var gen = gens[name];
    if (!gen) {
        return HueWheelGenerator;
    }

    var args = match[2] && match[2].split(/, */);
    if (args) {
        /* eslint no-try-catch: [0] */
        try {
            return gen.apply(null, args);
        } catch(e) {
            return HueWheelGenerator;
        }
    }

    return gen;
}

function toString(gen) {
    return gen.genString || 'hue';
}

gens.light = LightWheelGenerator;
gens.hue = HueWheelGenerator;

// TODO: husl too

function LightWheelGenerator(hue) {
    hue = parseInt(hue, 10) || 0;

    wheelGenGen.genString = 'light(' + hue.toString() + ')';
    return wheelGenGen;

    function wheelGenGen(intensity) {
        var h = hue * (1 + (intensity - 1) / 3);
        var sh = h.toString();
        var prefix = 'hsl(' + sh + ', 65%, ';
        var suffix = ')';
        return function wheelGen(ncolors) {
            var step = 100 / (ncolors + 1);
            var r = [];
            var l = step;
            for (var i = 0; i < ncolors; l += step, i++) {
                var sl = l.toFixed(1) + '%';
                r.push(prefix + sl + suffix);
            }
            return r;
        };
    }
}

HueWheelGenerator.genString = 'hue';

function HueWheelGenerator(intensity) {
    var ss = (65 + 10 * intensity).toFixed(1) + '%';
    var sl = (30 + 10 * intensity).toFixed(1) + '%';

    var suffix = ', ' + ss + ', ' + sl + ')';
    return function wheelGen(ncolors) {
        var scale = 360 / ncolors;
        var r = [];
        for (var i = 0; i < ncolors; i++) {
            var sh = Math.floor(i * scale).toString();
            r.push('hsl(' + sh + suffix);
        }
        return r;
    };
}

}],["coord.js","hexant","coord.js",{},function (require, exports, module, __filename, __dirname){

// hexant/coord.js
// ---------------

'use strict';

/* eslint no-inline-comments:0 */

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
        return this.copyFrom(other.toCube());
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
CubePoint.prototype.toScreen = function toScreen() {
    var screenX = 3 / 2 * this.x;
    var screenY = Math.sqrt(3) * (this.z + this.x / 2);
    return ScreenPoint(screenX, screenY);
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
OddQOffset.prototype.toScreen = function toScreen() {
    var x = 3 / 2 * this.q;
    var y = Math.sqrt(3) * (this.r + 0.5 * (this.q & 1));
    return ScreenPoint(x, y);
};
OddQOffset.prototype.toOddQOffset = function toOddQOffset() {
    return this;
};
OddQOffset.prototype.toCube = function toCube() {
    var x = this.q;
    var z = this.r - (this.q - (this.q & 1)) / 2;
    var y = -x - z;
    return CubePoint(x, y, z);
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

}],["hash.js","hexant","hash.js",{},function (require, exports, module, __filename, __dirname){

// hexant/hash.js
// --------------

'use strict';

module.exports = Hash;

function Hash(window) {
    var self = this;

    this.window = window;
    this.window.addEventListener('hashchange', onHashChange);
    this.last = '';
    this.cache = {};
    this.values = {};
    this.bound = {};
    this.load();

    function onHashChange(e) {
        self.load();
    }
}

Hash.prototype.load = function load() {
    if (this.window.location.hash === this.last) {
        return;
    }

    this.last = this.window.location.hash;
    var parts = this.last.slice(1).split('&');
    var seen = {};
    var i;
    var key;
    for (i = 0; i < parts.length; i++) {
        var keyval = parts[i].split('=');
        key = unescape(keyval[0]);
        var str = unescape(keyval[1]) || '';
        if (this.cache[key] !== str) {
            this.cache[key] = str;
            if (this.bound[key]) {
                this.bound[key].onChange();
            } else {
                this.values[key] = parseValue(str);
            }
        }
        seen[key] = true;
    }

    var cacheKeys = Object.keys(this.cache);
    for (i = 0; i < cacheKeys.length; i++) {
        key = cacheKeys[i];
        if (!seen[key]) {
            if (this.bound[key]) {
                this.bound[key].reset();
            } else {
                this.cache[key] = undefined;
                this.values[key] = undefined;
            }
        }
    }
};

Hash.prototype.save = function save() {
    var hash = '';

    var keys = Object.keys(this.cache);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (!this.bound[key]) {
            this.cache[key] = valueToString(this.values[key]);
        }
        var str = this.cache[key];

        var part = '' + escape(key);
        if (str === undefined) {
            continue;
        } else if (str !== '') {
            part += '=' + escape(str);
        }

        if (hash !== '') {
            hash += '&' + part;
        } else {
            hash += '#' + part;
        }
    }

    this.window.location.hash = this.last = hash;
};

Hash.prototype.bind = function bind(key) {
    if (this.bound[key]) {
        throw new Error('key already bound');
    }
    var bound = new HashKeyBinding(this, key);
    this.bound[key] = bound;
    return bound;
};

Hash.prototype.getStr = function getStr(key) {
    return this.cache[key];
};

Hash.prototype.get = function get(key) {
    return this.values[key];
};

Hash.prototype.set = function set(key, val) {
    var bound = this.bound[key] || this.bind(key);
    return bound.set(val);
};

function HashKeyBinding(hash, key) {
    this.hash = hash;
    this.key = key;
    this.def = undefined;
    this.value = hash.values[key];
    this.parse = parseValue;
    this.valToString = valueToString;
    this.listeners = [];
}

HashKeyBinding.prototype.load = function load() {
    var str = this.hash.cache[this.key];
    if (str !== undefined) {
        var val = this.parse(str);
        if (this.value !== val) {
            this.value = val;
            this.hash.values[this.key] = this.value;
            this.notify();
        }
    }
    return this;
};

HashKeyBinding.prototype.save = function save() {
    this.hash.values[this.key] = this.value;
    var str = this.valToString(this.value);
    if (this.hash.cache[this.key] !== str) {
        this.hash.cache[this.key] = str;
        this.hash.save();
    }
    return this;
};

HashKeyBinding.prototype.notify = function notify() {
    for (var i = 0; i < this.listeners.length; i++) {
        this.listeners[i].call(this, this.value);
    }
    return this;
};

HashKeyBinding.prototype.setParse = function setParse(parse, toString) {
    this.parse = parse || parseValue;
    this.load();
    if (toString) {
        this.setToString(toString);
    }
    return this;
};

HashKeyBinding.prototype.setToString = function setToString(toString) {
    this.valToString = toString;
    if (this.value !== undefined) {
        this.save();
    }
    return this;
};

HashKeyBinding.prototype.addListener = function addListener(listener) {
    if (this.value !== undefined) {
        listener(this.value);
    }
    this.listeners.push(listener);
    return this;
};

HashKeyBinding.prototype.setDefault = function setDefault(def) {
    if (typeof def === 'string') {
        def = this.parse(def);
    }
    this.def = def;
    if (this.value === undefined) {
        this.value = def;
        this.save();
    }
    return this;
};

HashKeyBinding.prototype.onChange = function onChange() {
    this.load();
    return this;
};

HashKeyBinding.prototype.get = function get() {
    return this.value;
};

HashKeyBinding.prototype.reset = function reset() {
    if (this.value !== this.def) {
        this.value = this.def;
        this.save();
    }
};

HashKeyBinding.prototype.set = function set(val) {
    if (typeof val === 'string') {
        val = this.parse(val);
    }

    if (this.value !== val) {
        this.value = val;
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
        return true;
    }
    if (str === 'false') {
        return false;
    }
    if (str === 'null') {
        return null;
    }
    return str;
}

}],["hexant.html","hexant","hexant.html",{"./hexant.js":10},function (require, exports, module, __filename, __dirname){

// hexant/hexant.html
// ------------------

"use strict";
var $SUPER = require("./hexant.js");
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
        component.setAttribute("id", "view_j3izy1");
    }
    if (scope.componentsFor["view"]) {
       scope.componentsFor["view"].setAttribute("for", "view_j3izy1")
    }
    if (component.setAttribute) {
    component.setAttribute("class", "hexant-canvas");
    }
    parents[parents.length] = parent; parent = node;
    // CANVAS
    node = parent; parent = parents[parents.length - 1]; parents.length--;
    this.scope.hookup("this", this);
};
$THIS.prototype = Object.create($SUPER.prototype);
$THIS.prototype.constructor = $THIS;
$THIS.prototype.exports = {};
module.exports = $THIS;

}],["hexant.js","hexant","hexant.js",{"./colorgen.js":6,"./world.js":20,"./view.js":19,"./ant.js":5,"./hash.js":8,"./coord.js":7,"./hextiletree.js":13,"./rules.js":18},function (require, exports, module, __filename, __dirname){

// hexant/hexant.js
// ----------------

'use strict';
/* global console, prompt */
/* eslint no-console: [0], no-alert: [0], no-try-catch: [0] */

module.exports = Hexant;

var colorGen = require('./colorgen.js');
var World = require('./world.js');
var View = require('./view.js');
var Ant = require('./ant.js');
var Hash = require('./hash.js');
var OddQOffset = require('./coord.js').OddQOffset;
var HexTileTree = require('./hextiletree.js');
var rules = require('./rules.js');

var BatchLimit = 256;

function Hexant(body, scope) {
    var self = this;

    this.el = null;
    this.world = null;
    this.view = null;

    this.hash = new Hash(scope.window);
    this.animator = scope.animator.add(this);
    this.lastFrameTime = null;
    this.frameRate = 0;
    this.frameInterval = 0;
    this.paused = true;

    this.boundOnKeyPress = onKeyPress;
    function onKeyPress(e) {
        self.onKeyPress(e);
    }

    this.boundPlaypause = playpause;
    function playpause() {
        self.playpause();
    }
}

Hexant.prototype.hookup = function hookup(id, component, scope) {
    var self = this;
    if (id !== 'view') {
        return;
    }

    this.el = component;
    this.world = new World();
    this.view = this.world.addView(
        new View(this.world, component));

    this.el.addEventListener('click', this.boundPlaypause);
    scope.window.addEventListener('keypress', this.boundOnKeyPress);

    this.hash.bind('colors')
        .setParse(colorGen.parse, colorGen.toString)
        .setDefault(colorGen.gens.hue)
        .addListener(function onColorGenChange(gen) {
            self.view.setColorGen(gen);
            self.view.redraw();
        })
        ;

    this.world.addAnt(new Ant(this.world));

    this.hash.bind('rule')
        .setParse(rules.parse, rules.toString)
        .setDefault('LR')
        .addListener(function onRuleChange(rules) {
            var ant = self.world.ants[0];
            ant.rules = rules;
            self.world.updateAnt(ant);
            self.reset();
        });

    this.hash.bind('frameRate')
        .setParse(parseInt)
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
            self.view.defaultCellValue = drawUnvisited ? 1 : 0;
        });

    if (this.hash.get('autoplay')) {
        this.play();
    }
};

Hexant.prototype.onKeyPress =
function onKeyPress(e) {
    switch (e.keyCode) {
    case 0x20: // <Space>
        this.playpause();
        break;
    case 0x23: // #
        this.toggleLabeled();
        break;
    case 0x2a: // *
        console.log(this.world.tile.dump());
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
    case 0x2f: // /
        var rule = this.hash.getStr('rule');
        rule = prompt('New Rules: (' + rules.help + ')', rule);
        if (typeof rule === 'string') {
            this.pause();
            this.hash.set('rule', rule);
        }
        break;
    }
};

Hexant.prototype.reset =
function reset() {
    var ant = this.world.ants[0];
    this.world.tile = new HexTileTree(OddQOffset(0, 0), 2, 2);
    this.view.hexGrid.bounds = this.world.tile.boundingBox().copy();
    ant.dir = 0;
    ant.pos = this.world.tile.centerPoint().toCube();
    this.world.tile.set(ant.pos, 1);
    this.el.width = this.el.width;
    this.view.hexGrid.updateSize();
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

    this.lastFrameTime += frames * this.frameInterval;
    var err = this.stepn(frames);
    if (err) {
        this.pause();
        throw err;
    }
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

Hexant.prototype.stepn =
function stepn(n) {
    try {
        this.world.stepn(n);
        return null;
    } catch(err) {
        return err;
    }
};

Hexant.prototype.step =
function step() {
    try {
        this.world.step();
        return null;
    } catch(err) {
        return err;
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

}],["hexgrid.js","hexant","hexgrid.js",{"./coord.js":7},function (require, exports, module, __filename, __dirname){

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
}

HexGrid.prototype.internalize =
function internalize(point) {
    // TODO: hack, better compromise than the broken-ness of doing the sub in
    // odd-q space
    return point
        .toScreen()
        // .copy()
        // .toOddQOffset()
        .sub(this.bounds.topLeft)
        ;
};

HexGrid.prototype.toScreen =
function toScreen(point) {
    return this.internalize(point)
        .toScreen()
        .scale(this.cellSize)
        .add(this.origin);
};

HexGrid.prototype.cellPath =
function offsetCellPath(point) {
    var screenPoint = this.toScreen(point);
    this.ctxHex.full(screenPoint.x, screenPoint.y, this.cellSize);
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

    // align top-left
    this.origin.copyFrom(this.cell).scale(0.5);

    this.canvas.width = this.cell.x * this.view.x;
    this.canvas.height = this.cell.y * this.view.y;
    this.canvas.style.width = this.canvas.width + 'px';
    this.canvas.style.height = this.canvas.height + 'px';
};

}],["hextile.js","hexant","hextile.js",{"./coord.js":7},function (require, exports, module, __filename, __dirname){

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
    this.data = new Uint8Array(this.width * this.height);
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

OddQHexTile.prototype.set = function set(point, c) {
    this.data[this.pointToIndex(point)] = c;
    return c;
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

}],["hextiletree.js","hexant","hextiletree.js",{"./coord.js":7,"./hextile.js":12},function (require, exports, module, __filename, __dirname){

// hexant/hextiletree.js
// ---------------------

'use strict';

/* eslint no-inline-comments:0 */

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

HexTileTree.prototype.set = function set(point, c) {
    var offsetPoint = point.toOddQOffset();

    while (!this.root.box.contains(offsetPoint)) {
        this.root = this.root.expand();
    }

    return this.root._set(offsetPoint, c);
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

HexTileTreeNode.prototype.set = function set(point, c) {
    var offsetPoint = point.toOddQOffset();
    if (!this.box.contains(offsetPoint)) {
        throw new Error('set out of bounds');
    }
    return this._set(offsetPoint, c);
};

HexTileTreeNode.prototype._set = function _set(point, c) {
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

    return tile.set(point, c);
};

}],["index.js","hexant","index.js",{"domready":1,"global/window":2,"gutentag/scope":4,"gutentag/document":3,"blick":0,"./main.html":15},function (require, exports, module, __filename, __dirname){

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

}],["main.html","hexant","main.html",{"./main.js":16,"./hexant.html":9},function (require, exports, module, __filename, __dirname){

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
        component.setAttribute("id", "view_9pbs5i");
    }
    if (scope.componentsFor["view"]) {
       scope.componentsFor["view"].setAttribute("for", "view_9pbs5i")
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

/* eslint max-params:[0,6] */

module.exports = NGonContext;

function NGonContext(degree, ctx2d) {
    this.ctx2d = ctx2d;
    this.degree = degree;
    this.offset = 0;
    this.step = 2 * Math.PI / this.degree;
}

NGonContext.prototype.full = function full(x, y, radius) {
    var r = this.offset;
    this.ctx2d.moveTo(
        x + radius * Math.cos(r),
        y + radius * Math.sin(r));
    for (var i = 1; i < this.degree; i++) {
        r += this.step;
        this.ctx2d.lineTo(
            x + radius * Math.cos(r),
            y + radius * Math.sin(r));
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

    var r = this.offset + this.step * start;
    var px = x + radius * Math.cos(r);
    var py = y + radius * Math.sin(r);
    this.ctx2d.moveTo(px, py);

    for (var i = 1; i <= n; i++) {
        r += this.step;
        px = x + radius * Math.cos(r);
        py = y + radius * Math.sin(r);
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

    var r = this.offset + this.step * start;
    for (var i = 0; i <= n; i++) {
        var px = x + radius * Math.cos(r);
        var py = y + radius * Math.sin(r);
        this.ctx2d.lineTo(px, py);
        r += this.step;
    }
};


}],["rules.js","hexant","rules.js",{},function (require, exports, module, __filename, __dirname){

// hexant/rules.js
// ---------------

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


}],["view.js","hexant","view.js",{"./hexgrid.js":11,"./ngoncontext.js":17},function (require, exports, module, __filename, __dirname){

// hexant/view.js
// --------------

'use strict';

var HexGrid = require('./hexgrid.js');
var NGonContext = require('./ngoncontext.js');

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
    this.defaultCellValue = 0;

    this.cellColorGen = null;
    this.antBodyColorGen = null;
    this.antHeadColorGen = null;

    this.cellColors = [];
    this.antBodyColors = [];
    this.antHeadColors = [];
    this.lastAntPos = [];

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
    var ants = self.world.ants;

    self.world.tile.eachDataPoint(function each(point, c) {
        c = c || self.defaultCellValue;
        if (c) {
            self.drawCell(point, c);
        }
    });

    for (var i = 0; i < ants.length; i++) {
        self.drawAnt(ants[i]);
        for (i = 0; i < ants.length; i++) {
            this.lastAntPos[i].copyFrom(ants[i].pos);
        }
    }
};

View.prototype.updateAnts =
function updateAnts() {
    var i;
    for (i = 0; i < this.world.ants.length; i++) {
        var ant = this.world.ants[i];
        if (i < this.lastAntPos.length) {
            this.lastAntPos[i].copyFrom(ant.pos);
        } else {
            this.lastAntPos.push(ant.pos.copy());
        }
    }
    while (i < this.lastAntPos.length) {
        this.lastAntPos.pop();
    }
    this.updateColors(false);
};

View.prototype.addAnt =
function addAnt(ant) {
    this.lastAntPos.push(ant.pos.copy());
    this.updateColors(false);
};

View.prototype.updateAnt =
function updateAnt(ant) {
    this.lastAntPos[ant.index].copyFrom(ant.pos);
    this.updateColors(false);
};

View.prototype.removeAnt =
function removeAnt(ant) {
    swapout(this.lastAntPos, ant.index);
    this.lastAntPos.pop();
    this.updateColors(false);
};

View.prototype.setColorGen =
function setColorGen(colorGen) {
    this.cellColorGen = colorGen(1);
    this.antBodyColorGen = colorGen(2);
    this.antHeadColorGen = colorGen(3);
    this.updateColors(true);
};

View.prototype.updateColors = function updateColors(regen) {
    var N = this.world.numStates;
    var M = this.world.ants.length;

    if (this.cellColorGen &&
        (regen || this.cellColors.length !== N)
    ) {
        this.cellColors = this.cellColorGen(N);
    }

    if (this.antBodyColorGen &&
        (regen || this.antBodyColors.length !== M)
    ) {
        this.antBodyColors = this.antBodyColorGen(M);
    }

    if (this.antHeadColorGen &&
        (regen || this.antHeadColors.length !== M)
    ) {
        this.antHeadColors = this.antHeadColorGen(M);
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
function drawUnlabeledCell(point, c) {
    this.ctx2d.beginPath();
    var screenPoint = this.hexGrid.cellPath(point);
    this.ctx2d.closePath();
    this.ctx2d.fillStyle = this.cellColors[c - 1];
    this.ctx2d.fill();
    return screenPoint;
};

View.prototype.drawLabeledCell =
function drawLabeledCell(point, c) {
    var screenPoint = this.drawUnlabeledCell(point, c);
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
    var ants = this.world.ants;
    var i;

    var expanded = false;
    for (i = 0; i < ants.length; i++) {
        expanded = this.hexGrid.bounds.expandTo(ants[i].pos) || expanded;
    }

    if (expanded) {
        this.needsRedraw = true;
        this.hexGrid.updateSize();
    }

    if (this.needsRedraw) {
        return;
    }

    for (i = 0; i < ants.length; i++) {
        var c = this.world.tile.get(this.lastAntPos[i]);
        this.drawCell(this.lastAntPos[i], c);
    }

    for (i = 0; i < ants.length; i++) {
        this.drawAnt(ants[i]);
        this.lastAntPos[i].copyFrom(ants[i].pos);
    }

};

View.prototype.drawAnt =
function drawAnt(ant) {
    var c = this.world.tile.get(ant.pos);
    if (!c) {
        this.world.tile.set(ant.pos, 1);
        this.drawCell(ant.pos, c);
    }

    var screenPoint = this.hexGrid.toScreen(ant.pos);
    var size = this.hexGrid.cellSize * ant.size;

    if (size <= 5) {
        this.drawSmallAnt(ant, screenPoint, size);
    } else {
        this.drawFullAnt(ant, screenPoint, size);
    }

    if (this.labeled) {
        this.drawCellLabel(ant.pos, screenPoint);
    }
};

View.prototype.drawFullAnt =
function drawFullAnt(ant, screenPoint, size) {
    var ctxHex = this.hexGrid.ctxHex;
    var ctx2d = ctxHex.ctx2d;

    var start = ant.dir;
    var end = ant.dir + 1;

    // head
    ctx2d.fillStyle = this.antHeadColors[ant.index];
    ctx2d.strokeStyle = this.antHeadColors[ant.index];
    ctx2d.lineWidth = size / 2;
    ctx2d.beginPath();
    ctxHex.wedge(screenPoint.x, screenPoint.y, size, start, end, false);
    ctx2d.closePath();
    ctx2d.fill();
    ctx2d.stroke();

    // body
    ctx2d.fillStyle = this.antBodyColors[ant.index];
    ctx2d.beginPath();
    ctxHex.wedge(screenPoint.x, screenPoint.y, size, start, end, true);
    ctx2d.closePath();
    ctx2d.fill();
};

View.prototype.drawSmallAnt =
function drawSmallAnt(ant, screenPoint, size) {
    var ctxHex = this.hexGrid.ctxHex;
    var ctx2d = ctxHex.ctx2d;

    ctx2d.fillStyle = this.antHeadColors[ant.index];
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

}],["world.js","hexant","world.js",{"./coord.js":7,"./hextiletree.js":13},function (require, exports, module, __filename, __dirname){

// hexant/world.js
// ---------------

'use strict';

var Coord = require('./coord.js');
var HexTileTree = require('./hextiletree.js');

var OddQOffset = Coord.OddQOffset;

module.exports = World;

function World() {
    this.numStates = 0;
    this.tile = new HexTileTree(OddQOffset(0, 0), 2, 2);
    this.ants = [];
    this.views = [];
}

World.prototype.step = function step() {
    var i;
    for (i = 0; i < this.ants.length; i++) {
        this.ants[i].step();
    }
    for (i = 0; i < this.views.length; i++) {
        var view = this.views[i];
        view.step();
        if (view.needsRedraw) {
            view.redraw();
            view.needsRedraw = false;
        }
    }
};

World.prototype.stepn = function stepn(n) {
    var i;
    var j;
    for (i = 0; i < n; i++) {
        for (j = 0; j < this.ants.length; j++) {
            this.ants[j].step();
        }
        for (j = 0; j < this.views.length; j++) {
            this.views[j].step();
        }
    }
    for (i = 0; i < this.views.length; i++) {
        var view = this.views[i];
        if (view.needsRedraw) {
            view.redraw();
            view.needsRedraw = false;
        }
    }
};

World.prototype.addAnt = function addAnt(ant) {
    this.numStates = Math.max(this.numStates, ant.rules.length);
    ant.index = this.ants.length;
    this.ants.push(ant);
    var c = this.tile.get(ant.pos);
    if (!c) {
        this.tile.set(ant.pos, 1);
    }

    for (var i = 0; i < this.views.length; i++) {
        this.views[i].addAnt(ant);
    }

    return ant;
};

World.prototype.updateAnt = function updateAnt(ant) {
    var i;

    this.numStates = 0;
    for (i = 0; i < this.ants.length; i++) {
        this.numStates = Math.max(this.numStates, this.ants[i].rules.length);
    }

    for (i = 0; i < this.views.length; i++) {
        this.views[i].updateAnt(ant);
    }

    return ant;
};

World.prototype.removeAnt = function removeAnt(ant) {
    if (this.ants[ant.index] !== ant) {
        throw new Error('removeAnt mismatch');
    }

    var i = ant.index;
    var j = i++;
    for (; i < this.ants.length; i++, j++) {
        this.ants[j] = this.ants[i];
        this.ants[j].index = j;
    }
    this.ants.pop();

    for (i = 0; i < this.views.length; i++) {
        this.views[i].removeAnt(ant);
    }

    return ant;
};

World.prototype.addView = function addView(view) {
    this.views.push(view);
    view.updateAnts();
    return view;
};

}],["koerper.js","koerper","koerper.js",{"wizdom":24},function (require, exports, module, __filename, __dirname){

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

}],["index.js","raf","index.js",{"performance-now":22},function (require, exports, module, __filename, __dirname){

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
