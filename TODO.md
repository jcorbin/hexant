# General

- extend the current hack that is `drawTrace` to something like
  `trace=redraw|<number>` so that we can have "last-N" tracing
- support forking -- see turmite/index.js circa L109
- support interaction rules
  - first implement mutual annihilation
  - next support rules table voting from each entity
- color schemes
  - better hue separation for the various classes in light scheme
  - support varying the scheme for each class (e.g. hue(...) for ants, but
    light(...) for cells)
  - more schemes
    - a `sat(...)` scheme for completeness
    - perhaps make hsl vs hsluv available for all aspects, rather than the
      current pick-and-choose
    - a constant color scheme; espec useful for the empty cell class, so we
      could have them all drawn black
- jump to iteration
- rewind
- support zoom and pan
- ant pov inset view(s)
- randomized starting cell values
- generalize and borg github:jcorbin/ants

# Turmite Lang

- better when matching logic
- bitwise operators
- syntax for partial then spec
- syntax for interaction
- refactor compiler
  - support error return
  - consistent composition shape between parts
- debug the disparity between `ant(2L 13R 2L)` and it's turmite equivalent
- add comment support to turmite lang
- add further variable support to turmite lang
- add higher level looping or qualification construct to turmite lang

# UI

- mobile
  - affordance for current keybinds
    - trigger rules/color dialog
    - slower/faster
    - feature toggles
    - reset and single-step
  - rules editor that isn't as keyboard heavy
  - color editor that isn't as keyboard heavy

# View

- fix minor view clipping error
- fix minor GL artifacting glitch

# Performance

- optimistic quad-tree pre-alloc under a threshold
