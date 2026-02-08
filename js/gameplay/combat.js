// Gameplay combat module: weapon firing, damage handling, kill resolution, and specials.

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
