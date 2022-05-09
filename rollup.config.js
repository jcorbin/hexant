// @ts-check

'use strict';

import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

/** @type {import('rollup').RollupOptions} */
const config = {
  input: 'src/hexant.js',
  output: {
    file: 'public/hexant.js',
    format: 'esm',
  },
  plugins: [nodeResolve(), commonjs()],
};

export default config;
