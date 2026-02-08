// Bootstrap module: restore persisted run and start the main loop.
// ═══════ MAIN LOOP ═══════
restoreRunIfAny();
let lastT=0;
let recoveredFromFatal=false;
function recoverFromFatal(err,phase){
console.error('Runtime error in',phase,err);
if(recoveredFromFatal)return;
recoveredFromFatal=true;
try{clearRunSave()}catch(e){}
state='menu';P=null;enemies=[];projs=[];pickups=[];parts=[];gfx=[];inputDir={x:0,y:0};joyAct=false;joyId=null;
pendingGameOverT=0;timeScale=1;timeScaleT=0;impactFlash=0;
}
function loop(ts){
requestAnimationFrame(loop);
try{
 if(!lastT)lastT=ts;
 let realDt=(ts-lastT)/1000;
 lastT=ts;
 if(realDt>.1)realDt=.1;
 const dt=realDt*tickTimeScale(realDt);
 update(dt);render();
}catch(e){recoverFromFatal(e,'loop')}
}
requestAnimationFrame(loop);
