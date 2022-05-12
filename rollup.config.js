// @ts-check

import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

/** @type {import('rollup').RollupOptions} */
const config = {
  input: 'index.js',
  output: [
    {
      file: 'build/index.bundle.js',
      format: 'esm',
      sourcemap: true,
    },
    {
      file: 'build/index.bundle.min.js',
      format: 'esm',
      sourcemap: true,
      plugins: [terser()],
    },
  ],
  plugins: [nodeResolve(), commonjs()],
};

export default config;
