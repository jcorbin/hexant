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

## Status 75% done (3442 / 4563 LoC, 24 / 32 modules)

- NOTE: "pass" means passes `// @ts-check`
- NOTE: "works" means functionally verified
- NOTE: any module without a stated status is "TODO"

- `glsl-loader.js` - works
- `src/`
  - `colorgen.js` - pass
  - `coord.js` - pass
  - `glpalette.js` - pass
  - `glprogram.js` - pass
  - `glslshader.js` - pass
  - `hashbind.js` - pass
  - `hexant.js` - WIP top level controller ; TODO decompose
  - `hextile.js` - pass
  - `hextiletree.js` - pass
  - `pool.js` - pass
  - `prompt.js` - pass
  - `rangelist.js` - pass
  - `rezult.js` - pass
  - `sample.js` - pass
  - `tileglbuffer.js` - pass
  - `view_gl.js` - pass
  - `world.js` - pass
  - `test/`
    - `hextiletree.js`
    - `index.js` - TODO port to ava
    - `rangelist.js`
    - `tileglbuffer.js`
  - `turmite/`
    - `constants.js` - pass
    - `index.js`
    - `lang/`
      - `analyze.js` - pass
      - `compile.js` - pass
      - `parse.js` - pass
      - `tostring.js` - pass
      - `walk.js` - pass
    - `parse.js` - pass
    - `rle-builder.js` - pass
    - `test.js` - TODO port to ava, maybe move into `../test/`

```
$ cloc --vcs=git --include-lang=JavaScript --by-file

------------------------------------------------------------------------------------------
File                                        blank        comment           code
------------------------------------------------------------------------------------------
glsl-loader.js                                 16             17            103
snowpack.config.js                              1              3             18
src/colorgen.js                                15             35             66
src/coord.js                                   63             88            283
src/glpalette.js                               12             11             48
src/glprogram.js                               13             12             29
src/glslshader.js                              19             27             90
src/hashbind.js                                58             72            318
src/hexant.js                                  61             16            351
src/hextile.js                                 23             39            166
src/hextiletree.js                             77             76            417
src/pool.js                                     2              8             20
src/prompt.js                                  17             32            107
src/rangelist.js                                6             26             61
src/rezult.js                                   6             22             31
src/sample.js                                  19             20             75
src/test/hextiletree.js                        15              3             80
src/test/index.js                               1              0              4
src/test/rangelist.js                          11              8             52
src/test/tileglbuffer.js                       16              0            285
src/tileglbuffer.js                            33             72            196
src/turmite/constants.js                        9             22             55
src/turmite/index.js                           23             44             95
src/turmite/lang/analyze.js                    14             30             49
src/turmite/lang/compile.js                    82            128            401
src/turmite/lang/parse.js                      10              3             35
src/turmite/lang/tostring.js                   27             20            115
src/turmite/lang/walk.js                       41            125             73
src/turmite/parse.js                           18             38            100
src/turmite/rle-builder.js                      6             40             43
src/turmite/test.js                            38             11            185
src/view_gl.js                                 90            106            434
src/world.js                                   49             51            178
------------------------------------------------------------------------------------------
SUM:                                          891           1205           4563
------------------------------------------------------------------------------------------

```

# TODO

- flatten `src/turmite/lang` into `src/turmite`
  - naturalize the legacy `ant(...)` parser into either `grammar.ne` and/or
    into the eventual recursive descent replacement
- get it working on dev server again
- refactor `glslshader.js` and `glprogram.js`
  - move linking to program;
    program becomes `new GLProgram(gl, shadeer1, shader2, ...)`
  - provide unifrom / attrib introspection from shader;
    shader become `new GLSLShader({name, type, source, uniformNames, attribNames})`
    - with name extraction done at build time by `glsl-loader.js` using the
      parser we added for minification
- `hextiletree.js` refactor to linear(-ish) form
  - either on a `Map<{key, mask}, tile>` or on `Array<tile>` sorted by `Array<{key, mask}>`
  - probably a good time to move to maker form
- refactor `World.ents` to be propely system oriented, rather than have the
  world model itself particpate in per-ent concerns; rectify how views relate
  to all that jazz
- once there's only need for a single pool (no more nodes), flatten it into
  `hextile.js`, dropping `pool.js`
- revamp `coord.js`
  - push conversions out to callers
  - maybe drop the `type` field?
  - can we elminate `CubePoint` (it only has a couple of users)?
- unbreak the tests, after the `src/` pivot
- write tests for more parts of `turmite/` like `RLEBuilder`
- switch classes out for maker pattern throughout; initial uplift pass above
  may do so when scope is small enough to be easily done in passing
- evaluate why hexer
- do a bundle or some form of inline/flattening for deploy
- decompose `src/hexant.js`
  - inline much of the specific integration/controller logic into `public/index.html`
  - factor out a stats component for fps, sps, timing, etc
  - factor out a keymap component, which can later be a basis for a help overlay
- just write a custom parser and drop nearley
- separate tile rendering module
- separate turmite sim module
- asyncify the gap between view and sim
- port turmite sim to Go... shard and scale over goroutines
- META: see also / subsume the old `TODO.md` file

# 2022-04-29

## WIP

- uplifting `turmite/index.js`

## Done

- uplifted `turmite/lang/parse.js`
  - moved evaluation to compile module, making return a typed result object
    - fixed option default and return string type from yesterday's uplift
  - flattened and simplified `parse.js` module, setting it up well to grow a
    custom recursive descent parser
- uplifted `turmite/parse.js`
  - around new `Builder => Built` types which will be merged with
    `turmite/lang.Spec` during parser unification
- added a new `from` convenience to `rle-builder.js`
- added explicit `Rules` table type with docs; documented `RuleConstants`

# 2022-04-28

- uplifted `turmite/lang/compile.js`
  - completely refactored over iterable-strings paradigm
  - reworked nearly all `compileFoo` function boundaries
  - greatly clarified symbols in scope
  - tightened down the grammar node field types
  - refactored `toSpecString` into the iterable-strings paradigm
  - preserved integer bases from parsing to code gen time

# 2022-04-27

- continued uplifting `turmite/lang/compile.js`... not done yet
- noticed how the old grammar definition locks us into expressions over
  mixtures of turns and primitive numbers everywhere
  - made a parametric `Expr<Literal>` type that makes this explicit for now,
    until we can rework the grammar to prevent turns where the context doesn't
    call for them

# 2022-04-26

- uplifted `turmite/lang/analyze.js`
  - gnarly logic under `analyze() each() switch-case 'then'
    - looks to be implictly indexing the then.turns name(s) by the first
      then.color symbol? wat?
- started reformatting code as I go, starting with the current
  `turmite/lang/...` modules undef focus

# 2022-04-23

- uplifted `turmite/lang/walk.js`, standing up a new gramma type tree alongside
  the nearley parser, for future use by its recursive descent replacement
- uplifted `turmite/lang/tostring.js`
  - noted how it would be better without a "generic" DFS walker
  - hardened its cases over the new types, rather than allowing invalid grammar
    tree node data
- subsumed `turmite/lang/solve.js` into `.../compile.js`, resolving their
  circular relationship, and deduplicating an array declaration

# 2022-04-22

- uplifted `turmite/rle-builder.js`; greatly refactored it:
  - no more string accumulation, result is an array of term pairs
  - returned surface is now
    `{consume([count, ]sym) => void, finish() => [[count, sym]]}`,
    with sensible "prefixed count parsing" out of symbol strings
- updated turmite grammar definition
  - subsumed `turmite/lang/build.js` module, just inline all those
    post-processing rules
  - fix build script
  - switch to ESM output

# 2022-04-21

- uplifted `world.js`
  - that old entity "system" sure is 🥔🍐💀
- uplifted `view_gl.js`
  - dropped obsolete `"'experimental-webgl"' rendering context branch, as
    typescript definitions don't acknowledge it
  - refactored a lot of drawing code to be more coherent
  - many small changes and fixes throughout
  - ramified usage fix into `GLProgram` wrt uniform and attr collections
  - ramified usage fix into `HexTileTree` wrt tiles collection
- uplifted `turmite/constants.js`
  - switched to `Map()`s where it made sense

# 2022-04-20

- uplifted `pool.js`
  - refactored to a `makePool(cons) => {alloc, free}` for use in static blocks
- uplifted `hextile.js`
- uplifted `hextiletree.js`
  - lots of subtle changes, fixes, and improvements on the way around weak
    points revealed by type checking
- uplifted `prompt.js`
  - the initial gutennacht pass was insufficient, type checking revealed typos,
    and other deficiences
- uplifted `rangelist.js`
- uplifted `sample.js`
- uplifted `tileglbuffer.js`
  - subsumed `TileGLBuffer`, `LazyGLBuffer`, and `GLBuffer` out of `view_gl.js`
- simplifed old cell width/height calc logic, a holdover from the times
  when we used to compute 6 vertices per cell

# 2022-04-19

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
