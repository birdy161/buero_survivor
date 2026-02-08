// Gameplay progression module: combo mechanics, leveling, and upgrade selection/application.

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

function addXP(v){if(!P)return;P.xp+=v;while(P.xp>=P.xpN){P.xp-=P.xpN;P.lv++;
P.xpN=Math.floor(P.xpN*1.28+15);sfx('lvl');burst(P.x,P.y,18,'#FFD740',120,5,.5);
state='upgrade';makeUC();saveRunNow()}}

function comboDmg(){const b=1+Math.min(combo*.015,1);return hasTemp('poster')?b*2:b} // +1.5% per combo, max +100%
function comboXp(){return 1+Math.min(combo*.012,0.8)} // +1.2% per combo, max +80%
function comboSpd(){return comboSpdB>0?.25:Math.min(combo*.008,.3)} // max +30%

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
