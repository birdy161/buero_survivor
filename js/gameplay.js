// Gameplay module: run lifecycle, combat systems, progression, and per-frame simulation.
function startGame(){
const ch=CHARS[selChar],su=save.up;
P={x:worldW/2,y:worldH/2,hp:ch.hp+su.hp*10,mhp:ch.hp+su.hp*10,
spd:ch.spd*(1+su.spd*.05),bdmg:ch.dmg*(1+su.dmg*.05),
dmgM:1,atkSpd:1,spdM:1,armor:su.armor,regen:ch.id===4?.5:0,
magnet:45,crit:.05,proj:0,xpM:1+su.xp*.1,
lv:1,xp:0,xpN:25,weps:[],ch,sz:15,invT:0,facing:{x:1,y:0},shieldT:0};
const wd=WP[ch.wep];P.weps.push({...wd,id:ch.wep,timer:0,lv:1,shotCount:0});
enemies=[];projs=[];pickups=[];parts=[];gfx=[];
gameTime=0;kills=0;coins=0;wave=1;waveT=0;spawnT=0;
combo=0;comboT=0;lastMS=0;comboSpdB=0;comboShield=0;
bossRef=null;specCD=0;upChoices=[];wepState={clicks:0};hitTracker={};
activeTemps={};tempData={};
cam={x:P.x-VW/2,y:P.y-VH/2,shake:0};state='playing';runSaveTimer=0;
save.games++;save.run=null;doS();
}

function hasTemp(id){return (activeTemps[id]||0)>0}
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

function saveRunNow(){
if(!P||state==='menu'||state==='charsel'||state==='shop'||state==='stats'||state==='gameover')return;
save.run={
v:1,selChar,state:'pause',
gameTime,kills,coins,wave,waveT,spawnT,combo,comboT,lastMS,comboSpdB,comboShield,specCD,
activeTemps,tempData,
P:{
x:P.x,y:P.y,hp:P.hp,mhp:P.mhp,spd:P.spd,bdmg:P.bdmg,dmgM:P.dmgM,atkSpd:P.atkSpd,spdM:P.spdM,armor:P.armor,regen:P.regen,
magnet:P.magnet,crit:P.crit,proj:P.proj,xpM:P.xpM,lv:P.lv,xp:P.xp,xpN:P.xpN,sz:P.sz,invT:P.invT,shieldT:P.shieldT,
facing:P.facing,chId:P.ch?.id||0,weps:(P.weps||[]).map(w=>({id:w.id,timer:w.timer||0,lv:w.lv||1,shotCount:w.shotCount||0}))
}
};
doS();
}

function clearRunSave(){
if(save.run!==null){save.run=null;doS()}
}

function restoreRunIfAny(){
const r=save.run;
if(!r||!r.P)return;
const chId=Number.isInteger(r.P.chId)?r.P.chId:0;
const ch=CHARS[chId]||CHARS[0];
selChar=Number.isInteger(r.selChar)?clamp(r.selChar,0,CHARS.length-1):ch.id;
P={x:r.P.x,y:r.P.y,hp:r.P.hp,mhp:r.P.mhp,spd:r.P.spd,bdmg:r.P.bdmg,dmgM:r.P.dmgM,atkSpd:r.P.atkSpd,spdM:r.P.spdM,armor:r.P.armor,regen:r.P.regen,
magnet:r.P.magnet,crit:r.P.crit,proj:r.P.proj,xpM:r.P.xpM,lv:r.P.lv,xp:r.P.xp,xpN:r.P.xpN,weps:[],ch,sz:r.P.sz||15,invT:r.P.invT||0,
facing:r.P.facing||{x:1,y:0},shieldT:r.P.shieldT||0};
P.weps=(r.P.weps||[]).map(w=>{if(!WP[w.id])return null;return {...WP[w.id],id:w.id,timer:w.timer||0,lv:w.lv||1,shotCount:w.shotCount||0}}).filter(Boolean);
if(!P.weps.length){const wd=WP[ch.wep];P.weps.push({...wd,id:ch.wep,timer:0,lv:1,shotCount:0})}
gameTime=r.gameTime||0;kills=r.kills||0;coins=r.coins||0;wave=Math.max(1,r.wave||1);waveT=r.waveT||0;spawnT=r.spawnT||0;
combo=r.combo||0;comboT=r.comboT||0;lastMS=r.lastMS||0;comboSpdB=r.comboSpdB||0;comboShield=r.comboShield||0;
activeTemps=r.activeTemps||{};tempData=r.tempData||{};
specCD=r.specCD||0;bossRef=null;upChoices=[];wepState={clicks:0};hitTracker={};enemies=[];projs=[];pickups=[];parts=[];gfx=[];
cam={x:P.x-VW/2,y:P.y-VH/2,shake:0};state='pause';runSaveTimer=0;
}

// ═══════ COMBO LOGIC ═══════
function addCombo(){
combo++;comboT=2.5;
// Check milestones
for(const m of COMBO_M){
 if(combo===m.at){
  sfx('combo');fTxt(P.x,P.y-40,m.name,m.col,clamp(18+combo*.2,18,40));
  burst(P.x,P.y,15+combo*.3,m.col,100+combo,5,.5);
  coins+=m.co;
  if(m.heal>0)P.hp=Math.min(P.mhp,P.hp+P.mhp*m.heal);
  // Damage pulse — hurts all nearby enemies
  if(m.pulse>0){
   sfx('boom');cam.shake=Math.min(15,5+combo*.1);
   for(const e of enemies){if(e.hp>0&&dst(P,e)<m.pulse)hurtE(e,Math.floor(P.bdmg*P.dmgM*(1+combo*.03)),true)}
   burst(P.x,P.y,20,m.col,m.pulse,6,.4);
  }
  // Shield at 50+
  if(combo>=50)comboShield=3;
  // Speed boost at 35+
  if(combo>=35)comboSpdB=4;
  // Track best
  if(combo>save.bestCombo){save.bestCombo=combo;doS()}
  lastMS=combo;
 }
}
}

// ═══════ SPAWNING ═══════
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

// ═══════ FIRE WEAPONS ═══════
function fireW(w){
if(!P)return;
const cdmg=comboDmg(); // combo passive DMG
const dmg=Math.floor(w.dm*P.bdmg*P.dmgM*(1+getDamageBonus())*cdmg);
const shots=1+P.proj;
let near=null,nd=450;
for(const e of enemies){if(e.hp<=0)continue;const d=dst(P,e);if(d<nd){nd=d;near=e}}

w.shotCount=(w.shotCount||0)+1;

// === CHAIN LIGHTNING (Kabelsalat) ===
if(w.mech==='chain'){
 if(!near)return;sfx('shoot');
 let tgt=near,ch=[tgt];hurtE(tgt,dmg);
 for(let c=0;c<4;c++){let nt=null,nd2=160;
  for(const e of enemies){if(ch.includes(e)||e.hp<=0)continue;const d2=dst(tgt,e);if(d2<nd2){nd2=d2;nt=e}}
  if(!nt)break;
  for(let j=0;j<6;j++){const t2=j/6;addP(lerp(tgt.x,nt.x,t2)+rng(-10,10),lerp(tgt.y,nt.y,t2)+rng(-10,10),0,0,.12,w.col,3)}
  hurtE(nt,Math.floor(dmg*.8));ch.push(nt);tgt=nt}
 return;
}

// === CONE (Feuerlöscher) ===
if(w.mech==='cone'){
 if(!near)return;sfx('shoot');
 const fa=ang(P,near);
 for(const e of enemies){if(e.hp<=0)continue;const d2=dst(P,e),ea=ang(P,e);
  let ad=Math.abs(ea-fa);if(ad>PI)ad=PI2-ad;
  if(d2<160&&ad<.5){hurtE(e,dmg);e.slowT=Math.max(e.slowT,1.5);
   const ka=ang(P,e);e.x+=Math.cos(ka)*55;e.y+=Math.sin(ka)*55}}
 // Visual cone
 for(let i=0;i<12;i++){const ca=fa+rng(-.5,.5),cd=rng(30,140);
  addP(P.x+Math.cos(ca)*cd,P.y+Math.sin(ca)*cd,Math.cos(ca)*40,Math.sin(ca)*40,.3,w.col,rng(3,6))}
 return;
}

if(!near)return;sfx('shoot');

for(let s=0;s<shots;s++){
 const spread=(s-(shots-1)/2)*.2;
 const a=ang(P,near)+spread;
 const pr={x:P.x,y:P.y,vx:Math.cos(a)*(w.ps||300),vy:Math.sin(a)*(w.ps||300),
  dmg,col:w.col,sz:5,life:1.5,own:'p',mech:w.mech,wid:w.id,
  pierce:0,retT:0,aoe:0,sc:w.shotCount};

 // Weapon-specific projectile properties
 switch(w.mech){
  case'multi': // Mouse: every 4th = 3x + aoe
   if(w.shotCount%4===0){pr.dmg=dmg*3;pr.aoe=50;pr.sz=8}break;
  case'grease':pr.aoe=35;break; // Schnitzel
  case'wetfloor':pr.aoe=25;break; // Mopp
  case'infect':break; // Spritze
  case'goldrush':pr.pierce=99;break; // Megafon durchdringt alle
  case'pin':break; // Tacker
  case'burn':pr.aoe=40;break; // Heißer Kaffee
  case'freeze':break; // Kalter Kaffee
  case'boomkb':pr.pierce=5;pr.retT=0;break; // Bürostuhl boomerang
 }
 projs.push(pr);
}

if(hasTemp('staplerfury')&&near){
 for(let i=0;i<2;i++){
  const a=ang(P,near)+rng(-.28,.28);
  projs.push({x:P.x,y:P.y,vx:Math.cos(a)*420,vy:Math.sin(a)*420,dmg:Math.floor(dmg*.45),col:'#EF5350',sz:3,life:.7,own:'p',mech:'pin',wid:'stapler',pierce:0,retT:0,aoe:0});
 }
}
}

// ═══════ HURT ENEMY ═══════
function hurtE(e,dmg,noCrit){
if(!e||e.hp<=0||!P)return;
let cr=!noCrit&&Math.random()<P.crit,fd=cr?dmg*2:dmg;
if(hasTemp('vpn')){
 if(tempData.vpnFirst)cr=true;
 tempData.vpnFirst=false;
 delete activeTemps.vpn;
}
fd=cr?dmg*2:dmg;
// Frozen enemies take 2x damage!
if(e.freezeT>0)fd=Math.floor(fd*2);
e.hp-=fd;e.flash=.12;
fTxt(e.x,e.y-e.sz,(cr?'KRIT!':'')+fd,cr?'#FF5722':e.freezeT>0?'#00E5FF':'#FFD740',cr?20:15);
burst(e.x,e.y,2,e.elite?'#FFD700':'#fff',50,3,.15);sfx('hit');
if(e.hp<=0)killE(e);
}

// ═══════ ON-HIT EFFECTS (Weapon Mechanics) ═══════
function onHit(pr,e){
if(!P)return;
switch(pr.mech){
 case'stack':{ // Bleistift: 3 hits on same = burst
  const uid=''+e.uid;hitTracker[uid]=(hitTracker[uid]||0)+1;
  if(hitTracker[uid]>=3){hitTracker[uid]=0;hurtE(e,pr.dmg*2.5,true);
   fTxt(e.x,e.y-25,'📝 NOTIZ!','#FFD54F',18);burst(e.x,e.y,8,'#FFD54F',80,4,.3);sfx('boom')}
  break;}
 case'grease':{ // Schnitzel: grease puddle
  gfx.push({x:e.x,y:e.y,r:35,dps:12,dur:3,slow:.35,col:'#E65100',t:0});
  e.slowT=Math.max(e.slowT,.8);break;}
 case'wetfloor':{ // Mopp: knockback + wet floor
  const ka=ang(P,e);e.x+=Math.cos(ka)*35;e.y+=Math.sin(ka)*35;
  gfx.push({x:e.x,y:e.y,r:28,dps:3,dur:4,slow:.3,col:'#64B5F6',t:0});break;}
 case'infect':{ // Spritze: infect enemy
  e.infected=true;break;}
 case'goldrush':{ // Megafon: Bonus-Münze bei Treffer
  if(Math.random()<.25){pickups.push({x:e.x+rng(-8,8),y:e.y+rng(-8,8),type:'coin',val:1,life:12});sfx('coin')}
  break;}
 case'pin':{ // Tacker: pin in place
  e.pinT=Math.max(e.pinT,.5);break;}
 case'burn':{ // Heißer Kaffee: burning puddle
  gfx.push({x:e.x,y:e.y,r:30,dps:18,dur:2.5,slow:.65,col:'#4E342E',t:0});break;}
 case'freeze':{ // Kalter Kaffee: slow → double hit = freeze
  if(e.slowT>0){e.freezeT=2;e.slowT=0;fTxt(e.x,e.y-20,'❄️ FROZEN!','#00E5FF',16);
   burst(e.x,e.y,8,'#29B6F6',60,4,.3);sfx('freeze')}
  else e.slowT=Math.max(e.slowT,1.5);break;}
 case'boomkb':{ // Bürostuhl: knockback into others
  const ka=ang(P,e);e.x+=Math.cos(ka)*45;e.y+=Math.sin(ka)*45;
  // Check if knocked into another enemy
  for(const e2 of enemies){if(e2===e||e2.hp<=0)continue;
   if(dst(e,e2)<e.sz+e2.sz+10){hurtE(e2,Math.floor(pr.dmg*.6),true);
    fTxt(e2.x,e2.y-15,'💥CRASH!','#FFA726',14);burst(e2.x,e2.y,4,'#FFA726',50,3,.2)}}
  break;}
}
}

// ═══════ KILL ENEMY ═══════
function killE(e){
if(!P)return;e.hp=0;kills++;addCombo();
const cxp=comboXp(); // combo passive XP bonus
pickups.push({x:e.x,y:e.y,type:'xp',val:Math.floor(e.xp*P.xpM*cxp),life:15});
if(Math.random()<.3)pickups.push({x:e.x+rng(-10,10),y:e.y+rng(-10,10),type:'coin',val:e.co||1,life:15});
if(Math.random()<.03)pickups.push({x:e.x,y:e.y,type:'hp',val:Math.floor(P.mhp*.1),life:15});
if(hasTemp('expense'))for(let i=0;i<2;i++)pickups.push({x:e.x+rng(-14,14),y:e.y+rng(-14,14),type:'coin',val:1,life:10});
spawnTempPickup(e.x,e.y,e.isBoss?.35:.04);
burst(e.x,e.y,e.elite?15:8,e.elite?'#FFD700':'#aaa',100,5,.4);sfx('kill');

// INFECT chain explosion!
if(e.infected){
 sfx('boom');burst(e.x,e.y,12,'#F48FB1',120,6,.4);
 for(const e2 of enemies){if(e2===e||e2.hp<=0)continue;
  if(dst(e,e2)<80){hurtE(e2,Math.floor(P.bdmg*P.dmgM*1.5),true);e2.infected=true}}
}

if(e.isBoss){bossRef=null;burst(e.x,e.y,30,'#FFD700',180,8,.7);sfx('boom');cam.shake=15;
 for(let i=0;i<10;i++)pickups.push({x:e.x+rng(-50,50),y:e.y+rng(-50,50),type:'coin',val:Math.floor(e.co/10),life:15});
 spawnTempPickup(e.x,e.y,.9)}
// Clean hitTracker
delete hitTracker[''+e.uid];
}

function pHurt(d){
if(!P||P.invT>0||P.shieldT>0||comboShield>0)return;
if((tempData.bubbleCharges||0)>0){
 tempData.bubbleCharges--;P.invT=.15;
 burst(P.x,P.y,8,'#B3E5FC',90,4,.25);
 for(const e of enemies){if(e.hp>0&&dst(P,e)<90){const a=ang(P,e);e.x+=Math.cos(a)*35;e.y+=Math.sin(a)*35}}
 if(tempData.bubbleCharges<=0)delete activeTemps.bubble;
 return;
}
const fd=Math.max(1,d-(P.armor+getArmorBonus()));P.hp-=fd;P.invT=.4;
fTxt(P.x,P.y-20,'-'+fd,'#FF1744',18);burst(P.x,P.y,5,'#FF1744',80,4,.3);
sfx('hurt');cam.shake=5;
// Combo broken by damage!
if(combo>=5){fTxt(P.x,P.y-40,'COMBO LOST!','#FF5252',14);combo=0;comboT=0;lastMS=0}
if(P.hp<=0){P.hp=0;gameOver()}
}

function addXP(v){if(!P)return;P.xp+=v;while(P.xp>=P.xpN){P.xp-=P.xpN;P.lv++;
P.xpN=Math.floor(P.xpN*1.28+15);sfx('lvl');burst(P.x,P.y,18,'#FFD740',120,5,.5);
state='upgrade';makeUC();saveRunNow()}}

function comboDmg(){const b=1+Math.min(combo*.015,1);return hasTemp('poster')?b*2:b} // +1.5% per combo, max +100%
function comboXp(){return 1+Math.min(combo*.012,0.8)} // +1.2% per combo, max +80%
function comboSpd(){return comboSpdB>0?.25:Math.min(combo*.008,.3)} // max +30%

function useSpec(){
if(!P||state!=='playing'||specCD>0)return;
const ch=P.ch;specCD=ch.sCD;sfx('power');
switch(ch.spec){
 case'coffee':P.hp=Math.min(P.mhp,P.hp+Math.floor(P.mhp*.25));fTxt(P.x,P.y-30,'☕ KAFFEE!','#4CAF50',22);burst(P.x,P.y,12,'#795548',80,4,.4);break;
 case'reboot':P.hp=Math.min(P.mhp,P.hp+20);burst(P.x,P.y,15,'#2196F3',150,6,.5);
  enemies.forEach(e=>{if(e.hp>0&&dst(P,e)<130)hurtE(e,Math.floor(P.bdmg*3))});break;
 case'soup':burst(P.x,P.y,20,'#FF9800',120,5,.5);
  enemies.forEach(e=>{if(e.hp>0&&dst(P,e)<160)hurtE(e,Math.floor(P.bdmg*2))});
  gfx.push({x:P.x,y:P.y,r:100,dps:15,dur:4,slow:.5,col:'#E65100',t:0});break;
 case'sweep':enemies.forEach(e=>{if(e.hp>0&&dst(P,e)<180){const a=ang(P,e);e.x+=Math.cos(a)*90;e.y+=Math.sin(a)*90;hurtE(e,Math.floor(P.bdmg*1.5))}});
  gfx.push({x:P.x,y:P.y,r:80,dps:5,dur:5,slow:.4,col:'#64B5F6',t:0});burst(P.x,P.y,15,'#9C27B0',130,5,.5);break;
 case'immune':P.shieldT=5;burst(P.x,P.y,12,'#E91E63',80,4,.4);fTxt(P.x,P.y-30,'📋 KRANK!','#E91E63',18);break;
 case'nuke':enemies.forEach(e=>{if(e.hp>0)hurtE(e,Math.floor(P.bdmg*5))});burst(P.x,P.y,30,'#FFD700',200,8,.7);cam.shake=15;sfx('boom');fTxt(P.x,P.y-30,'📢 STREIK!','#FFD700',22);break;
}}

function gameOver(){state='gameover';save.totalKills+=kills;save.coins+=coins;
if(gameTime>save.bestTime)save.bestTime=gameTime;if(wave>save.bestWave)save.bestWave=wave;
if(kills>save.bestKills)save.bestKills=kills;if(combo>save.bestCombo)save.bestCombo=combo;clearRunSave();doS();sfx('boom')}

function makeUC(){if(!P)return;let pool=UPG.filter(u=>{if(u.t==='w')return!P.weps.find(w=>w.id===u.w);return true});
const lk=save.up.luck*.04;upChoices=[];
for(let i=0;i<3;i++){if(!pool.length)break;let f=pool;if(Math.random()<.25+lk)f=pool.filter(u=>u.r!=='common');
if(!f.length)f=pool;const idx=rngI(0,f.length-1);upChoices.push(f[idx]);pool=pool.filter(u=>u!==f[idx])}}

function pickUP(u){sfx('power');
if(u.t==='w'){const wd={...WP[u.w]};wd.id=u.w;wd.timer=0;wd.lv=1;wd.shotCount=0;P.weps.push(wd)}
else if(u.t==='s'){
 if(u.k==='mhp'){P.mhp+=u.v;P.hp=Math.min(P.mhp,P.hp+u.v)}
 else if(u.k==='dmg')P.dmgM+=u.v;else if(u.k==='spd')P.spdM+=u.v;
 else if(u.k==='atk')P.atkSpd+=u.v;else if(u.k==='arm')P.armor+=u.v;
 else if(u.k==='reg')P.regen+=u.v;else if(u.k==='mag')P.magnet+=u.v;
 else if(u.k==='crt')P.crit+=u.v;else if(u.k==='prj')P.proj+=u.v;
}else if(u.t==='i'){
 if(u.id==='heal')P.hp=P.mhp;
 else if(u.id==='bomb'){enemies.forEach(e=>{if(!e.isBoss&&e.hp>0)killE(e)});enemies=enemies.filter(e=>e.hp>0);sfx('boom');cam.shake=12}
 else if(u.id==='coins')coins+=50;
}
state='playing';upChoices=[]}

// ═══════════════════════════════════════
//  🔄 UPDATE
// ═══════════════════════════════════════
function update(dt){
if(state!=='playing'||!P)return;
gameTime+=dt;getKI();

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
 // Boomerang return
 if(p.mech==='boomkb'){p.retT+=dt;if(p.retT>.4){const a=ang(p,P);p.vx=Math.cos(a)*350;p.vy=Math.sin(a)*350;
  if(dst(p,P)<25){projs.splice(i,1);continue}}}
 p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
 if(p.life<=0){projs.splice(i,1);continue}
 if(p.own==='p'){let rm=false;
  for(let j=enemies.length-1;j>=0;j--){const e=enemies[j];if(e.hp<=0)continue;
   if(dst(p,e)<e.sz+p.sz){
    hurtE(e,p.dmg);onHit(p,e); // Apply weapon mechanic!
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
  projs.push({x:e.x,y:e.y,vx:Math.cos(ea)*200,vy:Math.sin(ea)*200,dmg:e.dmg,col:'#fff',sz:4,life:2,own:'e',mech:'',pierce:0,aoe:0})}}

 // Aura (PPT, Zoom)
 if(e.aura&&ed<e.aura&&ms>0)pHurt(Math.ceil(e.dmg*.4*dt));

 // Boss attacks — MORE aggressive!
 if(e.isBoss){e.atkT=(e.atkT||0)+dt;
  if(e.atkT>1.5){e.atkT=0; // Attack every 1.5s (was 2s)
   const r=Math.random();
   if(r<.35){// Burst shot
    for(let f=0;f<8;f++){const fa=f*(PI2/8);
     projs.push({x:e.x,y:e.y,vx:Math.cos(fa)*200,vy:Math.sin(fa)*200,dmg:e.dmg,col:'#FF5722',sz:6,life:2,own:'e',mech:'',pierce:0,aoe:0})}sfx('boom')}
   else if(r<.55){// Spawn minions
    for(let s=0;s<4+Math.floor(wave*.3);s++)spawnE()}
   else if(r<.75){// Charge at player
    e.chargeT=.6;e.chA=ea;e.charge=true;sfx('boss')}
   else{// Aimed triple shot
    for(let f=-1;f<=1;f++){const fa=ea+f*.3;
     projs.push({x:e.x,y:e.y,vx:Math.cos(fa)*250,vy:Math.sin(fa)*250,dmg:Math.floor(e.dmg*1.2),col:'#FF1744',sz:7,life:2,own:'e',mech:'',pierce:0,aoe:0})}
   }
  }
 }
}

// Pickups
for(let i=pickups.length-1;i>=0;i--){
 const p=pickups[i];p.life-=dt;if(p.life<=0){pickups.splice(i,1);continue}
 const d=dst(p,P);
 if(d<P.magnet){const a=ang(p,P),s=Math.max(250,500-d*3);p.x+=Math.cos(a)*s*dt;p.y+=Math.sin(a)*s*dt}
 if(d<22){
  if(p.type==='xp'){addXP(p.val);sfx('xp')}
  else if(p.type==='coin'){coins+=p.val;sfx('coin')}
  else if(p.type==='hp'){P.hp=Math.min(P.mhp,P.hp+p.val);fTxt(P.x,P.y-20,'+'+p.val,'#4CAF50',16);sfx('xp')}
  else if(p.type==='temp'){const t=TEMP_BY_ID[p.id];if(t){addTemp(t.id,t.dur);sfx('power')}}
  pickups.splice(i,1)}}

// Particles
for(let i=parts.length-1;i>=0;i--){const p=parts[i];
 p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.type==='c')p.vy+=200*dt;p.vx*=.97;p.life-=dt;
 if(p.life<=0)parts.splice(i,1)}

cam.x=lerp(cam.x,P.x-VW/2,6*dt);cam.y=lerp(cam.y,P.y-VH/2,6*dt);
if(cam.shake>.5)cam.shake*=.88;else cam.shake=0;
runSaveTimer+=dt;
if(runSaveTimer>=1){runSaveTimer=0;saveRunNow()}
}
