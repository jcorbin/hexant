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

The possible turns are:
- `L` -- to the left
- `R` -- to the right
- `F` -- forward (no turn)
- `B` -- backward (reverse direction)
- `P` -- "port", rear left turn
- `S` -- "starboard", rear right turn

Please excuse the abuse of "port" and "starboard" towards the end of unique
single-character letters ;-)

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
