// Core module: canvas setup, utilities, data tables, shared runtime state, input, and UI helpers.
const C=document.getElementById('gc'),X=C.getContext('2d');
let VW,VH,DPR=Math.min(devicePixelRatio,2);
let bgPapers=[],bgGrain=[],bgFibers=[],vignetteGrad=null,bgGrad=null;
function rebuildFxCache(){
const n=Math.max(12,Math.min(28,Math.floor((VW*VH)/78000)));
bgPapers=Array.from({length:n},()=>({
x:Math.random()*VW,y:Math.random()*VH,
w:Math.random()*(14-6)+6,h:Math.random()*(10-4)+4,
a:Math.random()*(.14-.05)+.05,par:Math.random()*(.08-.03)+.03
}));
const gn=Math.max(500,Math.min(1300,Math.floor((VW*VH)/1800)));
bgGrain=Array.from({length:gn},()=>({
x:Math.random()*VW,y:Math.random()*VH,r:Math.random()*1.1+.2,a:Math.random()*.12+.04
}));
const fn=Math.max(45,Math.min(120,Math.floor((VW*VH)/18000)));
bgFibers=Array.from({length:fn},()=>({
x:Math.random()*VW,y:Math.random()*VH,l:Math.random()*36+18,a:Math.random()*Math.PI*2,w:Math.random()*1.3+.6,o:Math.random()*.08+.03
}));
bgGrad=X.createRadialGradient(VW/2,VH/2,50,VW/2,VH/2,VW*.7);
bgGrad.addColorStop(0,'#2a2d34');
bgGrad.addColorStop(.62,'#1f232b');
bgGrad.addColorStop(1,'#161a21');
vignetteGrad=X.createRadialGradient(VW/2,VH/2,Math.min(VW,VH)*.2,VW/2,VH/2,Math.max(VW,VH)*.75);
vignetteGrad.addColorStop(0,'rgba(0,0,0,0)');
vignetteGrad.addColorStop(1,'rgba(0,0,0,.3)');
}
function resize(){VW=innerWidth;VH=innerHeight;C.width=VW*DPR;C.height=VH*DPR;C.style.width=VW+'px';C.style.height=VH+'px';X.setTransform(DPR,0,0,DPR,0,0);rebuildFxCache()}
resize();addEventListener('resize',resize);
const PI=Math.PI,PI2=PI*2,rng=(a,b)=>Math.random()*(b-a)+a,rngI=(a,b)=>Math.floor(rng(a,b+1));
const dst=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y),ang=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x),lerp=(a,b,t)=>a+(b-a)*t,clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
const fmtT=s=>{const m=Math.floor(s/60),c=Math.floor(s%60);return m+':'+(c<10?'0':'')+c};

// ═══════ AUDIO ═══════
let AC=null;function initA(){if(!AC)try{AC=new(AudioContext||webkitAudioContext)}catch(e){}}
function sfx(t){if(!AC)return;try{const o=AC.createOscillator(),g=AC.createGain();o.connect(g);g.connect(AC.destination);const n=AC.currentTime;
if(t==='boom'){const s=AC.createBufferSource(),b=AC.createBuffer(1,AC.sampleRate*.25,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,1.5);s.buffer=b;const gn=AC.createGain();gn.gain.setValueAtTime(.13,n);gn.gain.exponentialRampToValueAtTime(.001,n+.25);s.connect(gn);gn.connect(AC.destination);s.start(n);return}
const P={shoot:[600,150,.08,'square'],hit:[300,80,.08,'sawtooth'],kill:[500,900,.07,'square'],xp:[700,1400,.04,'sine'],
lvl:[523,1047,.1,'sine'],coin:[988,1319,.05,'sine'],hurt:[200,50,.09,'sawtooth'],boss:[80,60,.13,'sawtooth'],
power:[440,880,.08,'sine'],combo:[800,1600,.07,'triangle'],freeze:[1200,400,.06,'sine']};
const p=P[t];if(!p)return;o.type=p[3];o.frequency.setValueAtTime(p[0],n);o.frequency.exponentialRampToValueAtTime(p[1],n+.12);
g.gain.setValueAtTime(p[2],n);g.gain.exponentialRampToValueAtTime(.001,n+.15);o.start(n);o.stop(n+.16)}catch(e){}}

// ═══════ SAVE ═══════
let save={coins:0,totalKills:0,games:0,bestTime:0,bestWave:0,bestKills:0,bestCombo:0,up:{hp:0,dmg:0,spd:0,armor:0,luck:0,xp:0},unlocked:[0],run:null};
const SAVE_KEY='bs5',COOKIE_MAX_AGE=60*60*24*365*5;
const COOKIE_SAFE_BYTES=3800; // practical cap below common ~4KB cookie limit
function getCookie(name){
const v=('; '+document.cookie).split('; '+name+'=');
if(v.length<2)return null;
return v.pop().split(';').shift();
}
function mergeSave(raw){
if(!raw||typeof raw!=='object')return;
const merged={...save,...raw};
if(!merged.up||typeof merged.up!=='object')merged.up={...save.up};
else merged.up={...save.up,...merged.up};
if(!Array.isArray(merged.unlocked))merged.unlocked=[0];
if(merged.run!==null&&typeof merged.run!=='object')merged.run=null;
save=merged;
}
function loadS(){
try{
const c=getCookie(SAVE_KEY);
if(c){mergeSave(JSON.parse(decodeURIComponent(c)));return}
const s=localStorage.getItem(SAVE_KEY); // one-time migration from old saves
if(s){mergeSave(JSON.parse(s));doS();localStorage.removeItem(SAVE_KEY)}
}catch(e){}
}
function doS(){
try{
let payload=JSON.stringify(save);
let enc=encodeURIComponent(payload);
if(enc.length>COOKIE_SAFE_BYTES&&save.run){
 // Keep durable/meta progress even if volatile run state is too large for a cookie.
 const trimmed={...save,run:null};
 payload=JSON.stringify(trimmed);
 enc=encodeURIComponent(payload);
}
if(enc.length<=COOKIE_SAFE_BYTES){
 document.cookie=`${SAVE_KEY}=${enc}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}
try{localStorage.setItem(SAVE_KEY,payload)}catch(e){}
}catch(e){}
}
loadS();

// ═══════════════════════════════════════
// 🏆 COMBO SYSTEM — Echte Belohnungen!
// ═══════════════════════════════════════
// Passive: +1.5% DMG per combo (max +100%), +0.8% speed per combo (max +30%)
// Milestones give coins, heals, explosions, shields
const COMBO_M=[
{at:5,name:'NICE!',col:'#FFD740',co:3,heal:0,pulse:0},
{at:10,name:'SUPER!',col:'#FFA726',co:8,heal:.05,pulse:60},
{at:20,name:'WAHNSINN!',col:'#FF7043',co:15,heal:.08,pulse:100},
{at:35,name:'LEGENDÄR!',col:'#FF5252',co:25,heal:.15,pulse:130},
{at:50,name:'BÜRO-GOTT!',col:'#E040FB',co:40,heal:.2,pulse:180},
{at:75,name:'UNMÖGLICH!',col:'#00E5FF',co:60,heal:.5,pulse:220},
{at:100,name:'TRANSZENDENT!',col:'#FFD700',co:100,heal:1,pulse:300},
];

// ═══════ CHARACTERS ═══════
const CHARS=[
{id:0,name:'Praktikant',emoji:'👨‍💼',desc:'Ausgewogen',hp:85,spd:150,dmg:10,color:'#4CAF50',cost:0,wep:'pencil',spec:'coffee',sCD:15,sN:'☕ Kaffeepause'},
{id:1,name:'IT-Admina',emoji:'👩‍💻',desc:'Schnell & präzise',hp:65,spd:190,dmg:12,color:'#2196F3',cost:120,wep:'mouse',spec:'reboot',sCD:12,sN:'🔄 Neustart'},
{id:2,name:'Koch',emoji:'👨‍🍳',desc:'Tank mit Soße',hp:130,spd:110,dmg:16,color:'#FF9800',cost:200,wep:'food',spec:'soup',sCD:10,sN:'🍜 Kantinenkeule'},
{id:3,name:'Hausmeister',emoji:'🧹',desc:'Mopp-Fu Meister',hp:95,spd:140,dmg:13,color:'#9C27B0',cost:180,wep:'mop',spec:'sweep',sCD:13,sN:'🌊 Großputz'},
{id:4,name:'Ärztin',emoji:'👩‍⚕️',desc:'Passiv-Regen',hp:75,spd:148,dmg:9,color:'#E91E63',cost:300,wep:'syringe',spec:'immune',sCD:20,sN:'📋 Krankschreibung'},
{id:5,name:'Betriebsrat',emoji:'✊',desc:'Anti-Stress Tank. Teuer.',hp:170,spd:180,dmg:22,color:'#FFD700',cost:999,wep:'creditcard',spec:'nuke',sCD:25,sN:'📢 Streikaufruf'},
];
let selChar=0;

// ═══════ ENEMIES ═══════
const ET=[
{name:'Spam-Email',emoji:'📧',hp:18,spd:115,dmg:7,sz:13,xp:5,co:1},
{name:'Meeting-Einladung',emoji:'📋',hp:28,spd:80,dmg:10,sz:16,xp:8,co:2},
{name:'Papierstau',emoji:'🖨️',hp:50,spd:38,dmg:9,sz:22,xp:14,co:3,ranged:1},
{name:'Software-Bug',emoji:'🐛',hp:20,spd:185,dmg:8,sz:13,xp:7,co:1},
{name:'Deadline',emoji:'📅',hp:38,spd:165,dmg:18,sz:18,xp:12,co:3,charge:1},
{name:'Death by PPT',emoji:'📊',hp:42,spd:48,dmg:5,sz:20,xp:11,co:2,aura:85},
{name:'Steuerbescheid',emoji:'🧾',hp:32,spd:120,dmg:6,sz:16,xp:10,co:6},
{name:'Wütender Kunde',emoji:'😤',hp:55,spd:75,dmg:22,sz:20,xp:13,co:3,charge:1},
{name:'Überstunden',emoji:'🕐',hp:65,spd:42,dmg:15,sz:22,xp:16,co:4},
{name:'Endlos-Zoom',emoji:'📱',hp:48,spd:55,dmg:4,sz:19,xp:12,co:3,aura:95},
{name:'Aktenschrank',emoji:'🗄️',hp:85,spd:32,dmg:26,sz:26,xp:20,co:5},
{name:'Compliance-Audit',emoji:'🔍',hp:55,spd:105,dmg:18,sz:18,xp:18,co:4},
];
const BT=[
{name:'DER MONTAG',emoji:'📦',hp:500,spd:60,dmg:24,sz:48,xp:80,co:40},
{name:'DER VORSTAND',emoji:'👔',hp:900,spd:75,dmg:35,sz:50,xp:120,co:70},
{name:'UMSTRUKTURIERUNG',emoji:'🏗️',hp:1400,spd:50,dmg:30,sz:55,xp:200,co:100},
{name:'DAS FINANZAMT',emoji:'🏛️',hp:2200,spd:65,dmg:45,sz:60,xp:350,co:150},
];

// ═══════════════════════════════════════════════
// 🔫 WAFFEN — Jede einzigartig & kreativ!
// ═══════════════════════════════════════════════
const WP={
pencil:{emoji:'✏️',name:'Bleistift',ps:340,dm:1,rt:.4,col:'#FFD54F',
 desc:'3 Treffer → NOTIZ-BURST (3x DMG)!',mech:'stack'},
mouse:{emoji:'🖱️',name:'Maus',ps:380,dm:1,rt:.25,col:'#42A5F5',
 desc:'4. Klick = DOPPELKLICK (3x DMG-AOE)!',mech:'multi'},
food:{emoji:'🍖',name:'Schnitzel',ps:220,dm:1.4,rt:.55,col:'#FF9800',
 desc:'Hinterlässt Fettlache (Slow+DOT)!',mech:'grease'},
mop:{emoji:'🧹',name:'Mopp',ps:270,dm:1.1,rt:.38,col:'#CE93D8',
 desc:'Knockback + nasser Boden (Rutschgefahr)!',mech:'wetfloor'},
syringe:{emoji:'💉',name:'Spritze',ps:360,dm:.85,rt:.32,col:'#F48FB1',
 desc:'Infiziert! Tod → Kettenexplosion!',mech:'infect'},
creditcard:{emoji:'📣',name:'Megafon',ps:420,dm:1.6,rt:.22,col:'#FFD700',
 desc:'Durchdringt Reihen + Bonus-Münzen!',mech:'goldrush'},
stapler:{emoji:'📌',name:'Tacker',ps:450,dm:.5,rt:.1,col:'#EF5350',
 desc:'Rapid-Fire! Nagelt Feinde 0.5s fest!',mech:'pin'},
hotcoffee:{emoji:'☕',name:'Heißer Kaffee',ps:250,dm:1.1,rt:.5,col:'#795548',
 desc:'Splash + brennende Kaffeelache (DOT)!',mech:'burn'},
coldcoffee:{emoji:'🧊',name:'Kalter Kaffee',ps:300,dm:.7,rt:.33,col:'#29B6F6',
 desc:'Slow → Doppelt-Hit = EINFRIEREN 2s!',mech:'freeze'},
cablechain:{emoji:'🔌',name:'Kabelsalat',ps:0,dm:1.4,rt:.55,col:'#FFEE58',
 desc:'Kettenblitz springt 4x!',mech:'chain'},
chair:{emoji:'🪑',name:'Bürostuhl',ps:220,dm:1.2,rt:.65,col:'#FFA726',
 desc:'Bumerang! Schubst Feinde ineinander!',mech:'boomkb'},
extinguish:{emoji:'🧯',name:'Feuerlöscher',ps:240,dm:1.3,rt:.5,col:'#B0BEC5',
 desc:'CO2-Kegel: Pushback + Slow + AOE!',mech:'cone'},
};

// ═══════ UPGRADES ═══════
const UPG=[
{t:'w',w:'stapler',emoji:'📌',name:'Tacker-Salve',desc:'Rapid-Fire! Nagelt fest!',r:'common'},
{t:'w',w:'hotcoffee',emoji:'☕',name:'Heißer Kaffee',desc:'Splash + brennende Lache!',r:'common'},
{t:'w',w:'extinguish',emoji:'🧯',name:'Feuerlöscher',desc:'CO2-Kegel: Push + Slow!',r:'rare'},
{t:'w',w:'coldcoffee',emoji:'🧊',name:'Kalter Kaffee',desc:'Slow → EINFRIEREN!',r:'rare'},
{t:'w',w:'cablechain',emoji:'🔌',name:'Kabelsalat',desc:'Kettenblitz springt 4x!',r:'epic'},
{t:'w',w:'chair',emoji:'🪑',name:'Bürostuhl',desc:'Bumerang + Kollision!',r:'rare'},
{t:'s',k:'mhp',v:20,emoji:'❤️',name:'Betriebsarzt',desc:'+20 Max HP',r:'common'},
{t:'s',k:'mhp',v:40,emoji:'❤️‍🔥',name:'Yoga-Kurs',desc:'+40 Max HP',r:'rare'},
{t:'s',k:'dmg',v:.12,emoji:'💪',name:'Motivation',desc:'+12% Schaden',r:'common'},
{t:'s',k:'dmg',v:.25,emoji:'🔥',name:'Gehaltserhöhung',desc:'+25% Schaden',r:'rare'},
{t:'s',k:'spd',v:.12,emoji:'👟',name:'Sneakers',desc:'+12% Speed',r:'common'},
{t:'s',k:'atk',v:.12,emoji:'⏩',name:'3. Espresso',desc:'+12% Feuerrate',r:'common'},
{t:'s',k:'atk',v:.22,emoji:'⚡',name:'Energy Drink',desc:'+22% Feuerrate',r:'rare'},
{t:'s',k:'arm',v:3,emoji:'🦺',name:'Schutzhelm',desc:'+3 Rüstung',r:'common'},
{t:'s',k:'reg',v:1.5,emoji:'🥗',name:'Gesundes Essen',desc:'+1.5 HP/Sek',r:'rare'},
{t:'s',k:'mag',v:BALANCE.magnet.levelUpBonus,emoji:'🧲',name:'Praktikant',desc:'Magnet+',r:'common'},
{t:'s',k:'crt',v:.08,emoji:'💥',name:'Motivations-Push',desc:'+8% Krit',r:'rare'},
{t:'s',k:'prj',v:1,emoji:'🎆',name:'Beidhändig',desc:'+1 Projektil!',r:'epic'},
{t:'i',id:'heal',emoji:'💖',name:'Wellness-Tag',desc:'Volle Heilung!',r:'common'},
{t:'i',id:'bomb',emoji:'💣',name:'Feueralarm',desc:'Tötet alle Sichtbaren!',r:'epic'},
{t:'i',id:'coins',emoji:'💰',name:'Spesenkonto',desc:'+50 Münzen',r:'rare'},
];

const SHOP=[
{id:'hp',name:'Fitness-Abo',emoji:'🏋️',desc:'+10 HP',cost:30,max:10},
{id:'dmg',name:'Rhetorikkurs',emoji:'🎤',desc:'+5% DMG',cost:40,max:10},
{id:'spd',name:'Koffein',emoji:'☕',desc:'+5% Speed',cost:35,max:8},
{id:'armor',name:'Panzerung',emoji:'🦺',desc:'+1 Rüstung',cost:45,max:5},
{id:'luck',name:'Vitamin B',emoji:'🤝',desc:'Bessere Upgrades',cost:50,max:5},
{id:'xp',name:'Fortbildung',emoji:'🎓',desc:'+10% XP',cost:55,max:8},
];
const WNAMES=['08:00 — Arbeitsbeginn!','09:00 — Emails!','10:00 — Meeting!','11:00 — Kaffee leer!','12:00 — Mittagschaos!','13:00 — Food Coma!','14:00 — Tief!','15:00 — PPT-Hölle!','16:00 — Deadline!','17:00 — KEIN Feierabend!','18:00 — Überstunden!','19:00 — Noch hier?!','20:00 — Nachtschicht!','21:00 — Wahnsinn!','22:00 — APOKALYPSE!'];
const TEMP_ITEMS=[
{id:'bubble',emoji:'🫧',name:'Bubble Wrap Suit',dur:8,desc:'3 Treffer absorbieren + Knockback'},
{id:'drift',emoji:'🪑',name:'Office Chair Drift',dur:6,desc:'+40% Speed, Kontakt rammt Gegner'},
{id:'staplerfury',emoji:'📎',name:'Red Stapler Fury',dur:7,desc:'Zusätzliche Miniprojektile'},
{id:'vpn',emoji:'🛡️',name:'VPN Cloak',dur:5,desc:'Unsichtbar bis Angriff, erster Hit immer Krit'},
{id:'overclock',emoji:'☕',name:'Coffee Overclock',dur:10,desc:'Feuerrate skaliert jede Sekunde hoch'},
{id:'firewall',emoji:'🔥',name:'Firewall Badge',dur:8,desc:'Blockt Fernkampf-Projektile, gibt XP/Münzen'},
{id:'leave',emoji:'🏖️',name:'Paid Leave',dur:6,desc:'Kein Kontaktschaden + Pushback'},
{id:'meeting',emoji:'❄️',name:'Meeting Cancelled',dur:0,desc:'Sofortiger Freeze-Puls'},
{id:'expense',emoji:'🧾',name:'Expense Report',dur:12,desc:'Kills droppen Bonus-Münzen'},
{id:'ergo',emoji:'🧘',name:'Ergonomic Aura',dur:10,desc:'Regen + temporäre Rüstung'},
{id:'jam',emoji:'🖨️',name:'Printer Jam Field',dur:7,desc:'Nahbereich stark verlangsamt'},
{id:'drone',emoji:'🤖',name:'IT Helpdesk Drone',dur:9,desc:'Orbit-Drohne zapt Gegner'},
{id:'poster',emoji:'📌',name:'Motivation Poster',dur:8,desc:'Combo fällt langsamer, Combo-DMG x2'},
{id:'overtime',emoji:'⏱️',name:'Overtime Rage',dur:6,desc:'Low-HP Berserk mit HP-Drain'},
{id:'alarm',emoji:'🚨',name:'Fire Drill Alarm',dur:5,desc:'Periodischer Furcht-Puls'},
];
const TEMP_BY_ID=Object.fromEntries(TEMP_ITEMS.map(t=>[t.id,t]));

// ═══════ PARTICLES ═══════
let parts=[];
function addP(x,y,vx,vy,l,c,s,tp){parts.push({x,y,vx,vy,life:l,ml:l,color:c,size:s,type:tp||'c',text:''})}
function burst(x,y,n,c,sp,sz,l){sp=sp||120;sz=sz||4;l=l||.5;for(let i=0;i<n;i++){const a=rng(0,PI2),s=rng(sp*.3,sp);addP(x,y,Math.cos(a)*s,Math.sin(a)*s,rng(l*.5,l),c,rng(sz*.5,sz))}}
function fTxt(x,y,t,c,s){s=s||16;parts.push({x,y,vx:rng(-15,15),vy:-55,life:1.2,ml:1.2,color:c||'#fff',size:s,type:'t',text:t})}
function fDmgTxt(x,y,t,c,s){
s=s||16;
const a=-PI/2+rng(-PI/4,PI/4),sp=rng(290,350);
parts.push({
 x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1.15,ml:1.15,color:c||'#fff',size:s,type:'t',text:t,
 txtFx:'dmg',hang:.2,grav:520
});
}

// ═══════ STATE ═══════
let state='menu',P=null; // P = player
let enemies=[],projs=[],pickups=[],gfx=[]; // gfx = ground effects (puddles)
let gameTime=0,kills=0,coins=0,wave=1,waveT=0,spawnT=0;
let waveSpawned=0,waveTarget=0;
let directorWaveTime=0,directorAmbientT=0,directorBudget=0,directorEvents=[];
let arenaHazards=[],arenaTools=[],arenaHazSpawnT=0,arenaToolSpawnT=0;
let activeObjective=null,objectiveSpawnT=0,objectivePenaltyT=0;
let combo=0,comboT=0,lastMS=0,comboSpdB=0,comboShield=0;
let bossRef=null,specCD=0,worldW=3000,worldH=3000,menuA=0;
let cam={x:0,y:0,shake:0};
let inputDir={x:0,y:0},joyAct=false,joyS={x:0,y:0},joyId=null,keys={},taps=[],upChoices=[];
let runSaveTimer=0;
let timeScale=1,timeScaleT=0,pendingGameOverT=0;
let impactFlash=0;
let coinHudPulse=0;
let activeTemps={},tempData={};
// Weapon state tracking
let wepState={clicks:0}; // for mouse multi-click
let hitTracker={}; // for pencil stacking
function triggerSlowMo(scale,dur,flash){
const sc=clamp(Number(scale)||1,.05,1),du=Math.max(0,Number(dur)||0);
timeScale=Math.min(timeScale,sc);
timeScaleT=Math.max(timeScaleT,du);
impactFlash=Math.max(impactFlash,clamp(Number(flash)||.22,0,.7));
}
function tickTimeScale(realDt){
if(impactFlash>0)impactFlash=Math.max(0,impactFlash-realDt*2.6);
if(timeScaleT>0){
 timeScaleT-=realDt;
 if(timeScaleT<=0){timeScaleT=0;timeScale=1}
}else timeScale=1;
return timeScale;
}
function triggerCoinHudPulse(){
coinHudPulse=.32;
}
function tickCoinHudPulse(dt){
if(coinHudPulse>0)coinHudPulse=Math.max(0,coinHudPulse-dt);
}
function coinHudScale(){
if(coinHudPulse<=0)return 1;
const t=1-coinHudPulse/.32;
if(t<.18)return lerp(1,1.2,t/.18);
const u=(t-.18)/.82;
return 1+.2*Math.exp(-4*u)*Math.cos(10*u);
}

// ═══════ INPUT ═══════
document.addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;e.preventDefault()});
document.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
C.addEventListener('touchstart',e=>{e.preventDefault();initA();for(const t of e.changedTouches){const x=t.clientX,y=t.clientY;
if(state!=='playing'){taps.push({x,y});continue}
if(Math.hypot(x-(VW-55),y-(VH-100))<38){useSpec();continue}
if(x>VW-55&&y>VH-48){state='pause';saveRunNow();return}
if(!joyAct){joyAct=true;joyS={x,y};joyId=t.identifier;inputDir={x:0,y:0}}
else taps.push({x,y})}},{passive:false});
C.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches){if(t.identifier===joyId){
let dx=t.clientX-joyS.x,dy=t.clientY-joyS.y;const d=Math.hypot(dx,dy),m=55;
if(d>m){dx=dx/d*m;dy=dy/d*m}inputDir=d>8?{x:dx/m,y:dy/m}:{x:0,y:0}}}},{passive:false});
C.addEventListener('touchend',e=>{e.preventDefault();for(const t of e.changedTouches)if(t.identifier===joyId){joyAct=false;joyId=null;inputDir={x:0,y:0}}},{passive:false});
C.addEventListener('touchcancel',e=>{e.preventDefault();for(const t of e.changedTouches)if(t.identifier===joyId){joyAct=false;joyId=null;inputDir={x:0,y:0}}},{passive:false});
C.addEventListener('click',e=>{initA();if(state!=='playing')taps.push({x:e.clientX,y:e.clientY})});
addEventListener('beforeunload',()=>saveRunNow());
function getKI(){let dx=0,dy=0;if(keys.w||keys.arrowup)dy=-1;if(keys.s||keys.arrowdown)dy=1;if(keys.a||keys.arrowleft)dx=-1;if(keys.d||keys.arrowright)dx=1;
if(dx||dy){const l=Math.hypot(dx,dy);inputDir={x:dx/l,y:dy/l}}else if(!joyAct)inputDir={x:0,y:0};
if(keys[' ']){useSpec();keys[' ']=false}
if(keys.escape){
 if(state==='playing'){state='pause';saveRunNow()}
 else if(state==='pause')state='playing';
 keys.escape=false;
}}

// ═══════ BUTTONS ═══════
let btns=[];function btn(x,y,w,h,cb){btns.push({x:x-w/2,y:y-h/2,w,h,cb})}
function chkB(tp){for(const p of tp)for(const b of btns)if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){b.cb();sfx('coin');return true}return false}

// ═══════ DRAW HELPERS ═══════
function dE(e,x,y,s){X.font=s+'px serif';X.textAlign='center';X.textBaseline='middle';X.fillText(e,x,y)}
function dT(t,x,y,s,c,a,st){X.font=`bold ${s}px 'Segoe UI',system-ui,sans-serif`;X.textAlign=a||'center';X.textBaseline='middle';
if(st){X.strokeStyle='#000';X.lineWidth=Math.max(2,s/4);X.strokeText(t,x,y)}X.fillStyle=c||'#fff';X.fillText(t,x,y)}
function dBar(x,y,w,h,p,c,bg){X.fillStyle=bg||'rgba(0,0,0,.5)';X.beginPath();X.roundRect(x,y,w,h,h/2);X.fill();
if(p>0){X.fillStyle=c;X.beginPath();X.roundRect(x,y,w*clamp(p,0,1),h,h/2);X.fill()}}

// ═══════════════════════════════════════
//  GAME LOGIC
