Features:
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
    - perhaps make hsl vs husl available for all aspects, rather than the
      current pick-and-choose
    - a constant color scheme; espec useful for the empty cell class, so we
      could have them all drawn black
- jump to iteration
- rewind
- support zoom and pan
- ant pov inset view(s)
- randomized starting cell values
- generalize and borg github:jcorbin/ants

Turmite Lang:
- better when matching logic
- bitwise operators
- syntax for partial then spec
- syntax for interaction
- refactor compiler
  - support error return
  - consistent composition shape between parts

UI:
- mobile
  - affordance for current keybinds
    - trigger rules/color dialog
    - slower/faster
    - feature toggles
    - reset and single-step
  - rules editor that isn't as keyboard heavy
  - color editor that isn't as keyboard heavy

Bugs:
- fix minor view clipping error

Performance
- quad tree
  - compaction
  - optimistic pre-alloc under a threshold
- drawing:
  - actually measure redraws /sec, we're probably doing too many
  - make redraws faster; while an eye has been kept to performance throughout,
    no real optimization work has happened yet
  - frameRate vs lag adaptation
