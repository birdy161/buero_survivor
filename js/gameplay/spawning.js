// Gameplay spawning/director module: enemy spawning, wave director, arena events, and micro-objectives.

function spawnE(opts){
if(!P)return;
opts=opts||{};
let sx,sy;
if(Number.isFinite(opts.x)&&Number.isFinite(opts.y)){sx=opts.x;sy=opts.y}
else{
 const a=rng(0,PI2),d=Math.max(VW,VH)*.55+rng(30,120);
 sx=P.x+Math.cos(a)*d;sy=P.y+Math.sin(a)*d;
}
let et=null;
if(Number.isInteger(opts.etIndex)&&ET[opts.etIndex])et=ET[opts.etIndex];
else if(opts.role==='fast'){
 const fi=[3,4,7,11].filter(i=>i<ET.length);et=ET[fi[rngI(0,fi.length-1)]||0];
}else if(opts.role==='tank'){
 const ti=[2,8,10].filter(i=>i<ET.length);et=ET[ti[rngI(0,ti.length-1)]||0];
}else{
 const wi=[0,1,5,6,9].filter(i=>i<ET.length),mx=Math.min(2+Math.floor(wave*0.7),ET.length);
 et=opts.role==='weak'?ET[wi[rngI(0,wi.length-1)]||0]:ET[rngI(0,mx-1)];
}
const eg=Math.max(0,Number(directorScaling().enemyStatGrowth||1));
const sc=1+wave*.18*eg; // HP scales with configurable growth factor
const spdSc=1+wave*.04*eg;
const dmgSc=1+wave*.1*eg;
// ELITE chance: 15% from wave 3, 30% from wave 7
const isElite=opts.elite===true||(opts.elite!==false&&wave>=3&&Math.random()<(wave>=7?.3:.15));
const em=isElite?2.5:1, esm=isElite?1.3:1, edm=isElite?1.5:1;
const inView=Math.abs(sx-P.x)<=VW*.55&&Math.abs(sy-P.y)<=VH*.55;
const popDur=inView?BALANCE.director.spawnPopDuration:0;
enemies.push({...et,x:sx,y:sy,
hp:Math.floor(et.hp*sc*em),mhp:Math.floor(et.hp*sc*em),
spd:et.spd*spdSc*esm,dmg:Math.floor(et.dmg*dmgSc*edm),
xp:Math.floor(et.xp*(1+wave*.05)*(isElite?2:1)),
co:et.co*(isElite?3:1),flash:0,slowT:0,freezeT:0,pinT:0,
atkT:0,isBoss:false,elite:isElite,infected:false,
chargeT:0,chargeCD:0,rushT:Math.max(0,Number(opts.rushT)||0),rushVX:Number(opts.rushVX)||0,rushVY:Number(opts.rushVY)||0,spawnT:popDur,spawnDur:Math.max(.001,popDur),uid:Math.random()
});
}

function spawnBoss(){
if(bossRef||!P)return;const bi=clamp(Math.floor((wave-5)/5),0,BT.length-1);
const bg=Math.max(0,Number(directorScaling().bossStatGrowth||1));
const bt={...BT[bi]},sc=1+wave*.22*bg;
bt.hp=Math.floor(bt.hp*sc);bt.mhp=bt.hp;
bt.dmg=Math.floor(bt.dmg*(1+wave*.1*bg));
bt.xp=Math.floor(bt.xp*(1+wave*.08*bg));
const a=rng(0,PI2);bt.x=P.x+Math.cos(a)*350;bt.y=P.y+Math.sin(a)*350;
bt.flash=0;bt.slowT=0;bt.freezeT=0;bt.pinT=0;bt.atkT=0;bt.isBoss=true;
bt.elite=false;bt.infected=false;bt.chargeT=0;bt.chargeCD=0;bt.uid=Math.random();
const bossInView=Math.abs(bt.x-P.x)<=VW*.55&&Math.abs(bt.y-P.y)<=VH*.55;
bt.spawnT=bossInView?BALANCE.director.spawnPopDuration:0;bt.spawnDur=Math.max(.001,bt.spawnT||0);
bossRef=bt;enemies.push(bt);sfx('boss');
}

function waveLerp(v1,v10,wv){
const t=clamp((wv-1)/9,0,1);
return lerp(v1,v10,t);
}

function directorScaling(){
return BALANCE.director.scaling||{};
}

function scaledWave(wv){
return Math.max(1,wv+Number(directorScaling().roleTierShift||0));
}

function directorEventCount(wv){
const sw=scaledWave(wv),f=Math.max(.1,Number(directorScaling().eventFrequency||1));
let base=4;
if(sw<=2)base=1;
else if(sw<=6)base=2;
else if(sw<=10)base=3;
return Math.max(1,Math.round(base*f));
}

function directorAmbientInterval(wv){
const rt=Math.max(.1,Number(directorScaling().ambientRate||1));
return Math.max(.05,waveLerp(BALANCE.director.ambient.intervalWave1,BALANCE.director.ambient.intervalWave10,wv)/rt);
}

function directorWaveBudget(wv){
const b=BALANCE.director.budget;
const mul=Math.max(.05,Number(directorScaling().budgetMultiplier||1));
const g=Math.max(1,Number(directorScaling().budgetPost10Growth||1.12));
if(wv<=1)return Math.floor(b.wave1*mul);
if(wv>=10)return Math.floor(b.wave10*Math.pow(g,wv-10)*mul);
const k=(wv-1)/9;
return Math.floor(b.wave1*Math.pow(b.wave10/b.wave1,k)*mul);
}

function directorEnemyMix(wv){
const m=BALANCE.director.mix;
const sw=scaledWave(wv);
const weak=clamp(waveLerp(m.weakWave1,m.weakWave10,sw),0,1);
const fast=clamp(waveLerp(m.fastWave1,m.fastWave10,sw),0,1-weak);
const tank=clamp(1-weak-fast,0,1);
return{weak,fast,tank};
}

function chooseRoleByMix(wv){
const m=directorEnemyMix(wv),r=Math.random();
if(r<m.weak)return'weak';
if(r<m.weak+m.fast)return'fast';
return'tank';
}

function directorEventRole(wv){
const sw=scaledWave(wv);
if(sw<=3)return'weak';
if(sw<=7)return'fast';
return'tank';
}

function roleCost(role){
return BALANCE.director.budget.cost[role]||1;
}

function affordableEventRole(role){
if(directorBudget>=roleCost(role))return role;
if(role==='tank'&&directorBudget>=roleCost('fast'))return'fast';
if(directorBudget>=roleCost('weak'))return'weak';
return null;
}

function eventTypeIndexForRole(role){
let pool=[0];
if(role==='fast')pool=[3,4,7,11].filter(i=>i<ET.length);
else if(role==='tank')pool=[2,8,10].filter(i=>i<ET.length);
else pool=[0,1,5,6,9].filter(i=>i<ET.length);
if(!pool.length)pool=[0];
return pool[rngI(0,pool.length-1)];
}

function spendDirector(role){
const c=roleCost(role);
if(directorBudget<c)return false;
directorBudget-=c;
return true;
}

function eventCircleCountByWave(wv){
const s=Math.max(.1,Number(directorScaling().eventSize||1));
return Math.max(4,Math.min(70,Math.round((10+Math.floor(wv*4))*s)));
}
function eventCircleRadiusByWave(wv){
const rs=Math.max(.2,Number(directorScaling().eventRadius||1));
return Math.max(110,Math.round((320-wv*11)*rs));
}
function eventStampedeCountByWave(wv){
const s=Math.max(.1,Number(directorScaling().eventSize||1));
return Math.max(3,Math.min(56,Math.round((8+Math.floor(wv*3))*s)));
}
function eventStampedeSpeedByWave(wv){
const ss=Math.max(.1,Number(directorScaling().eventSpeed||1));
return Math.max(140,Math.min(700,Math.round((220+wv*24)*ss)));
}
function eventAmbushEliteByWave(wv){
const s=Math.max(.1,Number(directorScaling().eventSize||1));
return Math.max(1,Math.min(8,Math.round((1+Math.floor((wv+1)/3))*s)));
}
function eventAmbushMinionsByWave(wv){
const s=Math.max(.1,Number(directorScaling().eventSize||1));
return Math.max(0,Math.min(20,Math.round(Math.max(0,(wv-2)*1.2)*s)));
}

function buildDirectorEvents(wv){
const cfg=BALANCE.director,types=cfg.events.types.slice(),n=directorEventCount(wv);
const out=[],step=cfg.waveDuration/(n+1);
for(let i=0;i<n;i++){
 const t=Math.max(6,step*(i+1)+rng(-2,2));
 const type=types[rngI(0,types.length-1)];
 let count=12;
 if(type==='CIRCLE')count=eventCircleCountByWave(wv);
 else if(type==='STAMPEDE')count=eventStampedeCountByWave(wv);
 else if(type==='AMBUSH')count=eventAmbushEliteByWave(wv)+eventAmbushMinionsByWave(wv);
 const role=directorEventRole(wv);
 out.push({time:t,type,count,role,etIndex:eventTypeIndexForRole(role),fired:false});
}
out.sort((a,b)=>a.time-b.time);
return out;
}

function spawnCircleEvent(wv,count,role,etIndex){
const useRole=affordableEventRole(role);if(!useRole)return;
const n=Math.max(4,Math.min(count,Math.floor(directorBudget/roleCost(useRole))));
const rad=eventCircleRadiusByWave(wv);
for(let i=0;i<n;i++){
 if(!spendDirector(useRole))break;
 const a=(i/n)*PI2,x=clamp(P.x+Math.cos(a)*rad,30,worldW-30),y=clamp(P.y+Math.sin(a)*rad,30,worldH-30);
 spawnE({x,y,role:useRole,etIndex,elite:false});
}
fTxt(P.x,P.y-46,'⭕ EINKREISUNG','#FFB74D',14);
}

function spawnStampedeEvent(wv,count,role,etIndex){
const useRole=affordableEventRole(role);if(!useRole)return;
const n=Math.max(1,Math.min(count,Math.floor(directorBudget/roleCost(useRole))));
const speed=eventStampedeSpeedByWave(wv),rushDuration=BALANCE.director.events.stampede.rushDuration;
const side=rngI(0,3);
const laneT=i=>(i+.5)/n;
for(let i=0;i<n;i++){
 if(!spendDirector(useRole))break;
 let x=P.x,y=P.y,vx=0,vy=0;
 if(side===0){x=clamp(P.x-VW*.7,20,worldW-20);y=clamp(P.y-VH*.45+laneT(i)*(VH*.9),20,worldH-20);vx=speed}
 else if(side===1){x=clamp(P.x+VW*.7,20,worldW-20);y=clamp(P.y-VH*.45+laneT(i)*(VH*.9),20,worldH-20);vx=-speed}
 else if(side===2){x=clamp(P.x-VW*.45+laneT(i)*(VW*.9),20,worldW-20);y=clamp(P.y-VH*.7,20,worldH-20);vy=speed}
 else{x=clamp(P.x-VW*.45+laneT(i)*(VW*.9),20,worldW-20);y=clamp(P.y+VH*.7,20,worldH-20);vy=-speed}
 spawnE({x,y,role:useRole,etIndex,elite:false,rushT:rushDuration,rushVX:vx,rushVY:vy});
}
fTxt(P.x,P.y-46,'🏃 STAMPEDE','#FF8A65',14);
}

function spawnAmbushEvent(wv,role,etIndex){
const useRole=affordableEventRole(role);if(!useRole)return;
const a=BALANCE.director.events.ambush,pts=[
 {x:clamp(P.x,30,worldW-30),y:clamp(P.y-a.distance,30,worldH-30)},
 {x:clamp(P.x+a.distance,30,worldW-30),y:clamp(P.y,30,worldH-30)},
 {x:clamp(P.x,30,worldW-30),y:clamp(P.y+a.distance,30,worldH-30)},
 {x:clamp(P.x-a.distance,30,worldW-30),y:clamp(P.y,30,worldH-30)}
];
const totalMax=Math.floor(directorBudget/roleCost(useRole));
const eCount=Math.min(totalMax,eventAmbushEliteByWave(wv));
const mCount=Math.min(Math.max(0,totalMax-eCount),eventAmbushMinionsByWave(wv));
for(let i=0;i<eCount;i++){
 if(!spendDirector(useRole))break;
 const p=pts[i%pts.length];
 spawnE({x:p.x,y:p.y,role:useRole,etIndex,elite:wv>=8});
}
for(let i=0;i<mCount;i++){
 if(!spendDirector(useRole))break;
 const p=pts[i%pts.length];
 spawnE({x:clamp(p.x+rng(-55,55),20,worldW-20),y:clamp(p.y+rng(-55,55),20,worldH-20),role:useRole,etIndex,elite:false});
}
fTxt(P.x,P.y-46,'🎯 AMBUSH','#CE93D8',14);
}

function triggerDirectorEvent(ev){
if(!P||!ev||ev.fired)return;
ev.fired=true;
const role=ev.role||directorEventRole(wave);
const useRole=affordableEventRole(role);if(!useRole)return;
const etIndex=eventTypeIndexForRole(useRole);
if(ev.type==='CIRCLE')spawnCircleEvent(wave,ev.count,useRole,etIndex);
else if(ev.type==='STAMPEDE')spawnStampedeEvent(wave,ev.count,useRole,etIndex);
else spawnAmbushEvent(wave,useRole,etIndex);
}

function buildDirectorWave(wv){
wave=wv;
waveSpawned=0;waveTarget=0;spawnT=0;
directorWaveTime=0;directorAmbientT=0;
directorBudget=directorWaveBudget(wv);
directorEvents=buildDirectorEvents(wv);
if(wave%5===0)spawnBoss();
}

function pickArenaPos(minDist,maxDist){
if(!P)return{x:worldW/2,y:worldH/2};
for(let i=0;i<24;i++){
 const a=rng(0,PI2),d=rng(minDist,maxDist);
 const x=clamp(P.x+Math.cos(a)*d,60,worldW-60),y=clamp(P.y+Math.sin(a)*d,60,worldH-60);
 if(dst({x,y},P)>=minDist)return{x,y};
}
return{x:clamp(P.x+rng(-maxDist,maxDist),60,worldW-60),y:clamp(P.y+rng(-maxDist,maxDist),60,worldH-60)};
}

function spawnArenaHazard(){
const hc=BALANCE.arena.hazards,zc=hc.zapZone;
if(!P||arenaHazards.length>=hc.maxActive)return;
const p=pickArenaPos(hc.spawnMinDist,hc.spawnMaxDist);
arenaHazards.push({
 id:Math.random(),type:'zap_zone',x:p.x,y:p.y,r:zc.radius,state:'idle',t:0,life:zc.life,
 interval:zc.interval,warning:zc.warning,activeDur:zc.activeDuration,cooldown:zc.cooldown,damageE:zc.enemyDamage,damageP:zc.playerDamage,slowE:zc.enemySlow
});
}

function spawnArenaTool(){
const tc=BALANCE.arena.tools,bc=tc.barrel,cc=tc.coffee;
if(!P||arenaTools.length>=tc.maxActive)return;
const p=pickArenaPos(tc.spawnMinDist,tc.spawnMaxDist);
if(Math.random()<tc.barrelChance)arenaTools.push({id:Math.random(),type:'barrel',x:p.x,y:p.y,r:bc.radius,hp:bc.hp,maxHp:bc.hp,exploded:false});
else arenaTools.push({id:Math.random(),type:'coffee',x:p.x,y:p.y,r:cc.radius,cd:0,maxCd:cc.cooldown});
}

function explodeBarrel(b){
if(!b||b.exploded)return;
const bc=BALANCE.arena.tools.barrel;
b.exploded=true;cam.shake=Math.max(cam.shake,6);sfx('boom');
burst(b.x,b.y,16,'#FF7043',140,6,.45);
for(const e of enemies){
 if(e.hp<=0)continue;
 const d=dst(b,e);
 if(d<=bc.explosionRadius){
  hurtE(e,bc.enemyDamage,true);
  const a=ang(b,e),k=(1-d/bc.explosionRadius)*bc.knockback;
  e.x+=Math.cos(a)*k;e.y+=Math.sin(a)*k;
 }
}
if(P&&dst(b,P)<=bc.explosionRadius)pHurt(bc.playerDamage);
for(const t of arenaTools){if(t!==b&&t.type==='barrel'&&!t.exploded&&dst(b,t)<=bc.chainRadius)explodeBarrel(t)}
}

function damageBarrel(b,dmg){
if(!b||b.exploded)return;
b.hp-=Math.max(1,Math.floor(dmg||1));
if(b.hp<=0)explodeBarrel(b);
}

function pulseZapZone(h){
if(!h||!P)return;
burst(h.x,h.y,12,'#00E5FF',h.r*1.3,4,.35);sfx('freeze');
for(const e of enemies){
 if(e.hp<=0)continue;
 if(dst(h,e)<=h.r){hurtE(e,h.damageE,true);e.slowT=Math.max(e.slowT,h.slowE||0)}
}
if(dst(h,P)<=h.r)pHurt(h.damageP);
}

function tickArenaEvents(dt){
if(!P)return;
arenaHazSpawnT+=dt;
if(arenaHazSpawnT>=BALANCE.arena.hazards.spawnInterval){arenaHazSpawnT=0;spawnArenaHazard()}
arenaToolSpawnT+=dt;
if(arenaToolSpawnT>=BALANCE.arena.tools.spawnInterval){arenaToolSpawnT=0;spawnArenaTool()}

for(let i=arenaHazards.length-1;i>=0;i--){
 const h=arenaHazards[i];h.life-=dt;if(h.life<=0){arenaHazards.splice(i,1);continue}
 h.t+=dt;
 if(h.state==='idle'&&h.t>=h.interval){h.state='warning';h.t=0}
 else if(h.state==='warning'&&h.t>=h.warning){h.state='active';h.t=0;pulseZapZone(h)}
 else if(h.state==='active'&&h.t>=h.activeDur){h.state='cooldown';h.t=0}
 else if(h.state==='cooldown'&&h.t>=h.cooldown){h.state='idle';h.t=0}
}
for(let i=arenaTools.length-1;i>=0;i--){
 const t=arenaTools[i];
 if(t.type==='barrel'&&t.exploded){arenaTools.splice(i,1);continue}
 if(t.type==='coffee'){
  if(t.cd>0)t.cd=Math.max(0,t.cd-dt);
  if(t.cd<=0&&dst(t,P)<=t.r+P.sz){
   const heal=Math.max(1,Math.floor(P.mhp*BALANCE.arena.tools.coffee.healPercent));
   P.hp=Math.min(P.mhp,P.hp+heal);t.cd=t.maxCd;
   fTxt(P.x,P.y-24,'☕ +'+heal,'#66BB6A',15);sfx('power');
   if(waveT<=0)for(let i=0;i<BALANCE.arena.tools.coffee.enemySpawnOnUse;i++)spawnE();
  }
 }
}
}

function spawnObjective(){
if(!P||activeObjective||waveT>0||bossRef)return;
const oc=BALANCE.objectives;
if(wave<oc.minWave)return;
const roll=Math.random();
if(roll<.34){
 const hc=oc.hold,p=pickArenaPos(170,480);
 activeObjective={type:'hold',x:p.x,y:p.y,r:hc.radius,progress:0,target:hc.targetTime,decay:hc.decayPerSec};
 fTxt(p.x,p.y-24,'🛡️ Zone halten','#B2EBF2',16);
 return;
}
if(roll<.67){
 const hc=oc.hazard,p=pickArenaPos(250,760);
 activeObjective={type:'hazard',x:p.x,y:p.y,r:hc.radius,hp:hc.hp,mhp:hc.hp,timer:hc.duration,pulseT:0,pulseEvery:hc.pulseEvery,pulseR:hc.pulseRadius,pulseDmg:hc.pulseDamage};
 fTxt(p.x,p.y-26,'☢️ Quelle zerstören','#FF8A80',16);
 return;
}
const ec=oc.escort,p=pickArenaPos(260,700),ox=clamp(P.x+rng(-35,35),30,worldW-30),oy=clamp(P.y+rng(-35,35),30,worldH-30);
activeObjective={type:'escort',orbX:ox,orbY:oy,orbR:ec.orbRadius,machineX:p.x,machineY:p.y,machineR:ec.machineRadius,tether:ec.tetherDistance,startDist:Math.max(1,dst({x:ox,y:oy},{x:p.x,y:p.y}))};
fTxt(p.x,p.y-26,'⚡ Energie eskortieren','#FFE082',16);
}

function completeObjective(){
if(!P||!activeObjective)return;
const o=activeObjective,oc=BALANCE.objectives;
if(o.type==='hold'){
 coins+=oc.hold.rewardCoins;triggerCoinHudPulse();
 P.shieldT=Math.max(P.shieldT,oc.hold.rewardShield);
 fTxt(P.x,P.y-34,'✅ Zone gesichert','#80CBC4',16);sfx('coin');
}else if(o.type==='hazard'){
 coins+=oc.hazard.rewardCoins;triggerCoinHudPulse();addXP(oc.hazard.rewardXp);
 burst(o.x,o.y,18,'#80DEEA',170,6,.55);fTxt(o.x,o.y-26,'✅ Quelle zerstört','#80DEEA',16);sfx('lvl');
}else if(o.type==='escort'){
 const ec=oc.escort;
 coins+=ec.rewardCoins;triggerCoinHudPulse();
 burst(o.machineX,o.machineY,22,'#FFD54F',200,6,.55);
 for(const e of enemies){if(e.hp>0&&dst({x:o.machineX,y:o.machineY},e)<ec.rewardEmpRadius)hurtE(e,ec.rewardEmpDamage,true)}
 fTxt(o.machineX,o.machineY-24,'✅ Maschine online','#FFD54F',16);sfx('power');
}
activeObjective=null;objectiveSpawnT=0;
}

function failObjective(){
if(!activeObjective)return;
if(activeObjective.type==='hazard'){
 objectivePenaltyT=Math.max(objectivePenaltyT,BALANCE.objectives.penaltyDuration);
 fTxt(P.x,P.y-36,'❌ Quelle aktiv! Feinde schneller','#FF8A80',15);
}
activeObjective=null;objectiveSpawnT=0;
}

function tickObjectives(dt){
if(!P)return;
if(objectivePenaltyT>0)objectivePenaltyT=Math.max(0,objectivePenaltyT-dt);
if(!activeObjective){
 if(waveT>0)return; // no new objectives during break
 objectiveSpawnT+=dt;
 if(objectiveSpawnT>=BALANCE.objectives.spawnInterval){objectiveSpawnT=0;spawnObjective()}
 return;
}
const o=activeObjective;
if(o.type==='hold'){
 const inside=dst(P,o)<o.r+P.sz;
 o.progress=inside?Math.min(o.target,o.progress+dt):Math.max(0,o.progress-o.decay*dt);
 if(o.progress>=o.target)completeObjective();
 return;
}
if(o.type==='hazard'){
 o.timer=Math.max(0,o.timer-dt);o.pulseT+=dt;
 if(o.pulseT>=o.pulseEvery){
  o.pulseT=0;
  burst(o.x,o.y,10,'#FF5252',o.pulseR,4,.3);sfx('hurt');
  if(dst(P,o)<=o.pulseR)pHurt(o.pulseDmg);
 }
 if(o.hp<=0)completeObjective();
 else if(o.timer<=0)failObjective();
 return;
}
if(o.type==='escort'){
 const ec=BALANCE.objectives.escort,orb={x:o.orbX,y:o.orbY};
 if(dst(orb,P)<=o.tether){
  const a=ang(orb,P);
  o.orbX+=Math.cos(a)*ec.orbFollowSpeed*dt;
  o.orbY+=Math.sin(a)*ec.orbFollowSpeed*dt;
 }else{
  const ma=ang(orb,{x:o.machineX,y:o.machineY});
  o.orbX+=Math.cos(ma)*ec.targetApproachSpeed*.35*dt;
  o.orbY+=Math.sin(ma)*ec.targetApproachSpeed*.35*dt;
 }
 o.orbX=clamp(o.orbX,20,worldW-20);o.orbY=clamp(o.orbY,20,worldH-20);
 if(dst({x:o.orbX,y:o.orbY},{x:o.machineX,y:o.machineY})<=o.machineR)completeObjective();
}
}
