# v0.9.8

- Updated build and dev tooling
- Added redraw timing to he FPS overlay
- FIxed animation when step rate is slower than one-per-frame
- Small fixes and improvements

## v0.9.7

- Collapsed world entity (re-)initialization code
- Loosened coupling between turmite entities, world, and especially view
- Improved view drawing code
- Improved turmite step code

## v0.9.6

- Stop animation on exception
- Renamed "frameRate" to "stepRate"
- Added a Frames and Steps Per Second display
- Added automatic step throttling based on step round timing and minimum-FPS
  targeting; removed static step size limit
- Added quad tree tile compaction
- Combined get-and-set quad tree access pattern into a single update
- Many small fixes and improvements

## v0.9.5

- Fixed animation step/frame rate
- Modest performance gains
- Many minor improvements

## v0.9.4

- Minor fixes and improvements

## v0.9.3

- Added a CHANGELOG
- Evolved bulid-pages script into fully versioned scripting
- Added shrinkwrap
- Changed all package.json dependency versions to be exact

## v0.9.2

- Aded support for base64 encoded hash

## v0.9.1

- Added turmite language support for overwriting prior rule, in addition to
  combining with prior
- Minor fixes and improvements

# v0.9.0 -- Turmite Language

- New turmite language

## v0.8.5

- Fix double hash escaping bug

## v0.8.4

- Improved colorgen parsing so that errors aren't ironed over
- Minor fixes and improvements

## v0.8.3

- Added support for absolute turns
- Many minor improvements

## v0.8.2

- Updated documentation

## v0.8.1

- Renamed confusing "other" left/right moves to "port" and "starboard"

# v0.8.0 -- That's a feature!?!

- Featurified a prior bug: drawTrace

## v0.7.7

- Better error display in prompt
- Many minor improvements

## v0.7.6

- Switch to external hashbind module
- Minor fixes and improvements

## v0.7.5

- Minor fixes and improvements

## v0.7.4

- Minor fixes and improvements

## v0.7.3

- Added a custom prompt dialog

## v0.7.2

- Many minor improvements

## v0.7.1

- Many minor improvements

# v0.7.0 -- Turmite Engine

- New Turmite engine
- Redefined `*` keybind to reset

## v0.6.16

- Added keybind to change colors
- Switch to HUSL colors
- Change default colors to light
- Minor fixes and improvements

## v0.6.15

- Minor fixes and improvements

## v0.6.14

- Added LoD degradation to circles

## v0.6.13

- Added a fullauto mode
- Added autorefresh flag
- Minor fixes and improvements

## v0.6.12

- Minor fixes and improvements

## v0.6.11

- Many minor improvements

## v0.6.10

- Added deferred view redraw
- Minor improvements

## v0.6.9

- Many minor improvements

## v0.6.8

- Many minor improvements

## v0.6.7

- Added autoplay support
- Minor fixes and improvements

## v0.6.6

- Added light(H, S) colorogen
- Better hash integration by binding
- Port main component to gutentag
- Minor bug fixes

## v0.6.5

- Better animation controller

## v0.6.4

- Adopt gutentag system

## v0.6.3

- Many small fixes and improvements

## v0.6.2

- Change key binds, added play/pause
- Improved build process

## v0.6.1

- Normalize input to uppercase
- Reset the ant direction when changing rules

# v0.6.0 -- Initial Release

Initial release
