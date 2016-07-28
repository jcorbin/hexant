/* oddq_dxy.vert is a vertex shader for odd-q hexagonal vertices.  The vertices
 * are specified with Q,R cell centers and relative DX,DY offsets.
 *
 * The vert attribute contains two pieces:
 * - the first two components are the column (Q) and row (R) numbers
 * - the second two components are an X,Y delta in unit-cell space
 *
 * The shader then converts the Q,R vert into X,Y space, and adds the given
 * delta.
 *
 * The color is simply passed along at full opacity.
 */

uniform mat4 uPMatrix;

attribute vec4 vert; // q, r, dx, dy
attribute vec3 color; // r, g, b

const vec2 scale = vec2(1.5, sqrt(3.0));

varying lowp vec4 vertColor;

void main(void) {
    gl_Position = uPMatrix * vec4(
        vec2(
            vert.x,
            vert.y + mod(vert.x, 2.0)/2.0
        ) * scale + vert.zw,
        0.0,
        1.0
    );
    vertColor = vec4(color, 1.0);
}
