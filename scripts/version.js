// @ts-check

import {
  readFile,
} from 'node:fs/promises';

import {
  system,
} from './clikit.js';

const { version } = JSON.parse(
  await readFile('./package.json', { encoding: 'utf-8' })
)

let found = false;
let ok = false;

for (const line of (
  await readFile('CHANGELOG.md', { encoding: 'utf-8' })
).split(/\n/)) {
  const match = /^# v([^ ]+)/.exec(line);
  if (match) {
    found = true;
    const lastVersion = match[1];
    if (version === lastVersion) {
      ok = true;
    } else {
      console.error(`Last changelog version ${lastVersion} != package version ${version} `);
    }
    break;
  }
}

if (!found) {
  console.error('Found no CHANGELOG.md version');
  ok = false;
}

if (!ok) process.exit(1);

await system('npm', 'run', 'generate');
await system('git', 'add', '--update');
