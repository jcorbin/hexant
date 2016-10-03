/* hex.frag is a fragment shader which draws flat-topped hexagonal point
 * sprites.
 */

varying lowp float vertColor;
varying mediump vec2 varAng;

const mediump float pi = 3.141592653589793;
const mediump float tau = 2.0 * pi;
const mediump vec2 off = vec2(0.5, 0.5);
const mediump vec2 P0 = vec2(1.0, 0.0) / 2.0;
const mediump vec2 P1 = vec2(0.5, sqrt(3.0)/2.0) / 2.0;
const mediump float M10 = (P1.y - P0.y) / (P1.x - P0.x);
const mediump float B10 = P1.y - M10 * P1.x;

uniform sampler2D uSampler;

void main(void) {
    mediump vec2 p = gl_PointCoord - off;
    if (varAng.x != varAng.y) {
        mediump float a = mod(atan(p.y, p.x), tau);
        if (varAng.x < varAng.y) {
            if (a < varAng.x || a > varAng.y) {
                discard;
            }
        } else {
            if (a >= varAng.y && a <= varAng.x) {
                discard;
            }
        }
    }
    p = abs(p);
    if (p.y > P1.y || p.y > M10 * p.x + B10) {
        discard;
    }

    mediump float gamma = 2.2;
    gl_FragColor.rgb = pow(
        texture2D(uSampler, vec2(vertColor, 0)).rgb,
        vec3(1.0/gamma)
    );
}
