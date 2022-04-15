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

# WIP

Reading... orienting...

- npm uplift:
  - deprecations:
  ```
  npm WARN deprecated husl@6.0.1: Project renamed to HSLuv
  npm WARN deprecated nomnom@1.6.2: Package no longer supported. Contact support@npmjs.com for more info.
  npm WARN deprecated xmldom@0.1.22: Deprecated due to CVE-2021-21366 resolved in 0.5.0
  npm WARN deprecated circular-json@0.3.3: CircularJSON is in maintenance only, flatted is its successor.
  npm WARN deprecated ecstatic@0.7.6: This package is unmaintained and deprecated. See the GH Issue 259.
  npm WARN deprecated minimatch@0.3.0: Please update to minimatch 3.0.2 or higher to avoid a RegExp DoS issue
  ```

# 2022-04-15

- opened back up for the first time in over 5 years, started sketching a plan
- renamed `master` branch to `main`
- started npm uplift
  - dropped old `html-inline` based build, as it's not been mainstained and has
    critical transitive vulnerabilityes under `npm audit`

