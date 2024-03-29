# WIP

Working on validating `v1.0` functionality.

# TODO

#### `v1.0.x`

- flatten `turmite/lang/...` into `turmite/...`
- `RuleConstants` shifts are awkward ; see `turmite/test.js` for a starting point
- debug initial hex scale bug ; also mobile

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

- use `constants.Turn` to type extracted turn results out of a `Rules` table,
  rather than using raw `number` types
- switch away from nearley to a custom recursive descent parser
- make `turmite.ruleHelp` interactive
- feature to specify a fixed state rule
  - e.g. to "lift" an ant
  - e.g. to precede a simplified rule of the form `when-c => then-c, then-turn`
  - idea: `state = 42: ant(...)` ; `state = 42: c => c + 1, turns(R L)`
    - coidea:
      ```
      color = 2*c: s => s + 1, L
      color = 2*c+1: s => s + 1, R
      color = 16*c+1: _ => F
      ```
- ternary expressions?
  - what would that even mean in an LHS when match?
    - .... probably can work actually, but will need a revamp of the solver/matcher
  - most useful tho for the RHS... but what can it achieve that isn't possible
    with multiple rules?

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
- NOTE: the `src/prompt.js` module is experimenting towards this

## server

- port turmite sim to Go... shard and scale over goroutines
- maybe allow shard(s) to run locally in a background web worker

## META: see also / subsume the old `TODO.md` file
## META: grep for code TODOs and cull/triage them into this stream document

# 2023-01-16

## TODO

- make `ant(...)` usable as a rule RHS to fix its whenState / thenState terms

## WIP

- vercel build description isn't picking up the tag since v0.11.1

## Done

# 2023-01-15

- simplified world/view surface down to just `reset()` and `redraw()`
  - world now tracks visited bounding box, which view syncs to at top of
    redraw, eliminating a potentially expensive and redundant call from
    `world.stepn(n)` inner loop
  - simplified various aspects of bounding box logic around `OddQBox`
    expansion, which now works correctly when starting from an empty box
  - simplified view color scheme palette build, to happen once at top of
    redraw, and simply sync to the number of colors / entities; no more entity
    add/remove/update/delete interface
- this ended up fixing part of the initial view scale problem, since the
  viewport had previously been starting out empty, rather than containing the
  first entity-occupied cell

# 2023-01-13

- expanded test coverage to include all sources
- expand type checking to tests and `index.jx`
- picked back up development
  - ran `npm audit fix`
  - ran `npm update`
    - fixed new typescript complaint

# 2022-06-27

- simplified RAF usage based motivated by typescript global error
- adapted build script to not fully nuke the build directory, allowing usage of
  `git-worktree` to track the `gh-pages` branch
- changed keymap to watch click events than mouseup events to easily fix mobile
  touch event, without needing to care about them directly yet

# 2022-06-26

- shipped as v0.11.0

# 2022-05-27

- further generalized prompt so that it doesn't require a text box
- generalized keymaps into actions
  - improving representation of shifted keys and space keys
  - now supporting the escape key to cancel

# 2022-05-26

- flattened `turmite/lang/...` into `turmite/...` now that there is only the
  nearley driven parser
- refactored `analyze.transform` to support deleting nodes
- moved turmite code actions into the analyze package

# 2022-05-25

- subsumed comments and @directives into turmite language module
  - tried and failed to add comments/@directives to nearley grammar
  - ...then spent some time trying to write a new parser module form scratch,
    abandoned for now due to frustration with variadic tuple types
  - ...then circled back to the nearley grammar, and was able to add comments
    and @directives on a second try
- eliminated legacy `walk.dfs` routines:
  - `dfsPre` and `collect` have already been replace by `analyze.transform()`
  - flattened remainder into `toSpecString` and simplified into a recursive
    generator, no more string building stack ops

# 2022-05-24

- reified compile scope management
  - now there's a nestable `makeScope() => Scope` set-ish of symbols
  - used for block construction
- added strict "all symbols must be defined" check to value compilation
- flattened spec node, allowing assigns to interleave rules, and setting up for
  directives / comments next
  - such interleaving enabled by scope rework, since assigns can happen
    anywhere more robustly now

# 2022-05-23

- refactored language analysis module
  - added suite of grammar node maker functions
  - refactored analysis around generic node tree transformation that does not
    mutate the input tree
  - evicted all application code into the compile module
    - turn counting and symbol collision check now happen where they did
      before, but have no potential to mutate the parsed input tree
    - tmp hoisting has been pushed down into a refactored `compileRule` unit
      that makes rule scope manipulation more coherent
    - commented out block about bare `turns()` auto-color-indexing also left
      for future resurrection
- refactored language compile module
  - reified `block()` handling
  - made `wrap()` and `amend()` more ergonomic
  - rule compilation more coherent, easier to re-use for `ant(...)`
- implemented `ant(...)` alternate rule form
  - compiles thru all the same rule paths as normal `{when, then}` form by way
    of a new `analyze.antRule()` transform

# 2022-05-22

- added explicitly null then rules
  - this allows rules like `0, c % 32 => 1, _, _` that only change the state
    field, pass on the color and turn fields
- let prompt `{help}` be an iterable string body, naturalizing functions like
  `turmiteRuleHelp`
- ditched all WIP work towards a general interactive `/command` and help system
  in prompt, will experiment towards that again someday, currently planned for
  the `v1.3` language phase
- `turmite/lang`
  - now compiles directly to a `Builder` function
  - erased the `_result` temporary, inlining then-comments withing one
    multi-line bitwise or-shift construct
- improved turmite test tool
  - added command to run a compiled module
  - fixed rules dump, and elide runs of 0-result rules
- fixed mixed up `World` mask constants... wasn't detected before because of
  the update loop hardcodes...
- fixed `Turmite.TestSpec` mask and shift constants
- fixed symbolic solver to actually work for non-trivial matches like `16 * c - 1`
- added a bi-modal ant text example

# 2022-05-21

- finished out `@numColors` directive

# 2022-05-20

- finished out color halver test case and its collatz progeny
  - added verbose value and code logging options to `isTurmite()` test utility
- started working on comment / directive syntax for specifying numColors
  broader than required for a turmite's turn sequence

# 2022-05-19

- broke up turmite help routines ahead of making them more elaborate /
  interactive
- fixed `scripts/ed.js`, wasn't including a final newline before, which led to
  eventual churn once re-added by $editor
- switched rule then mode to `=` by default, which is less surprising than `|=`
- refactored test harness ahead of adding more involved turmite examples
- improved turmite rule compilation while trying to add a new "color halver"
  test, many small bug fixes, and the generated code is now much more readable
  / natural, including more spec-string fragment comments

# 2022-05-18

- further work on prompt ux
  - made prompt semantics be a clean start each round, no carry over state
  - added explicit `{title}` header support
  - added `{command}` buttons
  - concatenate all `{help}` outputs

# 2022-05-17

- refactored `prompt` module over a new `Interactor<T>` type that is a
  generator of outputs given inputs; this allows basic responsive help now, and
  will allow more structural interaction later like action commands
- improved prompt legibility
  - don't let it take more than 50% of viewport height, make long errors scroll
  - provider clearer ant parse errors that don't leak turmite grammar rules
- added conversion button for ant => turmites

# 2022-05-16

- uplifted all tests and got them passing
  - including `tests/hextiletree.js` which has been broken since commit
    `7885fe5` removed `OddQHexTile.prototype.grow` 6 years ago
- added coverage testing, got `ci` script passing
- wrote a basic turmite test module
  - test ant parse/builder
  - test turmite parse/builder vs equivalent ant
  - TODO: more turmite test coverage, e.g. a multi-state turmite
  - caught and fixed many bugs
- added easy access to turmite `string => ...lines` compilation, useful today
  for testing/debugging, maybe usable tomorrow for ahead-of-time compilation
  for something like a canned/fixed demo
- improved prompt usability when dealing with large parse / compile errors

# 2022-05-14

- finished off minified build
  - now using full html+css+js minification
  - code generator now drops .min.js alternate forms of .glsl shaders, which
    then get used by the .min.js build bundle

# 2022-05-13

- added asset inlining to `index.html` build
- added `importmap.json` auto generation from `package.json`
- added `index.html` auto re-generation from `importmap.json`
  - added generation chain dependency support
- minor fixes in generate
  - rollup command were broken
  - scanLines was wrong at scale, if not yet
  - improved command spawning to be closer to `clikit.system`

# 2022-05-12

- switched back to sparse development
  - flattened `public/` into toplevel
  - added `generate.js` driven vendoring of common.js modules
  - using emerging browser <https://wicg.github.io/import-maps> support
  - this means that hexant development may only be possible in Chrome currently
- spent the rest of the day "researching" html inliners
  - spent too much time toying with a token-stack based monad...
- started over and wrote a pragmatic `scripts/build.js` that does line based
  editing configured by `build.config.js`

# 2022-05-11

- dropped `pool.js` module ahead of schedule, since its surrounding use of
  static blocks conflicts with terser v5.13.1 not yet supporting that syntax
- added terser-minifed rollup bundle
- a bit more work on `scripts/generate.js`
  - handle per-file build errors better
  - rename all shaders to `.vert.glsl` and `.frag.glsl`, helps editors
  - improved tmp file renaming and cleanup
- dropped explicit `'use strict'` from all uplifted `.js` files
- split `index.js` out again, with sourcemaps, hardcoded to use the minified
  bundle for now

# 2022-05-10

- finished of initial scope of `scripts/generate.js`
  - config structured in a humane way
  - ci check command wired up
- got rollup + http-server based dev server working

# 2022-05-09

- got tsc-driven lint passing
  - ignored shader imports for now, plan to revamp gl src / shader / program
    handling anyhow
  - ignored the nearley dep
    - tried `@types/nearley` but it got hung up on all of my destructuring post
      processors like `([tick, tock]) => {type: "meme", tick, tock}` due to
      post procs getting passed an `any[]` which may have fewer than N elements...
    - ... but if it did, that'd be a parser library bug, since the grammar
      production rule guarantees N elements, so nearley's type declarations are
      insufficient
    - ... this will all be better once we replace nearley with a recursive
      decent parser that we own
- dropped unused leftover dependencies: global, domready, and rezult
- fully ripped out eslint, and integrated tsc as the lint script
- got vercel deployment working
  - fixed `glsl-loader` to work under Node 14.x LTS... which is apparently the
    latest that vercel supports...
  - had to add `npm run grammar &&` to build script, since postinstall hook was
    not running for some reason
- started ripping out snowpack, since it's looking like abandonware
  - added `go generate` inspired approach: offline code generation, with
    committed artifacts:
    - driver is `genkit.js` as ran by `npm run generate` ; may move into `scripts/generate.js`
    - configured by `gen-config.js`
    - ported `glsl-loader.{cjs => js}`
    - runs `nearleyc` for now

# 2022-05-08

- uplifted `turmite/test.js`, which is actually more of a CLI testing vehicle
  than an automated test
  - also the only user of the hexer dependency; eliminated usage, dropped dependency
  - much refactored around async line generators
- set `package.json` type to modules to that `turmite/test.js` can be ESM
  without changing extension
- bumped tsconfig module to es2022 so that `turmite/test.js` can use toplevel
  await
- added `rezult.toPromise(Result) => Promise`

# 2022-05-07

- finished the git rebake from yesterday
  - ripped out `noUncheckedIndexedAccess` and
    `noPropertyAccessFromIndexSignature` from tsconfig, turned out to be more
    trouble than worth
- many minor changes all around ramifying from more type checking, some notes:
  - added `rezult.catchErr()` and `rezult.bind()` conveniences
  - hash binds now must provide a default and listener
  - factored `domkit.mustQuery()` out of `prompt.js` and `hexant.js`
- fixed view tombstone pruning bug
- added fullscreen toggle on `Enter`

# 2022-05-06

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
