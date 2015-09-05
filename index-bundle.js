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
})([["index.js","animation-frame","index.js",{"./lib/animation-frame":1},function (require, exports, module, __filename, __dirname){

// animation-frame/index.js
// ------------------------

/**
 * An even better animation frame.
 *
 * @copyright Oleg Slobodskoi 2015
 * @website https://github.com/kof/animationFrame
 * @license MIT
 */

module.exports = require('./lib/animation-frame')

}],["lib/animation-frame.js","animation-frame/lib","animation-frame.js",{"./native":2,"./now":3,"./performance":5},function (require, exports, module, __filename, __dirname){

// animation-frame/lib/animation-frame.js
// --------------------------------------

'use strict'

var nativeImpl = require('./native')
var now = require('./now')
var performance = require('./performance')

// Weird native implementation doesn't work if context is defined.
var nativeRequest = nativeImpl.request
var nativeCancel = nativeImpl.cancel

/**
 * Animation frame constructor.
 *
 * Options:
 *   - `useNative` use the native animation frame if possible, defaults to true
 *   - `frameRate` pass a custom frame rate
 *
 * @param {Object|Number} options
 */
function AnimationFrame(options) {
    if (!(this instanceof AnimationFrame)) return new AnimationFrame(options)
    options || (options = {})

    // Its a frame rate.
    if (typeof options == 'number') options = {frameRate: options}
    options.useNative != null || (options.useNative = true)
    this.options = options
    this.frameRate = options.frameRate || AnimationFrame.FRAME_RATE
    this._frameLength = 1000 / this.frameRate
    this._isCustomFrameRate = this.frameRate !== AnimationFrame.FRAME_RATE
    this._timeoutId = null
    this._callbacks = {}
    this._lastTickTime = 0
    this._tickCounter = 0
}

module.exports = AnimationFrame

/**
 * Default frame rate used for shim implementation. Native implementation
 * will use the screen frame rate, but js have no way to detect it.
 *
 * If you know your target device, define it manually.
 *
 * @type {Number}
 * @api public
 */
AnimationFrame.FRAME_RATE = 60

/**
 * Replace the globally defined implementation or define it globally.
 *
 * @param {Object|Number} [options]
 * @api public
 */
AnimationFrame.shim = function(options) {
    var animationFrame = new AnimationFrame(options)

    window.requestAnimationFrame = function(callback) {
        return animationFrame.request(callback)
    }
    window.cancelAnimationFrame = function(id) {
        return animationFrame.cancel(id)
    }

    return animationFrame
}

/**
 * Request animation frame.
 * We will use the native RAF as soon as we know it does works.
 *
 * @param {Function} callback
 * @return {Number} timeout id or requested animation frame id
 * @api public
 */
AnimationFrame.prototype.request = function(callback) {
    var self = this

    // Alawys inc counter to ensure it never has a conflict with the native counter.
    // After the feature test phase we don't know exactly which implementation has been used.
    // Therefore on #cancel we do it for both.
    ++this._tickCounter

    if (nativeImpl.supported && this.options.useNative && !this._isCustomFrameRate) {
        return nativeRequest(callback)
    }

    if (!callback) throw new TypeError('Not enough arguments')

    if (this._timeoutId == null) {
        // Much faster than Math.max
        // http://jsperf.com/math-max-vs-comparison/3
        // http://jsperf.com/date-now-vs-date-gettime/11
        var delay = this._frameLength + this._lastTickTime - now()
        if (delay < 0) delay = 0

        this._timeoutId = setTimeout(function() {
            self._lastTickTime = now()
            self._timeoutId = null
            ++self._tickCounter
            var callbacks = self._callbacks
            self._callbacks = {}
            for (var id in callbacks) {
                if (callbacks[id]) {
                    if (nativeImpl.supported && self.options.useNative) {
                        nativeRequest(callbacks[id])
                    } else {
                        callbacks[id](performance.now())
                    }
                }
            }
        }, delay)
    }

    this._callbacks[this._tickCounter] = callback

    return this._tickCounter
}

/**
 * Cancel animation frame.
 *
 * @param {Number} timeout id or requested animation frame id
 *
 * @api public
 */
AnimationFrame.prototype.cancel = function(id) {
    if (nativeImpl.supported && this.options.useNative) nativeCancel(id)
    delete this._callbacks[id]
}

}],["lib/native.js","animation-frame/lib","native.js",{},function (require, exports, module, __filename, __dirname){

// animation-frame/lib/native.js
// -----------------------------

'use strict'

var global = window

// Test if we are within a foreign domain. Use raf from the top if possible.
try {
    // Accessing .name will throw SecurityError within a foreign domain.
    global.top.name
    global = global.top
} catch(e) {}

exports.request = global.requestAnimationFrame
exports.cancel = global.cancelAnimationFrame || global.cancelRequestAnimationFrame
exports.supported = false

var vendors = ['Webkit', 'Moz', 'ms', 'O']

// Grab the native implementation.
for (var i = 0; i < vendors.length && !exports.request; i++) {
    exports.request = global[vendors[i] + 'RequestAnimationFrame']
    exports.cancel = global[vendors[i] + 'CancelAnimationFrame'] ||
        global[vendors[i] + 'CancelRequestAnimationFrame']
}

// Test if native implementation works.
// There are some issues on ios6
// http://shitwebkitdoes.tumblr.com/post/47186945856/native-requestanimationframe-broken-on-ios-6
// https://gist.github.com/KrofDrakula/5318048

if (exports.request) {
    exports.request.call(null, function() {
        exports.supported = true
    });
}

}],["lib/now.js","animation-frame/lib","now.js",{},function (require, exports, module, __filename, __dirname){

// animation-frame/lib/now.js
// --------------------------

'use strict'

/**
 * Crossplatform Date.now()
 *
 * @return {Number} time in ms
 * @api private
 */
module.exports = Date.now || function() {
    return (new Date).getTime()
}

}],["lib/performance-timing.js","animation-frame/lib","performance-timing.js",{"./now":3},function (require, exports, module, __filename, __dirname){

// animation-frame/lib/performance-timing.js
// -----------------------------------------

'use strict'

var now = require('./now')

/**
 * Replacement for PerformanceTiming.navigationStart for the case when
 * performance.now is not implemented.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/PerformanceTiming.navigationStart
 *
 * @type {Number}
 * @api private
 */
exports.navigationStart = now()

}],["lib/performance.js","animation-frame/lib","performance.js",{"./now":3,"./performance-timing":4},function (require, exports, module, __filename, __dirname){

// animation-frame/lib/performance.js
// ----------------------------------

'use strict'

var now = require('./now')
var PerformanceTiming = require('./performance-timing')

/**
 * Crossplatform performance.now()
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/Performance.now()
 *
 * @return {Number} relative time in ms
 * @api public
 */
exports.now = function () {
    if (window.performance && window.performance.now) return window.performance.now()
    return now() - PerformanceTiming.navigationStart
}


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

}],["ant.js","hexant","ant.js",{"./coord.js":10},function (require, exports, module, __filename, __dirname){

// hexant/ant.js
// -------------

'use strict';

var Coord = require('./coord.js');
var CubePoint = Coord.CubePoint;

module.exports = Ant;

function Ant(world) {
    this.world = world;
    this.pos = CubePoint(0, 0, 0);
    this.dir = 0;
    this.headColor = '#eee';
    this.bodyColor = '#ccc';
    this.size = 0.5;
    this.rules = [-1, 1];
}

Ant.prototype.step = function step() {
};

Ant.prototype.stepDraw = function stepDraw() {
    var tile = this.world.tile;
    var c = tile.get(this.pos) || 1;
    var rule = this.rules[(c - 1) % this.rules.length];
    c = tile.set(this.pos, 1 + c % this.world.cellColors.length);
    this.dir = (CubePoint.basis.length + this.dir + rule
               ) % CubePoint.basis.length;

    this.world.drawCell(this.pos, c);
    this.pos.add(CubePoint.basis[this.dir]);

    c = tile.get(this.pos);
    if (!c) {
        tile.set(this.pos, 1);
    }

    // TODO: wall check
    this.redraw();
};

Ant.prototype.redraw = function redraw() {
    var ctxHex = this.world.hexGrid.ctxHex;
    var ctx2d = ctxHex.ctx2d;

    var start = this.dir;
    var end = this.dir + 1;
    var screenPoint = this.world.hexGrid.toScreen(this.pos);
    var size = this.world.hexGrid.cellSize * this.size;

    // head
    ctx2d.fillStyle = this.headColor;
    ctx2d.strokeStyle = this.headColor;
    ctx2d.lineWidth = size / 2;
    ctx2d.beginPath();
    ctxHex.wedge(screenPoint.x, screenPoint.y, size, start, end, false);
    ctx2d.closePath();
    ctx2d.fill();
    ctx2d.stroke();

    // body
    ctx2d.fillStyle = this.bodyColor;
    ctx2d.beginPath();
    ctxHex.wedge(screenPoint.x, screenPoint.y, size, start, end, true);
    ctx2d.closePath();
    ctx2d.fill();

    if (this.world.labeled) {
        this.world.drawCellLabel(this.pos, screenPoint);
    }
};

}],["colorgen.js","hexant","colorgen.js",{},function (require, exports, module, __filename, __dirname){

// hexant/colorgen.js
// ------------------

'use strict';

module.exports = HueWheelGenerator;

// TODO: husl instead of hsl
function HueWheelGenerator(s, l) {
    var ss = (s * 100).toFixed(1) + '%';
    var sl = (l * 100).toFixed(1) + '%';
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
ScreenPoint.prototype.toString = function toString() {
    return 'ScreenPoint(' + this.x + ', ' + this.y + ')';
};
ScreenPoint.prototype.toScreen = function toScreen() {
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
    this.topLeft = topLeft.toOddQOffset();
    this.bottomRight = bottomRight.toOddQOffset();
}

OddQBox.prototype.toString = function toString() {
    return 'OddQBox(' +
        this.topLeft.toString() + ', ' +
        this.bottomRight.toString() + ')';
};

OddQBox.prototype.screenCount = function screenCount(pointArg) {
    var W = this.bottomRight.q - this.topLeft.q;
    var H = this.bottomRight.r - this.topLeft.r;

    // return the count number of hexes needed in screen x space and screen y
    // space

    // first one is a unit, each successive column backs 1/4 with the last
    // var x = 1 + 3 / 4 * (W - 1);
    var x = (3 * W + 1) / 4;

    // height backs directly, but we need an extra half cell except when we
    // have only one column
    var y = H + (W > 1 ? 0.5 : 0);

    return ScreenPoint(x, y);
};

OddQBox.prototype.contains = function contains(pointArg) {
    var point = pointArg.toOddQOffset();
    return point.q >= this.topLeft.q && point.q < this.bottomRight.q &&
           point.r >= this.topLeft.r && point.r < this.bottomRight.r;
};

}],["hash.js","hexant","hash.js",{},function (require, exports, module, __filename, __dirname){

// hexant/hash.js
// --------------

'use strict';

module.exports = Hash;

function Hash(window) {
    this.window = window;
}

Hash.prototype.parse = function parse() {
    return this.window.location.hash.slice(1).split('&');
};

Hash.prototype.get = function get(key, def) {
    var parts = this.parse();
    for (var i = 0; i < parts.length; i++) {
        var keyval = parts[i].split('=');
        if (unescape(keyval[0]) === key) {
            var val = unescape(keyval[1]);
            if (val === undefined || val === 'true') {
                return true;
            }
            if (val === 'false') {
                return false;
            }
            if (val === 'null') {
                return null;
            }
            return val;
        }
    }

    return this.set(key, def);
};

Hash.prototype.set = function set(key, val) {
    var part = '' + escape(key);
    if (val === false) {
        part = '';
    } else if (val !== true) {
        part += '=' + escape(val);
    }

    var found = false;
    var parts = this.parse();
    for (var i = 0; i < parts.length; i++) {
        var keyval = parts[i].split('=');
        if (keyval[0] === key) {
            found = true;
            parts[i] = part;
            break;
        }
    }
    if (!found) {
        parts.push(part);
    }

    parts = parts.filter(notEmptyString);
    this.window.location.hash = parts.join('&');

    return val;
};

function notEmptyString(val) {
    return val !== '';
}

}],["hexgrid.js","hexant","hexgrid.js",{},function (require, exports, module, __filename, __dirname){

// hexant/hexgrid.js
// -----------------

'use strict';

// TODO: perhaps this whole module would be better done as a thinner
// NGonContext wrapper.  Essentially an equally-radius'd equally-spaced
// NGonContext.  This would force us to explicate the vertical-orientation
// assumption spread throughout HexGrid and its consumers.

var HexAspect = Math.sqrt(3) / 2;

module.exports = HexGrid;

function HexGrid(canvas, ctxHex) {
    this.canvas = canvas;
    this.viewWidth = 0;
    this.viewHeight = 0;
    this.ctxHex = ctxHex;
    this.cellSize = 0;
    this.cellWidth = 0;
    this.cellHeight = 0;
    this.hexOrigin = null;
    this.originX = 0;
    this.originY = 0;
    // TODO: support horizontal orientation
}

HexGrid.prototype.toScreen = function toScreen(point) {
    if (this.hexOrigin) {
        point = point.copy();
        point = point.toOddQOffset();
        point.sub(this.hexOrigin);
    }
    var screenPoint = point.toScreen();
    screenPoint.x *= this.cellSize;
    screenPoint.y *= this.cellSize;
    screenPoint.x += this.originX;
    screenPoint.y += this.originY;
    return screenPoint;
};

HexGrid.prototype.cellPath = function offsetCellPath(point) {
    var screenPoint = this.toScreen(point);
    this.ctxHex.full(screenPoint.x, screenPoint.y, this.cellSize);
    return screenPoint;
};

HexGrid.prototype.satisfySize = function satisfySize(width, height, box) {
    var numCells = box.screenCount();
    this.cellWidth = width / numCells.x;
    this.cellHeight = height / numCells.y;

    var widthSize = this.cellWidth / 2;
    var heightSize = this.cellHeight / 2 / HexAspect;
    if (widthSize < heightSize) {
        this.cellSize = widthSize;
        this.cellHeight = this.cellWidth * HexAspect;
    } else {
        this.cellSize = heightSize;
        this.cellWidth = 2 * this.cellSize;
    }

    this.viewWidth = numCells.x;
    this.viewHeight = numCells.y;

    width = this.cellWidth * this.viewWidth;
    height = this.cellHeight * this.viewHeight;
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = Math.floor(width) + 'px';
    this.canvas.style.height = Math.floor(height) + 'px';
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

}],["hextiletree.js","hexant","hextiletree.js",{"./coord.js":10,"./hextile.js":13},function (require, exports, module, __filename, __dirname){

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
    this.resized = false;
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
        this.resized = true;
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

}],["index.js","hexant","index.js",{"domready":6,"animation-frame":0,"global/window":7,"./world.js":17,"./hash.js":11},function (require, exports, module, __filename, __dirname){

// hexant/index.js
// ---------------

'use strict';

var domready = require('domready');
var AnimationFrame = require('animation-frame');
var window = require('global/window');
var document = window.document;

var HexAntWorld = require('./world.js');
var Hash = require('./hash.js');

var BatchLimit = 256;

domready(setup);

function setup() {
    var el = document.querySelector('#view');

    var hash = new Hash(window);
    var animFrame = new AnimationFrame();
    var frameId = null;
    var lastFrameTime = null;
    var frameRate = 0;
    var frameInterval = 0;

    var hexant = new HexAntWorld(el);
    hexant.addAnt();
    el.addEventListener('click', playpause);
    window.hexant = hexant;
    window.addEventListener('keypress', onKeyPress);

    setFrameRate(hash.get('frameRate', 4));
    hexant.setLabeled(hash.get('labeled', false));

    hexant.defaultCellValue = hash.get('drawUnvisited', false) ? 1 : 0;

    function onKeyPress(e) {
        switch (e.keyCode) {
        case 0x20: // <Space>
            if (!frameId) {
                stepit();
                e.preventDefault();
            }
            break;
        case 0x23: // #
            toggleLabeled();
            break;
        case 0x2a: // *
            console.log(hexant.tile.dump());
            break;
        case 0x2b: // +
            setFrameRate(frameRate * 2);
            hash.set('frameRate', frameRate);
            break;
        case 0x2d: // -
            setFrameRate(Math.max(1, Math.floor(frameRate / 2)));
            hash.set('frameRate', frameRate);
            break;
        }
    }

    function toggleLabeled() {
        hexant.setLabeled(!hexant.labeled);
        hexant.redraw();
        hash.set('labeled', hexant.labeled);
    }

    function stepit() {
        hexant.stepDraw();
    }

    function setFrameRate(rate) {
        frameRate = rate;
        frameInterval = 1000 / frameRate;
        if (frameId) {
            animFrame.cancel(frameId);
        }
        if (frameId) {
            play();
        }
    }

    function play() {
        lastFrameTime = null;
        frameId = animFrame.request(tick);
    }

    function pause() {
        animFrame.cancel(frameId);
        lastFrameTime = null;
        frameId = null;
    }

    function playpause() {
        if (frameId) {
            pause();
        } else {
            play();
        }
    }

    function tick(time) {
        var frames = 1;
        if (!lastFrameTime) {
            lastFrameTime = time;
        } else {
            var progress = time - lastFrameTime;
            frames = Math.min(BatchLimit, progress / frameInterval);
        }

        for (var i = 0; i < frames; i++) {
            lastFrameTime += frameInterval;
            var err = step();
            if (err) {
                pause();
                throw err;
            }
        }

        frameId = animFrame.request(tick);
    }

    function step() {
        try {
            hexant.stepDraw();
            return null;
        } catch(err) {
            return err;
        }
    }

    window.addEventListener('resize', onResize);
    onResize();

    function onResize() {
        var width = Math.max(
            document.documentElement.clientWidth,
            window.innerWidth || 0);
        var height = Math.max(
            document.documentElement.clientHeight,
            window.innerHeight || 0);
        hexant.resize(width, height);
    }
}

}],["ngoncontext.js","hexant","ngoncontext.js",{},function (require, exports, module, __filename, __dirname){

// hexant/ngoncontext.js
// ---------------------

'use strict';

/* eslint max-parameters:6 */

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

NGonContext.prototype.wedge = function wedge(x, y, radius, startArg, endArg, complement) {
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


}],["world.js","hexant","world.js",{"./coord.js":10,"./hexgrid.js":12,"./ant.js":8,"./colorgen.js":9,"./hextiletree.js":14,"./ngoncontext.js":16},function (require, exports, module, __filename, __dirname){

// hexant/world.js
// ---------------

'use strict';

var Coord = require('./coord.js');
var HexGrid = require('./hexgrid.js');
var Ant = require('./ant.js');
var colorGen = require('./colorgen.js');
var HexTileTree = require('./hextiletree.js');
var NGonContext = require('./ngoncontext.js');

var OddQOffset = Coord.OddQOffset;

module.exports = HexAntWorld;

function HexAntWorld(canvas) {
    this.canvas = canvas;
    this.ctx2d = this.canvas.getContext('2d');
    this.ctxHex = new NGonContext(6, this.ctx2d);

    this.cellColorGen = colorGen(0.75, 0.4);
    this.antBodyColorGen = colorGen(0.85, 0.5);
    this.antHeadColorGen = colorGen(0.95, 0.6);

    this.cellColors = [];
    this.antBodyColors = [];
    this.antHeadColors = [];

    this.tile = new HexTileTree(OddQOffset(0, 0), 2, 2);

    this.hexGrid = new HexGrid(this.canvas, this.ctxHex);
    this.hexGrid.hexOrigin = this.tile.boundingBox().topLeft;
    this.ants = [];

    this.labeled = false;

    this.defaultCellValue = 0;
    this.availWidth = 0;
    this.availHeight = 0;
}

HexAntWorld.prototype.setLabeled = function setLabeled(labeled) {
    this.labeled = labeled;
    if (this.labeled) {
        this.drawCell = this.drawLabeledCell;
    } else {
        this.drawCell = this.drawUnlabeledCell;
    }
};

HexAntWorld.prototype.step = function step(draw) {
    for (var i = 0; i < this.ants.length; i++) {
        this.ants[i].step();
    }
};

HexAntWorld.prototype.stepDraw = function stepDraw() {
    for (var i = 0; i < this.ants.length; i++) {
        this.ants[i].stepDraw();
    }
    if (this.tile.resized) {
        this.tile.resized = false;
        this.hexGrid.hexOrigin = this.tile.boundingBox().topLeft;
        this.resize(this.availWidth, this.availHeight);
    }
};

HexAntWorld.prototype.resize = function resize(width, height) {
    this.availWidth = width;
    this.availHeight = height;

    // TODO: need this?
    // this.canvas.width = width;
    // this.canvas.height = height;

    this.hexGrid.satisfySize(width, height, this.tile.boundingBox());

    // align top-left
    this.hexGrid.originX = this.hexGrid.cellWidth / 2;
    this.hexGrid.originY = this.hexGrid.cellHeight / 2;

    this.redraw();
};

HexAntWorld.prototype.redraw = function redraw() {
    var self = this;

    self.tile.eachDataPoint(function each(point, c) {
        c = c || self.defaultCellValue;
        if (c) {
            self.drawCell(point, c);
        }
    });

    for (var i = 0; i < self.ants.length; i++) {
        self.ants[i].redraw();
    }
};

HexAntWorld.prototype.drawUnlabeledCell = function drawCell(point, c) {
    this.ctx2d.beginPath();
    var screenPoint = this.hexGrid.cellPath(point);
    this.ctx2d.closePath();
    this.ctx2d.fillStyle = this.cellColors[c - 1];
    this.ctx2d.fill();
    return screenPoint;
};

HexAntWorld.prototype.drawLabeledCell = function drawCell(point, c) {
    var screenPoint = this.drawUnlabeledCell(point, c);
    this.drawCellLabel(point, screenPoint);
};

HexAntWorld.prototype.drawCellLabel =
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

HexAntWorld.prototype.drawCell = HexAntWorld.prototype.drawUnlabeledCell;

HexAntWorld.prototype.addAnt = function addAnt() {
    var ant = new Ant(this);
    if (this.ants.length === 0) {
        ant.pos = this.tile.centerPoint().toCube();
    }
    var c = this.tile.get(ant.pos);
    if (!c) {
        this.tile.set(ant.pos, 1);
    }
    this.ants.push(ant);

    this.cellColors = this.cellColorGen(Math.max(
        this.cellColors.length, ant.rules.length));

    this.antBodyColors = this.antBodyColorGen(this.ants.length);
    this.antHeadColors = this.antHeadColorGen(this.ants.length);

    for (var i = 0; i < this.ants.length; i++) {
        this.ants[i].bodyColor = this.antBodyColors[i];
        this.ants[i].headColor = this.antHeadColors[i];
    }

    return ant;
};

}]])("hexant/index.js")
