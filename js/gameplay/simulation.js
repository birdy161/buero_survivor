// Gameplay simulation module: per-frame update loop and runtime ticking.

function tickParticles(dt){
for(let i=parts.length-1;i>=0;i--){const p=parts[i];
 if(p.type==='t'&&p.txtFx==='dmg'){
  // Damage number motion: pop up, short hang, then drift down with gravity.
  p.vx*=.9;
  if((p.hang||0)>0){
   p.hang-=dt;
   p.vy*=Math.max(.2,1-dt*8);
  }else p.vy+=p.grav*dt;
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

function spawnBossZap(){
const zh=BALANCE.director.bossHazards?.zap;
if(!bossRef||!zh)return;
const x=clamp(bossRef.x+rng(-220,220),60,worldW-60);
const y=clamp(bossRef.y+rng(-220,220),60,worldH-60);
bossHazards.push({type:'boss_zap',x,y,r:zh.radius,state:'warning',t:0,warning:zh.warning,activeDur:zh.activeDuration,cooldown:zh.cooldown,dmg:zh.playerDamage});
}

function spawnBossLaser(){
const lh=BALANCE.director.bossHazards?.laser;
if(!bossRef||!lh)return;
bossHazards.push({type:'boss_laser',x:bossRef.x,y:bossRef.y,r:lh.radius,width:lh.width,a:rng(0,PI2),t:0,warn:lh.warning,dur:lh.duration,rot:lh.rotateSpeed,dmg:lh.tickDamage,hitT:0});
}

function tickBossHazards(dt){
if(!bossRef||bossRef.hp<=0){
 if(bossHazards.length)bossHazards.length=0;
 bossHazZapT=0;bossHazLaserT=0;
 return;
}
const bh=BALANCE.director.bossHazards||{};
const hpP=bossRef.hp/Math.max(1,bossRef.mhp);
if(bh.zap&&hpP<=0.7){
 bossHazZapT+=dt;
 if(bossHazZapT>=bh.zap.interval){bossHazZapT=0;spawnBossZap()}
}else if(hpP>0.7){
 bossHazZapT=0;
}
if(bh.laser&&hpP<=0.4){
 bossHazLaserT+=dt;
 if(bossHazLaserT>=bh.laser.interval){bossHazLaserT=0;spawnBossLaser()}
}else if(hpP>0.4){
 bossHazLaserT=0;
}
for(let i=bossHazards.length-1;i>=0;i--){
 const h=bossHazards[i];
 if(h.type==='boss_zap'){
  h.t+=dt;
  if(h.state==='warning'&&h.t>=h.warning){
   h.state='active';h.t=0;
   burst(h.x,h.y,10,'#B39DDB',h.r*1.2,4,.35);sfx('freeze');
   if(dst(P,h)<=h.r+P.sz)pHurt(h.dmg);
  }else if(h.state==='active'&&h.t>=h.activeDur){
   h.state='cooldown';h.t=0;
  }else if(h.state==='cooldown'&&h.t>=h.cooldown){
   bossHazards.splice(i,1);continue;
  }
 }else if(h.type==='boss_laser'){
  h.t+=dt;h.a+=h.rot*dt;h.x=bossRef.x;h.y=bossRef.y;
  if(h.t>=h.warn+h.dur){bossHazards.splice(i,1);continue}
  if(h.t>=h.warn){
   h.hitT=Math.max(0,(h.hitT||0)-dt);
   const dx=Math.cos(h.a),dy=Math.sin(h.a);
   const vx=P.x-h.x,vy=P.y-h.y;
   const t=clamp(vx*dx+vy*dy,0,h.r);
   const cx=h.x+dx*t,cy=h.y+dy*t;
   if(dst(P,{x:cx,y:cy})<=h.width+P.sz*.2&&h.hitT<=0){
    pHurt(h.dmg);h.hitT=.35;
   }
  }
 }
}
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
if(objectiveRewardT>0)objectiveRewardT=Math.max(0,objectiveRewardT-dt);
if(comboShield>0)comboShield-=dt;
if(comboSpdB>0)comboSpdB-=dt;
if(specCD>0)specCD-=dt;
if(P.regen>0)P.hp=Math.min(P.mhp,P.hp+P.regen*dt);
if(hasTemp('ergo'))P.hp=Math.min(P.mhp,P.hp+.7*dt);
tickTemps(dt);

// Combo timer
if(comboT>0){comboT-=dt*(hasTemp('poster')?.55:1);if(comboT<=0){combo=0;lastMS=0}}

if(!directorEvents.length&&waveT<=0)buildDirectorWave(Math.max(1,wave));
if(waveT>0){
 waveT=Math.max(0,waveT-dt);
 if(waveT<=0){sfx('lvl');buildDirectorWave(wave+1)}
}

if(waveT<=0){
 directorWaveTime+=dt;directorAmbientT+=dt;
 const ai=directorAmbientInterval(wave);
 if(directorAmbientT>=ai){
  directorAmbientT=0;
  const sp=rollAmbientSpecial();
  if(sp==='micromanager'){
   const role=(BALANCE.director.specialEnemies?.micromanager?.budgetRole)||'fast';
   if(directorBudget>=roleCost(role))spendDirector(role); // optional budget spend
   spawnE({special:'micromanager'});
  }else if(sp==='sniper'){
   const sn=BALANCE.director.specialEnemies?.sniper||{};
   const role=sn.budgetRole||'fast';
   if(directorBudget>=roleCost(role))spendDirector(role); // optional budget spend
   const p=pickArenaPos(sn.minRange||260,sn.maxRange||520);
   spawnE({special:'sniper',x:p.x,y:p.y});
  }else{
   const role=chooseRoleByMix(wave);
   if(spendDirector(role))spawnE({role});
  }
 }
 for(const ev of directorEvents){if(!ev.fired&&directorWaveTime>=ev.time)triggerDirectorEvent(ev)}
 const minCost=Math.min(roleCost('weak'),roleCost('fast'),roleCost('tank'));
 const eventsDone=directorEvents.every(ev=>ev.fired);
 if(directorBudget<minCost&&eventsDone&&enemies.length===0&&!bossRef){
  waveT=BALANCE.waves.breakDuration;
  fTxt(P.x,P.y-40,'☕ Kurze Pause','#80CBC4',16);
 }
 if(directorWaveTime>=BALANCE.director.waveDuration&&!bossRef){
  waveT=BALANCE.waves.breakDuration;
  fTxt(P.x,P.y-40,'☕ Kurze Pause','#80CBC4',16);
 }
}
tickObjectives(dt);
tickArenaEvents(dt);
tickPhotocopiers(dt);
tickBossHazards(dt);
applyMicromanagerBuffs();

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
    if(p.aoe>0){for(const e2 of enemies){if(e2!==e&&e2.hp>0&&dst(p,e2)<p.aoe)hurtE(e2,Math.floor(p.dmg*.5),true)}
     burst(p.x,p.y,6,p.col,p.aoe,4,.3)}
    if(p.pierce>0){p.pierce--;p.dmg=Math.floor(p.dmg*.85)}
    else if(p.mech!=='boomkb'){projs.splice(i,1);rm=true;break}}}
  if(rm)continue;
 }else if(dst(p,P)<P.sz+p.sz){
   if(hasTemp('firewall')){coins+=1;addXP(2);sfx('coin');projs.splice(i,1);continue}
   pHurt(p.dmg);projs.splice(i,1)
 }
}

// Ground effects (puddles)
for(let i=gfx.length-1;i>=0;i--){
 const g=gfx[i];g.t+=dt;if(g.t>=g.dur){gfx.splice(i,1);continue}
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
 if(e.spawnT>0){e.spawnT=Math.max(0,e.spawnT-dt);continue}

 let ms=e.spd;
 if(objectivePenaltyT>0)ms*=BALANCE.objectives.penaltyEnemySpeedMult;
 const isSniper=e.special==='sniper';
 if(e.freezeT>0){ms=0;e.freezeT-=dt;}
 else if(e.pinT>0){ms=0;e.pinT-=dt;}
 else if(e.slowT>0){ms*=.3;e.slowT-=dt;}
 if(e.fearT>0)e.fearT-=dt;
 if(hasTemp('jam')&&dst(P,e)<130){ms*=.2;if(Math.random()<dt*2)e.pinT=Math.max(e.pinT,.3)}

 const ea=ang(e,P),ed=dst(e,P);
 const rushing=e.rushT>0&&ms>0;
 if(rushing){
  e.rushT-=dt;
  e.x+=e.rushVX*dt;e.y+=e.rushVY*dt;
  e.x=clamp(e.x,20,worldW-20);e.y=clamp(e.y,20,worldH-20);
 }

 if(!rushing&&!isSniper&&e.charge&&!e.isBoss){
  e.chargeCD=(e.chargeCD||0)+dt;
  if(e.chargeCD>3&&ed<250&&ed>60&&ms>0){
   e.chargeT=.4;e.chargeCD=0;e.chA=ea;
   fTxt(e.x,e.y-e.sz-5,'⚡','#FF5252',14)}
  if(e.chargeT>0){e.chargeT-=dt;ms=e.spd*4;const ca=e.chA||ea;
   e.x+=Math.cos(ca)*ms*dt;e.y+=Math.sin(ca)*ms*dt}
  else{e.x+=Math.cos(ea)*ms*dt;e.y+=Math.sin(ea)*ms*dt}
 }else if(!rushing&&!isSniper&&ms>0){
  const ma=e.fearT>0?ea+PI:ea;
  e.x+=Math.cos(ma)*ms*dt;e.y+=Math.sin(ma)*ms*dt
 }
 if(isSniper&&ms>0){
  const sn=BALANCE.director.specialEnemies.sniper,sd=dst(e,P);
  if(sd<sn.minRange){e.x-=Math.cos(ea)*ms*dt;e.y-=Math.sin(ea)*ms*dt}
  else if(sd>sn.maxRange){e.x+=Math.cos(ea)*ms*.5*dt;e.y+=Math.sin(ea)*ms*.5*dt}
  e.x=clamp(e.x,20,worldW-20);e.y=clamp(e.y,20,worldH-20);
  if((e.snipeCharge||0)>0){
   e.snipeCharge-=dt;
   if(e.snipeCharge<=0){
    const aa=e.snipeA||ea;
    projs.push({x:e.x,y:e.y,vx:Math.cos(aa)*sn.projectileSpeed,vy:Math.sin(aa)*sn.projectileSpeed,dmg:e.dmg,col:'#FF1744',sz:6,life:2,own:'e',mech:'',pierce:0,aoe:0,trail:[]});
   }
  }else{
   e.snipeCd=(e.snipeCd||0)+dt;
   if(e.snipeCd>=sn.cooldown){e.snipeCd=0;e.snipeCharge=sn.chargeTime;e.snipeA=ea}
  }
 }
 for(const t of arenaTools){
  if(t.type==='barrel'&&!t.exploded&&dst(e,t)<e.sz+t.r){explodeBarrel(t);break}
 }

 if(ed<P.sz+e.sz){
  if(hasTemp('leave')||hasTemp('drift')){
   const ka=ang(P,e);e.x+=Math.cos(ka)*50;e.y+=Math.sin(ka)*50;
   if(hasTemp('drift'))hurtE(e,Math.floor(P.bdmg*.25),true);
  }else pHurt(e.dmg);
 }

 if(e.ranged&&ms>0&&!isSniper){e.atkT=(e.atkT||0)+dt;if(e.atkT>1.2){e.atkT=0;
  projs.push({x:e.x,y:e.y,vx:Math.cos(ea)*200,vy:Math.sin(ea)*200,dmg:e.dmg,col:'#fff',sz:4,life:2,own:'e',mech:'',pierce:0,aoe:0,trail:[]})}}

 if(e.aura&&ed<e.aura&&ms>0)pHurt(Math.ceil(e.dmg*.4*dt));

 if(e.isBoss){e.atkT=(e.atkT||0)+dt;
  if(e.atkT>1.5){e.atkT=0;
   const r=Math.random();
   if(r<.35){
    for(let f=0;f<8;f++){const fa=f*(PI2/8);
     projs.push({x:e.x,y:e.y,vx:Math.cos(fa)*200,vy:Math.sin(fa)*200,dmg:e.dmg,col:'#FF5722',sz:6,life:2,own:'e',mech:'',pierce:0,aoe:0,trail:[]})}sfx('boom')}
   else if(r<.55){for(let s=0;s<4+Math.floor(wave*.3);s++)spawnE()}
   else if(r<.75){e.chargeT=.6;e.chA=ea;e.charge=true;sfx('boss')}
   else{
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
  pickups.splice(i,1)}
}

// Particles
 tickParticles(dt);
 tickCamera(dt);
 runSaveTimer+=dt;
 if(runSaveTimer>=1){runSaveTimer=0;saveRunNow()}
}
