Gameplay is split by responsibility:

- `temps.js`: temporary effects, buffs/debuffs, and temp state normalization.
- `run.js`: run lifecycle (`startGame`) and run persistence (`saveRunNow`, `restoreRunIfAny`).
- `progression.js`: combo system, XP/level-up, and upgrade selection/application.
- `combat.js`: firing logic, hit resolution, kill handling, player damage, and specials.
- `simulation.js`: enemy spawning and frame update loop (`update`).

Load order is defined in `index.html` and must be preserved unless dependencies are reworked.
