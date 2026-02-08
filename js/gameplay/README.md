Gameplay is split by responsibility:

- `temps.js`: temporary effects, buffs/debuffs, and temp state normalization.
- `run.js`: run lifecycle (`startGame`) and run persistence (`saveRunNow`, `restoreRunIfAny`).
- `progression.js`: combo system, XP/level-up, and upgrade selection/application.
- `combat.js`: firing logic, hit resolution, kill handling, player damage, and specials.
- `spawning.js`: director/wave spawning, event patterns, arena events, and micro-objectives.
- `simulation.js`: per-frame runtime update loop (`update`) and ticking.

Load order is defined in `index.html` and must be preserved unless dependencies are reworked.
