// @generated from id:9516005881cb617dd3952c0b2523a952c7d9f464160bd7277c98b24df0e7c190

"use strict";

import GLSLShader from '././glsl-shader.js';

export default new GLSLShader("pass", "frag",
  "/* pass.frag is a trivial lowp color paas-thru fragment shader\n" +
  " */\n" +
  "\n" +
  "varying lowp vec4 vertColor;\n" +
  "\n" +
  "void main(void) {\n" +
  "    gl_FragColor = vertColor;\n" +
  "}\n"
);
