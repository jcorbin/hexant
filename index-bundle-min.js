global=this,function(t){function e(t,e,i,o,n){this.id=t,this.dirname=e,this.filename=e+"/"+i,this.dependencies=o,this.factory=n}for(var i,o={},n=0;n<t.length;n++){var r=t[n];r=t[n]=new e(r[0],r[1],r[2],r[3],r[4]),o[r.filename]=r}return e.prototype._require=function(){var e=this;if(void 0===e.exports){e.exports={};var o=function(i){var o=e.dependencies[i],n=t[o];if(!n)throw new Error("Bundle is missing a dependency: "+i);return n._require()};o.main=i,e.exports=e.factory(o,e.exports,e,e.filename,e.dirname)||e.exports}return e.exports},e.prototype.modules=o,function(t){i=o[t],i._require()}}([["index.js","animation-frame","index.js",{"./lib/animation-frame":1},function(t,e,i,o,n){i.exports=t("./lib/animation-frame")}],["lib/animation-frame.js","animation-frame/lib","animation-frame.js",{"./native":2,"./now":3,"./performance":5},function(t,e,i,o,n){"use strict";function r(t){return this instanceof r?(t||(t={}),"number"==typeof t&&(t={frameRate:t}),null!=t.useNative||(t.useNative=!0),this.options=t,this.frameRate=t.frameRate||r.FRAME_RATE,this._frameLength=1e3/this.frameRate,this._isCustomFrameRate=this.frameRate!==r.FRAME_RATE,this._timeoutId=null,this._callbacks={},this._lastTickTime=0,void(this._tickCounter=0)):new r(t)}var s=t("./native"),h=t("./now"),a=t("./performance"),l=s.request,u=s.cancel;i.exports=r,r.FRAME_RATE=60,r.shim=function(t){var e=new r(t);return window.requestAnimationFrame=function(t){return e.request(t)},window.cancelAnimationFrame=function(t){return e.cancel(t)},e},r.prototype.request=function(t){var e=this;if(++this._tickCounter,s.supported&&this.options.useNative&&!this._isCustomFrameRate)return l(t);if(!t)throw new TypeError("Not enough arguments");if(null==this._timeoutId){var i=this._frameLength+this._lastTickTime-h();0>i&&(i=0),this._timeoutId=setTimeout(function(){e._lastTickTime=h(),e._timeoutId=null,++e._tickCounter;var t=e._callbacks;e._callbacks={};for(var i in t)t[i]&&(s.supported&&e.options.useNative?l(t[i]):t[i](a.now()))},i)}return this._callbacks[this._tickCounter]=t,this._tickCounter},r.prototype.cancel=function(t){s.supported&&this.options.useNative&&u(t),delete this._callbacks[t]}}],["lib/native.js","animation-frame/lib","native.js",{},function(t,e,i,o,n){"use strict";var r=window;try{r.top.name,r=r.top}catch(s){}e.request=r.requestAnimationFrame,e.cancel=r.cancelAnimationFrame||r.cancelRequestAnimationFrame,e.supported=!1;for(var h=["Webkit","Moz","ms","O"],a=0;a<h.length&&!e.request;a++)e.request=r[h[a]+"RequestAnimationFrame"],e.cancel=r[h[a]+"CancelAnimationFrame"]||r[h[a]+"CancelRequestAnimationFrame"];e.request&&e.request.call(null,function(){e.supported=!0})}],["lib/now.js","animation-frame/lib","now.js",{},function(t,e,i,o,n){"use strict";i.exports=Date.now||function(){return(new Date).getTime()}}],["lib/performance-timing.js","animation-frame/lib","performance-timing.js",{"./now":3},function(t,e,i,o,n){"use strict";var r=t("./now");e.navigationStart=r()}],["lib/performance.js","animation-frame/lib","performance.js",{"./now":3,"./performance-timing":4},function(t,e,i,o,n){"use strict";var r=t("./now"),s=t("./performance-timing");e.now=function(){return window.performance&&window.performance.now?window.performance.now():r()-s.navigationStart}}],["ready.js","domready","ready.js",{},function(t,e,i,o,n){!function(t,e){"undefined"!=typeof i?i.exports=e():"function"==typeof define&&"object"==typeof define.amd?define(e):this[t]=e()}("domready",function(){var t,e=[],i=document,o=i.documentElement.doScroll,n="DOMContentLoaded",r=(o?/^loaded|^c/:/^loaded|^i|^c/).test(i.readyState);return r||i.addEventListener(n,t=function(){for(i.removeEventListener(n,t),r=1;t=e.shift();)t()}),function(t){r?setTimeout(t,0):e.push(t)}})}],["window.js","global","window.js",{},function(t,e,i,o,n){"undefined"!=typeof window?i.exports=window:"undefined"!=typeof global?i.exports=global:"undefined"!=typeof self?i.exports=self:i.exports={}}],["ant.js","hexant","ant.js",{"./coord.js":10},function(t,e,i,o,n){"use strict";function r(t){this.world=t,this.pos=h(0,0,0),this.dir=0,this.headColor="#eee",this.bodyColor="#ccc",this.size=.5,this.rules=[-1,1]}var s=t("./coord.js"),h=s.CubePoint;i.exports=r,r.prototype.step=function(){var t=this.world.tile,e=t.get(this.pos)||1,i=this.rules[(e-1)%this.rules.length];e=t.set(this.pos,1+e%this.world.cellColors.length),this.dir=(h.basis.length+this.dir+i)%h.basis.length,this.pos.add(h.basis[this.dir])},r.prototype.stepDraw=function(){var t=this.world.tile,e=t.get(this.pos)||1,i=this.rules[(e-1)%this.rules.length];e=t.set(this.pos,1+e%this.world.cellColors.length),this.dir=(h.basis.length+this.dir+i)%h.basis.length,this.world.drawCell(this.pos,e),this.pos.add(h.basis[this.dir]),this.redraw()},r.prototype.redraw=function(){var t=this.world.hexGrid.ctxHex,e=t.ctx2d,i=this.dir,o=this.dir+1,n=this.world.hexGrid.toScreen(this.pos),r=this.world.hexGrid.cellSize*this.size;e.fillStyle=this.headColor,e.strokeStyle=this.headColor,e.lineWidth=r/2,e.beginPath(),t.wedge(n.x,n.y,r,i,o,!1),e.closePath(),e.fill(),e.stroke(),e.fillStyle=this.bodyColor,e.beginPath(),t.wedge(n.x,n.y,r,i,o,!0),e.closePath(),e.fill(),this.world.labeled&&this.world.drawCellLabel(this.pos,n)}}],["colorgen.js","hexant","colorgen.js",{},function(t,e,i,o,n){"use strict";function r(t,e){var i=(100*t).toFixed(1)+"%",o=(100*e).toFixed(1)+"%",n=", "+i+", "+o+")";return function(t){for(var e=360/t,i=[],o=0;t>o;o++){var r=Math.floor(o*e).toString();i.push("hsl("+r+n)}return i}}i.exports=r}],["coord.js","hexant","coord.js",{},function(t,e,i,o,n){"use strict";function r(t,e){return this instanceof r?(this.x=t,void(this.y=e)):new r(t,e)}function s(t,e,i){if(!(this instanceof s))return new s(t,e,i);if(t+e+i!==0)throw new Error("CubePoint invariant violated: "+t+" + "+e+" + "+i+" = "+(t+e+i));this.x=t,this.y=e,this.z=i}function h(t,e){return this instanceof h?(this.q=t,void(this.r=e)):new h(t,e)}function a(t,e){return this instanceof a?(this.topLeft=t?t.toOddQOffset():h(),void(this.bottomRight=e?e.toOddQOffset():h())):new a(t,e)}i.exports.ScreenPoint=r,i.exports.CubePoint=s,i.exports.OddQOffset=h,i.exports.OddQBox=a,r.prototype.type="point.screen",r.prototype.copy=function(){return r(this.x,this.y)},r.prototype.copyFrom=function(t){return this.x=t.x,this.y=t.y,this},r.prototype.toString=function(){return"ScreenPoint("+this.x+", "+this.y+")"},r.prototype.toScreen=function(){return this},r.prototype.scale=function(t){return this.x*=t,this.y*=t,this},r.prototype.mulBy=function(t,e){return this.x*=t,this.y*=e,this},r.prototype.add=function(t){return t.type!==this.type&&(t=t.toScreen()),this.x+=t.x,this.y+=t.y,this},r.prototype.sub=function(t){return t.type!==this.type&&(t=t.toScreen()),this.x-=t.x,this.y-=t.y,this},s.basis=[s(1,-1,0),s(0,-1,1),s(-1,0,1),s(-1,1,0),s(0,1,-1),s(1,0,-1)],s.prototype.type="point.cube",s.prototype.toString=function(){return"CubePoint("+this.x+", "+this.y+", "+this.z+")"},s.prototype.copy=function(){return s(this.x,this.y,this.z)},s.prototype.add=function(t){return t.type!==this.type&&(t=t.toCube()),this.x+=t.x,this.y+=t.y,this.z+=t.z,this},s.prototype.sub=function(t){return t.type!==this.type&&(t=t.toCube()),this.x-=t.x,this.y-=t.y,this.z-=t.z,this},s.prototype.toScreen=function(){var t=1.5*this.x,e=Math.sqrt(3)*(this.z+this.x/2);return r(t,e)},s.prototype.toCube=function(){return this},s.prototype.toOddQOffset=function(){var t=this.x,e=this.z+(this.x-(1&this.x))/2;return h(t,e)},h.prototype.type="offset.odd-q",h.prototype.toString=function(){return"OddQOffset("+this.q+", "+this.r+")"},h.prototype.copy=function(){return h(this.q,this.r)},h.prototype.copyFrom=function(t){return t.type!==this.type?this.copyFrom(t.toOddQOffset()):(this.q=t.q,this.r=t.r,this)},h.prototype.add=function(t){return t.type!==this.type&&(t=t.toOddQOffset()),this.q+=t.q,this.r+=t.r,this},h.prototype.sub=function(t){return t.type!==this.type&&(t=t.toOddQOffset()),this.q-=t.q,this.r-=t.r,this},h.prototype.mulBy=function(t,e){return this.q*=t,this.r*=e,this},h.prototype.toScreen=function(){var t=1.5*this.q,e=Math.sqrt(3)*(this.r+.5*(1&this.q));return r(t,e)},h.prototype.toOddQOffset=function(){return this},h.prototype.toCube=function(){var t=this.q,e=this.r-(this.q-(1&this.q))/2,i=-t-e;return s(t,i,e)},a.prototype.copy=function(){return new a(this.topLeft.copy(),this.bottomRight.copy())},a.prototype.copyFrom=function(t){return this.topLeft.copy(t.topLeft),this.bottomRight.copy(t.bottomRight),this},a.prototype.toString=function(){return"OddQBox("+this.topLeft.toString()+", "+this.bottomRight.toString()+")"},a.prototype.screenCount=function(){var t=this.bottomRight.q-this.topLeft.q,e=this.bottomRight.r-this.topLeft.r,i=(3*t+1)/4,o=e+(t>1?.5:0);return r(i,o)},a.prototype.contains=function(t){var e=t.toOddQOffset();return e.q>=this.topLeft.q&&e.q<this.bottomRight.q&&e.r>=this.topLeft.r&&e.r<this.bottomRight.r},a.prototype.expandTo=function(t){var e=!1,i=t.toOddQOffset();return i.q<this.topLeft.q?(this.topLeft.q=i.q,e=!0):i.q>=this.bottomRight.q&&(this.bottomRight.q=i.q+1,e=!0),i.r<this.topLeft.r?(this.topLeft.r=i.r,e=!0):i.r>=this.bottomRight.r&&(this.bottomRight.r=i.r+1,e=!0),e}}],["hash.js","hexant","hash.js",{},function(t,e,i,o,n){"use strict";function r(t){this.window=t}function s(t){return""!==t}i.exports=r,r.prototype.parse=function(){return this.window.location.hash.slice(1).split("&")},r.prototype.get=function(t,e){for(var i=this.parse(),o=0;o<i.length;o++){var n=i[o].split("=");if(unescape(n[0])===t){var r=unescape(n[1]);return void 0===r||"true"===r?!0:"false"===r?!1:"null"===r?null:r}}return this.set(t,e)},r.prototype.set=function(t,e){var i=""+escape(t);e===!1?i="":e!==!0&&(i+="="+escape(e));for(var o=!1,n=this.parse(),r=0;r<n.length;r++){var h=n[r].split("=");if(h[0]===t){o=!0,n[r]=i;break}}return o||n.push(i),n=n.filter(s),this.window.location.hash=n.join("&"),e}}],["hexgrid.js","hexant","hexgrid.js",{"./coord.js":10},function(t,e,i,o,n){"use strict";function r(t,e,i){this.canvas=t,this.ctxHex=e,this.bounds=i||h(),this.cell=a(),this.origin=a(),this.avail=a(),this.cellSize=0}var s=t("./coord.js"),h=s.OddQBox,a=s.ScreenPoint,l=Math.sqrt(3)/2;i.exports=r,r.prototype.internalize=function(t){return t.toScreen().sub(this.bounds.topLeft)},r.prototype.toScreen=function(t){return this.internalize(t).toScreen().scale(this.cellSize).add(this.origin)},r.prototype.cellPath=function(t){var e=this.toScreen(t);return this.ctxHex.full(e.x,e.y,this.cellSize),e},r.prototype.resize=function(t,e){this.avail.x=t,this.avail.y=e,this.updateSize()},r.prototype.updateSize=function(){var t=this.bounds.screenCount();this.cell.x=this.avail.x/t.x,this.cell.y=this.avail.y/t.y;var e=this.cell.x/2,i=this.cell.y/2/l;i>e?(this.cellSize=e,this.cell.y=this.cell.x*l):(this.cellSize=i,this.cell.x=2*this.cellSize),this.origin.copyFrom(this.cell).scale(.5),this.canvas.width=this.cell.x*t.x,this.canvas.height=this.cell.y*t.y,this.canvas.style.width=this.canvas.width+"px",this.canvas.style.height=this.canvas.height+"px"}}],["hextile.js","hexant","hextile.js",{"./coord.js":10},function(t,e,i,o,n){"use strict";function r(t,e,i){this.origin=t.toOddQOffset(),this.width=e,this.height=i,this.data=new Uint8Array(this.width*this.height)}var s=t("./coord.js"),h=s.OddQOffset,a=s.OddQBox;i.exports=r,r.prototype.boundingBox=function(){return a(this.origin,h(this.width,this.height))},r.prototype.centerPoint=function(){return h(this.origin.q+Math.floor(this.width/2),this.origin.r+Math.floor(this.height/2))},r.prototype.pointToIndex=function(t){var e=t.toOddQOffset();return(e.r-this.origin.r)*this.width+(e.q-this.origin.q)},r.prototype.get=function(t){return this.data[this.pointToIndex(t)]},r.prototype.set=function(t,e){return this.data[this.pointToIndex(t)]=e,e},r.prototype.eachDataPoint=function(t){var e,i=this.origin.q,o=this.origin.r,n=i+this.width,r=o+this.height,s=h(i,o);for(e=0,s.r=o;s.r<r;s.r++)for(s.q=i;s.q<n;s.q++,e++)t(s,this.data[e])}}],["hextiletree.js","hexant","hextiletree.js",{"./coord.js":10,"./hextile.js":13},function(t,e,i,o,n){"use strict";function r(t,e,i){this.root=new s(t,e,i)}function s(t,e,i){this.origin=t,this.width=e,this.height=i,this.tileWidth=Math.floor(this.width/2),this.tileHeight=Math.floor(this.height/2),this.tiles=[null,null,null,null];var o=l(this.origin.q-this.tileWidth,this.origin.r-this.tileHeight),n=l(this.origin.q+this.tileWidth,this.origin.r+this.tileHeight);this.box=u(o,n)}var h=t("./coord.js"),a=t("./hextile.js"),l=h.OddQOffset,u=h.OddQBox;i.exports=r;var c=[3,2,1,0],d=[l(0,0),l(1,0),l(0,1),l(1,1)],p=[l(-1,-1),l(1,-1),l(-1,1),l(1,1)];r.prototype.dump=function(){return this.root.dump()},s.prototype.dump=function(){for(var t=["TreeNode @"+this.origin.toString(),"  box: "+this.box.toString()],e=0;e<this.tiles.length;e++){var i=["null"],o=this.tiles[e];o&&(i=o.dump().split(/\n/)),t.push("["+e+"]: "+i[0]);for(var n=1;n<i.length;n++)t.push("     "+i[n])}return t.join("\n")},a.prototype.dump=function(){for(var t=["Tile @"+this.origin.toString()],e=[],i=0;i<this.data.length;i++)i&&i%this.width===0&&(t.push(e.join(" ")),e=[]),e.push(this.data[i].toString());return t.push(e.join(" ")),t.join("\n")},r.prototype.boundingBox=function(){return this.root.boundingBox()},r.prototype.eachDataPoint=function(t){this.root.eachDataPoint(t)},r.prototype.centerPoint=function(){return this.root.centerPoint()},r.prototype.get=function(t){return this.root.get(t)},r.prototype.set=function(t,e){for(var i=t.toOddQOffset();!this.root.box.contains(i);)this.root=this.root.expand();return this.root._set(i,e)},s.prototype.expand=function(){for(var t=new s(this.origin.copy(),2*this.width,2*this.height),e=0;e<this.tiles.length;e++)t.tiles[e]=this.growTile(e);return t},s.prototype.growTile=function(t){var e=this.tiles[t];return e?e.grow(t):null},a.prototype.grow=function(t){var e=d[t].copy().mulBy(this.width,this.height),i=this.origin.copy().add(e),o=new s(i,2*this.width,2*this.height);return o.tiles[c[t]]=this,o},s.prototype.grow=function(t){var e=p[t].copy().mulBy(this.tileWidth,this.tileHeight),i=this.origin.copy().add(e),o=new s(i,2*this.width,2*this.height);return o.tiles[c[t]]=this,o},s.prototype.boundingBox=function(){return this.box},s.prototype.eachDataPoint=function(t){for(var e=0;e<this.tiles.length;e++){var i=this.tiles[e];i?i.eachDataPoint(t):this._fakeDataPoints(e,t)}},s.prototype._fakeDataPoints=function(t,e){var i=1&t,o=t>>1,n=this.origin.q+(i?0:-this.tileWidth),r=this.origin.r+(o?0:-this.tileHeight),s=n+this.tileWidth,h=r+this.tileHeight,a=l(n,r);for(a.r=r;a.r<h;a.r++)for(a.q=n;a.q<s;a.q++)e(a,0)},s.prototype.centerPoint=function(){return this.origin},s.prototype.get=function(t){var e=t.toOddQOffset();if(!this.box.contains(e))return NaN;var i=e.q<this.origin.q?0:1,o=e.r<this.origin.r?0:1,n=2*o+i,r=this.tiles[n];return r?r.get(t):0},s.prototype.set=function(t,e){var i=t.toOddQOffset();if(!this.box.contains(i))throw new Error("set out of bounds");return this._set(i,e)},s.prototype._set=function(t,e){var i=t.q<this.origin.q?0:1,o=t.r<this.origin.r?0:1,n=2*o+i,r=this.tiles[n];if(!r){var s=l(this.origin.q,this.origin.r);t.q<s.q&&(s.q-=this.tileWidth),t.r<s.r&&(s.r-=this.tileHeight),r=new a(s,this.tileWidth,this.tileHeight),this.tiles[n]=r}return r.set(t,e)}}],["index.js","hexant","index.js",{domready:6,"animation-frame":0,"global/window":7,"./world.js":17,"./ant.js":8,"./hash.js":11,"./coord.js":10,"./hextiletree.js":14},function(t,e,i,o,n){"use strict";function r(){function t(t){switch(t.keyCode){case 32:O?h():(i(),t.preventDefault());break;case 35:e();break;case 42:console.log(T.tile.dump());break;case 43:o(2*R),q.set("frameRate",R);break;case 45:o(Math.max(1,Math.floor(R/2))),q.set("frameRate",R);break;case 47:h();var n=q.get("rule");n=prompt("New Rules: ("+x+")",n).toUpperCase(),q.set("rule",s(_,n)),T.updateAntColors(),r()}}function e(){T.setLabeled(!T.labeled),T.redraw(),q.set("labeled",T.labeled)}function i(){T.stepDraw()}function o(t){R=t,L=1e3/R,O&&C.cancel(O),O&&n()}function n(){S=null,O=C.request(w)}function r(){T.tile=new y(f(0,0),2,2),T.hexGrid.bounds=T.tile.boundingBox().copy(),_.pos=T.tile.centerPoint().toCube(),T.tile.set(_.pos,1),j.width=j.width,T.hexGrid.updateSize(),T.redraw()}function h(){C.cancel(O),S=null,O=null}function m(){O?h():n()}function w(t){var e=1;if(S){var i=t-S;e=Math.min(g,i/L)}else S=t;for(var o=0;e>o;o++){S+=L;var n=v();if(n)throw h(),n}O=C.request(w)}function v(){try{return T.stepDraw(),null}catch(t){return t}}function b(){var t=Math.max(u.documentElement.clientWidth,l.innerWidth||0),e=Math.max(u.documentElement.clientHeight,l.innerHeight||0);T.resize(t,e)}var j=u.querySelector("#view"),q=new p(l),C=new a,O=null,S=null,R=0,L=0,T=new c(j),_=new d(T);_.pos=T.tile.centerPoint().toCube(),q.set("rule",s(_,q.get("rule","LR"))),T.addAnt(_),j.addEventListener("click",m),l.hexant=T,l.addEventListener("keypress",t),o(q.get("frameRate",4)),T.setLabeled(q.get("labeled",!1)),T.defaultCellValue=q.get("drawUnvisited",!1)?1:0,l.addEventListener("resize",b),b()}function s(t,e){var i="";return t.rules=e.split("").map(function(t){var e=m[t];return void 0!==e&&(i+=t),e}).filter(function(t){return"number"==typeof t}),i}var h=t("domready"),a=t("animation-frame"),l=t("global/window"),u=l.document,c=t("./world.js"),d=t("./ant.js"),p=t("./hash.js"),f=t("./coord.js").OddQOffset,y=t("./hextiletree.js"),g=256;h(r);var x="W=West, L=Left, A=Ahead, R=Right, E=East, F=Flip",m={W:-2,L:-1,A:0,R:1,E:2,F:3}}],["ngoncontext.js","hexant","ngoncontext.js",{},function(t,e,i,o,n){"use strict";function r(t,e){this.ctx2d=e,this.degree=t,this.offset=0,this.step=2*Math.PI/this.degree}i.exports=r,r.prototype.full=function(t,e,i){var o=this.offset;this.ctx2d.moveTo(t+i*Math.cos(o),e+i*Math.sin(o));for(var n=1;n<this.degree;n++)o+=this.step,this.ctx2d.lineTo(t+i*Math.cos(o),e+i*Math.sin(o))},r.prototype.arc=function(t,e,i,o,n,r){var s=0,h=0;if("number"==typeof o&&(s=o%this.degree),"number"==typeof n&&(h=n%this.degree),s===h)return void this.full(t,e,i);if(r)return void this.arc(t,e,i,h,this.degree-s,!1);var a=this.degree+h-s;a>this.degree&&(a-=this.degree);var l=this.offset+this.step*s,u=t+i*Math.cos(l),c=e+i*Math.sin(l);this.ctx2d.moveTo(u,c);for(var d=1;a>=d;d++)l+=this.step,u=t+i*Math.cos(l),c=e+i*Math.sin(l),this.ctx2d.lineTo(u,c)},r.prototype.wedge=function(t,e,i,o,n,r){var s=0,h=0;if("number"==typeof o&&(s=o%this.degree),"number"==typeof n&&(h=n%this.degree),s===h)return void this.full(t,e,i);if(r)return void this.wedge(t,e,i,h,s,!1);var a=this.degree+h-s;a>this.degree&&(a-=this.degree),this.ctx2d.moveTo(t,e);for(var l=this.offset+this.step*s,u=0;a>=u;u++){var c=t+i*Math.cos(l),d=e+i*Math.sin(l);this.ctx2d.lineTo(c,d),l+=this.step}}}],["world.js","hexant","world.js",{"./coord.js":10,"./hexgrid.js":12,"./colorgen.js":9,"./hextiletree.js":14,"./ngoncontext.js":16},function(t,e,i,o,n){"use strict";function r(t){this.canvas=t,this.ctx2d=this.canvas.getContext("2d"),this.ctxHex=new u(6,this.ctx2d),this.cellColorGen=a(.75,.4),this.antBodyColorGen=a(.85,.5),this.antHeadColorGen=a(.95,.6),this.cellColors=[],this.antBodyColors=[],this.antHeadColors=[],this.tile=new l(c(0,0),2,2),this.hexGrid=new h(this.canvas,this.ctxHex,this.tile.boundingBox().copy()),this.ants=[],this.labeled=!1,this.defaultCellValue=0}var s=t("./coord.js"),h=t("./hexgrid.js"),a=t("./colorgen.js"),l=t("./hextiletree.js"),u=t("./ngoncontext.js"),c=s.OddQOffset;i.exports=r,r.prototype.setLabeled=function(t){this.labeled=t,this.labeled?this.drawCell=this.drawLabeledCell:this.drawCell=this.drawUnlabeledCell},r.prototype.step=function(){for(var t,e=0,i=!1;e<this.ants.length&&(t=this.ants[e++],t.step(),!(i=this.hexGrid.bounds.expandTo(t.pos))););for(;e<this.ants.length;)t=this.ants[e++],t.step(),this.hexGrid.bounds.expandTo(t.pos);i&&this.hexGrid.updateSize()},r.prototype.stepDraw=function(){for(var t,e=0,i=!1;e<this.ants.length&&(t=this.ants[e++],t.stepDraw(),!(i=this.hexGrid.bounds.expandTo(t.pos))););for(;e<this.ants.length;)t=this.ants[e++],t.step(),this.hexGrid.bounds.expandTo(t.pos);i&&(this.hexGrid.updateSize(),this.redraw())},r.prototype.resize=function(t,e){this.hexGrid.resize(t,e),this.redraw()},r.prototype.redraw=function(){var t=this;t.tile.eachDataPoint(function(e,i){i=i||t.defaultCellValue,i&&t.drawCell(e,i)});for(var e=0;e<t.ants.length;e++)t.ants[e].redraw()},r.prototype.drawUnlabeledCell=function(t,e){this.ctx2d.beginPath();var i=this.hexGrid.cellPath(t);return this.ctx2d.closePath(),this.ctx2d.fillStyle=this.cellColors[e-1],this.ctx2d.fill(),i},r.prototype.drawLabeledCell=function(t,e){var i=this.drawUnlabeledCell(t,e);this.drawCellLabel(t,i)},r.prototype.drawCellLabel=function(t,e){function i(t,i){var n=o.measureText(t).width;o.strokeText(t,e.x-n/2,e.y+i)}e||(e=this.hexGrid.toScreen(t));var o=this.ctx2d;o.lineWidth=1,o.strokeStyle="#fff",i(t.toCube().toString(),0),i(t.toOddQOffset().toString(),14)},r.prototype.drawCell=r.prototype.drawUnlabeledCell,r.prototype.updateAntColors=function(){this.antBodyColors=this.antBodyColorGen(this.ants.length),this.antHeadColors=this.antHeadColorGen(this.ants.length);for(var t=0,e=0;e<this.ants.length;e++)this.ants[e].bodyColor=this.antBodyColors[e],this.ants[e].headColor=this.antHeadColors[e],t=Math.max(t,this.ants[e].rules.length);this.cellColors=this.cellColorGen(t)},r.prototype.addAnt=function(t){var e=this.tile.get(t.pos);return e||this.tile.set(t.pos,1),this.ants.push(t),this.updateAntColors(),t}}]])("hexant/index.js");
