// @ts-check

import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

/** @type {import('rollup').RollupOptions} */
const config = {
  input: 'public/index.js',
  output: [
    {
      file: 'public/index.bundle.js',
      format: 'esm',
    },
    {
      file: 'public/index.bundle.min.js',
      format: 'esm',
      plugins: [terser()],
    },
  ],
  plugins: [nodeResolve(), commonjs()],
};

export default config;
