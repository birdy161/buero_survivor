// Gameplay simulation module: spawning and per-frame update loop.

function spawnE(){
if(!P)return;const a=rng(0,PI2),d=Math.max(VW,VH)*.55+rng(30,120);
const sx=P.x+Math.cos(a)*d,sy=P.y+Math.sin(a)*d;
const mx=Math.min(2+Math.floor(wave*0.7),ET.length); // unlocks types FASTER
const et=ET[rngI(0,mx-1)];
const sc=1+wave*.18; // HP scales 18% per wave (was 12%)
const spdSc=1+wave*.04; // Speed also scales!
const dmgSc=1+wave*.1; // DMG scales 10% per wave
// ELITE chance: 15% from wave 3, 30% from wave 7
const isElite=wave>=3&&Math.random()<(wave>=7?.3:.15);
const em=isElite?2.5:1, esm=isElite?1.3:1, edm=isElite?1.5:1;
enemies.push({...et,x:sx,y:sy,
hp:Math.floor(et.hp*sc*em),mhp:Math.floor(et.hp*sc*em),
spd:et.spd*spdSc*esm,dmg:Math.floor(et.dmg*dmgSc*edm),
xp:Math.floor(et.xp*(1+wave*.05)*(isElite?2:1)),
co:et.co*(isElite?3:1),flash:0,slowT:0,freezeT:0,pinT:0,
atkT:0,isBoss:false,elite:isElite,infected:false,
chargeT:0,chargeCD:0,uid:Math.random()
});
}

function spawnBoss(){
if(bossRef||!P)return;const bi=clamp(Math.floor((wave-5)/5),0,BT.length-1);
const bt={...BT[bi]},sc=1+wave*.22;
bt.hp=Math.floor(bt.hp*sc);bt.mhp=bt.hp;bt.dmg=Math.floor(bt.dmg*(1+wave*.1));
bt.xp=Math.floor(bt.xp*(1+wave*.08));
const a=rng(0,PI2);bt.x=P.x+Math.cos(a)*350;bt.y=P.y+Math.sin(a)*350;
bt.flash=0;bt.slowT=0;bt.freezeT=0;bt.pinT=0;bt.atkT=0;bt.isBoss=true;
bt.elite=false;bt.infected=false;bt.chargeT=0;bt.chargeCD=0;bt.uid=Math.random();
bossRef=bt;enemies.push(bt);sfx('boss');
}

function waveEnemyTarget(wv){
const wc=BALANCE.waves;
return Math.max(1,Math.floor(wc.baseEnemyCount+wv*wc.perWaveEnemyCount));
}

function beginWave(wv){
if(!P)return;
wave=wv;
waveSpawned=0;
waveTarget=waveEnemyTarget(wv);
spawnT=0;
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
if(waveT>0){activeObjective=null;objectiveSpawnT=0;return}
if(!activeObjective){
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

function tickParticles(dt){
for(let i=parts.length-1;i>=0;i--){const p=parts[i];
 if(p.type==='t'&&p.txtFx==='dmg'){
  // Damage number motion: pop up, short hang, then drift down with gravity.
  p.vx*=.9;
  if((p.hang||0)>0){
   p.hang-=dt;
   p.vy*=Math.max(.2,1-dt*8);
  }else{
   p.vy+=p.grav*dt;
  }
  p.x+=p.vx*dt;p.y+=p.vy*dt;
 }else{
  p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.type==='c')p.vy+=200*dt;p.vx*=.97;
 }
 p.life-=dt;
 if(p.life<=0)parts.splice(i,1)}
}

function tickCamera(dt){
cam.x=lerp(cam.x,P.x-VW/2,6*dt);cam.y=lerp(cam.y,P.y-VH/2,6*dt);
if(cam.shake>.5)cam.shake*=.88;else cam.shake=0;
}

function update(dt){
if(state!=='playing'||!P)return;
gameTime+=dt;getKI();
tickCoinHudPulse(dt);
if(pendingGameOverT>0){
 pendingGameOverT-=dt;
 tickParticles(dt);
 tickCamera(dt);
 if(pendingGameOverT<=0){P.hp=0;gameOver()}
 return;
}

// Movement (with combo speed bonus)
const spd=P.spd*P.spdM*(1+comboSpd()+getMoveSpeedBonus());
P.x+=inputDir.x*spd*dt;P.y+=inputDir.y*spd*dt;
P.x=clamp(P.x,20,worldW-20);P.y=clamp(P.y,20,worldH-20);
if(inputDir.x||inputDir.y)P.facing={x:inputDir.x,y:inputDir.y};

if(P.invT>0)P.invT-=dt;
if(P.shieldT>0)P.shieldT-=dt;
if(comboShield>0)comboShield-=dt;
if(comboSpdB>0)comboSpdB-=dt;
if(specCD>0)specCD-=dt;
if(P.regen>0)P.hp=Math.min(P.mhp,P.hp+P.regen*dt);
if(hasTemp('ergo'))P.hp=Math.min(P.mhp,P.hp+.7*dt);
tickTemps(dt);

// Combo timer
if(comboT>0){comboT-=dt*(hasTemp('poster')?.55:1);if(comboT<=0){combo=0;lastMS=0}}

if(waveTarget<=0&&waveT<=0)beginWave(Math.max(1,wave));
if(waveT>0){
 waveT=Math.max(0,waveT-dt);
 if(waveT<=0){sfx('lvl');beginWave(wave+1)}
}

if(waveT<=0){
 const wc=BALANCE.waves;
 const sr=Math.max(wc.spawnIntervalMin,wc.spawnIntervalBase-wave*wc.spawnIntervalWaveScale);
 spawnT+=dt;
 if(spawnT>=sr&&enemies.length<wc.maxAliveBase+wave*wc.maxAlivePerWave&&waveSpawned<waveTarget){
  spawnT=0;
  const batch=Math.min(wc.spawnBatchBase+Math.floor(wave*wc.spawnBatchWaveScale),wc.spawnBatchMax);
  const cnt=Math.min(batch,waveTarget-waveSpawned);
  for(let i=0;i<cnt;i++){spawnE();waveSpawned++}
 }
 if(waveSpawned>=waveTarget&&enemies.length===0&&!bossRef){
  waveTarget=0;waveT=BALANCE.waves.breakDuration;
  fTxt(P.x,P.y-40,'☕ Kurze Pause','#80CBC4',16);
 }
}
tickObjectives(dt);
tickArenaEvents(dt);

// Fire weapons
P.weps.forEach(w=>{w.timer=(w.timer||0)-dt;
 if(w.timer<=0){w.timer=(w.rt||.4)/(1+P.atkSpd*.3+getAtkSpeedBonus());fireW(w)}});

// Projectiles
for(let i=projs.length-1;i>=0;i--){
 const p=projs[i];
 if(!Array.isArray(p.trail))p.trail=[];
 p.trail.push({x:p.x,y:p.y});
 if(p.trail.length>5)p.trail.shift();
 // Boomerang return
 if(p.mech==='boomkb'){p.retT+=dt;if(p.retT>.4){const a=ang(p,P);p.vx=Math.cos(a)*350;p.vy=Math.sin(a)*350;
  if(dst(p,P)<25){projs.splice(i,1);continue}}}
 p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
 if(p.life<=0){projs.splice(i,1);continue}
 if(activeObjective&&activeObjective.type==='hazard'&&p.own==='p'){
  const o=activeObjective;
  if(dst(p,o)<o.r+p.sz){
   o.hp=Math.max(0,o.hp-Math.max(1,Math.floor(p.dmg)));
   burst(p.x,p.y,3,'#80DEEA',45,3,.18);
   if(p.mech!=='boomkb'){projs.splice(i,1);continue}
  }
 }
 let hitTool=false;
 for(const t of arenaTools){
  if(t.type!=='barrel'||t.exploded)continue;
  if(dst(p,t)<t.r+p.sz){
   damageBarrel(t,p.dmg);
   if(p.mech!=='boomkb'){projs.splice(i,1);hitTool=true}
   break;
  }
 }
 if(hitTool)continue;
 if(p.own==='p'){let rm=false;
  for(let j=enemies.length-1;j>=0;j--){const e=enemies[j];if(e.hp<=0)continue;
   if(dst(p,e)<e.sz+p.sz){
    hurtE(e,p.dmg);onHit(p,e);trySynergy(p,e); // Apply weapon mechanic + synergies
    // AOE damage
    if(p.aoe>0){for(const e2 of enemies){if(e2!==e&&e2.hp>0&&dst(p,e2)<p.aoe)hurtE(e2,Math.floor(p.dmg*.5),true)}
     burst(p.x,p.y,6,p.col,p.aoe,4,.3)}
    if(p.pierce>0){p.pierce--;p.dmg=Math.floor(p.dmg*.85)}
    else if(p.mech!=='boomkb'){projs.splice(i,1);rm=true;break}}}
  if(rm)continue;
 }else{if(dst(p,P)<P.sz+p.sz){
   if(hasTemp('firewall')){coins+=1;addXP(2);sfx('coin');projs.splice(i,1);continue}
   pHurt(p.dmg);projs.splice(i,1)}}
}

// Ground effects (puddles)
for(let i=gfx.length-1;i>=0;i--){
 const g=gfx[i];g.t+=dt;if(g.t>=g.dur){gfx.splice(i,1);continue}
 // Damage & slow enemies in puddle
 for(const e of enemies){if(e.hp<=0)continue;
  if(dst({x:g.x,y:g.y},e)<g.r+e.sz){
   if(Math.random()<dt*3)hurtE(e,Math.ceil(g.dps*dt*3),true);
   e.slowT=Math.max(e.slowT,.3)}}}

// Enemies
for(let i=enemies.length-1;i>=0;i--){
 const e=enemies[i];if(e.hp<=0){enemies.splice(i,1);continue}
 if(e.flash>0)e.flash-=dt;
 if(e.wetT>0)e.wetT=Math.max(0,e.wetT-dt);
 if(e.oilT>0)e.oilT=Math.max(0,e.oilT-dt);
 if(e.burnT>0)e.burnT=Math.max(0,e.burnT-dt);
 if(e.synCD>0)e.synCD=Math.max(0,e.synCD-dt);

 // Movement (with freeze/pin/slow)
 let ms=e.spd;
 if(objectivePenaltyT>0)ms*=BALANCE.objectives.penaltyEnemySpeedMult;
 if(e.freezeT>0){ms=0;e.freezeT-=dt;} // Frozen = can't move
 else if(e.pinT>0){ms=0;e.pinT-=dt;} // Pinned = can't move
 else if(e.slowT>0){ms*=.3;e.slowT-=dt;} // Slowed
 if(e.fearT>0)e.fearT-=dt;
 if(hasTemp('jam')&&dst(P,e)<130){ms*=.2;if(Math.random()<dt*2)e.pinT=Math.max(e.pinT,.3)}

const ea=ang(e,P),ed=dst(e,P);

 // Charge attack (Deadline, Wütender Kunde)
 if(e.charge&&!e.isBoss){
  e.chargeCD=(e.chargeCD||0)+dt;
  if(e.chargeCD>3&&ed<250&&ed>60&&ms>0){
   e.chargeT=.4;e.chargeCD=0;e.chA=ea; // Lock angle and sprint
   fTxt(e.x,e.y-e.sz-5,'⚡','#FF5252',14)}
  if(e.chargeT>0){e.chargeT-=dt;ms=e.spd*4;const ca=e.chA||ea;
   e.x+=Math.cos(ca)*ms*dt;e.y+=Math.sin(ca)*ms*dt}
  else{e.x+=Math.cos(ea)*ms*dt;e.y+=Math.sin(ea)*ms*dt}
 }else if(ms>0){
  const ma=e.fearT>0?ea+PI:ea;
  e.x+=Math.cos(ma)*ms*dt;e.y+=Math.sin(ma)*ms*dt
 }
 for(const t of arenaTools){
  if(t.type==='barrel'&&!t.exploded&&dst(e,t)<e.sz+t.r){explodeBarrel(t);break}
 }

 // Contact damage
 if(ed<P.sz+e.sz){
  if(hasTemp('leave')||hasTemp('drift')){
   const ka=ang(P,e);e.x+=Math.cos(ka)*50;e.y+=Math.sin(ka)*50;
   if(hasTemp('drift'))hurtE(e,Math.floor(P.bdmg*.25),true);
  }else pHurt(e.dmg);
 }

 // Ranged (Drucker)
 if(e.ranged&&ms>0){e.atkT=(e.atkT||0)+dt;if(e.atkT>1.2){e.atkT=0;
  projs.push({x:e.x,y:e.y,vx:Math.cos(ea)*200,vy:Math.sin(ea)*200,dmg:e.dmg,col:'#fff',sz:4,life:2,own:'e',mech:'',pierce:0,aoe:0,trail:[]})}}

 // Aura (PPT, Zoom)
 if(e.aura&&ed<e.aura&&ms>0)pHurt(Math.ceil(e.dmg*.4*dt));

 // Boss attacks — MORE aggressive!
 if(e.isBoss){e.atkT=(e.atkT||0)+dt;
  if(e.atkT>1.5){e.atkT=0; // Attack every 1.5s (was 2s)
   const r=Math.random();
   if(r<.35){// Burst shot
    for(let f=0;f<8;f++){const fa=f*(PI2/8);
     projs.push({x:e.x,y:e.y,vx:Math.cos(fa)*200,vy:Math.sin(fa)*200,dmg:e.dmg,col:'#FF5722',sz:6,life:2,own:'e',mech:'',pierce:0,aoe:0,trail:[]})}sfx('boom')}
   else if(r<.55){// Spawn minions
    for(let s=0;s<4+Math.floor(wave*.3);s++)spawnE()}
   else if(r<.75){// Charge at player
    e.chargeT=.6;e.chA=ea;e.charge=true;sfx('boss')}
   else{// Aimed triple shot
    for(let f=-1;f<=1;f++){const fa=ea+f*.3;
     projs.push({x:e.x,y:e.y,vx:Math.cos(fa)*250,vy:Math.sin(fa)*250,dmg:Math.floor(e.dmg*1.2),col:'#FF1744',sz:7,life:2,own:'e',mech:'',pierce:0,aoe:0,trail:[]})}
   }
  }
 }
}

// Pickups
for(let i=pickups.length-1;i>=0;i--){
 const p=pickups[i];p.life-=dt;if(p.life<=0){pickups.splice(i,1);continue}
 const d=dst(p,P);
 if(d<P.magnet){
  const a=ang(p,P),mc=BALANCE.magnet,s=Math.max(mc.pullMinSpeed,mc.pullBaseSpeed-d*mc.pullDistanceFactor);
  p.x+=Math.cos(a)*s*dt;p.y+=Math.sin(a)*s*dt
 }
 if(d<22){
  if(p.type==='xp'){addXP(p.val);sfx('xp')}
  else if(p.type==='coin'){coins+=p.val;triggerCoinHudPulse();sfx('coin')}
  else if(p.type==='hp'){P.hp=Math.min(P.mhp,P.hp+p.val);fTxt(P.x,P.y-20,'+'+p.val,'#4CAF50',16);sfx('xp')}
  else if(p.type==='temp'){const t=TEMP_BY_ID[p.id];if(t){addTemp(t.id,t.dur);sfx('power')}}
  pickups.splice(i,1)}}

// Particles
tickParticles(dt);

tickCamera(dt);
runSaveTimer+=dt;
if(runSaveTimer>=1){runSaveTimer=0;saveRunNow()}
}
