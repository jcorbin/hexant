# [Hexagonal Ants](//jcorbin.github.io/hexant)

A continuation of [github:jcorbin/ants](//github.com/jcorbin/ants), now on hexagons.

# UI

Beyond click to play/pause, UI is currently keyboard and URL-fragment driven
only:

## Keyboard controls

- `<Space>` -- play/pause
- `.` -- single step when paused, pause when playing
- `/` -- prompt and set new rule set
- `c` -- prompt and set new color scheme
- `t` -- toggle "trace mode" drawing
- `t` -- toggle drawing of unvisited cells
- `+` -- double step rate
- `-` -- half step rate
- `*` -- reset to iteration 0 and pause
- `^` -- summon/dismiss a mysterious deity
- `f` -- show/hide frames and steps per second (fps and sps)
- `#` -- toggle labels for debugging

## Specifying Ants

The language for specifying ants is:
```
ant( [<count>]<turn> ... )
```

Essentially it's simple RLE-encoded turn sequences inside `ant(...)`, some
examples:
- the default LR rule set is just: `ant(L R)`
- a more interesting example: `ant(2R 10F 2R)`

The possible relative turns are:
- `L` -- to the left
- `R` -- to the right
- `F` -- forward (no turn)
- `B` -- backward (reverse direction)
- `P` -- "port", rear left turn
- `S` -- "starboard", rear right turn

The possible absolute turns are:
- `NW` -- North West
- `NO` -- North
- `NE` -- North East
- `SE` -- South East
- `SO` -- South
- `SW` -- South West

Please excuse the abuse of "port" and "starboard" towards the end of unique
single-character letters ;-)

## Specifying Turmites

[Ants](//en.wikipedia.org/wiki/Langton%27s_ant) are a special case of a
[Turmite](//en.wikipedia.org/wiki/Turmite):
- instead of just deciding based on world color, turmites also have an internal
  state byte
- they're free to write an arbitrary output color to their current cell
- if they decide on more than one turn, then they fork into multiple turmites
  (***NOT YET IMPLEMENTED***)
- if two turmites would colide, both are destroyed (***NOT YET IMPLEMENTED***)

Internally turmites are implemented as a 65536-element 32-bit lookup table.

- table index is `state << 8 | color` where:
  - `state` is the turmite state byte
  - `color` is the world color byte
- table value is `state << 24 | color << 16 | turn` where
  - `state` is the next turmite state byte
  - `color` is the world color byte to write
  - `turn` is a 16-bit field indicating the turn(s) to take (only 12 of the
    bits are used for each of the 6 relative and absolute directions)

### Turmite Language

***EXPERIMENTAL***: the specification language is still in very early
development and may breaking changes may happen at anytime.  Additionally the
quality of the error messages provided by the parser and compiler reflect its
immaturity.

To assist in building this lookup table, a turmite specification language is
provided.  As our first example the classic `ant(L R)` becomes:
```
Turns = turns(L R)
0, c => 0, c + 1, Turns[c]
```

Quirks to note:
- turns sequence indexing is automatically "modulo length"
- defined variable names must start with an Uppercase letter; lowercase
  variables can only be used within a rule
- successive rule results are bitwise `OR`ed together by default; you can
  prefix a then field with `=` to instead replace any prior value
- the pattern matching in the left-hand side is still rudimentary, and supports
  only basic arithmetic

A more complex example:
```
T1 = turns(L R)
T2 = turns(2L 2R)
0, c => 0, c + 1, T1[c]
1, c => 1, c - 1, T2[c]
0, 32 * c => =1, 0, 0
1, 32 * c => =0, 0, 0
```

## Specifying Colors

Colors are driven by a color generation scheme, using a simple language.

### Lightness-varying color scheme

`light(HUE, SAT)`

Uses lightness variation for a fixed hue and saturation in the [HUSL color
space](http://www.husl-colors.org/).

- `HUE` is a number between `0` and `360` and is in degrees on the color wheel;
  defaults to `0`.
- `SAT` is a number between `0` and `100` and is a percentage; defaults to
  `100`.

### Hue-varying color scheme

`hue(SAT, LIGHT)`

Uses hue variaton for a fixed saturation and lightness in the HSL color space.

- `SAT` is a number between `0` and `100` and is a percentage; defaults to
  `70`.
- `LIGHT` is a number between `0` and `100` and is a percentage; defaults to
  `40`.

## URL-fragment (hash) variables

- `rule` -- the rule spec to use
- `colors` -- the color scheme to use
- `stepRate` -- goal number of turmite steps per second
- `drawUnvisited` -- specify to draw every cell in the tree instead of only
  visited ones
- `labeled` -- specify to add coordinate labels to cells (doesn't scale well,
  only for debugging)

# Running

Just:
```
$ npm install
$ npm run serve
```

## MIT Licensed
