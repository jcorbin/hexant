// @generated from id:9b04f495a6aa9075b4885817bd4d08d5e76574582df8a35da7c47aa3eee0f1e8

// @ts-check

import GLSLShader from '././glsl-shader.js';

export default new GLSLShader("oddq_point", "vert",
  "/* oddq_point.vert is a vertex shader for point vertices that are positioned\n" +
  " * using odd-q hexagonal coordinates.\n" +
  " *\n" +
  " * The vert attribute is just a Q,R vec2.\n" +
  " *\n" +
  " * The shader converts the Q,R vert into X,Y space, and sets gl_PointSize based\n" +
  " * on the viewport and radius uniforms.\n" +
  " *\n" +
  " * The color is simply passed along to the fragment shader\n" +
  " * for palette resolution.\n" +
  " *\n" +
  " * The optional ang attribute makes the hex partial, its two components are\n" +
  " * just a lo and hi value between 0 and 2*π.  If hi < lo, then the\n" +
  " * complementing range is drawn.\n" +
  " */\n" +
  "\n" +
  "uniform mat4 uPMatrix;\n" +
  "uniform vec2 uVP;\n" +
  "uniform float uRadius;\n" +
  "\n" +
  "attribute vec2 vert; // q, r\n" +
  "attribute vec2 ang; // aLo, aHi\n" +
  "attribute lowp float color; // i\n" +
  "\n" +
  "const vec2 scale = vec2(1.5, sqrt(3.0));\n" +
  "\n" +
  "varying lowp float vertColor;\n" +
  "varying mediump vec2 varAng;\n" +
  "\n" +
  "void main(void) {\n" +
  "    gl_PointSize = uVP.y * abs(uPMatrix[1][1]) * uRadius;\n" +
  "    gl_Position = uPMatrix * vec4(\n" +
  "        vec2(\n" +
  "            vert.x,\n" +
  "            vert.y + mod(vert.x, 2.0)/2.0\n" +
  "        ) * scale,\n" +
  "        0.0,\n" +
  "        1.0\n" +
  "    );\n" +
  "    vertColor = color + 1.0/512.0;\n" +
  "    varAng = ang;\n" +
  "}\n"
);
