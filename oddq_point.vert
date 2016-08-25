/* oddq_point.vert is a vertex shader for point vertices that are positioned
 * using odd-q hexagonal coordinates.
 *
 * The vert attribute is just a Q,R vec2.
 *
 * The shader converts the Q,R vert into X,Y space, and sets gl_PointSize based
 * on the viewport and radius uniforms.
 *
 * The color is simply passed along at full opacity.
 */

uniform mat4 uPMatrix;
uniform vec2 uVP;
uniform float uRadius;

attribute vec2 vert; // q, r
attribute vec3 color; // r, g, b

const vec2 scale = vec2(1.5, sqrt(3.0));

varying lowp vec4 vertColor;

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
    vertColor = vec4(color, 1.0);
}
