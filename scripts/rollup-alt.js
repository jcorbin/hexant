// @ts-check

import {
  basename,
  dirname,
  extname,
  join,
  resolve,
} from 'node:path';

import {
  stat,
} from 'node:fs/promises';


import { ok } from './clikit.js';

/** @typedef {object} Options
 * @prop {(target: string) => boolean} [filter]
 */

/**
 * @param {(target: string) => string} map
 * @param {Options} [options]
 * @returns {import('rollup').Plugin}
 */
export function useAlt(map, { filter } = {}) {
  return {
    name: 'use-alt',
    async resolveId(source, importer) {
      const target = importer ? resolve(importer, source) : source;
      if (!(filter && !filter(target))) {
        const alt = map(target);
        if (await ok(stat(alt))) {
          return alt;
        }
      }
      return null;
    },
  }
}

/**
 * @param {Options} [options]
 * @returns {import('rollup').Plugin}
 */
export function useMin(options) {
  return {
    ...useAlt(target => {
      const dir = dirname(target);
      const ext = extname(target);
      const base = basename(target, ext);
      return join(dir, `${base}.min${ext}`);
    }, options),
    name: 'use-min-js',
  }
}

/**
 * @param {Options} [options]
 * @returns {import('rollup').Plugin}
 */
export default function({
  filter = (() => {
    const srcDir = process.cwd();
    return target => {
      if (!target.startsWith(srcDir + '/')) { return false }
      const srcPath = target.slice(srcDir.length + 1);
      return !srcPath.startsWith('node_modules/');
    }
  })(),
  ...opts
} = {}) {
  return useMin({ filter, ...opts });
}
