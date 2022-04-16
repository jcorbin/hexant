# TODO

- build solution now that html-inline is gone... snowpack?
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

# WIP

Reading... orienting...

- working toward a working dev server again
  - browser kicks 404s for `node_modules/...` things like `gutentag`; will
    probably just need to drop system/gutentag right away

# 2022-04-15

- opened back up for the first time in over 5 years, started sketching a plan
- renamed `master` branch to `main`
- started npm uplift
  - dropped old `html-inline` based build, as it's not been mainstained and has
    critical transitive vulnerabilityes under `npm audit`

