// @generated from id:38ef3f5d0d481570ecae82f042a9a8ce293f342d5884d5c195d75d382b31813e

// @ts-check

import GLSLShader from '././glsl-shader.js';

export default new GLSLShader("pass", "frag",
  "/* A trivial lowp color paas-thru fragment shader.\n" +
  " */\n" +
  "\n" +
  "varying lowp vec4 vertColor;\n" +
  "\n" +
  "void main(void) {\n" +
  "    gl_FragColor = vertColor;\n" +
  "}\n"
);
