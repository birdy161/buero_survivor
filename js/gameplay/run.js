// Gameplay run module: start/reset flow and run persistence snapshots.

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
cam={x:P.x-VW/2,y:P.y-VH/2,shake:0};state='playing';runSaveTimer=0;pendingGameOverT=0;timeScale=1;timeScaleT=0;impactFlash=0;
save.games++;save.run=null;doS();
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
try{
const num=(v,d)=>{v=Number(v);return Number.isFinite(v)?v:d};
const chId=Number.isInteger(r.P.chId)?r.P.chId:0;
const ch=CHARS[chId]||CHARS[0];
selChar=Number.isInteger(r.selChar)?clamp(r.selChar,0,CHARS.length-1):ch.id;
P={x:num(r.P.x,worldW/2),y:num(r.P.y,worldH/2),hp:num(r.P.hp,ch.hp),mhp:Math.max(1,num(r.P.mhp,ch.hp)),spd:Math.max(1,num(r.P.spd,ch.spd)),
bdmg:Math.max(1,num(r.P.bdmg,ch.dmg)),dmgM:Math.max(.1,num(r.P.dmgM,1)),atkSpd:Math.max(.1,num(r.P.atkSpd,1)),spdM:Math.max(.1,num(r.P.spdM,1)),
armor:Math.max(0,num(r.P.armor,0)),regen:Math.max(0,num(r.P.regen,0)),magnet:Math.max(10,num(r.P.magnet,45)),crit:clamp(num(r.P.crit,.05),0,1),
proj:Math.max(0,Math.floor(num(r.P.proj,0))),xpM:Math.max(.1,num(r.P.xpM,1)),lv:Math.max(1,Math.floor(num(r.P.lv,1))),xp:Math.max(0,num(r.P.xp,0)),
xpN:Math.max(1,num(r.P.xpN,25)),weps:[],ch,sz:Math.max(8,num(r.P.sz,15)),invT:Math.max(0,num(r.P.invT,0)),
facing:r.P.facing&&Number.isFinite(r.P.facing.x)&&Number.isFinite(r.P.facing.y)?r.P.facing:{x:1,y:0},shieldT:Math.max(0,num(r.P.shieldT,0))};
P.hp=clamp(P.hp,0,P.mhp);
P.weps=(r.P.weps||[]).map(w=>{if(!WP[w.id])return null;return {...WP[w.id],id:w.id,timer:num(w.timer,0),lv:Math.max(1,Math.floor(num(w.lv,1))),shotCount:Math.max(0,Math.floor(num(w.shotCount,0)))}}).filter(Boolean);
if(!P.weps.length){const wd=WP[ch.wep];P.weps.push({...wd,id:ch.wep,timer:0,lv:1,shotCount:0})}
gameTime=Math.max(0,num(r.gameTime,0));kills=Math.max(0,Math.floor(num(r.kills,0)));coins=Math.max(0,Math.floor(num(r.coins,0)));wave=Math.max(1,Math.floor(num(r.wave,1)));
waveT=Math.max(0,num(r.waveT,0));spawnT=Math.max(0,num(r.spawnT,0));
combo=Math.max(0,Math.floor(num(r.combo,0)));comboT=Math.max(0,num(r.comboT,0));lastMS=Math.max(0,Math.floor(num(r.lastMS,0)));
comboSpdB=Math.max(0,num(r.comboSpdB,0));comboShield=Math.max(0,num(r.comboShield,0));
activeTemps=r.activeTemps||{};tempData=r.tempData||{};normalizeTempState();
specCD=Math.max(0,num(r.specCD,0));bossRef=null;upChoices=[];wepState={clicks:0};hitTracker={};enemies=[];projs=[];pickups=[];parts=[];gfx=[];
cam={x:P.x-VW/2,y:P.y-VH/2,shake:0};state='pause';runSaveTimer=0;pendingGameOverT=0;timeScale=1;timeScaleT=0;impactFlash=0;
}catch(e){
 clearRunSave();
 state='menu';P=null;enemies=[];projs=[];pickups=[];parts=[];gfx=[];inputDir={x:0,y:0};joyAct=false;joyId=null;
}
}
