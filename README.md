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

## URL-fragment (hash) variables

- frameRate -- number of animation ticks attempted per second
- drawUnvisited -- specify to draw every cell in the tree instead of only
  visited ones
- labeled -- specify to add coordinate labels to cells (doesn't scale well,
  only for debugging)

# Running

Just:
```
$ npm install
$ npm run serve
```

## MIT Licensed
