// Bootstrap module: restore persisted run and start the main loop.
// ═══════ MAIN LOOP ═══════
restoreRunIfAny();
let lastT=0;
function loop(ts){requestAnimationFrame(loop);if(!lastT)lastT=ts;let dt=(ts-lastT)/1000;lastT=ts;if(dt>.1)dt=.1;update(dt);render()}
requestAnimationFrame(loop);
