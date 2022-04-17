# TODO

- uplift js
  - wip
    - esm
    - classify
    - const, for-of, destructring, etc...
    - switch to local version of rezult as we go
  - next
    - switch classes out for maker pattern
    - jsdoc type annotations to pass tsc

- unbreak the tests, after the `src/` pivot
- drop deps should be obsolete now
  - Base64
- evaluate why hexer
- do a bundle or some form of inline/flattengin for deploy

- separate tile rendering module
- separate turmite sim module
- asyncify the gap between view and sim
- port turmite sim to Go... shard and scale over goroutines
- maybe just write a custom parser and drop nearley
- META: subsume the old `TODO.md` file

# 2022-04-17

## WIP

Porting towards a working dev server again.

- continue code uplift

## Done

- further refactored hashbind to take over all codec concerns (base64) from
  hexant.js, obviating need for Base64 shim dependency

# 2022-04-16

- inlined page integrated javascript into its html file
- added an uplifted copy of rezult, started using it in the `hexant.js` module
- added a reworked copy of hashbind, and converted `hexant.js` to use it
- fixed raf leftover from yesterday, and added a sprinkle of type hinting to assist

# 2022-04-15

- opened back up for the first time in over 5 years, started sketching a plan
- renamed `master` branch to `main`
- started npm uplift
  - dropped old `html-inline` based build, as it's not been maintained and has
    critical transitive vulnerabilities under `npm audit`
- switched to snowpack, including a port of my glsl loader
- excised gutentag
  - classified `Prompt` and `Hexant` in passing
  - switching to simpler component wiring along the way
