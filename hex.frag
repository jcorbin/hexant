/* hex.frag is a fragment shader which draws flat-topped hexagonal point
 * sprites.
 */

varying lowp vec4 vertColor;
const mediump vec2 off = vec2(0.5, 0.5);

const mediump vec2 P0 = vec2(1.0, 0.0) / 2.0;
const mediump vec2 P1 = vec2(0.5, sqrt(3.0)/2.0) / 2.0;
const mediump float M10 = (P1.y - P0.y) / (P1.x - P0.x);
const mediump float B10 = P1.y - M10 * P1.x;

void main(void) {
    gl_FragColor = vertColor;
    mediump vec2 p = abs(gl_PointCoord - off);
    if (p.y > P1.y || p.y > M10 * p.x + B10) {
        discard;
    }
}
