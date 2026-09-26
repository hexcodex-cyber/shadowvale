// ===== Shadowvale: multiplayer glue (login overlay, chat, remote players, world boss) =====
// Works entirely through window.NET (js/net.js). Everything degrades to offline mode.
'use strict';
const MP = { remote:{}, chatOpen:false, lastPresJSON:'', lastBeat:0, offline:false, busy:false };
const RIFT = {id:'rift', sp:'Riftmaw', level:12, x:37, y:24, zone:'meadow', world:true, max:4000,
  line:'A crack in reality tears open... the RIFTMAW attacks! (Shared world boss — every tamer online chips away at the same HP pool.)'};
const netOn = ()=>!!(window.NET && NET.user && NET.online);
const $ = id=>document.getElementById(id);

// ---------- login overlay ----------
function showLogin(show){ $('login').style.display = show?'flex':'none'; if(show) renderLogin(); else { if(document.activeElement && document.activeElement.blur) document.activeElement.blur(); if(typeof canvas!=='undefined' && canvas) canvas.focus({preventScroll:true}); window.focus(); } }
function loginMsg(t,isErr=true){ const m=$('lg-msg'); m.textContent=t||''; m.className=isErr?'err':'ok'; }
function renderLogin(){
  const net=window.NET, conf = net && net.configured;
  $('lg-status').textContent = !net && MP.netMissing ? '⚠ Multiplayer services unavailable (open the game over http/https). You can play offline.' : !net || !net.ready ? 'Connecting to multiplayer services…' : conf ? 'Sign in to join the shared world of Shadowvale.' : (net.error || '⚠ Multiplayer not configured — you can play offline.');
  $('lg-status').className = (net && net.ready && !conf) || (!net && MP.netMissing) ? 'warn' : '';
  $('lg-form').style.display = conf ? 'block' : 'none';
  $('lg-signup-extra').style.display = MP.signup ? 'block' : 'none';
  $('lg-submit').textContent = MP.signup ? 'Create account' : 'Sign in';
  $('lg-toggle').textContent = MP.signup ? 'Have an account? Sign in' : 'New here? Create an account';
  document.querySelectorAll('#login button').forEach(b=>b.disabled=MP.busy);
}
async function doAuth(kind){
  if(MP.busy) return; loginMsg(''); MP.busy=true; renderLogin();
  try{
    const email=$('lg-email').value.trim(), pw=$('lg-pass').value;
    if(kind==='google') await NET.signInGoogle();
    else if(MP.signup){ const name=$('lg-name').value.trim(); if(!name) throw {message:'Please choose a tamer name.'}; await NET.signUpEmail(email,pw,name); }
    else { if(!email) throw {message:'Please enter your email.'}; await NET.signInEmail(email,pw); }
  }catch(e){ loginMsg(NET.errorText(e)); }
  MP.busy=false; renderLogin();
}
function playOffline(){ MP.offline=true; showLogin(false); G.mode='title'; G.menuSel=0; }
async function afterLogin(){
  if(MP.loggingIn) return; MP.loggingIn=true;
  showLogin(false); loginMsg('');
  try{ const cloud=await NET.loadSave(); if(cloud) localStorage.setItem(saveKey(), cloud); }catch(e){ console.warn('cloud load failed', e.code||e); toast('Could not load cloud save — using local save','#ffb'); }
  G.mode='title'; G.menuSel=0; G.player.name=NET.user.name; if(MP.toastedUid!==NET.user.uid){ MP.toastedUid=NET.user.uid; toasts=toasts.filter(t=>!t.t.startsWith('Signed in as')); toast(`Signed in as ${NET.user.name}`,'#8fd0ff'); } MP.loggingIn=false;
}
window.onNetChange = ()=>{ if(!G) return;
  if(G.mode==='login'){ if(NET.user) afterLogin(); else renderLogin(); } };
window.onChatMessage = m=>{ m._t=performance.now(); };
function signOutToLogin(){ saveGame(); const p=NET.user?NET.signOut():Promise.resolve(); p.finally(()=>{ G=newState(); G.mode='login'; G.menuSel=0; MP.offline=false; MP.remote={}; showLogin(true); }); }

// ---------- chat ----------
function openChat(){ if(!NET.user){ toast('Sign in to use chat','#aaa'); return; } MP.chatOpen=true; const i=$('chat-input'); i.style.display='block'; i.value=''; i.focus(); }
function closeChat(){ MP.chatOpen=false; const i=$('chat-input'); i.style.display='none'; i.blur(); canvas.focus(); }
function chatKey(e){ if(e.key==='Enter'){ const t=e.target.value; if(t.trim()) NET.sendChat(t); closeChat(); e.preventDefault(); } else if(e.key==='Escape'){ closeChat(); e.preventDefault(); } e.stopPropagation(); }
function drawChat(){
  if(!window.NET || !NET.user) return;
  const now=performance.now(); const msgs=(NET.chat||[]).slice(MP.chatOpen?-12:-6).filter(m=>MP.chatOpen || now-(m._t||0)<25000);
  if(!msgs.length && !MP.chatOpen) return;
  const lines=[]; msgs.forEach(m=>wrap(`${m.name}: ${m.text}`,400,13).forEach((l,i)=>lines.push({l,me:m.uid===NET.user.uid,sys:m.sys,first:i===0})));
  const show=lines.slice(-14), h=show.length*17+12, y0=H-(MP.chatOpen?125:90)-h;
  rr(10,y0,420,h,6,'rgba(0,0,0,.55)'); show.forEach((o,i)=>text(o.l,18,y0+20+i*17,{size:13,color:o.sys?'#ff9':o.me?'#9ae6ff':'#fff'}));
  if(!MP.chatOpen) text('Enter: chat',426,y0-4,{size:10,align:'right',color:'#aaa'});
}

// ---------- presence ----------
function mpUpdate(dt){
  if(!netOn()) return;
  const p=G.player; if(G.mode!=='world' && G.mode!=='battle') return;
  const data={zone:G.zone, x:Math.round(p.x*100)/100, y:Math.round(p.y*100)/100, dir:p.dir, lead:G.party[0]?G.party[0].sp:'', lvl:p.level, battle:G.mode==='battle'};
  const j=JSON.stringify(data), now=performance.now();
  if(j!==MP.lastPresJSON || now-MP.lastBeat>20000){ MP.lastPresJSON=j; MP.lastBeat=now; NET.updatePresence(data); }
  // smooth remote players
  for(const [uid,r] of Object.entries(NET.players||{})){ const d=MP.remote[uid]||(MP.remote[uid]={x:r.x,y:r.y});
    if(Math.abs(d.x-r.x)+Math.abs(d.y-r.y)>6){ d.x=r.x; d.y=r.y; } d.x+=(r.x-d.x)*Math.min(1,dt*12); d.y+=(r.y-d.y)*Math.min(1,dt*12); d.moving=Math.abs(r.x-d.x)+Math.abs(r.y-d.y)>0.02; d.step=(d.step||0)+(d.moving?dt*5:0); }
  for(const uid of Object.keys(MP.remote)) if(!(NET.players||{})[uid]) delete MP.remote[uid];
  // world boss upkeep: spawn if missing, respawn 2 minutes after defeat
  if(NET.online && (!NET.boss || (NET.boss.hp<=0 && Date.now()-(NET.boss.defeatedAt||0)>120000))){ if(now-(MP.lastBossReset||0)>10000){ MP.lastBossReset=now; NET.resetBoss(RIFT.max); } }
}
function livePlayers(){ const out=[]; const now=Date.now(); for(const [uid,r] of Object.entries((window.NET&&NET.players)||{})){ if(r.ts && now-r.ts>90000) continue; out.push([uid,r]); } return out; }
function colorFor(uid){ let h=0; for(const c of uid) h=(h*31+c.charCodeAt(0))>>>0; return `hsl(${h%360},60%,45%)`; }
function drawRemotePlayers(ox,oy){
  if(!netOn()) return;
  for(const [uid,r] of livePlayers()){ if(r.zone!==G.zone) continue; const d=MP.remote[uid]; if(!d) continue;
    const px=d.x*TILE-ox, py=d.y*TILE-oy; if(px<-40||py<-40||px>W+40||py>H+40) continue;
    if(r.lead && SPECIES[r.lead]){ const [fx,fy]=DIRS[r.dir]||[0,1]; drawCreature(r.lead,px+16-fx*22,py+22-fy*14,20,{t:G.time}); }
    drawPerson(px,py,colorFor(uid),'#222',r.dir||'down',d.moving?d.step:0,true);
    const tag=`${r.name} · Lv ${r.lvl||1}${r.battle?' ⚔':''}`; ctx.font='bold 11px Trebuchet MS'; const w=ctx.measureText(tag).width+10;
    rr(px+16-w/2,py-20,w,15,7,'rgba(0,0,0,.6)'); text(tag,px+16,py-9,{size:11,bold:true,align:'center',color:'#9ae6ff'}); }
}
function drawOnlinePanel(){
  if(!window.NET) return;
  let label; if(NET.user && NET.online){ const ps=livePlayers(); const here=ps.filter(([,r])=>r.zone===G.zone).map(([,r])=>r.name);
    label=`🌐 ${ps.length+1} online${here.length?` · here: ${here.slice(0,3).join(', ')}${here.length>3?'…':''}`:''}`; }
  else if(NET.user) label='🌐 Reconnecting…'; else label='⚪ Offline mode';
  ctx.font='bold 13px Trebuchet MS'; const w=Math.min(380,ctx.measureText(label).width+24);
  rr(W/2-w/2,10,w,24,12,'rgba(18,16,30,.85)',NET.user&&NET.online?'#4cd964':'#888',1.5); text(label,W/2,27,{size:13,bold:true,align:'center',color:NET.user&&NET.online?'#bff5c8':'#ccc'});
}
// ---------- world boss ----------
const riftActive=()=>netOn() && NET.boss && NET.boss.hp>0;
function drawRift(ox,oy){
  if(!netOn() || !NET.boss) return; const px=RIFT.x*TILE-ox+16, py=RIFT.y*TILE-oy+8;
  if(NET.boss.hp<=0){ text(`Rift sealed by ${NET.boss.defeatedBy||'tamers'} — reopens soon`,px,py,{size:11,align:'center',color:'#e0c0ff'}); return; }
  ctx.fillStyle=`rgba(180,80,255,${0.25+0.1*Math.sin(G.time*3)})`; ctx.beginPath(); ctx.ellipse(px,py+22,34,10,0,0,7); ctx.fill();
  drawCreature(RIFT.sp,px,py,58,{t:G.time}); bar(px-40,py-44,80,7,NET.boss.hp/NET.boss.max,'#b26cff'); text('WORLD BOSS',px,py-48,{size:10,bold:true,align:'center',color:'#e0c0ff'});
}
function drawSystemMenu(){
  const opts=systemOptions(); panel(W/2-170,150,340,90+opts.length*44,0.96); text('MENU',W/2,186,{size:22,bold:true,align:'center',color:'#ffd84a'});
  text(NET&&NET.user?`Signed in as ${NET.user.name}${NET.user.email?' ('+NET.user.email+')':''}`:'Playing offline',W/2,208,{size:11,align:'center',color:'#bbb'});
  opts.forEach((o,i)=>{ rr(W/2-140,222+i*44,280,36,8,G.menuSel===i?'#5a4a8a':'#2a2540','#c8a458'); text(o,W/2,246+i*44,{size:16,bold:true,align:'center'}); });
}
function systemOptions(){ return ['Resume','Save game', NET&&NET.user?'Sign out':'Back to login']; }
function systemKey(c){ const o=systemOptions(); G.menuSel=(G.menuSel+vert(c)+o.length)%o.length; if(!isConfirm(c)) return; const s=o[G.menuSel];
  if(s==='Resume') G.menu=null; else if(s==='Save game'){ saveGame(); toast(NET&&NET.user?'Saved (cloud + local)':'Saved locally','#4cd964'); G.menu=null; } else { G.menu=null; signOutToLogin(); } }
