/* oddq_point.vert is a vertex shader for point vertices that are positioned
 * using odd-q hexagonal coordinates.
 *
 * The vert attribute is just a Q,R vec2.
 *
 * The shader converts the Q,R vert into X,Y space, and sets gl_PointSize based
 * on the viewport and radius uniforms.
 *
 * The color is simply passed along to the fragment shader
 * for palette resolution.
 *
 * The optional ang attribute makes the hex partial, its two components are
 * just a lo and hi value between 0 and 2*π.  If hi < lo, then the
 * complementing range is drawn.
 */

uniform mat4 uPMatrix;
uniform vec2 uVP;
uniform float uRadius;

attribute vec2 vert; // q, r
attribute vec2 ang; // aLo, aHi
attribute lowp float color; // i

const vec2 scale = vec2(1.5, sqrt(3.0));

varying lowp float vertColor;
varying mediump vec2 varAng;

void main(void) {
    gl_PointSize = uVP.y * abs(uPMatrix[1][1]) * uRadius;
    gl_Position = uPMatrix * vec4(
        vec2(
            vert.x,
            vert.y + mod(vert.x, 2.0)/2.0
        ) * scale,
        0.0,
        1.0
    );
    vertColor = color + 1.0/512.0;
    varAng = ang;
}
