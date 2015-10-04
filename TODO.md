Features:
- rewind
- jump to iteration
- utilize / unlock more turmite features
  - dsl for arbitrary turmite -- WIP on the turmite-lang branch
  - support forking -- see turmite/index.js circa L109
  - interaction rules
- support zoom and pan
- ant pov inset view(s)
- randomized starting cell values
- generalize and borg github:jcorbin/ants

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
