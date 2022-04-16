# TODO

- restore animation ticks, ripped out with gutentag
- unbreak the tests, after the `src/` pivot
- modernize js
  - esm
  - jsdoc type annotations to pass tsc
- subsume external deps
  - hashbind
  - rezult
- drop deps should be obsolete now
  - domready
  - Base64
- evaluate why hexer
- use snowpack for dev server and build
- tbd deploy artifact, whether single inlined page like before, or otherwise
- drop gutentag
- separate tile rendering module
- separate turmite sim module
- asyncify the gap between view and sim
- port turmite sim to Go... shard and scale over goroutines
- maybe just write a custom parser and drop nearley
- META: subsume the old `TODO.md` file

# 2022-04-16

## WIP

Porting towards a working dev server again.

- either comlete ESMification of yesterday's progress, or back it out for
  another future round of uplift
- fix the gutenacht raf gap
- continue code uplift

## Done

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
