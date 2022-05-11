// @generated from id:b34fd6f3e750d3d5e4373e5ca06a52a99341321a2f5213cc9c4a6118684d39e2

// @ts-check

import GLSLShader from '././glsl-shader.js';

export default new GLSLShader("oddq_dxy", "vert",
  "/* A vertex shader for odd-q hexagonal vertices.\n" +
  " * The vertices are specified with Q,R cell centers and relative DX,DY offsets.\n" +
  " *\n" +
  " * The vert attribute contains two pieces:\n" +
  " * - the first two components are the column (Q) and row (R) numbers\n" +
  " * - the second two components are an X,Y delta in unit-cell space\n" +
  " *\n" +
  " * The shader then converts the Q,R vert into X,Y space, and adds the given\n" +
  " * delta.\n" +
  " *\n" +
  " * The color is simply passed along at full opacity.\n" +
  " */\n" +
  "\n" +
  "uniform mat4 uPMatrix;\n" +
  "\n" +
  "attribute vec4 vert; // q, r, dx, dy\n" +
  "attribute vec3 color; // r, g, b\n" +
  "\n" +
  "const vec2 scale = vec2(1.5, sqrt(3.0));\n" +
  "\n" +
  "varying lowp vec4 vertColor;\n" +
  "\n" +
  "void main(void) {\n" +
  "    gl_Position = uPMatrix * vec4(\n" +
  "        vec2(\n" +
  "            vert.x,\n" +
  "            vert.y + mod(vert.x, 2.0)/2.0\n" +
  "        ) * scale + vert.zw,\n" +
  "        0.0,\n" +
  "        1.0\n" +
  "    );\n" +
  "    vertColor = vec4(color, 1.0);\n" +
  "}\n"
);
