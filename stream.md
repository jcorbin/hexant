# WIP

Uplifting old javascript toward a full type checking pass:

- esm (use `export` and `import` rather than common.js `module.exports` and `require()`
- typify (pass `// @ts-check` from leaf modules back up)
- classify old `function Foo() ; Foo.prototype.method = function method()` pattern
- switch all `var`s to `const` or `let`
- refactor where possible to use
  - for-of
  - iterators, generator functions
  - argument spreads, array spreads, object spreads
  - array and object destructuring
  - argument defaults, and destructured option defaults
  - Promise and async/await
- switch to local version of rezult as we go
- `rezult.js`
  - return frozen result objects
  - maybe drop the `class Result` entirel, and shift to `makeResult`

## Status 20% done (968 / 4862 LoC, 8 / 35 modules)

- NOTE: "pass" means passes `// @ts-check`
- NOTE: "works" means functionally verified
- NOTE: any module without a stated status is "TODO"

- `glsl-loader.js` - pass
- `src/`
  - `colorgen.js` - pass
  - `coord.js` - pass
  - `glpalette.js` - pass
  - `glprogram.js` - pass
  - `glslshader.js` - pass
  - `hashbind.js` - pass
  - `hexant.js` - WIP top level controller ; TODO decompose
  - `hextile.js`
  - `hextiletree.js`
  - `pool.js`
  - `prompt.js`
  - `rangelist.js`
  - `rezult.js` - pass
  - `sample.js`
  - `tileglbuffer.js`
  - `view_gl.js`
  - `world.js`
  - `test/`
    - `hextiletree.js`
    - `index.js` - TODO port to ava
    - `rangelist.js`
    - `tileglbuffer.js`
  - `turmite/`
    - `constants.js`
    - `index.js`
    - `lang/`
      - `analyze.js`
      - `build.js`
      - `compile.js`
      - `parse.js`
      - `solve.js`
      - `tostring.js`
      - `walk.js`
    - `parse.js`
    - `rle-builder.js`
    - `test.js` - TODO port to ava, maybe move into `../test/`

```
$ cloc --vcs=git --include-lang=JavaScript --by-file

github.com/AlDanial/cloc v 1.92  T=0.04 s (831.6 files/s, 145287.4 lines/s)
------------------------------------------------------------------------------------------
File                                        blank        comment           code
------------------------------------------------------------------------------------------
glsl-loader.js                                 16             17            103
snowpack.config.js                              1              3             18
src/colorgen.js                                15             35             66
src/coord.js                                   61             80            283
src/glpalette.js                               12             11             48
src/glprogram.js                               13             12             29
src/glslshader.js                              19             24             90
src/hashbind.js                                58             72            318
src/hexant.js                                  61             16            351
src/hextile.js                                 18              3            145
src/hextiletree.js                             55              2            461
src/pool.js                                     1              0             19
src/prompt.js                                  14              0            107
src/rangelist.js                                5             14             62
src/rezult.js                                   6             22             31
src/sample.js                                  15             10             94
src/test/hextiletree.js                        15              3             80
src/test/index.js                               1              0              4
src/test/rangelist.js                          11              8             52
src/test/tileglbuffer.js                       16              0            285
src/tileglbuffer.js                            13              7             80
src/turmite/constants.js                        8             16             55
src/turmite/index.js                           23             44             95
src/turmite/lang/analyze.js                    10              2             69
src/turmite/lang/build.js                      21              7            142
src/turmite/lang/compile.js                    61              4            336
src/turmite/lang/parse.js                       7              2             42
src/turmite/lang/solve.js                      14              9             76
src/turmite/lang/tostring.js                   21              1            118
src/turmite/lang/walk.js                       15              0             70
src/turmite/parse.js                           20              5            112
src/turmite/rle-builder.js                      3              0             39
src/turmite/test.js                            38             11            185
src/view_gl.js                                 90             29            598
src/world.js                                   24              3            199
------------------------------------------------------------------------------------------
SUM:                                          781            472           4862
------------------------------------------------------------------------------------------

```

# TODO

- get it working on dev server again
- unbreak the tests, after the `src/` pivot
- switch classes out for maker pattern throughout; initial uplift pass above
  may do so when scope is small enough to be easily done in passing
- evaluate why hexer
- do a bundle or some form of inline/flattening for deploy
- decompose `src/hexant.js`
  - inline much of the specific integration/controller logic into `public/index.html`
  - factor out a stats component for fps, sps, timing, etc
  - factor out a keymap component, which can later be a basis for a help overlay
- separate tile rendering module
- separate turmite sim module
- asyncify the gap between view and sim
- port turmite sim to Go... shard and scale over goroutines
- maybe just write a custom parser and drop nearley
- META: see also / subsume the old `TODO.md` file

# 2022-04-19

## Done

- uplifted `glpalette.js` thru type checking
  - minor change to data array fill to use `UInt8Array.fill` and `.set`
  - changed constructor to options pattern, made srgb option an enum
- uplifted `glprogram.js` thru type checking
  - eliminated shader load indirection, a problem for our future caller
  - switched attr and uniform collections to `Map`, dropped `attrs`
    array, just use `attr.values()`
- uplifted `glslshader.js` thru type checking
- fixed `glsl-loader.js` to generate ESMs with aliased imports, and to
  have better internal io semantics
- added build-time minification to `glsl-loader.js`
- fixed done module denominator... oops

# 2022-04-18

- refactored Hexant world stepping logic and reified its animation loop into
  while-await form
- uplifted `rezult.js` thru type checking
- uplifted `colorgen.js` thru type checking
  - now only exports `parse()`, string conversion is now implicit, and
    fortunately nothing was using the gens export
- surveyed remaining module status to sketch a better stream status picture
- uplifted `coord.js` thru type checking
  - elminated callable-constructor oddity

# 2022-04-17

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
