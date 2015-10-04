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
- `+` -- double frame rate
- `-` -- half frame rate
- `*` -- reset to iteration 0 and pause
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

## Specifying Colors

Colors are driven by a color geeration scheme, using a simple language.

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
- `frameRate` -- number of animation ticks attempted per second
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
