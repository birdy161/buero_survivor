// Render module: world rendering, HUD, and menu/panel screens.
function render(){
X.clearRect(0,0,VW,VH);
if(state==='menu'){rMenu();return}if(state==='charsel'){rCharSel();return}
if(state==='shop'){rShop();return}if(state==='stats'){rStats();return}
if(!P)return;rGame();
if(state==='upgrade')rUpg();if(state==='pause')rPause();if(state==='gameover')rGO();
}

function rGame(){
const cx=cam.x+(cam.shake>0?rng(-cam.shake,cam.shake):0);
const cy=cam.y+(cam.shake>0?rng(-cam.shake,cam.shake):0);

// BG
X.fillStyle=bgGrad||'#1f232b';X.fillRect(0,0,VW,VH);
// Paper flecks
for(const p of bgPapers){
 const sx=(p.x-cx*p.par)%VW,sy=(p.y-cy*p.par)%VH;
 X.globalAlpha=p.a;X.fillStyle='#4a5160';
 X.fillRect((sx+VW)%VW,(sy+VH)%VH,p.w,p.h);
}
// Fine paper grain
for(const g of bgGrain){
 X.globalAlpha=g.a;X.fillStyle='#5f6a7f';
 X.beginPath();X.arc(g.x,g.y,g.r,0,PI2);X.fill();
}
// Paper fibers
X.strokeStyle='rgba(148,166,196,.16)';
for(const f of bgFibers){
 X.globalAlpha=f.o;X.lineWidth=f.w;
 const x2=f.x+Math.cos(f.a)*f.l,y2=f.y+Math.sin(f.a)*f.l;
 X.beginPath();X.moveTo(f.x,f.y);X.lineTo(x2,y2);X.stroke();
}
X.globalAlpha=1;

// Grid
const gs=80;X.strokeStyle='rgba(164,182,212,.06)';X.lineWidth=1;
for(let gx=-(cx%gs);gx<VW+gs;gx+=gs){X.beginPath();X.moveTo(gx,0);X.lineTo(gx,VH);X.stroke()}
for(let gy=-(cy%gs);gy<VH+gs;gy+=gs){X.beginPath();X.moveTo(0,gy);X.lineTo(VW,gy);X.stroke()}

// Arena events (hazards + tools)
arenaHazards.forEach(h=>{
 const sx=h.x-cx,sy=h.y-cy;
 let sc='rgba(180,180,180,.2)',fc='rgba(180,180,180,.08)';
 if(h.state==='warning'){
  const blink=Math.sin(gameTime*16)>0?1:.45;
  sc=`rgba(255,214,80,${.35*blink})`;fc=`rgba(255,214,80,${.08*blink})`;
 }else if(h.state==='active'){sc='rgba(0,229,255,.85)';fc='rgba(0,229,255,.2)'}
 else if(h.state==='cooldown'){sc='rgba(120,160,180,.3)';fc='rgba(120,160,180,.08)'}
 X.fillStyle=fc;X.beginPath();X.arc(sx,sy,h.r,0,PI2);X.fill();
 X.strokeStyle=sc;X.lineWidth=2.4;X.beginPath();X.arc(sx,sy,h.r,0,PI2);X.stroke();
 if(h.state==='warning')dT('⚠️',sx,sy,13,'#FFD740');
 if(h.state==='active')dT('⚡',sx,sy,15,'#00E5FF');
});
arenaTools.forEach(t=>{
 const sx=t.x-cx,sy=t.y-cy;
 if(t.type==='barrel'){
  X.fillStyle='#8D4E2A';X.beginPath();X.arc(sx,sy,t.r,0,PI2);X.fill();
  X.strokeStyle='#D7A26A';X.lineWidth=2;X.stroke();
  const hp=(t.hp||0)/(t.maxHp||1);
  if(hp<.67){X.strokeStyle='rgba(255,255,255,.5)';X.lineWidth=1.2;X.beginPath();X.moveTo(sx-4,sy-2);X.lineTo(sx+3,sy+4);X.stroke()}
  if(hp<.34){X.beginPath();X.moveTo(sx+2,sy-5);X.lineTo(sx-5,sy+1);X.stroke()}
  dE('🛢️',sx,sy,14);
 }else if(t.type==='coffee'){
  const ready=t.cd<=0,col=ready?'#66BB6A':'#8a8f98';
  X.fillStyle='rgba(0,0,0,.28)';X.beginPath();X.arc(sx,sy,t.r+10,0,PI2);X.fill();
  X.strokeStyle=col;X.lineWidth=2.2;X.beginPath();X.arc(sx,sy,t.r+10,0,PI2);X.stroke();
  dE('☕',sx,sy,17);
  if(!ready)dT(Math.ceil(t.cd)+'s',sx,sy+t.r+18,8,'#bbb');
 }
});

// World border (visible when reaching map limits)
const wx=-cx,wy=-cy;
X.strokeStyle='rgba(255,215,64,.55)';X.lineWidth=4;
X.strokeRect(wx,wy,worldW,worldH);
X.strokeStyle='rgba(255,255,255,.2)';X.lineWidth=1;
X.strokeRect(wx+2,wy+2,worldW-4,worldH-4);

// Ground FX (puddles)
gfx.forEach(g=>{const sx=g.x-cx,sy=g.y-cy,a=1-g.t/g.dur;
 X.globalAlpha=a*.35;X.fillStyle=g.col;X.beginPath();X.arc(sx,sy,g.r,0,PI2);X.fill();
 X.globalAlpha=a*.15;X.fillStyle='#fff';X.beginPath();X.arc(sx,sy,g.r*.4,0,PI2);X.fill();
 X.globalAlpha=1});

// Pickups
pickups.forEach(p=>{const sx=p.x-cx,sy=p.y-cy,b=Math.sin(gameTime*5+p.x)*3;
 const py=sy+b;
 if(p.type==='xp')dE('🔹',sx,py,14);
 else if(p.type==='coin')dE('🪙',sx,py,14);
 else if(p.type==='hp')dE('💚',sx,py,14);
 else if(p.type==='temp'){
  const t=TEMP_BY_ID[p.id],col='#00E5FF';
  X.strokeStyle=col;X.lineWidth=2.2;
  X.beginPath();X.moveTo(sx,py-16);X.lineTo(sx-14,py+10);X.lineTo(sx+14,py+10);X.closePath();X.stroke();
  X.globalAlpha=.18;X.fillStyle=col;X.beginPath();X.moveTo(sx,py-16);X.lineTo(sx-14,py+10);X.lineTo(sx+14,py+10);X.closePath();X.fill();X.globalAlpha=1;
  dE(t?t.emoji:'✨',sx,py+1,15);
 }
});

// Enemies
enemies.forEach(e=>{if(e.hp<=0)return;const sx=e.x-cx,sy=e.y-cy;
 const emoY=sy+e.sz*.06; // optical centering for emoji glyph metrics
 X.fillStyle='rgba(0,0,0,.2)';X.beginPath();X.ellipse(sx,sy+e.sz*.6,e.sz*.7,e.sz*.25,0,0,PI2);X.fill();
 // Elite glow
 if(e.elite){X.globalAlpha=.2+Math.sin(gameTime*6)*.1;X.fillStyle='#FFD700';X.beginPath();X.arc(sx,sy,e.sz+6,0,PI2);X.fill();X.globalAlpha=1}
 // Freeze visual
 if(e.freezeT>0){X.fillStyle='rgba(0,200,255,.3)';X.beginPath();X.arc(sx,sy,e.sz+4,0,PI2);X.fill()}
 // Pin visual
 if(e.pinT>0){X.fillStyle='rgba(255,50,50,.25)';X.beginPath();X.arc(sx,sy,e.sz+3,0,PI2);X.fill()}
 // Body
 const eCol=e.flash>.01?'#fff':e.freezeT>0?'#88EEFF':e.slowT>0?'#88ccff':'#3a3a5a';
 X.fillStyle=eCol;X.beginPath();X.arc(sx,sy,e.sz,0,PI2);X.fill();
 X.globalAlpha=.18;X.fillStyle='#fff';X.beginPath();X.arc(sx-e.sz*.3,sy-e.sz*.35,e.sz*.45,0,PI2);X.fill();X.globalAlpha=1;
 X.strokeStyle=e.elite?'#FFD700':'rgba(255,255,255,.08)';X.lineWidth=e.elite?2:1;X.stroke();
 dE(e.emoji,sx,emoY,e.sz*1.3);
 // Infected marker
 if(e.infected){X.globalAlpha=.5+Math.sin(gameTime*8)*.3;dE('☣️',sx-e.sz*.7,sy-e.sz*.7,10);X.globalAlpha=1}
 // HP bar
 if(e.hp<e.mhp){const bw=e.sz*2;dBar(sx-bw/2,sy-e.sz-9,bw,4,e.hp/e.mhp,e.isBoss?'#FF5252':'#66BB6A')}
 if(e.isBoss)dE('👑',sx,sy-e.sz-16,18);
 // Status indicators (synergy readability)
 const sts=[];
 if(e.freezeT>0)sts.push('❄️');
 if(e.wetT>0)sts.push('💧');
 if(e.oilT>0)sts.push('🛢️');
 if(e.burnT>0)sts.push('🔥');
 if(sts.length)dT(sts.join(' '),sx,sy-e.sz-21,9,'#B3E5FC','center',true);
 // Aura
 if(e.aura){X.globalAlpha=.06+Math.sin(gameTime*3)*.03;X.fillStyle='#FF5722';X.beginPath();X.arc(sx,sy,e.aura,0,PI2);X.fill();X.globalAlpha=1}
});

// Projectiles
projs.forEach(p=>{const sx=p.x-cx,sy=p.y-cy;
 const tr=Array.isArray(p.trail)?p.trail:[];
 for(let i=0;i<tr.length;i++){
  const tp=tr[i],tx=tp.x-cx,ty=tp.y-cy;
  const t=(i+1)/(tr.length+1);
  X.globalAlpha=.08+.2*t;
  X.fillStyle=p.own==='e'?'#FF6A63':(p.col||'#fff');
  X.beginPath();X.arc(tx,ty,Math.max(1.2,p.sz*(.3+.45*t)),0,PI2);X.fill();
 }
 X.globalAlpha=1;
 if(p.own==='e'){
  const s=p.sz+1.5,col='#FF3B30';
  X.fillStyle=col;X.beginPath();
  X.moveTo(sx,sy-s);X.lineTo(sx+s,sy);X.lineTo(sx,sy+s);X.lineTo(sx-s,sy);X.closePath();X.fill();
  X.strokeStyle='#FFD9A3';X.lineWidth=1.6;X.stroke();
 }else{
  X.globalAlpha=.22;X.fillStyle=p.col||'#fff';X.beginPath();X.arc(sx,sy,p.sz*2.2,0,PI2);X.fill();X.globalAlpha=1;
  X.fillStyle=p.col||'#fff';X.beginPath();X.arc(sx,sy,p.sz,0,PI2);X.fill();
  X.strokeStyle=(p.col||'#fff')+'88';X.lineWidth=p.sz*.6;
  X.beginPath();X.moveTo(sx,sy);X.lineTo(sx-p.vx*.015,sy-p.vy*.015);X.stroke()
 }});

// Particles
parts.forEach(p=>{const sx=p.x-cx,sy=p.y-cy,a=clamp(p.life/p.ml,0,1);
 X.globalAlpha=a;
 if(p.type==='t')dT(p.text,sx,sy,p.size,p.color,'center',true);
 else{X.fillStyle=p.color;X.beginPath();X.arc(sx,sy,p.size*a,0,PI2);X.fill()}
 X.globalAlpha=1});

// Player
const px=P.x-cx,py=P.y-cy;
if(P.hp>0||pendingGameOverT>0){
 X.fillStyle='rgba(0,0,0,.25)';X.beginPath();X.ellipse(px,py+P.sz*.7,P.sz*.7,P.sz*.25,0,0,PI2);X.fill();
 // Shield/Combo shield
 if(P.shieldT>0||comboShield>0){
  const sc=P.shieldT>0?'rgba(233,30,99':'rgba(0,229,255';
  X.strokeStyle=sc+`,${.4+Math.sin(gameTime*8)*.2})`;X.lineWidth=3;
  X.beginPath();X.arc(px,py,P.sz+10,0,PI2);X.stroke()}
 const blink=P.invT>0&&Math.floor(P.invT*10)%2===0;
 if(!blink){X.fillStyle=P.ch.color;X.beginPath();X.arc(px,py,P.sz,0,PI2);X.fill();
  X.globalAlpha=.24;X.fillStyle='#fff';X.beginPath();X.arc(px-P.sz*.35,py-P.sz*.4,P.sz*.48,0,PI2);X.fill();X.globalAlpha=1;
  X.strokeStyle='rgba(255,255,255,.3)';X.lineWidth=2;X.stroke();
  dE(P.ch.emoji,px,py,P.sz*1.6)}}
if(hasTemp('drone')){
 const da=tempData.droneA||0,dx=px+Math.cos(da)*35,dy=py+Math.sin(da)*35;
 X.globalAlpha=.25;X.fillStyle='#80DEEA';X.beginPath();X.arc(dx,dy,12,0,PI2);X.fill();X.globalAlpha=1;
 dE('🤖',dx,dy,13);
}

// Vignette for contrast depth
if(vignetteGrad){X.fillStyle=vignetteGrad;X.fillRect(0,0,VW,VH)}
if(impactFlash>0){
 X.fillStyle=`rgba(255,255,255,${clamp(impactFlash,0,.75)})`;
 X.fillRect(0,0,VW,VH);
}

rHUD();
}

function rHUD(){
if(!P)return;
// HP
dBar(12,12,clamp(VW*.28,80,180),14,P.hp/P.mhp,'#EF5350','rgba(0,0,0,.5)');
dT(`${Math.ceil(P.hp)}/${P.mhp}`,12+clamp(VW*.14,40,90),19,9,'#fff','center',true);
// XP
dBar(12,VH-18,VW-24,8,P.xp/P.xpN,'#42A5F5','rgba(0,0,0,.4)');
// Level
X.fillStyle='rgba(255,215,0,.15)';X.beginPath();X.roundRect(VW/2-35,8,70,22,11);X.fill();
dT('LV '+P.lv,VW/2,19,12,'#FFD740');
// Wave name
const wn=WNAMES[Math.min(wave-1,WNAMES.length-1)]||('Welle '+wave);
dT('⏱ '+fmtT(gameTime),12,38,11,'rgba(255,255,255,.6)','left',true);
if(waveT>0){
 dT('☕ Pause: '+Math.ceil(waveT)+'s',VW/2,38,10,'#80CBC4','center',true);
 dT('Nächste Welle: '+(wave+1),VW/2,50,8,'rgba(255,200,100,.55)','center',true);
}else dT('🌊 '+wn,VW/2,38,9,'rgba(255,200,100,.6)','center',true);
dT('💀 '+kills,VW-12,15,14,'#fff','right',true);
X.save();
X.translate(VW-12,35);
const cns=coinHudScale();
X.scale(cns,cns);
dT('🪙 '+coins,0,0,12,'#FFD740','right',true);
X.restore();
const activeKeys=Object.keys(activeTemps).sort((a,b)=>activeTemps[b]-activeTemps[a]).slice(0,4);
if(activeKeys.length){
 const rowH=23,padTop=14;
 X.fillStyle='rgba(0,0,0,.28)';X.beginPath();X.roundRect(10,50,320,padTop+activeKeys.length*rowH,8);X.fill();
 dT('AKTIVE BONI',16,57,9,'#80DEEA','left',true);
 activeKeys.forEach((id,i)=>{const t=TEMP_BY_ID[id];if(!t)return;
  const y=71+i*rowH;
  dT(`${t.emoji} ${t.name} (${Math.ceil(activeTemps[id])}s)`,16,y,9,'#B2EBF2','left',true);
  dT(`${t.desc}`,16,y+10,8,'rgba(178,235,242,.75)','left')});
}

// ═══════ COMBO DISPLAY ═══════
if(combo>=3){
 const ms=COMBO_M.filter(m=>m.at<=combo);
 const curMS=ms.length>0?ms[ms.length-1]:null;
 const col=curMS?curMS.col:'#FFD740';
 const sz=clamp(14+combo*.25,14,40);
 const nextMS=COMBO_M.find(m=>m.at>combo);

 // Combo counter
 dT(combo+'x',VW-12,VH*.28,sz,col,'right',true);
 // Current milestone name
 if(curMS)dT(curMS.name,VW-12,VH*.28+sz*.7,11,col,'right',true);
 // Next milestone progress
 if(nextMS){const prev=curMS?curMS.at:0;const pct=(combo-prev)/(nextMS.at-prev);
  dBar(VW-120,VH*.28+sz*.7+12,108,5,pct,col,'rgba(0,0,0,.3)');
  dT('→ '+nextMS.at+'x: '+nextMS.name,VW-12,VH*.28+sz*.7+26,8,'rgba(255,255,255,.4)','right')}
 // Passive bonus display
 const dmgB=Math.floor((comboDmg()-1)*100),spdB=Math.floor(comboSpd()*100);
 if(dmgB>0)dT('+'+dmgB+'% DMG',VW-12,VH*.28+sz*.7+38,8,'rgba(255,200,100,.5)','right');
 if(spdB>0)dT('+'+spdB+'% SPD',VW-12,VH*.28+sz*.7+50,8,'rgba(100,200,255,.5)','right');
}

// Weapon icons
P.weps.forEach((w,i)=>{const wx=14+i*38,wy=VH-42;
 X.fillStyle='rgba(0,0,0,.4)';X.beginPath();X.roundRect(wx,wy,32,28,6);X.fill();
 X.strokeStyle='rgba(255,255,255,.15)';X.lineWidth=1;X.stroke();
 dE(WP[w.id]?.emoji||'?',wx+16,wy+14,15)});

// Joystick
if(joyAct){
 const jx=joyS.x,jy=joyS.y;
 X.fillStyle='rgba(255,255,255,.05)';X.beginPath();X.arc(jx,jy,55,0,PI2);X.fill();
 X.strokeStyle='rgba(255,255,255,.1)';X.lineWidth=2;X.stroke();
 X.fillStyle='rgba(255,255,255,.18)';X.beginPath();X.arc(jx+inputDir.x*40,jy+inputDir.y*40,22,0,PI2);X.fill();
}

// Special
const bx=VW-55,by=VH-100,br=32,rdy=specCD<=0;
X.fillStyle=rdy?'rgba(255,152,0,.35)':'rgba(100,100,100,.25)';
X.beginPath();X.arc(bx,by,br,0,PI2);X.fill();
X.strokeStyle=rdy?'#FFA726':'#555';X.lineWidth=2;X.stroke();
if(!rdy){X.strokeStyle='#FFA726';X.lineWidth=3;X.beginPath();X.arc(bx,by,br,-PI/2,-PI/2+(1-specCD/P.ch.sCD)*PI2);X.stroke()}
dE('💥',bx,by,22);dT(rdy?'BEREIT':Math.ceil(specCD)+'s',bx,by+br+14,9,rdy?'#FFA726':'#777');

// Boss HP
if(bossRef&&bossRef.hp>0){const bw=VW*.6,bxx=(VW-bw)/2;
 dT(bossRef.name,VW/2,56,11,'#FF5252','center',true);
 dBar(bxx,68,bw,10,bossRef.hp/bossRef.mhp,'#FF5252','rgba(0,0,0,.5)')}

// Pause btn
X.fillStyle='rgba(0,0,0,.25)';X.beginPath();X.roundRect(VW-46,VH-40,38,28,8);X.fill();
dT('⏸',VW-27,VH-26,13,'rgba(255,255,255,.5)');

// Minimap
const mw=55,mh=55,mx=VW-mw-8,my=85;
X.fillStyle='rgba(0,0,0,.35)';X.fillRect(mx,my,mw,mh);
const ms2=mw/worldW;X.fillStyle='#FF5252';
enemies.forEach(e=>{if(e.hp<=0)return;const s=e.isBoss?4:e.elite?3:1.5;X.fillRect(mx+e.x*ms2-s/2,my+e.y*ms2-s/2,s,s)});
X.fillStyle='#4CAF50';X.beginPath();X.arc(mx+P.x*ms2,my+P.y*ms2,2.5,0,PI2);X.fill();
}

// ═══════ MENU SCREENS ═══════
function rMenu(){
menuA+=.016;const g=X.createLinearGradient(0,0,0,VH);
g.addColorStop(0,'#0a0a2e');g.addColorStop(.5,'#1a1035');g.addColorStop(1,'#0a0a2e');
X.fillStyle=g;X.fillRect(0,0,VW,VH);
const bge=['📧','📋','📊','📅','🐛','🖨️','😤','🧾','🔍','🕐'];
for(let i=0;i<bge.length;i++){const ex=VW*(i/bge.length)+Math.sin(menuA+i*2)*30,ey=VH*.12+Math.sin(menuA*.7+i*3)*35+i*18;
 X.globalAlpha=.12;dE(bge[i],ex,ey,28);X.globalAlpha=1}
const ts=1+Math.sin(menuA*2)*.03;X.save();X.translate(VW/2,VH*.2);X.scale(ts,ts);
dT('🏢',0,-28,clamp(VW*.08,28,45),'#fff');dT('BÜRO',0,8,clamp(VW*.09,26,44),'#fff','center',true);
dT('SURVIVORS',0,8+clamp(VW*.07,22,36),clamp(VW*.06,18,32),'#FF9800','center',true);X.restore();
dT('Überlebe den Büroalltag!',VW/2,VH*.41,clamp(VW*.025,9,13),'rgba(170,170,255,.5)');
btns=[];
X.fillStyle='#E65100';X.beginPath();X.roundRect(VW/2-110,VH*.5-26,220,52,14);X.fill();X.strokeStyle='#FFA726';X.lineWidth=2;X.stroke();
dT('▶  SPIELEN',VW/2,VH*.5,20,'#fff');btn(VW/2,VH*.5,220,52,()=>{state='charsel'});
X.fillStyle='rgba(255,255,255,.07)';X.beginPath();X.roundRect(VW/2-90,VH*.61-22,180,44,12);X.fill();X.strokeStyle='rgba(255,255,255,.18)';X.lineWidth=1;X.stroke();
dT('🛒 SHOP',VW/2,VH*.61,16,'#fff');btn(VW/2,VH*.61,180,44,()=>{state='shop'});
X.fillStyle='rgba(255,255,255,.07)';X.beginPath();X.roundRect(VW/2-90,VH*.71-22,180,44,12);X.fill();X.strokeStyle='rgba(255,255,255,.18)';X.lineWidth=1;X.stroke();
dT('📊 STATS',VW/2,VH*.71,15,'#fff');btn(VW/2,VH*.71,180,44,()=>{state='stats'});
dT('Touch / WASD + Leertaste',VW/2,VH*.86,9,'rgba(255,255,255,.2)');
chkB(function(){const t=[...taps];taps=[];return t}());
}

function rCharSel(){
X.fillStyle='#0a0a2e';X.fillRect(0,0,VW,VH);dT('⚔️ Held wählen',VW/2,28,clamp(VW*.04,15,22),'#fff');
btns=[];const cols=3,cw=clamp(VW*.28,90,130),ch=140,gap=10,tw=cols*(cw+gap)-gap,sx=(VW-tw)/2;
CHARS.forEach((c,i)=>{const col=i%cols,row=Math.floor(i/cols),cx2=sx+col*(cw+gap),cy2=55+row*(ch+gap);
 const ul=save.unlocked.includes(i),sl=i===selChar;
 X.fillStyle=sl?'rgba(0,255,255,.1)':'rgba(255,255,255,.04)';X.strokeStyle=sl?'#00BCD4':'rgba(255,255,255,.12)';X.lineWidth=sl?2:1;
 X.beginPath();X.roundRect(cx2,cy2,cw,ch,12);X.fill();X.stroke();
 if(!ul){X.fillStyle='rgba(0,0,0,.55)';X.beginPath();X.roundRect(cx2,cy2,cw,ch,12);X.fill()}
 dE(ul?c.emoji:'🔒',cx2+cw/2,cy2+30,26);dT(c.name,cx2+cw/2,cy2+58,10,ul?'#fff':'#555');
 dT(c.desc,cx2+cw/2,cy2+73,8,ul?'#aaa':'#444');
 if(!ul)dT('🪙 '+c.cost,cx2+cw/2,cy2+92,11,'#FFD740');
 else{dT(c.sN,cx2+cw/2,cy2+92,7,'#FFA726');dT(`HP:${c.hp} SPD:${Math.round(c.spd/10)}`,cx2+cw/2,cy2+106,7,'#8f8')}
 btn(cx2+cw/2,cy2+ch/2,cw,ch,()=>{if(ul)selChar=i;else if(save.coins>=c.cost){save.coins-=c.cost;save.unlocked.push(i);doS();selChar=i;sfx('power')}})});
const by=VH-85;X.fillStyle='#E65100';X.beginPath();X.roundRect(VW/2-100,by,200,44,12);X.fill();X.strokeStyle='#FFA726';X.lineWidth=2;X.stroke();
dT('⚔️ LOS!',VW/2,by+22,18,'#fff');btn(VW/2,by+22,200,44,()=>{if(save.unlocked.includes(selChar))startGame()});
X.fillStyle='rgba(255,255,255,.06)';X.beginPath();X.roundRect(VW/2-70,VH-30,140,26,10);X.fill();
dT('← ZURÜCK',VW/2,VH-17,11,'#888');btn(VW/2,VH-17,140,26,()=>{state='menu'});
chkB(function(){const t=[...taps];taps=[];return t}());
}

function rShop(){
X.fillStyle='#0a0a2e';X.fillRect(0,0,VW,VH);dT('🛒 Shop',VW/2,25,20,'#FFD740');dT('🪙 '+save.coins,VW/2,48,14,'#FFD740');
btns=[];const iw=clamp(VW*.42,125,170),ih=85,gap=10,cols=2,tw=cols*(iw+gap)-gap,sx=(VW-tw)/2;
SHOP.forEach((it,i)=>{const col=i%cols,row=Math.floor(i/cols),ix=sx+col*(iw+gap),iy=68+row*(ih+gap);
 const lvl=save.up[it.id]||0,mx=lvl>=it.max,co=it.cost+lvl*15;
 X.fillStyle='rgba(255,255,255,.04)';X.beginPath();X.roundRect(ix,iy,iw,ih,10);X.fill();
 X.strokeStyle=mx?'rgba(255,255,255,.08)':'rgba(255,255,255,.15)';X.lineWidth=1;X.stroke();
 if(mx){X.fillStyle='rgba(0,0,0,.25)';X.beginPath();X.roundRect(ix,iy,iw,ih,10);X.fill()}
 dE(it.emoji,ix+22,iy+22,18);dT(it.name,ix+iw/2+8,iy+17,10,mx?'#555':'#fff');
 dT(it.desc,ix+iw/2+8,iy+33,8,mx?'#444':'#aaa');dT(`Lv ${lvl}/${it.max}`,ix+iw/2+8,iy+50,8,'#777');
 dT(mx?'MAX':'🪙 '+co,ix+iw/2+8,iy+67,11,mx?'#555':'#FFD740');
 btn(ix+iw/2,iy+ih/2,iw,ih,()=>{if(!mx&&save.coins>=co){save.coins-=co;save.up[it.id]=(save.up[it.id]||0)+1;doS();sfx('coin')}})});
X.fillStyle='rgba(255,255,255,.06)';X.beginPath();X.roundRect(VW/2-70,VH-36,140,28,10);X.fill();
dT('← ZURÜCK',VW/2,VH-22,11,'#888');btn(VW/2,VH-22,140,28,()=>{state='menu'});
chkB(function(){const t=[...taps];taps=[];return t}());
}

function rStats(){
X.fillStyle='#0a0a2e';X.fillRect(0,0,VW,VH);dT('📊 Stats',VW/2,28,20,'#00BCD4');
const rows=[['Spiele',save.games],['Kills',save.totalKills],['Beste Zeit',fmtT(save.bestTime)],['Beste Welle',save.bestWave],['Kill-Rekord',save.bestKills],['Bester Combo',save.bestCombo+'x'],['Münzen','🪙 '+save.coins]];
rows.forEach((r,i)=>{const y=58+i*34;X.fillStyle=i%2?'rgba(255,255,255,.02)':'rgba(255,255,255,.05)';X.fillRect(VW*.08,y,VW*.84,28);
 dT(r[0],VW*.12,y+14,11,'#aaa','left');dT(''+r[1],VW*.88,y+14,12,'#fff','right')});
btns=[];X.fillStyle='rgba(255,255,255,.06)';X.beginPath();X.roundRect(VW/2-70,VH-36,140,28,10);X.fill();
dT('← ZURÜCK',VW/2,VH-22,11,'#888');btn(VW/2,VH-22,140,28,()=>{state='menu'});
chkB(function(){const t=[...taps];taps=[];return t}());
}

function rUpg(){
X.fillStyle='rgba(0,0,0,.82)';X.fillRect(0,0,VW,VH);
dT('⬆️ LEVEL UP!',VW/2,VH*.1,clamp(VW*.05,18,28),'#FFD740','center',true);
dT('Level '+P.lv,VW/2,VH*.16,13,'#fff');
btns=[];const cw=Math.min(VW*.88,350),ch2=65,gap=12,sy=VH*.22;
const rc={common:'#666',rare:'#2196F3',epic:'#9C27B0'};
upChoices.forEach((u,i)=>{const cy=sy+i*(ch2+gap),cx2=(VW-cw)/2,c=rc[u.r]||'#666';
 X.fillStyle='rgba(30,15,60,.88)';X.beginPath();X.roundRect(cx2,cy,cw,ch2,14);X.fill();
 X.strokeStyle=c+'66';X.lineWidth=2;X.stroke();
 dE(u.emoji,cx2+30,cy+ch2/2,24);dT(u.name,cx2+58,cy+20,12,'#fff','left');dT(u.desc,cx2+58,cy+38,9,'#bbb','left');
 X.fillStyle=c;X.beginPath();X.roundRect(cx2+cw-55,cy+8,48,16,8);X.fill();
 dT(u.r.toUpperCase(),cx2+cw-31,cy+16,7,'#fff');
 btn(VW/2,cy+ch2/2,cw,ch2,()=>pickUP(u))});
chkB(function(){const t=[...taps];taps=[];return t}());
}

function rPause(){
X.fillStyle='rgba(0,0,0,.65)';X.fillRect(0,0,VW,VH);dT('⏸ PAUSE',VW/2,VH*.32,26,'#fff');
btns=[];
X.fillStyle='rgba(255,255,255,.08)';X.beginPath();X.roundRect(VW/2-100,VH*.46,200,44,12);X.fill();
dT('▶ WEITER',VW/2,VH*.46+22,15,'#fff');btn(VW/2,VH*.46+22,200,44,()=>{state='playing'});
X.fillStyle='rgba(255,255,255,.08)';X.beginPath();X.roundRect(VW/2-100,VH*.56,200,44,12);X.fill();
dT('🏠 KÜNDIGEN',VW/2,VH*.56+22,14,'#FF8A80');btn(VW/2,VH*.56+22,200,44,()=>{state='menu';P=null;clearRunSave()});
chkB(function(){const t=[...taps];taps=[];return t}());
}

function rGO(){
X.fillStyle='rgba(10,0,0,.9)';X.fillRect(0,0,VW,VH);
dT('💀 BURNOUT!',VW/2,VH*.11,clamp(VW*.06,22,34),'#FF1744','center',true);
const st=[['Überlebt',fmtT(gameTime)],['Welle',WNAMES[Math.min(wave-1,WNAMES.length-1)]||''+wave],
 ['Level',''+P.lv],['Kills',''+kills],['Bester Combo',combo+'x'],['Münzen','🪙 '+coins]];
const bx2=(VW-250)/2,by2=VH*.22;
X.fillStyle='rgba(255,255,255,.04)';X.beginPath();X.roundRect(bx2,by2,250,st.length*26+14,12);X.fill();
st.forEach((s,i)=>{const sy2=by2+10+i*26;dT(s[0],bx2+14,sy2+8,10,'#aaa','left');dT(s[1],bx2+236,sy2+8,10,'#fff','right')});
btns=[];const by3=VH*.66;
X.fillStyle='#E65100';X.beginPath();X.roundRect(VW/2-100,by3,200,44,12);X.fill();X.strokeStyle='#FFA726';X.lineWidth=2;X.stroke();
dT('🔄 NOCHMAL',VW/2,by3+22,15,'#fff');btn(VW/2,by3+22,200,44,()=>startGame());
X.fillStyle='rgba(255,255,255,.08)';X.beginPath();X.roundRect(VW/2-100,by3+54,200,38,12);X.fill();
dT('🏠 MENÜ',VW/2,by3+73,13,'#fff');btn(VW/2,by3+73,200,38,()=>{state='menu';P=null;clearRunSave()});
chkB(function(){const t=[...taps];taps=[];return t}());
}
