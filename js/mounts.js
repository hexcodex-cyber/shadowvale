// ===== Shadowvale: mounts (multi-seat, multiplayer) + first-person raycast view =====
'use strict';
// G.mounts = {horse:true,...}   G.ride = {type, id, driver:bool, seat, x, y, a, duid?}
const RW=320, RH=214, FOCAL=RW/(2*0.66);
let fpCanvas=null, fctx=null, fpImg=null, fpBuf=null, zbuf=new Float32Array(RW);

// ---------- terrain ----------
function isWaterTile(c){ return c==='~'||c==='b'; }
function mountCanEnter(type,x,y){
  const tx=Math.floor(x), ty=Math.floor(y); if(tx<1||ty<1||tx>=MAP_W-1||ty>=MAP_H-1) return false;
  const t=MOUNTS[type].terrain, c=tileAt(tx,ty);
  if(t==='air') return true;
  if(t==='water') return isWaterTile(c);
  return !SOLID.has(c) && c!=='~';
}
function freeAt(type,x,y){ const r=0.22; return [[x-r,y-r],[x+r,y-r],[x-r,y+r],[x+r,y+r]].every(([a,b])=>mountCanEnter(type,a,b)); }

// ---------- summon / dismount ----------
function mountOwned(type){ return !!(G.mounts && G.mounts[type]); }
function summonMount(type){
  const m=MOUNTS[type], p=G.player;
  if(!mountOwned(type)){ toast(`You don't own a ${m.name} yet`,'#aaa'); return false; }
  let sx=p.tx+0.5, sy=p.ty+0.5;
  if(m.terrain==='water'){ const [dx,dy]=DIRS[p.dir]; const opts=[[dx,dy],[0,1],[1,0],[-1,0],[0,-1]].map(([a,b])=>[p.tx+a,p.ty+b]).find(([x,y])=>tileAt(x,y)==='~');
    if(!opts){ toast('🐋 The Orca needs water — stand next to a lake or the sea','#9ad0ff'); return false; } sx=opts[0]+0.5; sy=opts[1]+0.5; }
  else if(m.terrain==='land' && !mountCanEnter(type,sx,sy)){ toast('Not enough room here','#aaa'); return false; }
  const ang={right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2}[p.dir];
  G.ride={type, id:(window.NET&&NET.user?NET.user.uid:'local')+'-'+Date.now().toString(36), driver:true, seat:0, x:sx, y:sy, a:ang};
  G.menu=null; toast(`${m.icon} Mounted the ${m.name}! (first-person) — W/S move · A/D turn · M dismount`,'#ffd84a',4); burst(W/2,H/2,m.colors.accent,30);
  syncRideToPlayer(); return true;
}
function dismount(silent){
  const r=G.ride; if(!r) return;
  if(r.driver){ const [nx,ny]=nearestWalkable(WORLD.tiles,Math.floor(r.x),Math.floor(r.y));
    if(blocked(nx,ny) || Math.abs(nx-r.x)+Math.abs(ny-r.y)>6){ if(!silent){ toast('No land nearby to dismount on','#ff9'); return; } }
    warpTo(nx,ny); }
  else { const [nx,ny]=nearestWalkable(WORLD.tiles,G.player.tx,G.player.ty); warpTo(nx,ny); }
  G.ride=null; if(!silent) toast(`Dismounted the ${MOUNTS[r.type].name}`,'#ccc'); onStep(true);
}
function syncRideToPlayer(){ const r=G.ride, p=G.player; if(!r) return;
  p.x=p.fromX=r.x-0.5; p.y=p.fromY=r.y-0.5; const tx=Math.floor(r.x), ty=Math.floor(r.y);
  const a=((r.a%(2*Math.PI))+2*Math.PI)%(2*Math.PI); p.dir= a<Math.PI/4||a>=7*Math.PI/4?'right':a<3*Math.PI/4?'down':a<5*Math.PI/4?'left':'up';
  if(tx!==p.tx||ty!==p.ty){ p.tx=tx; p.ty=ty; onStep(true); } }

// ---------- passengers (multiplayer) ----------
function remoteMounts(){ // drivers currently riding, with seat usage
  const out=[]; for(const [uid,r] of livePlayers()){ if(r.ride && r.ride.driver && r.zone===G.zone){ const used=livePlayers().filter(([,q])=>q.ride&&q.ride.id===r.ride.id).length + (G.ride&&G.ride.id===r.ride.id?1:0);
    out.push({uid,r,used,seats:MOUNTS[r.ride.type]?MOUNTS[r.ride.type].seats:1}); } } return out; }
function tryBoardRemote(fx,fy){
  if(!netOn()) return false;
  for(const m of remoteMounts()){ const d=MP.remote[m.uid]; if(!d) continue; if(Math.abs(d.x-fx)<1.1 && Math.abs(d.y-fy)<1.1 || Math.abs(d.x-G.player.tx)<0.9&&Math.abs(d.y-G.player.ty)<0.9){
      if(m.used>=m.seats){ toast(`${m.r.name}'s ${MOUNTS[m.r.ride.type].name} is full`,'#ff9'); return true; }
      const taken=new Set(livePlayers().filter(([,q])=>q.ride&&q.ride.id===m.r.ride.id).map(([,q])=>q.ride.seat));
      let seat=1; while(taken.has(seat)) seat++;
      G.ride={type:m.r.ride.type, id:m.r.ride.id, driver:false, seat, duid:m.uid, x:d.x+0.5, y:d.y+0.5, a:m.r.ride.h||0};
      toast(`Boarded ${m.r.name}'s ${MOUNTS[m.r.ride.type].name} (seat ${seat+1}) — M to hop off`,'#9ae6ff',4); return true; } }
  return false;
}
function updatePassenger(dt){
  const r=G.ride, drv=(NET.players||{})[r.duid], d=MP.remote[r.duid];
  if(!netOn() || !drv || !drv.ride || drv.ride.id!==r.id || !d){ toast('The driver dismounted — you hop off','#ff9'); dismount(true); return; }
  r.x=d.x+0.5; r.y=d.y+0.5; let target=drv.ride.h||0, diff=((target-r.a+Math.PI*3)%(Math.PI*2))-Math.PI; r.a+=diff*Math.min(1,dt*10);
  const p=G.player; p.x=d.x; p.y=d.y; const tx=Math.round(d.x), ty=Math.round(d.y); if(tx!==p.tx||ty!==p.ty){ p.tx=tx; p.ty=ty; onStep(true); }
}

// ---------- update (called from main update when G.ride) ----------
let fpDrag=null;
function updateRide(dt){
  const r=G.ride; if(!r.driver) return updatePassenger(dt);
  const m=MOUNTS[r.type]; let turn=0, mv=0;
  if(keys.KeyA||keys.ArrowLeft) turn-=1; if(keys.KeyD||keys.ArrowRight) turn+=1;
  if(keys.KeyW||keys.ArrowUp) mv+=1; if(keys.KeyS||keys.ArrowDown) mv-=0.6;
  r.a+=turn*m.turn*dt;
  if(mv){ const sp=m.speed*speedMult()*mv*dt, nx=r.x+Math.cos(r.a)*sp, ny=r.y+Math.sin(r.a)*sp;
    if(freeAt(r.type,nx,r.y)) r.x=nx; if(freeAt(r.type,r.x,ny)) r.y=ny; r.bob=(r.bob||0)+dt*m.speed*2; }
  syncRideToPlayer();
}

// ---------- menus: mount picker (M) & stable ----------
const MOUNT_ORDER=['horse','dragonfly','dragon','orca'];
function mountSourceText(k){ const m=MOUNTS[k]; if(mountOwned(k)) return 'Owned — Enter to summon';
  if(m.source==='dock') return 'Get it free from Dockhand Marlo at the Mirror Lake dock';
  if(m.unlockFlag) return G.flags[m.unlockFlag]? 'Unlocked! Claim it FREE from Stablemaster Hilda' : `Defeat Thornwarden to unlock free, or buy for ${price2(k)}g at the Stable`;
  return `Buy from Stablemaster Hilda (Brightvale) for ${price2(k)}g`; }
function price2(k){ const m=MOUNTS[k]; return m.unlockFlag && G.flags[m.unlockFlag] ? 0 : Math.round(m.price*priceMult()); }
function drawMountMenu(title,stable){
  panel(170,70,620,480,0.96); text(title,480,108,{size:24,bold:true,align:'center',color:'#ffd84a'});
  text(stable?`Your gold: ${G.player.gold}g`:'Mounts carry friends! Other players can press E next to your mount to ride along.',480,132,{size:13,align:'center',color:'#ccc'});
  MOUNT_ORDER.forEach((k,i)=>{ const m=MOUNTS[k], y=150+i*92, sel=G.menuSel===i, own=mountOwned(k); rr(190,y,580,84,10,sel?'#3a3060':'#221e34',sel?'#ffd84a':own?'#4cd964':'#444');
    drawMount2D(k,240,y+46,0,G.time,0.9); text(`${m.icon} ${m.name}`,300,y+26,{size:18,bold:true});
    text(`Speed ${m.speed} · ${m.seats} seats · ${m.terrain==='air'?'Flying':m.terrain==='water'?'Water only':'Land'}`,300,y+46,{size:12,color:'#bbb'});
    text(m.desc,300,y+62,{size:11,color:'#999'});
    const st=stable? (own?'Owned':m.source==='dock'?'At the dock':price2(k)===0?'FREE':`${price2(k)}g`) : mountSourceText(k);
    text(st,756,y+26,{size:stable?16:11,bold:stable,align:'right',color:own?'#4cd964':stable&&m.source!=='dock'?(G.player.gold>=price2(k)?'#ffd84a':'#ff6060'):'#e0c0ff'}); });
  text(stable?'Enter/click: buy · Esc: leave':'Enter/click: summon · Esc: close',480,534,{size:13,align:'center',color:'#ccc'});
}
function mountMenuKey(c,stable){ G.menuSel=(G.menuSel+vert(c)+4)%4; if(!isConfirm(c)) return; const k=MOUNT_ORDER[G.menuSel], m=MOUNTS[k];
  if(stable){ if(mountOwned(k)) { toast('You already own it'); return; } if(m.source==='dock'){ toast('Marlo at the Mirror Lake dock looks after the orcas'); return; }
    const pr=price2(k); if(G.player.gold<pr){ toast('Not enough gold','#ff6060'); return; } G.player.gold-=pr; G.mounts=G.mounts||{}; G.mounts[k]=true; toast(`${m.icon} ${m.name} acquired! Press M to summon`,'#ffd84a',4); burst(W/2,H/2,m.colors.accent,30); saveGame(); return; }
  if(!mountOwned(k)){ toast(mountSourceText(k),'#ccc',3.5); return; } summonMount(k); }
function mountMenuClick(x,y,stable){ MOUNT_ORDER.forEach((k,i)=>{ if(x>=190&&x<=770&&y>=150+i*92&&y<=234+i*92){ G.menuSel=i; mountMenuKey('Enter',stable); } }); if(x<170||x>790||y<70||y>550) G.menu=null; }

// ---------- 2D mount sprite (top-down) ----------
function drawMount2D(type,cx,cy,ang,t,s=1){
  const m=MOUNTS[type], c=m.colors; ctx.save(); ctx.translate(cx,cy); ctx.scale(s,s);
  const flip=Math.cos(ang)<-0.1; if(flip) ctx.scale(-1,1);
  const ell=(x,y,rx,ry,col,rot=0)=>{ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot,0,7);ctx.fill();};
  ell(0,14,26,6,'rgba(0,0,0,.25)');
  if(type==='horse'){ ctx.fillStyle=c.body; [-14,-6,8,15].forEach(x=>ctx.fillRect(x,4,4,12)); ell(0,0,20,10,c.body); ell(20,-10,7,11,c.body,0.5); ell(24,-16,6,4,c.body); ctx.fillStyle=c.mane; ctx.fillRect(12,-20,5,14); ctx.fillRect(-24,-4,6,12); }
  if(type==='dragon'){ const fl=Math.sin(t*6)*6; ctx.fillStyle=c.mane; ctx.beginPath(); ctx.moveTo(-6,-4); ctx.lineTo(-30,-26-fl); ctx.lineTo(4,-8); ctx.fill(); ctx.beginPath(); ctx.moveTo(4,-4); ctx.lineTo(22,-30-fl); ctx.lineTo(14,-6); ctx.fill();
    ell(0,0,24,11,c.body); ell(26,-10,9,7,c.body); ctx.fillStyle=c.accent; ctx.beginPath(); ctx.moveTo(26,-16); ctx.lineTo(24,-26); ctx.lineTo(30,-16); ctx.fill(); ctx.strokeStyle=c.body; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(-22,0); ctx.quadraticCurveTo(-34,8,-40,-2); ctx.stroke(); ell(29,-12,1.5,1.5,'#ff0'); }
  if(type==='dragonfly'){ ctx.globalAlpha=0.55+0.35*Math.sin(t*40); ell(-4,-10,20,6,c.wing,-0.3); ell(-4,10,20,6,c.wing,0.3); ell(8,-10,18,5,c.wing,0.3); ell(8,10,18,5,c.wing,-0.3); ctx.globalAlpha=1;
    ctx.fillStyle=c.body; ctx.fillRect(-32,-3,40,6); ell(10,0,9,6,c.body); ell(18,-3,4,4,c.accent); ell(18,3,4,4,c.accent); }
  if(type==='orca'){ ell(0,6,30,5,'rgba(154,208,255,.6)'); ell(0,0,26,10,c.body); ell(4,4,16,5,c.belly); ell(16,-3,4,3,c.belly); ctx.fillStyle=c.body; ctx.beginPath(); ctx.moveTo(-4,-6); ctx.lineTo(2,-24); ctx.lineTo(8,-6); ctx.fill(); ctx.beginPath(); ctx.moveTo(-24,0); ctx.lineTo(-36,-8); ctx.lineTo(-34,8); ctx.fill(); }
  ctx.restore();
}
const SEAT_OFFSETS={horse:[[4,-14],[-10,-12]],dragon:[[8,-16],[-4,-15],[-16,-13]],dragonfly:[[4,-14],[-10,-12]],orca:[[4,-16],[-10,-14]]};
function drawRider(type,seat,px,py,ang,color,hat,name){ const o=(SEAT_OFFSETS[type]||[[0,-12]])[seat]||[0,-12]; const flip=Math.cos(ang)<-0.1?-1:1;
  ctx.save(); ctx.translate(px+16+o[0]*flip-16, py+10+o[1]-16); ctx.scale(0.8,0.8); drawPerson(4,4,color,hat,'down',0,true); ctx.restore(); }

// ---------- first-person raycast renderer ----------
function fpInit(){ fpCanvas=document.createElement('canvas'); fpCanvas.width=RW; fpCanvas.height=RH; fctx=fpCanvas.getContext('2d'); fpImg=fctx.createImageData(RW,RH); fpBuf=new Uint32Array(fpImg.data.buffer); }
const pack=(r,g,b)=>(255<<24)|((b&255)<<16)|((g&255)<<8)|(r&255);
function fogMix(c,f,fog){ return [c[0]+(fog[0]-c[0])*f, c[1]+(fog[1]-c[1])*f, c[2]+(fog[2]-c[2])*f]; }
function wallColor(c,u,v,x,y,t){ // u across face 0..1, v top..bottom 0..1
  const h=tileHash(x,y), n=((Math.sin(u*37+h)*43758.5)%1+1)%1;
  switch(c){
    case 'T': if(v>0.72) return Math.abs(u-0.5)<0.14?[92,58,30]:[70,140,60]; return [40+n*25,110+n*40,45+n*15];
    case 'R': return ((Math.floor(v*4)+Math.floor(u*3+(Math.floor(v*4)%2)*0.5))%2)?[78,65,58]:[58,47,42];
    case 'W': return (v*4%1<0.08||(u*2+Math.floor(v*4)*0.5)%1<0.05)?[30,24,40]:[69,58,92];
    case 'G': return [120,40,140];
    case 'B': { const b=WORLD.buildings.find(b=>x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h); if(v<0.3){ const rc=b?b.roof:'#8b3a3a'; return [parseInt(rc.slice(1,3),16),parseInt(rc.slice(3,5),16),parseInt(rc.slice(5,7),16)]; }
      if(v>0.45&&v<0.65&&(u%0.5)>0.15&&(u%0.5)<0.35) return [143,208,255]; return [232,220,192]; }
    case 'F': return (u*4%1<0.25||Math.abs(v-0.35)<0.08||Math.abs(v-0.7)<0.08)?[139,90,43]:null;
    case 'S': return v<0.5?[165,122,72]:(Math.abs(u-0.5)<0.08?[107,74,42]:null);
  } return [255,0,255];
}
function fpCamera(){ const r=G.ride; return {x:r.x, y:r.y, a:r.a, eye:MOUNTS[r.type].eye, fly:MOUNTS[r.type].terrain==='air'}; }
function drawFirstPerson(){
  if(!fpCanvas) fpInit();
  const cam=fpCamera(), t=G.time, dirX=Math.cos(cam.a), dirY=Math.sin(cam.a), plX=-dirY*0.66, plY=dirX*0.66;
  const hor=Math.floor(RH*0.5 - (cam.fly?18:0) + (G.ride.bob?Math.sin(G.ride.bob*3)*1.2:0)), eye=cam.eye;
  const cave=G.zone==='cave', ruins=G.zone==='ruins';
  const skyTop=cave?[20,10,8]:ruins?[25,10,40]:[70,130,220], skyBot=cave?[70,40,30]:ruins?[90,40,110]:[200,225,255], fog=skyBot, maxD=cam.fly?30:22;
  const buf=fpBuf;
  for(let y=0;y<Math.max(0,hor);y++){ const f=y/Math.max(1,hor); const c=pack(skyTop[0]+(skyBot[0]-skyTop[0])*f, skyTop[1]+(skyBot[1]-skyTop[1])*f, skyTop[2]+(skyBot[2]-skyTop[2])*f); buf.fill(c,y*RW,y*RW+RW); }
  // floor casting
  for(let y=Math.max(hor+1,0);y<RH;y++){
    const rowD=eye*FOCAL/(y-hor), fg=Math.min(1,rowD/maxD); let fx=cam.x+rowD*(dirX-plX), fy=cam.y+rowD*(dirY-plY); const sx=rowD*2*plX/RW, sy=rowD*2*plY/RW;
    for(let x=0;x<RW;x++){ const ix=Math.floor(fx), iy=Math.floor(fy); const c=(ix>=0&&iy>=0&&ix<MAP_W&&iy<MAP_H)?tileAt(ix,iy):'~';
      let col=FP_FLOOR[c]||[95,174,74];
      if(c==='~'){ const s=Math.sin(t*2+fx*3+Math.sin(fy*2+t))*14; col=[col[0]+s,col[1]+s,col[2]+s]; }
      else if(((ix+iy)&1)) col=[col[0]*0.94,col[1]*0.94,col[2]*0.94];
      const m=fogMix(col,fg,fog); buf[y*RW+x]=pack(m[0],m[1],m[2]); fx+=sx; fy+=sy; } }
  // walls (collect multiple hits per column, paint far → near; lets flying mounts see over walls)
  for(let x=0;x<RW;x++){
    const cx=2*x/RW-1, rdx=dirX+plX*cx, rdy=dirY+plY*cx; let mx=Math.floor(cam.x), my=Math.floor(cam.y);
    const ddx=Math.abs(1/(rdx||1e-9)), ddy=Math.abs(1/(rdy||1e-9)); const stx=rdx<0?-1:1, sty=rdy<0?-1:1;
    let sdx=(rdx<0?cam.x-mx:mx+1-cam.x)*ddx, sdy=(rdy<0?cam.y-my:my+1-cam.y)*ddy; const hits=[]; zbuf[x]=99;
    for(let i=0;i<64;i++){ let side; if(sdx<sdy){ sdx+=ddx; mx+=stx; side=0; } else { sdy+=ddy; my+=sty; side=1; }
      const d= side===0? sdx-ddx : sdy-ddy; if(d>maxD) break;
      const c=(mx<0||my<0||mx>=MAP_W||my>=MAP_H)?'R':tileAt(mx,my); const wc=FP_WALLS[c]; if(!wc || (c==='T' && !cam.fly)) continue;
      let u= side===0? cam.y+d*rdy : cam.x+d*rdx; u-=Math.floor(u);
      hits.push({c,d,de:Math.min(sdx,sdy),side,u,mx,my,h:wc.h}); if(zbuf[x]===99 && wc.h>eye*0.8) zbuf[x]=d;
      if(!cam.fly && wc.h>=1.3 && hits.length>=1 && wc.h>eye) { if(wc.h>=1.35) break; }
      if(hits.length>=12) break; }
    for(let k=hits.length-1;k>=0;k--){ const hh=hits[k], d=Math.max(0.08,hh.d), fg=Math.min(1,d/maxD);
      const yTop=hor-(hh.h-eye)*FOCAL/d, yBot=hor+eye*FOCAL/d;
      if(eye>hh.h){ const yT2=hor-(hh.h-eye)*FOCAL/Math.max(d+0.01,hh.de); const tc=hh.c==='T'?[50,135,55]:hh.c==='B'?[150,70,60]:[110,100,120]; const m=fogMix(tc,Math.min(1,hh.de/maxD),fog), pc=pack(m[0],m[1],m[2]);
        for(let y=Math.max(0,Math.floor(yT2));y<Math.min(RH,Math.ceil(yTop));y++) buf[y*RW+x]=pc; }
      const y0=Math.max(0,Math.floor(yTop)), y1=Math.min(RH,Math.ceil(yBot)), span=yBot-yTop, shade=hh.side?0.78:1;
      for(let y=y0;y<y1;y++){ const col=wallColor(hh.c,hh.u,(y-yTop)/span,hh.mx,hh.my,t); if(!col) continue; const m=fogMix([col[0]*shade,col[1]*shade,col[2]*shade],fg,fog); buf[y*RW+x]=pack(m[0],m[1],m[2]); } }
  }
  fctx.putImageData(fpImg,0,0); ctx.imageSmoothingEnabled=false; ctx.drawImage(fpCanvas,0,0,W,H); ctx.imageSmoothingEnabled=true;
  drawFPSprites(cam,dirX,dirY,plX,plY,hor);
  drawMountForeground(G.ride.type,t,G.ride.bob||0);
}
function drawFPSprites(cam,dirX,dirY,plX,plY,hor){
  const k=W/RW, sprites=[]; const inv=1/(plX*dirY-dirX*plY);
  const add=(x,y,kind,data)=>{ const sx=x-cam.x, sy=y-cam.y; const tx=inv*(dirY*sx-dirX*sy), ty=inv*(-plY*sx+plX*sy); if(ty<0.25||ty>28) return; sprites.push({tx,ty,kind,data}); };
  if(!cam.fly){ const R=14, cx0=Math.floor(cam.x), cy0=Math.floor(cam.y); for(let y=Math.max(0,cy0-R);y<=Math.min(MAP_H-1,cy0+R);y++) for(let x=Math.max(0,cx0-R);x<=Math.min(MAP_W-1,cx0+R);x++) { const tc=tileAt(x,y); if(tc==='T'||tc==='Y') add(x+0.5,y+0.5,'tree',{h:tileHash(x,y),dream:tc==='Y'}); } }
  NPCS.forEach(n=>add(n.x+0.5,n.y+0.5,'npc',n));
  GUARDIANS.forEach(g=>{ if(!G.flags['g_'+g.id]) add(g.x+0.5,g.y+0.5,'mon',{sp:g.sp,size:g.final?1.8:1.4}); });
  WORLD.lambs.forEach(([x,y],i)=>{ if(!G.lambs.includes(i)) add(x+0.5,y+0.5,'mon',{sp:'Fluffwool',size:0.7}); });
  WORLD.relics.forEach(([x,y],i)=>{ if(!G.relics.includes(i)) add(x+0.5,y+0.5,'relic',{}); });
  if(!G.flags.prismEgg) add(SECRET.egg[0]+0.5,SECRET.egg[1]+0.5,'egg',{});
  if(typeof riftActive==='function' && riftActive()) add(RIFT.x+0.5,RIFT.y+0.5,'mon',{sp:RIFT.sp,size:1.6});
  if(typeof livePlayers==='function' && window.NET && NET.user) for(const [uid,r] of livePlayers()){ if(r.zone!==G.zone) continue; if(G.ride && (r.ride&&r.ride.id===G.ride.id)) continue; const d=MP.remote[uid]; if(!d) continue; add(d.x+0.5,d.y+0.5,'player',{uid,r}); }
  sprites.sort((a,b)=>b.ty-a.ty);
  for(const s of sprites){ const scrX=(RW/2)*(1+s.tx/s.ty), col=Math.round(scrX); if(col>=0&&col<RW && zbuf[col]<s.ty-0.3) continue;
    const scale=FOCAL/s.ty, footY=hor+cam.eye*FOCAL/s.ty, X=scrX*k, Y=footY*k, px=scale*k; // px = pixels per tile on screen
    if(X<-200||X>W+200) continue;
    ctx.save();
    if(s.kind==='npc'||s.kind==='player'){ const sc=px/32*1.1; ctx.translate(X-16*sc,Y-30*sc); ctx.scale(sc,sc);
      if(s.kind==='player' && s.data.r.ride && s.data.r.ride.driver){ ctx.restore(); ctx.save(); drawMount2D(s.data.r.ride.type,X,Y-px*0.2,0,G.time,px/48); ctx.translate(X-16*sc,Y-44*sc); ctx.scale(sc,sc); }
      drawPerson(0,0,s.kind==='npc'?s.data.color:colorFor(s.data.uid),s.kind==='npc'?s.data.hat:'#222','down',0,s.kind==='player'); ctx.restore();
      if(px>14){ const nm=s.kind==='npc'?s.data.name:`${s.data.r.name} · Lv ${s.data.r.lvl||1}`; text(nm,X,Y-px*1.25,{size:Math.max(10,Math.min(14,px/5)),bold:true,align:'center',color:s.kind==='npc'?'#ffe9a8':'#9ae6ff'}); } continue; }
    if(s.kind==='mon'){ drawCreature(s.data.sp,X,Y-px*s.data.size*0.5,px*s.data.size,{t:G.time}); }
    if(s.kind==='tree'){ const f=Math.min(1,s.ty/(cam.fly?30:22)), fog=G.zone==='cave'?[70,40,30]:[200,225,255], v=(s.data.h%5)*6;
      const cs=(c)=>{ const m=fogMix(c,f,fog); return `rgb(${m[0]|0},${m[1]|0},${m[2]|0})`; }; const sz=px*(0.9+(s.data.h%3)*0.08);
      ctx.fillStyle=cs([92,58,30]); ctx.fillRect(X-sz*0.07,Y-sz*0.6,sz*0.14,sz*0.6);
      if(s.data.dream){ ctx.globalAlpha=0.85; }
      ctx.fillStyle=s.data.dream?`hsl(${130+Math.sin(G.time*1.3)*14},45%,32%)`:cs([34,100+v,40]); ctx.beginPath(); ctx.arc(X,Y-sz*1.0,sz*0.42,0,7); ctx.arc(X-sz*0.22,Y-sz*0.78,sz*0.3,0,7); ctx.arc(X+sz*0.22,Y-sz*0.8,sz*0.3,0,7); ctx.fill();
      ctx.fillStyle=cs([70,150+v,70]); ctx.beginPath(); ctx.arc(X-sz*0.12,Y-sz*1.1,sz*0.18,0,7); ctx.fill(); ctx.restore(); continue; }
    if(s.kind==='egg'){ ctx.fillStyle=rainbowColor(0); ctx.beginPath(); ctx.ellipse(X,Y-px*0.3,px*0.18,px*0.24,0,0,7); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke(); }
    if(s.kind==='relic'){ ctx.globalAlpha=0.8; ctx.fillStyle='#9ae6ff'; ctx.beginPath(); for(let i=0;i<8;i++){ const rr2=(i%2?0.08:0.25)*px, an=i*Math.PI/4+G.time; ctx.lineTo(X+Math.cos(an)*rr2,Y-px*0.4+Math.sin(an)*rr2);} ctx.fill(); }
    ctx.restore(); }
}
function drawMountForeground(type,t,bob){
  const c=MOUNTS[type].colors, b=Math.sin(bob*3)*6, cx=W/2; ctx.save();
  const shrink=(k)=>{ ctx.translate(cx,H); ctx.scale(k,k); ctx.translate(-cx,-H); };
  if(type==='horse') shrink(0.7);
  if(type==='horse'){ ctx.fillStyle=c.body; ctx.beginPath(); ctx.moveTo(cx-120,H); ctx.quadraticCurveTo(cx-60,H-200+b,cx-30,H-250+b); ctx.lineTo(cx+30,H-250+b); ctx.quadraticCurveTo(cx+60,H-200+b,cx+120,H); ctx.fill();
    ctx.fillStyle=c.mane; ctx.beginPath(); ctx.moveTo(cx-18,H); ctx.lineTo(cx-14,H-245+b); ctx.lineTo(cx+14,H-245+b); ctx.lineTo(cx+18,H); ctx.fill();
    for(const s of [-1,1]){ ctx.fillStyle=c.body; ctx.beginPath(); ctx.moveTo(cx+s*14,H-240+b); ctx.lineTo(cx+s*36,H-300+b+Math.sin(t*2)*3); ctx.lineTo(cx+s*40,H-236+b); ctx.fill(); ctx.fillStyle=c.accent; ctx.beginPath(); ctx.moveTo(cx+s*22,H-244+b); ctx.lineTo(cx+s*34,H-284+b); ctx.lineTo(cx+s*35,H-244+b); ctx.fill(); }
    ctx.strokeStyle='#5a3a1a'; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(cx-150,H); ctx.quadraticCurveTo(cx-60,H-150+b,cx-40,H-210+b); ctx.moveTo(cx+150,H); ctx.quadraticCurveTo(cx+60,H-150+b,cx+40,H-210+b); ctx.stroke(); }
  if(type==='dragon'){ const fl=Math.sin(t*3)*20; for(const s of [-1,1]){ ctx.fillStyle=c.mane; ctx.beginPath(); ctx.moveTo(cx+s*100,H); ctx.lineTo(cx+s*W*0.55,H-260-fl); ctx.lineTo(cx+s*W*0.52,H-120-fl*0.5); ctx.lineTo(cx+s*W*0.5,H); ctx.fill(); }
    shrink(0.65); ctx.fillStyle=c.body; ctx.beginPath(); ctx.moveTo(cx-110,H); ctx.quadraticCurveTo(cx-50,H-190+b,cx-40,H-230+b); ctx.lineTo(cx+40,H-230+b); ctx.quadraticCurveTo(cx+50,H-190+b,cx+110,H); ctx.fill();
    ctx.fillStyle='rgba(0,0,0,.18)'; for(let i=0;i<5;i++){ ctx.beginPath(); ctx.arc(cx,H-30-i*42+b*0.5,14,0,Math.PI); ctx.fill(); }
    for(const s of [-1,1]){ ctx.fillStyle=c.accent; ctx.beginPath(); ctx.moveTo(cx+s*22,H-226+b); ctx.quadraticCurveTo(cx+s*50,H-300+b,cx+s*70,H-330+b); ctx.lineTo(cx+s*40,H-226+b); ctx.fill(); } }
  if(type==='dragonfly'){ const a=0.35+0.3*Math.abs(Math.sin(t*38)); for(const s of [-1,1]) for(const off of [0,70]){ ctx.globalAlpha=a; ctx.fillStyle=c.wing; ctx.beginPath(); ctx.ellipse(cx+s*(W*0.42),H-180-off+Math.sin(t*38+off)*14,W*0.2,40,s*0.25,0,7); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,.5)'; ctx.lineWidth=1; ctx.stroke(); } ctx.globalAlpha=1;
    ctx.fillStyle=c.body; ctx.beginPath(); ctx.ellipse(cx,H+20,90,120+b,0,0,7); ctx.fill(); for(const s of [-1,1]){ ctx.fillStyle=c.accent; ctx.beginPath(); ctx.ellipse(cx+s*48,H-70+b,34,40,0,0,7); ctx.fill(); ctx.fillStyle='rgba(0,60,80,.35)'; for(let i=0;i<6;i++){ ctx.beginPath(); ctx.arc(cx+s*48+Math.cos(i)*16,H-70+b+Math.sin(i)*18,4,0,7); ctx.fill(); } } }
  if(type==='orca'){ ctx.fillStyle='rgba(154,208,255,.55)'; ctx.fillRect(0,H-60,W,60); ctx.save(); shrink(0.7); ctx.fillStyle=c.body; ctx.beginPath(); ctx.ellipse(cx,H+40,W*0.3,110,0,0,7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx-30,H-70+b); ctx.quadraticCurveTo(cx-10,H-220+b,cx+40,H-260+b); ctx.quadraticCurveTo(cx+20,H-160+b,cx+40,H-70+b); ctx.fill();
    ctx.fillStyle=c.belly; ctx.beginPath(); ctx.ellipse(cx-120,H-40,40,14,0.2,0,7); ctx.fill(); ctx.restore();
    ctx.fillStyle='rgba(255,255,255,.85)'; for(let i=0;i<14;i++){ const sx=(i%2?1:-1)*(W*0.25+Math.sin(t*4+i)*40+i*6), sy=H-40-Math.abs(Math.sin(t*5+i))*50; ctx.beginPath(); ctx.arc(cx+sx,sy,3+i%3,0,7); ctx.fill(); } }
  ctx.restore();
}
function drawRideHUD(){
  const r=G.ride, m=MOUNTS[r.type]; let used=1; if(netOn()) used=livePlayers().filter(([,q])=>q.ride&&q.ride.id===r.id).length+1;
  const seats=Array.from({length:m.seats},(_,i)=>i<used?'●':'○').join(' ');
  panel(W/2-170,40,340,56,0.8); text(`${m.icon} ${m.name} — ${r.driver?'Driving':'Passenger'}  ·  Seats ${seats}`,W/2,62,{size:14,bold:true,align:'center',color:'#ffd84a'});
  text(r.driver?(m.terrain==='air'?'Flying: soar over trees, walls & water':m.terrain==='water'?'Swimming: water only':'Galloping: land only')+' · no wild encounters':`Riding with ${(NET.players[r.duid]||{}).name||'driver'} — M to hop off`,W/2,82,{size:11,align:'center',color:'#ddd'});
  // heading arrow on minimap
  const x=W-138,y=H-102,w=128,h=88, sx=w/MAP_W, sy=h/MAP_H, px=x+(r.x)*sx, py=y+(r.y)*sy; ctx.strokeStyle='#ffd84a'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px+Math.cos(r.a)*9,py+Math.sin(r.a)*9); ctx.stroke();
}
