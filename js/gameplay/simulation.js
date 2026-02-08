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

// Waves — 25s per wave (faster!)
waveT+=dt;if(waveT>=25){waveT=0;wave++;sfx('lvl');if(wave%5===0)spawnBoss()}

// Spawn — MUCH faster spawning!
const sr=Math.max(.12,1.4-wave*.12); // Gets fast quick!
spawnT+=dt;
if(spawnT>=sr&&enemies.length<50+wave*5){spawnT=0;
 const cnt=Math.min(1+Math.floor(wave*.5),6); // More enemies per spawn
 for(let i=0;i<cnt;i++)spawnE()}

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
 if(d<P.magnet){const a=ang(p,P),s=Math.max(380,760-d*4.2);p.x+=Math.cos(a)*s*dt;p.y+=Math.sin(a)*s*dt}
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
