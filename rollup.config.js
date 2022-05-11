// @ts-check

import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

/** @type {import('rollup').RollupOptions} */
const config = {
  input: 'src/hexant.js',
  output: [
    {
      file: 'public/hexant.js',
      format: 'esm',
    },
    {
      file: 'public/hexant.min.js',
      format: 'esm',
      plugins: [terser()],
    },
  ],
  plugins: [nodeResolve(), commonjs()],
};

export default config;
