// Gameplay temps module: temporary effects lifecycle and combat stat modifiers.

function hasTemp(id){return (activeTemps[id]||0)>0}

function normalizeTempState(){
const clean={};
if(activeTemps&&typeof activeTemps==='object'){
 for(const id of Object.keys(activeTemps)){
  const t=TEMP_BY_ID[id],v=Number(activeTemps[id]);
  if(!t||!Number.isFinite(v)||v<=0)continue;
  clean[id]=clamp(v,.05,t.dur*2);
 }
}
activeTemps=clean;
if(!tempData||typeof tempData!=='object')tempData={};
if(tempData.bubbleCharges!==undefined){
 const c=Math.floor(Number(tempData.bubbleCharges));
 if(!Number.isFinite(c)||c<=0)delete tempData.bubbleCharges;
 else tempData.bubbleCharges=clamp(c,1,3);
}
if(tempData.droneCd!==undefined){
 const c=Number(tempData.droneCd);
 if(!Number.isFinite(c))delete tempData.droneCd;
 else tempData.droneCd=clamp(c,0,.9);
}
if(tempData.droneA!==undefined){
 const a=Number(tempData.droneA);
 if(!Number.isFinite(a))delete tempData.droneA;
 else tempData.droneA=a%(PI2*1000);
}
if(tempData.alarmPulse!==undefined){
 const p=Number(tempData.alarmPulse);
 if(!Number.isFinite(p))delete tempData.alarmPulse;
 else tempData.alarmPulse=clamp(p,0,2);
}
if(tempData.vpnFirst!==undefined)tempData.vpnFirst=!!tempData.vpnFirst;
}

function addTemp(id,dur){
if(!TEMP_BY_ID[id])return;
if(dur<=0){applyInstantTemp(id);return}
activeTemps[id]=Math.max(activeTemps[id]||0,dur);
if(id==='bubble')tempData.bubbleCharges=3;
if(id==='vpn')tempData.vpnFirst=true;
if(id==='drone'){tempData.droneCd=0;tempData.droneA=0}
if(id==='alarm')tempData.alarmPulse=0;
fTxt(P.x,P.y-35,`${TEMP_BY_ID[id].emoji} ${TEMP_BY_ID[id].name}`,'#80DEEA',14);
}

function applyInstantTemp(id){
if(id!=='meeting')return;
for(const e of enemies){
 if(e.hp<=0||e.isBoss)continue;
 if(dst(P,e)<260)e.freezeT=Math.max(e.freezeT||0,2);
}
burst(P.x,P.y,20,'#80DEEA',180,5,.45);sfx('freeze');
}

function spawnTempPickup(x,y,chance){
if(Math.random()>=chance)return;
const t=TEMP_ITEMS[rngI(0,TEMP_ITEMS.length-1)];
pickups.push({x:x+rng(-12,12),y:y+rng(-12,12),type:'temp',id:t.id,life:12});
}

function getAtkSpeedBonus(){
let b=0;
if(hasTemp('overclock'))b+=Math.min(0.7,(TEMP_BY_ID.overclock.dur-activeTemps.overclock)*0.07);
if(hasTemp('overtime')&&P.hp/P.mhp<.45)b+=0.35;
return b;
}

function getMoveSpeedBonus(){
let b=0;
if(hasTemp('drift'))b+=0.4;
if(hasTemp('overtime')&&P.hp/P.mhp<.45)b+=0.2;
return b;
}

function getDamageBonus(){
let b=0;
if(hasTemp('overtime')&&P.hp/P.mhp<.45)b+=0.45;
return b;
}

function getArmorBonus(){
return hasTemp('ergo')?2:0;
}

function tickTemps(dt){
if(!P)return;
for(const id in activeTemps){
 activeTemps[id]-=dt;
 if(activeTemps[id]<=0){
  delete activeTemps[id];
  if(id==='bubble')delete tempData.bubbleCharges;
  if(id==='vpn')delete tempData.vpnFirst;
  if(id==='drone'){delete tempData.droneCd;delete tempData.droneA}
  if(id==='alarm')delete tempData.alarmPulse;
 }
}
if(hasTemp('overtime'))P.hp=Math.max(1,P.hp-2*dt);
if(hasTemp('alarm')){
 tempData.alarmPulse=(tempData.alarmPulse||0)+dt;
 if(tempData.alarmPulse>=1.2){
  tempData.alarmPulse=0;
  for(const e of enemies){if(e.hp>0&&dst(P,e)<220)e.fearT=Math.max(e.fearT||0,1.2)}
  burst(P.x,P.y,8,'#FF7043',120,4,.25);
 }
}
if(hasTemp('drone')){
 tempData.droneA=(tempData.droneA||0)+dt*3.2;
 tempData.droneCd=(tempData.droneCd||0)-dt;
 if(tempData.droneCd<=0){
  tempData.droneCd=.55;
  const dx=P.x+Math.cos(tempData.droneA)*35,dy=P.y+Math.sin(tempData.droneA)*35;
  let target=null,nd=140;
  for(const e of enemies){if(e.hp<=0)continue;const d=dst({x:dx,y:dy},e);if(d<nd){nd=d;target=e}}
  if(target){hurtE(target,Math.floor(P.bdmg*.7),true);addP(dx,dy,0,0,.2,'#80DEEA',4);sfx('xp')}
 }
}
}
