// @generated from id:e9953cec26100334f8c622af64aa4e105217621f14ded4a5172b08f00a1b60fc

// @ts-check

import GLSLShader from '././glsl-shader.js';

export default new GLSLShader("hex", "frag",
  "/* A fragment shader which draws flat-topped hexagonal point sprites.\n" +
  " */\n" +
  "\n" +
  "varying lowp float vertColor;\n" +
  "varying mediump vec2 varAng;\n" +
  "\n" +
  "const mediump float pi = 3.141592653589793;\n" +
  "const mediump float tau = 2.0 * pi;\n" +
  "const mediump vec2 off = vec2(0.5, 0.5);\n" +
  "const mediump vec2 P0 = vec2(1.0, 0.0) / 2.0;\n" +
  "const mediump vec2 P1 = vec2(0.5, sqrt(3.0)/2.0) / 2.0;\n" +
  "const mediump float M10 = (P1.y - P0.y) / (P1.x - P0.x);\n" +
  "const mediump float B10 = P1.y - M10 * P1.x;\n" +
  "\n" +
  "uniform sampler2D uSampler;\n" +
  "\n" +
  "void main(void) {\n" +
  "    mediump vec2 p = gl_PointCoord - off;\n" +
  "    if (varAng.x != varAng.y) {\n" +
  "        mediump float a = mod(atan(p.y, p.x), tau);\n" +
  "        if (varAng.x < varAng.y) {\n" +
  "            if (a < varAng.x || a > varAng.y) {\n" +
  "                discard;\n" +
  "            }\n" +
  "        } else {\n" +
  "            if (a >= varAng.y && a <= varAng.x) {\n" +
  "                discard;\n" +
  "            }\n" +
  "        }\n" +
  "    }\n" +
  "    p = abs(p);\n" +
  "    if (p.y > P1.y || p.y > M10 * p.x + B10) {\n" +
  "        discard;\n" +
  "    }\n" +
  "    gl_FragColor = texture2D(uSampler, vec2(vertColor, 0));\n" +
  "}\n"
);
