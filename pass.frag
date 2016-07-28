/* pass.frag is a trivial lowp color paas-thru fragment shader
 */

varying lowp vec4 vertColor;

void main(void) {
    gl_FragColor = vertColor;
}
