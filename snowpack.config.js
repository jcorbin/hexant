// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
export default {
  mount: {
    src: '/dist',
    public: '/',
  },
  alias: {
    'glslshader': './src/glslshader.js',
  },
  plugins: [
    ['./glsl-loader.cjs', { minify: true }],
  ],
  packageOptions: {
  },
  devOptions: {
  },
  buildOptions: {
  },
};
