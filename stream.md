# WIP

Uplifting of all non-test code "done", now working on getting the dev server to
work, before uplifting tests and getting them to pass again.

## Uplift 86% done (3998 / 4622 LoC, 27 / 32 modules)

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
  - `hexant.js` - pass
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
    - `index.js` - pass
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
src/glpalette.js                               14             16             65
src/glprogram.js                               13             12             29
src/glslshader.js                              19             27             91
src/hashbind.js                                58             72            318
src/hexant.js                                  54             47            338
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
src/tileglbuffer.js                            32             72            190
src/turmite/constants.js                       10             27             68
src/turmite/index.js                           20             14             75
src/turmite/lang/analyze.js                    14             30             49
src/turmite/lang/compile.js                    82            128            401
src/turmite/lang/parse.js                      10              3             35
src/turmite/lang/tostring.js                   27             20            115
src/turmite/lang/walk.js                       41            125             73
src/turmite/parse.js                           18             38            100
src/turmite/rle-builder.js                      6             40             43
src/turmite/test.js                            38             11            185
src/view_gl.js                                 97            121            502
src/world.js                                   45             52            177
------------------------------------------------------------------------------------------
SUM:                                          886           1232           4622
------------------------------------------------------------------------------------------

```

# TODO

## `v1.0` retrospective re-release

- finish debugging dev
- evaluate why hexer
- get tsc-driven lint passing
- uplift tests and get them passing again
- sort out what production bundling looks like now
- likely as early `v1.0.x` releases before further refactoring, but maybe as part of `v1.0.0`
  - write tests for more parts of `turmite/` like `RLEBuilder`
  - expand turmite help to actually describe the turmite language
    - maybe make `turmite.ruleHelp` interactive as later called for in `v1.3` to
      at least present a 2-screen deal
  - add keymap help overlay

## `v1.1` refactoring

- refactor `glslshader.js` and `glprogram.js`
  - move linking to program;
    program becomes `new GLProgram(gl, shader1, shader2, ...)`
  - provide uniform / attrib introspection from shader;
    shader become `new GLSLShader({name, type, source, uniformNames, attribNames})`
    - with name extraction done at build time by `glsl-loader.js` using the
      parser we added for minification
- `hextiletree.js` refactor to linear(-ish) form
  - either on a `Map<{key, mask}, tile>` or on `Array<tile>` sorted by `Array<{key, mask}>`
  - probably a good time to move to maker form
  - once there's only need for a single pool (no more nodes), flatten it into
    `hextile.js`, dropping `pool.js`
- revamp `coord.js`
  - push conversions out to callers
  - maybe drop the `type` field?
  - can we eliminate `CubePoint` (it only has a couple of users)?
- switch classes out for maker pattern throughout; initial uplift pass above
  may do so when scope is small enough to be easily done in passing
- decompose `hexant.js`
  - inline much of the specific integration/controller logic into `public/index.html`
  - factor out a stats component for fps, sps, timing, etc
  - factor out a keymap component, which can later be a basis for a help overlay

## `v1.2` systemitization

- refactor `World.ents` to be properly system oriented, rather than have the
  world model itself participate in per-ent concerns; rectify how views relate
  to all that jazz
- separate tile rendering module
- separate turmite sim module

## `v1.3` language

- flatten `turmite/lang/...` into `turmite/...`
- use `constants.Turn` to type extracted turn results out of a `Rules` table,
  rather than using raw `number` types
- switch away from nearley to a custom recursive descent parser
- naturalize the legacy `ant(...)` parser into the new parser
- make `turmite.ruleHelp` interactive

## `v1.4` async

- asyncify the gap between view and sim
  - view can somehow subscribe to updates every N steps
  - could also pair will with a viewport box, rather than always-global views
- move sim into a web worker

## ui

- a low level immediate mode context over DOM elements and events
  - key processing
  - text
  - button
  - input.text
  - textarea
- a high level immediate mode context over request commands and response events
  - `{prompt: string, help?: string}` ... `{response: string}`
  - `{status: string[]}`
- should be feasible to write other low level layers eventually, e.g. one that
  would process an event stream and draw into a GL context ( or generate an
  intermediate buffer of GL commands... )

## server

- port turmite sim to Go... shard and scale over goroutines
- maybe allow shard(s) to run locally in a background web worker

## META: see also / subsume the old `TODO.md` file

# 2022-05-06

## WIP

- retcon tsconfig strict es2022
- debugging dev:

  - running `ant(2L 13R 2L)` with `stepRate=262144`:
    ```
    hmr-client.js:9 [ESM-HMR] listening for file changes...
    hexant.js:472 Hexant playtime error
    hexant.js:473 RangeError: Invalid array length
        at TileGLBuffer.removeTile (tileglbuffer.js:91:24)
        at TileBufferer.onWorldTileRemoved (view_gl.js:574:18)
        at HexTileTree.TileBufferer.world.tile.tileRemoved (view_gl.js:555:48)
        at HexTileTree.removeTiles (hextiletree.js:76:12)
        at HexTileTreeNode._mayCompact (hextiletree.js:413:15)
        at HexTileTreeNode.update (hextiletree.js:452:23)
        at HexTileTreeNode.update (hextiletree.js:457:17)
        at HexTileTreeNode.update (hextiletree.js:457:17)
        at HexTileTree.update (hextiletree.js:155:17)
        at World.updateEnt (world.js:118:10)
    logError @ hexant.js:473
    play @ hexant.js:354
    await in play (async)
    playpause @ hexant.js:378
    (anonymous) @ hexant.js:132
    handleEvent @ hexant.js:206
    hexant.js:475 config {colors: 'light(360, 100)', rule: 'ant(2L 13R 2L)', stepRate: '262144', showFPS: 'undefined'}
    hexant.js:475 runtime {step: 8108340, fps: 53.66666666666667, sps: 241135, redrawStats: {…}}
    ```

- sort out `glsl-loader.js` generated sources for tsc

## Done

- realized the need to refactor `rezult` objects to be pure data, dropping the
  `class Result` and exporting its `toValue()` and `toCallback()` methods
  directly as result functions
  - this started because error results really want to be `Result<never>` not
    `Result<null>`, and I couldn't find a good way to let the class-based
    version use `T=never`
  - however it was already a good idea, since no longer carrying methods allows
    result values to be spread extended like `return {...res, extra: stuff}` if
    desired, without loss of `Result<T>` covariance
- started baking down git history into per-module uplift monoliths, eliminating
  a lot of micro commit churn, and validating against the new stricter tsconfig
  (re)starting point
  - some misgivings about typescript inability to prove narrower array types
    when using `noUncheckedIndexedAccess` have started to crop up; may unring
    that bell before shipping to main branch

# 2022-05-05

- added better error handling to Hexant
  - lockout play after a caught error
  - log error with runtime stats and config dump
- fixed hashbind
  - parse error handling so that it doesn't process a null value
  - undefined value/default/parse handling
- ratcheted up tsconfig strictness and target
- started retconing tsconfig strict es2022 rules and re-staging commits one
  module at a time, building an rc branch that can merge into main, rather than
  have dev continue to diverge so long term

# 2022-05-04

- fixed hashbind default loading: it had been writing `undefined` strings back
  into the cache
  - since boolean value representation is "true if present, false otherwise"
    this was causing them to flip on by default
- fixed rle-builder: was getting initial counts and final flush wrong
- fixed removal of dirty tiles; was causing crash at higher step rates when
  dirty tiles get compacted
- chased down an ephemeral rebase-induced bug by auditing the ViewGL
  typification commit line by line:
  - bug presented as hex cells rendering extremely "sparsely", and seeming to
    be aligned to square grid positions...
  - turned out to be a mere loss of `offset++` in `TileBufferer.flushTileBuffer`
  - which caused each tile draw to merely (over)draw a single hex... revealing
    the emergent quad tree structure, which is centrally sparse, but dense
    toward the outer boundary... and dense around the origin
- refactored prompt module around an `async *interact()` loop
- simplified `hash.set()` return type, no more callbacks
- switched to a `$element` idiom when passing bound DOM nodes

# 2022-05-03

- reorganized the TODO section above around version milestones
- fixed infinite recursion bug in `HexTileTreeNode` compaction
- fixed the hashbind module
  - lots of minor refactoring bugs
  - make the user do call load, preferably after all bindings
  - improve initialization / round tripping
  - handling of default values when initial set parses to an error
- fixed `turmite/parse.js` handling of error results

# 2022-05-02

- debugging dev
  - fixed `GLPalette.setColorsRGB` data indexing
  - fixed world step logic: needed to add in cube space
- started minimizing and erasing view object structure towards an eventual
  refactor to maker form
- restructured `ViewGL.redraw` to clarify tile and entity phases
- factored out `setNumbers()` et al utilities to clarify data array builds

# 2022-05-01

- debugging dev
  - fixed `NaN` turn bug in newly refactored `constants.turnDirs`
  - fixed invocation error for `performance.now` bound to `world.now`

# 2022-04-30

- uplifted `turmite/index.js`
  - broadened `Turmite.reset`
  - factored out `constants.turnDirs(turn, dir)`
  - factored out `world.udpateEnt()
  - finishes the compiled form refactoring started in the `lang` modules
- uplifted `hexant.js`
  - fixed missing `World.MaskResultColor` constant
  - finished All The Refactoring threads from prior modules

# 2022-04-29

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
