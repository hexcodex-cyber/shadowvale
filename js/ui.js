// ===== Shadowvale: rendering of world, HUD, menus and battle =====
'use strict';
function camera(){ const p=G.player; return [clamp(p.x*TILE+16-W/2,0,MAP_W*TILE-W), clamp(p.y*TILE+16-H/2,0,MAP_H*TILE-H)]; }

function drawWorld(){
  const [ox,oy]=camera(), t=G.time;
  const x0=Math.floor(ox/TILE), y0=Math.floor(oy/TILE);
  for(let y=y0;y<=y0+H/TILE+1;y++) for(let x=x0;x<=x0+W/TILE+1;x++){ if(x>=MAP_W||y>=MAP_H) continue; drawTile(tileAt(x,y),x,y,x*TILE-ox,y*TILE-oy,t); }
  WORLD.buildings.forEach(b=>drawBuilding(b,ox,oy));
  const tracker=rank('tracker')>0;
  const sparkle=(x,y,c,strong)=>{ const px=x*TILE-ox+16, py=y*TILE-oy+16, a=strong?0.9:0.35+0.25*Math.sin(t*4+x);
    ctx.globalAlpha=a; ctx.fillStyle=c; ctx.beginPath(); for(let i=0;i<8;i++){ const r=i%2?3:(strong?10:6)+Math.sin(t*5)*2, ang=i*Math.PI/4+t; ctx.lineTo(px+Math.cos(ang)*r,py+Math.sin(ang)*r);} ctx.fill(); ctx.globalAlpha=1; };
  WORLD.relics.forEach(([x,y],i)=>{ if(!G.relics.includes(i)) sparkle(x,y,'#9ae6ff',tracker); });
  WORLD.petals.forEach(([x,y],i)=>{ if(!G.petals.includes(i) && G.quests.petals!=='done'){ const px=x*TILE-ox, py=y*TILE-oy; ctx.fillStyle=`rgba(120,200,255,${0.6+0.3*Math.sin(t*3+i)})`; for(let k=0;k<5;k++){ctx.beginPath();ctx.arc(px+16+Math.cos(k*1.26)*5,py+16+Math.sin(k*1.26)*5,4,0,7);ctx.fill();} ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(px+16,py+16,3,0,7); ctx.fill(); if(tracker) sparkle(x,y,'#8fd0ff',true);} });
  WORLD.lambs.forEach(([x,y],i)=>{ if(!G.lambs.includes(i)){ drawCreature('Fluffwool',x*TILE-ox+16,y*TILE-oy+16,26,{t,shadow:true}); if(tracker) sparkle(x,y-0.6,'#fff',true);} });
  GUARDIANS.forEach(g=>{ if(!G.flags['g_'+g.id]){ const px=g.x*TILE-ox+16, py=g.y*TILE-oy+10; drawCreature(g.sp,px,py,g.final?64:52,{t}); text('!',px,py-36,{size:20,bold:true,color:'#ff5',align:'center'}); } });
  drawRift(ox,oy); drawRemotePlayers(ox,oy);
  NPCS.forEach(n=>{ drawPerson(n.x*TILE-ox,n.y*TILE-oy,n.color,n.hat,'down'); const q=SIDE_QUESTS.find(q=>q.giver===n.id && G.quests[q.id]!=='done' && (!q.after||G.quests[q.after]==='done'));
    let mark=null; if(n.id==='elder' && mainStage()===0) mark='!'; else if(q){ if(!G.quests[q.id]) mark='!'; else if(q.progress(G)>=q.goal) mark='?'; }
    if(mark) text(mark,n.x*TILE-ox+16,n.y*TILE-oy-8,{size:22,bold:true,color:mark==='?'?'#4cd964':'#ffd84a',align:'center'}); });
  const p=G.player; if(G.time<G.camoUntil) ctx.globalAlpha=0.5+0.2*Math.sin(t*8);
  drawPerson(p.x*TILE-ox,p.y*TILE-oy,'#2c3e50','#c0392b',p.dir,p.moving?p.prog:0,true); ctx.globalAlpha=1;
  if(G.zone==='cave'){ const g=ctx.createRadialGradient(p.x*TILE-ox+16,p.y*TILE-oy+16,80,p.x*TILE-ox+16,p.y*TILE-oy+16,420); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(10,0,0,.6)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); }
  if(G.zone==='ruins'){ ctx.fillStyle='rgba(60,0,60,.18)'; ctx.fillRect(0,0,W,H); }
}

// ---------------- HUD ----------------
function drawHUD(){
  const p=G.player;
  // player panel
  panel(10,10,250,112);
  text(p.name.length>14?p.name.slice(0,13)+'…':p.name,22,34,{size:18,bold:true}); text(`Lv ${p.level}`,248,34,{size:18,bold:true,color:'#ffd84a',align:'right'});
  bar(22,42,226,10,p.level>=MAX_PLAYER_LEVEL?1:p.xp/playerXpNeed(p.level),'#b26cff');
  text(p.level>=MAX_PLAYER_LEVEL?'MAX LEVEL':`XP ${p.xp}/${playerXpNeed(p.level)}`,135,66,{size:12,align:'center',color:'#ddd'});
  text(`💰 ${p.gold}g`,22,88,{size:15,color:'#ffd84a'}); text(`◈ ${G.shards.length}/3`,120,88,{size:15,color:'#ff9ad0'}); text(`✦ ${G.relics.length}/8`,190,88,{size:15,color:'#9ae6ff'});
  if(p.points>0){ const a=0.6+0.4*Math.sin(G.time*5); rr(18,96,234,20,6,`rgba(255,216,74,${a*0.35})`,'#ffd84a',1); text(`★ ${p.points} talent point${p.points>1?'s':''} — press T`,135,111,{size:13,bold:true,align:'center',color:'#ffd84a'}); }
  else text(`Talents: ${TALENTS.map((b,i)=>b.branch.slice(0,5)+' '+pointsInBranch(i)).join(' · ')}`,135,111,{size:11,align:'center',color:'#bbb'});
  // party
  panel(10,128,250,14+G.party.length*30);
  G.party.forEach((c,i)=>{ const y=142+i*30; drawCreature(c.sp,32,y+10,24,{shadow:false}); text(`${c.sp}`,50,y+8,{size:13,bold:true,color:c.hp>0?'#fff':'#888'}); text(`Lv ${c.level}`,248,y+8,{size:12,align:'right',color:'#ffd84a'});
    bar(50,y+13,120,6,c.hp/c.maxhp,hpColor(c.hp/c.maxhp)); text(`${c.hp}/${c.maxhp}`,176,y+20,{size:10,color:'#ccc'}); bar(210,y+15,38,3,c.xp/monXpNeed(c.level),'#6fb7ff'); });
  // quest tracker
  const lines=[]; const s=mainStage();
  lines.push({t:'◆ '+MAIN_QUEST.name,c:'#ffd84a',b:true}); lines.push({t:MAIN_QUEST.stages[s]+(s===1?` (${G.shards.length}/3)`:''),c:'#fff'});
  SIDE_QUESTS.forEach(q=>{ if(G.quests[q.id]==='active'){ const pr=Math.min(q.progress(G),q.goal); lines.push({t:'◇ '+q.name,c:pr>=q.goal?'#4cd964':'#8fd0ff',b:true}); lines.push({t:pr>=q.goal?`Return to ${NPCS.find(n=>n.id===q.giver).name}`:`${q.obj}: ${pr}/${q.goal}`,c:'#ddd'}); } });
  let wrapped=[]; lines.forEach(l=>wrap(l.t,270,13).forEach(w=>wrapped.push({...l,t:w})));
  panel(W-300,10,290,20+wrapped.length*17); wrapped.forEach((l,i)=>text(l.t,W-288,30+i*17,{size:13,color:l.c,bold:l.b}));
  // ability hotbar (overworld + battle abilities)
  const all=[...OVERWORLD_ABILITIES,'rally','unleash','snare']; const bw=54, bx=W/2-(all.length*bw+8)/2;
  panel(bx-6,H-72,all.length*bw+20,64);
  all.forEach((id,i)=>{ const t=TALENT_BY_ID[id], x=bx+i*bw+4, y=H-66, un=rank(id)>0;
    rr(x,y,46,46,6,un?'#2a2540':'#1a1a1a',un?TALENTS[t.bi].color:'#444',2);
    ctx.globalAlpha=un?1:0.3; text(t.icon,x+23,y+32,{size:24,align:'center',shadow:false}); ctx.globalAlpha=1;
    if(!un) text('🔒',x+34,y+44,{size:12,align:'center',shadow:false});
    const cdEnd=G.cooldowns[id]||0; if(un && t.cd && G.time<cdEnd){ const f=(cdEnd-G.time)/t.cd; ctx.fillStyle='rgba(0,0,0,.65)'; ctx.fillRect(x,y,46,46*f); text(Math.ceil(cdEnd-G.time)+'',x+23,y+30,{size:16,bold:true,align:'center'}); }
    text(t.key?`[${t.key}]`:'⚔',x+4,y+12,{size:10,color:t.key?'#fff':'#f99'});
  });
  text('Overworld [1][2][3]  ·  ⚔ = battle abilities',W/2,H-76,{size:11,align:'center',color:'#ccc'});
  if(G.time<G.camoUntil) text(`🍃 Camouflaged ${Math.ceil(G.camoUntil-G.time)}s`,W/2,H-94,{size:14,bold:true,align:'center',color:'#7be07b'});
  // minimap
  drawMinimap(W-138,H-102,128,88);
  drawOnlinePanel(); drawChat();
  // key hints

  // zone
  text(ZONE_NAMES[G.zone]||'',W-74,H-108,{size:12,align:'center',color:'#ffe9a8'});
}
let minimapCanvas=null;
function drawMinimap(x,y,w,h){
  if(!minimapCanvas){ minimapCanvas=document.createElement('canvas'); minimapCanvas.width=MAP_W; minimapCanvas.height=MAP_H; const m=minimapCanvas.getContext('2d');
    const col={'.':'#5fae4a',',':'#3d8c30','T':'#1f5a22','~':'#2f78c4','=':'#c9a86a','s':'#e8d59a','R':'#3a2f2a','c':'#6b5040','W':'#2b2438','r':'#4a3a60','G':'#ff3fbf','b':'#8b5a2b','f':'#7cc060','B':'#c04040','F':'#8b5a2b','S':'#a57a48'};
    for(let j=0;j<MAP_H;j++) for(let i=0;i<MAP_W;i++){ m.fillStyle=col[WORLD.tiles[j][i]]||'#000'; m.fillRect(i,j,1,1); } }
  panel(x-4,y-4,w+8,h+8); ctx.imageSmoothingEnabled=false; ctx.drawImage(minimapCanvas,x,y,w,h);
  const sx=w/MAP_W, sy=h/MAP_H;
  GUARDIANS.forEach(g=>{ if(!G.flags['g_'+g.id]){ ctx.fillStyle='#ff3030'; ctx.fillRect(x+g.x*sx-2,y+g.y*sy-2,4,4);} });
  if(rank('tracker')){ ctx.fillStyle='#9ae6ff'; WORLD.relics.forEach(([rx,ry],i)=>{ if(!G.relics.includes(i)) ctx.fillRect(x+rx*sx-1,y+ry*sy-1,3,3); });
    ctx.fillStyle='#fff'; WORLD.lambs.forEach(([rx,ry],i)=>{ if(!G.lambs.includes(i)) ctx.fillRect(x+rx*sx-1,y+ry*sy-1,3,3); });
    ctx.fillStyle='#8fd0ff'; WORLD.petals.forEach(([rx,ry],i)=>{ if(!G.petals.includes(i)) ctx.fillRect(x+rx*sx-1,y+ry*sy-1,3,3); }); }
  ctx.fillStyle='#ffd84a'; ctx.fillRect(x+G.player.x*sx-2,y+G.player.y*sy-2,5,5);
}
function drawToasts(){ toasts.forEach((t,i)=>{ ctx.globalAlpha=Math.min(1,t.life*2); ctx.font='bold 15px Trebuchet MS'; const w=ctx.measureText(t.t).width+30; rr(W/2-w/2,140+i*34,w,28,14,'rgba(0,0,0,.75)',t.color,1.5); text(t.t,W/2,159+i*34,{size:15,bold:true,align:'center',color:t.color}); ctx.globalAlpha=1; }); }
function drawDialog(){ const d=G.dialog; if(!d) return;
  panel(60,H-190,W-120,110,0.95); if(d.name) { rr(76,H-206,ctx.measureText(d.name).width+60,26,6,'#3a2f55','#c8a458'); text(d.name,90,H-187,{size:15,bold:true,color:'#ffd84a'}); }
  wrap(d.lines[d.i],W-170,17).forEach((l,i)=>text(l,84,H-155+i*24,{size:17}));
  if(d.choice && d.i===d.lines.length-1){ d.choice.options.forEach((o,i)=>{ const x=W-300+i*120; rr(x,H-116,110,28,6,i===d.sel?'#5a4a8a':'#2a2540','#c8a458'); text(o,x+55,H-97,{size:14,align:'center',bold:true}); }); }
  else text('▼ Space',W-90,H-92,{size:12,color:'#ccc',align:'right'}); }

// ---------------- Talent tree screen ----------------
function talentNodePos(t){ const px=40+t.bi*300; return [px+ (t.col===0.5? 105 : t.col===0? 50 : 160), 150+t.tier*130]; }
function drawTalents(){
  ctx.fillStyle='rgba(8,6,16,.94)'; ctx.fillRect(0,0,W,H);
  text('TALENTS',W/2,40,{size:28,bold:true,align:'center',color:'#ffd84a'}); rr(W-60,6,54,30,8,'#3a3060','#c8a458'); text('✕',W-33,28,{size:18,bold:true,align:'center'});
  text(`${G.player.name} — Level ${G.player.level}   ·   Points available: ${G.player.points}   ·   Spent: ${totalSpent()}`,W/2,66,{size:15,align:'center',color:G.player.points?'#ffd84a':'#ccc'});
  TALENTS.forEach((b,bi)=>{ const px=40+bi*300; rr(px,82,280,420,10,'rgba(30,26,48,.9)',b.color,2);
    text(`${b.icon} ${b.branch}`,px+140,108,{size:19,bold:true,align:'center',color:b.color}); text(`${pointsInBranch(bi)} points · ${b.desc}`,px+140,126,{size:11,align:'center',color:'#bbb'});
    [1,2].forEach(tier=>{ const y=150+tier*130-22; text(`Tier ${tier+1}: ${TIER_REQ[tier]} pts`,px+8,y-14,{size:10,color:pointsInBranch(bi)>=TIER_REQ[tier]?'#7be07b':'#777'}); });
    b.talents.forEach(t=>{ if(t.req){ const [x1,y1]=talentNodePos(TALENT_BY_ID[t.req]),[x2,y2]=talentNodePos(t); ctx.strokeStyle=rank(t.req)>=TALENT_BY_ID[t.req].max?'#ffd84a':'#555'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(x1+32,y1+64); ctx.lineTo(x2+32,y2); ctx.stroke(); ctx.fillStyle=ctx.strokeStyle; ctx.beginPath(); ctx.moveTo(x2+24,y2-8); ctx.lineTo(x2+40,y2-8); ctx.lineTo(x2+32,y2); ctx.fill(); } });
    b.talents.forEach(t=>{ const [x,y]=talentNodePos(t), r=rank(t.id), lock=talentLockReason(t), can=canSpend(t), sel=G.talentSel===t.id;
      const border = r>=t.max?'#ffd84a': can?'#4cd964': r>0?'#ffd84a': '#555';
      if(can){ ctx.shadowColor='#4cd964'; ctx.shadowBlur=12+6*Math.sin(G.time*4); }
      rr(x,y,64,64,10,lock&&!r?'#1a1a22':'#2e2848',border,3); ctx.shadowBlur=0;
      ctx.globalAlpha=lock&&!r?0.35:1; text(t.icon,x+32,y+43,{size:32,align:'center',shadow:false}); ctx.globalAlpha=1;
      rr(x+38,y+48,30,18,5,'#111',border,1.5); text(`${r}/${t.max}`,x+53,y+61,{size:11,bold:true,align:'center',color:r>=t.max?'#ffd84a':'#fff'});
      if(t.kind!=='passive') rr(x-6,y-6,14,14,7,t.kind==='battle'?'#e0533d':'#3d8bff');
      text(t.name,x+32,y+80,{size:11,align:'center',color:lock&&!r?'#777':'#eee'});
      if(sel){ ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.setLineDash([5,4]); ctx.strokeRect(x-6,y-6,76,76); ctx.setLineDash([]); }
    }); });
  // tooltip
  const t=TALENT_BY_ID[G.talentSel]; panel(40,512,880,100,0.95);
  if(t){ const r=rank(t.id), lock=talentLockReason(t);
    text(`${t.icon} ${t.name}`,56,538,{size:18,bold:true,color:TALENTS[t.bi].color}); text(`Rank ${r}/${t.max}  ·  ${t.kind==='passive'?'Passive':t.kind==='battle'?'Active — Battle':'Active — Overworld'}`,260,538,{size:13,color:'#ccc'});
    text(r>0?`Current: ${t.text(r)}`:t.text(1),56,562,{size:14});
    if(r>0 && r<t.max) text(`Next rank: ${t.text(r+1)}`,56,582,{size:14,color:'#7be07b'});
    text(lock? '🔒 '+lock : r>=t.max? 'Maxed!' : G.player.points? 'Press Enter / click to learn' : 'No talent points — level up to earn more',56,602,{size:13,color:lock?'#ff7070':r>=t.max?'#ffd84a':'#7be07b'}); }
  text('Arrows/mouse select · Enter learn · R reset · Esc/T close',W-50,600,{size:11,align:'right',color:'#888'});
  text('● blue = overworld ability  ● red = battle ability',W-50,582,{size:11,align:'right',color:'#888'});
}
function talentNav(dir){
  const curT=TALENT_BY_ID[G.talentSel]; const [cx,cy]=talentNodePos(curT); const [dx,dy]=DIRS[dir];
  let best=null,bd=1e9; Object.values(TALENT_BY_ID).forEach(t=>{ if(t===curT) return; const [x,y]=talentNodePos(t); const vx=x-cx, vy=y-cy; const along=vx*dx+vy*dy; if(along<=0) return; const perp=Math.abs(vx*dy-vy*dx); const d=along+perp*2; if(d<bd){bd=d;best=t;} });
  if(best) G.talentSel=best.id;
}

// ---------------- Party / Quests / Bag / Shop ----------------
function drawParty(){
  panel(60,40,W-120,H-80,0.96); text('PARTY',W/2,74,{size:24,bold:true,align:'center',color:'#ffd84a'});
  G.party.forEach((c,i)=>{ const y=92+i*78, sel=G.menuSel===i; rr(80,y,W-160,70,8,sel?'#3a3060':'#221e34',sel?'#ffd84a':'#444');
    drawCreature(c.sp,120,y+36,54,{t:G.time}); text(`${c.sp}`,160,y+24,{size:17,bold:true}); typeBadge(SPECIES[c.sp].type,160,y+32);
    text(`Lv ${c.level}`,300,y+24,{size:16,color:'#ffd84a',bold:true}); bar(300,y+32,150,9,c.hp/c.maxhp,hpColor(c.hp/c.maxhp)); text(`HP ${c.hp}/${c.maxhp}`,300,y+58,{size:12,color:'#ccc'});
    bar(460,y+34,60,5,c.xp/monXpNeed(c.level),'#6fb7ff'); text(`ATK ${c.atk} DEF ${c.def} SPD ${c.spd}`,400,y+58,{size:11,color:'#aaa'});
    c.moves.forEach((m,k)=>{ const mx=540+(k%2)*170, my=y+10+Math.floor(k/2)*28; rr(mx,my,162,24,5,TYPE_COLORS[MOVES[m].type]+'aa'); text(`${m} ${MOVES[m].power||'—'}`,mx+81,my+17,{size:12,align:'center',bold:true}); });
    if(i===0) text('LEAD',86,y+14,{size:10,color:'#ffd84a',bold:true}); });
  text(`Enter: set as lead · H: use Potion (${G.items.potion}) · Esc: close   ·   Storage: ${G.storage.length}`,W/2,H-56,{size:13,align:'center',color:'#ccc'});
}
function drawQuests(){
  panel(80,40,W-160,H-80,0.96); text('QUEST LOG',W/2,74,{size:24,bold:true,align:'center',color:'#ffd84a'});
  let y=110; const s=mainStage();
  text(`◆ ${MAIN_QUEST.name} (Main)`,110,y,{size:18,bold:true,color:'#ffd84a'}); y+=24;
  MAIN_QUEST.stages.forEach((st,i)=>{ text(`${i<s?'✔':i===s?'➤':'·'} ${st}`,130,y,{size:14,color:i<s?'#7be07b':i===s?'#fff':'#777'}); y+=20; });
  y+=12; text('Side Quests',110,y,{size:18,bold:true,color:'#8fd0ff'}); y+=26;
  SIDE_QUESTS.forEach(q=>{ const st=G.quests[q.id]; const giver=NPCS.find(n=>n.id===q.giver).name; const pr=Math.min(q.progress(G),q.goal);
    const label = st==='done'?'✔ Complete': st==='active'? (pr>=q.goal?`Ready — return to ${giver}`:`${q.obj}: ${pr}/${q.goal}`) : `Not started — talk to ${giver}`;
    text(`${st==='done'?'✔':st?'◇':'?'} ${q.name}`,130,y,{size:15,bold:true,color:st==='done'?'#7be07b':st?'#fff':'#888'}); text(label,380,y,{size:14,color:st==='done'?'#7be07b':'#ccc'});
    const r=q.reward; text(`Reward: ${[r.gold&&r.gold+'g',r.xp&&r.xp+' XP',r.points&&'+1 Talent Point',r.flag&&'Ancient Crown',r.items&&Object.entries(r.items).map(([k,n])=>n+'x '+ITEMS[k].name).join(', ')].filter(Boolean).join(' · ')}`,150,y+18,{size:11,color:'#999'}); y+=44; });
  text('Esc: close',W/2,H-56,{size:13,align:'center',color:'#ccc'});
}
const BAG_TABS=['Items','Bestiary','Collection'];
function drawBag(){
  panel(60,40,W-120,H-80,0.96); BAG_TABS.forEach((t,i)=>{ rr(90+i*170,56,160,32,8,G.bagTab===i?'#5a4a8a':'#2a2540','#c8a458'); text(t,170+i*170,78,{size:16,bold:true,align:'center'}); });
  if(G.bagTab===0){ Object.keys(ITEMS).forEach((k,i)=>{ const y=120+i*52; rr(90,y,W-180,44,6,'#221e34','#444'); text(`${ITEMS[k].name}  x${G.items[k]||0}`,110,y+20,{size:16,bold:true}); text(ITEMS[k].desc,110,y+38,{size:12,color:'#bbb'}); }); }
  if(G.bagTab===1){ text(`Caught ${Object.keys(G.dex.caught).length} / ${DEX_ORDER.length}  ·  Seen ${Object.keys(G.dex.seen).filter(s=>!SPECIES[s].boss).length}`,W/2,112,{size:14,align:'center',color:'#ccc'});
    DEX_ORDER.forEach((sp,i)=>{ const x=90+(i%4)*200, y=124+Math.floor(i/4)*140, caught=G.dex.caught[sp], seen=G.dex.seen[sp]; rr(x,y,190,130,8,'#221e34',caught?'#ffd84a':'#444');
      if(seen) drawCreature(sp,x+95,y+52,60,{t:G.time,alpha:caught?1:0.35}); else text('?',x+95,y+66,{size:40,align:'center',color:'#555'});
      text(seen?sp:'???',x+95,y+104,{size:14,bold:true,align:'center',color:caught?'#fff':'#888'}); if(seen) text(SPECIES[sp].type+(caught?' · caught':' · seen'),x+95,y+120,{size:11,align:'center',color:TYPE_COLORS[SPECIES[sp].type]}); }); }
  if(G.bagTab===2){ let y=120; text(`Glimmer Relics: ${G.relics.length}/8`,100,y,{size:18,bold:true,color:'#9ae6ff'}); for(let i=0;i<8;i++){ const got=G.relics.includes(i); text(got?'✦':'✧',110+i*50,y+44,{size:34,color:got?'#9ae6ff':'#444'}); }
    y+=90; text(`Rune Shards: ${G.shards.length}/3`,100,y,{size:18,bold:true,color:'#ff9ad0'}); ['Verdant Shard','Ember Shard','Tidal Shard'].forEach((s,i)=>text(`${G.shards.includes(s)?'◈':'◇'} ${s}`,110+i*220,y+32,{size:16,color:G.shards.includes(s)?'#ff9ad0':'#555'}));
    y+=80; text(`Moonpetals: ${G.petals.length}/5    Lambs found: ${G.lambs.length}/3    Wild wins: ${G.wildWins}`,100,y,{size:16,color:'#ddd'});
    y+=40; text(G.flags.crown?'👑 Ancient Crown equipped (+10% XP)':'👑 Ancient Crown — ???',100,y,{size:16,color:G.flags.crown?'#ffd84a':'#555'}); }
  text('←/→ switch tab · Esc close',W/2,H-56,{size:13,align:'center',color:'#ccc'});
}
const SHOP_ITEMS=['soulstone','greater','potion','superpotion','revive'];
function drawShop(){
  panel(200,80,560,440,0.96); text("GIL'S GOODS",480,116,{size:24,bold:true,align:'center',color:'#ffd84a'}); text(`Your gold: ${G.player.gold}g${rank('haggler')?`  (Haggler: -${rank('haggler')*10}%)`:''}`,480,140,{size:14,align:'center'});
  SHOP_ITEMS.forEach((k,i)=>{ const y=160+i*62, sel=G.menuSel===i; rr(220,y,520,54,8,sel?'#3a3060':'#221e34',sel?'#ffd84a':'#444');
    text(`${ITEMS[k].name}`,240,y+24,{size:16,bold:true}); text(`${price(k)}g`,720,y+24,{size:16,bold:true,align:'right',color:G.player.gold>=price(k)?'#ffd84a':'#ff6060'}); text(`${ITEMS[k].desc}  (own ${G.items[k]||0})`,240,y+44,{size:12,color:'#bbb'}); });
  text('Enter: buy · Esc: leave',480,H-132,{size:13,align:'center',color:'#ccc'});
}

// ---------------- Battle screen ----------------
function battleMenuOptions(){ const b=G.battle;
  if(b.menu==='main') return ['Fight','Ability','Bag','Creatures','Run'];
  if(b.menu==='fight') return cur(b).moves;
  if(b.menu==='ability') return BATTLE_ABILITIES.map(a=>a.name);
  if(b.menu==='bag') return BATTLE_ITEMS.map(k=>`${ITEMS[k].name} x${G.items[k]||0}`);
  if(b.menu==='swap') return G.party.map(c=>`${c.sp} Lv${c.level} ${c.hp}/${c.maxhp}`);
  if(b.menu==='learn') return [...b.learn.mon.moves, `Don't learn ${b.learn.move}`];
  return []; }
const BATTLE_ITEMS=['soulstone','greater','potion','superpotion','revive'];
function battleOptRect(i,menu){ const grid=menu==='fight'||menu==='learn', mx=W-380;
  if(menu==='learn'&&i===4) return {x:mx,y:H-180+84,w:348,h:36};
  return {x:mx+(grid?i%2:0)*178, y:H-180+(grid?Math.floor(i/2):i)*(grid?40:30), w:grid?170:348, h:grid?36:27}; }
function drawBattle(){
  const b=G.battle, e=b.enemy, p=cur(b), t=G.time;
  const zone=b.guardian?b.guardian.zone:G.zone; const sky={forest:['#274d2f','#6fa86a'],cave:['#2a1410','#6b3a22'],lake:['#3a7bd5','#a8e0ff'],ruins:['#150a22','#4a2060'],meadow:['#6ec6ff','#c8f0a0'],town:['#6ec6ff','#c8f0a0']}[zone]||['#6ec6ff','#c8f0a0'];
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,sky[0]); g.addColorStop(1,sky[1]); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(700,250,150,34,0,0,7); ctx.fill(); ctx.beginPath(); ctx.ellipse(250,430,170,38,0,0,7); ctx.fill();
  const es=b.shake.e>0?Math.sin(b.shake.e*60)*8:0, ps=b.shake.p>0?Math.sin(b.shake.p*60)*8:0, slide=b.intro*400;
  if(!(b.over && e.hp<=0 && !b.caught) && !b.caught) drawCreature(e.sp,700+es+slide,190,SPECIES[e.sp].boss?190:150,{t});
  else if(e.hp<=0) drawCreature(e.sp,700,210,150,{t,alpha:0.25});
  if(p.hp>0) drawCreature(p.sp,250+ps-slide,360,170,{t,flip:true});
  if(b.flash>0){ ctx.fillStyle=`rgba(255,255,255,${b.flash*3})`; ctx.fillRect(0,0,W,H); }
  // enemy panel
  panel(40,30,330,86); text(`${b.wild?'':'★ '}${e.sp}`,56,58,{size:20,bold:true}); text(`Lv ${e.level}`,354,58,{size:18,bold:true,align:'right',color:'#ffd84a'}); typeBadge(SPECIES[e.sp].type,56,68);
  bar(126,72,228,12,e.hp/e.maxhp,hpColor(e.hp/e.maxhp)); if(G.dex.caught[e.sp]) text('●',360,104,{size:12,color:'#ff5050',align:'right'});
  const st=(s)=>[s.atk&&`ATK${s.atk>0?'+':''}${s.atk}`,s.def&&`DEF${s.def>0?'+':''}${s.def}`].filter(Boolean).join(' ');
  text(st(b.stages.e),56,106,{size:12,color:'#ffb'});
  if(b.guardian && b.guardian.world && window.NET && NET.boss){ panel(390,30,250,40); text(`🌐 Shared HP ${NET.boss.hp}/${NET.boss.max}`,402,48,{size:12,bold:true,color:'#e0c0ff'}); bar(402,54,226,8,NET.boss.hp/NET.boss.max,'#b26cff'); }
  // player panel
  panel(W-380,300,350,108); text(p.sp,W-364,328,{size:20,bold:true}); text(`Lv ${p.level}`,W-46,328,{size:18,bold:true,align:'right',color:'#ffd84a'}); typeBadge(SPECIES[p.sp].type,W-364,338);
  bar(W-294,342,248,12,p.hp/p.maxhp,hpColor(p.hp/p.maxhp)); text(`${p.hp}/${p.maxhp}`,W-46,372,{size:14,align:'right'});
  bar(W-364,382,318,6,p.xp/monXpNeed(p.level),'#6fb7ff'); text(`XP ${p.xp}/${monXpNeed(p.level)}  ${st(b.stages.p)}${b.unleash?'  🐉 UNLEASHED':''}`,W-364,402,{size:11,color:'#bbb'});
  // tamer strip (player level + abilities)
  panel(40,124,330,30,0.75); const abil=BATTLE_ABILITIES.filter(a=>rank(a.id)).map(a=>`${TALENT_BY_ID[a.id].icon}${b.used[a.id]?'✗':'✓'}`).join(' ');
  text(`🧙 ${G.player.name} Lv ${G.player.level}   Abilities: ${abil||'none (see T)'}`,52,144,{size:12,color:'#ddd'});
  // message + menu
  panel(20,H-190,W-40,170,0.95);
  const opts=battleMenuOptions(); const hasMenu=b.menu!=='msg';
  const msgW = hasMenu? W-420 : W-80;
  wrap(b.msg,msgW,18).forEach((l,i)=>text(l,44,H-150+i*26,{size:18}));
  if(!hasMenu) text('▼ Space',W-50,H-36,{size:12,align:'right',color:'#ccc'});
  if(hasMenu){ opts.forEach((o,i)=>{ const {x,y,w,h}=battleOptRect(i,b.menu);
      let fill='#2a2540', dis=false;
      if(b.menu==='fight'){ fill=TYPE_COLORS[MOVES[o].type]+'99'; }
      if(b.menu==='learn' && i<4) fill=TYPE_COLORS[MOVES[o].type]+'99';
      if(b.menu==='ability'){ const a=BATTLE_ABILITIES[i]; dis=!rank(a.id)||b.used[a.id]||(a.wildOnly&&!b.wild); }
      if(b.menu==='bag'){ const k=BATTLE_ITEMS[i]; dis=!(G.items[k]>0) || (ITEMS[k].catchMult&&!b.wild); }
      if(b.menu==='swap'){ const c=G.party[i]; dis=c.hp<=0||i===b.pi; }
      rr(x,y,w,h,6,fill,i===b.sel?'#ffd84a':'#555',i===b.sel?3:1.5); ctx.globalAlpha=dis?0.4:1;
      let label=o; if(b.menu==='ability'){ const a=BATTLE_ABILITIES[i]; label=`${TALENT_BY_ID[a.id].icon} ${o}${!rank(a.id)?' 🔒':b.used[a.id]?' (used)':''}`; }
      text(label,x+(w>200?14:w/2),y+h/2+5,{size:14,bold:true,align:w>200?'left':'center'}); ctx.globalAlpha=1; });
    // detail line
    let info=''; const sel=b.sel;
    if(b.menu==='fight'||(b.menu==='learn'&&sel<4)){ const mv=MOVES[opts[sel]]; if(mv) info=`${mv.type} · Power ${mv.power||'—'} · Acc ${mv.acc}% ${mv.desc?'· '+mv.desc:''}${mv.power?` · ${typeMult(mv.type,SPECIES[e.sp].type)>1?'Super effective!':typeMult(mv.type,SPECIES[e.sp].type)<1?'Not very effective':''}`:''}`; }
    if(b.menu==='learn'){ const nm=MOVES[b.learn.move]; info = sel<4? `Forget ${opts[sel]} → learn ${b.learn.move} (${nm.type} · Power ${nm.power||'—'})` : `Keep current moves`; }
    if(b.menu==='ability'){ const a=BATTLE_ABILITIES[sel]; info=rank(a.id)?TALENT_BY_ID[a.id].text(1).replace('BATTLE ABILITY: ',''):`Locked — learn ${a.name} in the talent tree (T).`; }
    if(b.menu==='bag') info=ITEMS[BATTLE_ITEMS[sel]].desc;
    if(info) wrap(info,msgW,13).slice(0,2).forEach((l,i)=>text(l,44,H-56+i*18,{size:13,color:'#cfe'}));
    if(b.menu!=='main' && !(b.menu==='swap'&&b.forced) && b.menu!=='learn') text('Esc: back',W-40,H-28,{size:11,align:'right',color:'#999'}); }
}

// ---------------- Title / starter / win ----------------
function drawTitle(bgOnly){
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#1a0f2e'); g.addColorStop(1,'#3a2060'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  for(let i=0;i<60;i++){ ctx.fillStyle=`rgba(255,255,255,${0.3+0.3*Math.sin(G.time*2+i)})`; ctx.fillRect((i*137)%W,(i*71)%300,2,2); }
  drawCreature('Umbrax',W/2,250,200,{t:G.time,alpha:0.5});
  text('SHADOWVALE',W/2,130,{size:64,bold:true,align:'center',color:'#ffd84a'}); text('Tamers of the Shadow Wyrm',W/2,170,{size:20,align:'center',color:'#e0c0ff'});
  if(bgOnly) return;
  const opts=hasSave()?['Continue','New Game']:['New Game']; opts.forEach((o,i)=>{ rr(W/2-120,400+i*56,240,44,10,G.menuSel===i?'#5a4a8a':'#2a2540','#c8a458',2); text(o,W/2,428+i*56,{size:20,bold:true,align:'center'}); });
  text('A Pokémon-style adventure with a World of Warcraft talent tree',W/2,H-80,{size:13,align:'center',color:'#aaa'});
  text(window.NET&&NET.user?`🌐 Signed in as ${NET.user.name} — cloud save & shared world enabled`:'⚪ Offline mode — progress saved in this browser only',W/2,H-100,{size:14,align:'center',color:window.NET&&NET.user?'#9ae6ff':'#ccc'});
}
function drawStarter(){
  ctx.fillStyle='#1d1830'; ctx.fillRect(0,0,W,H); text('Choose your first companion',W/2,80,{size:30,bold:true,align:'center',color:'#ffd84a'});
  ['Emberpup','Tidefin','Sproutle'].forEach((sp,i)=>{ const x=100+i*270, sel=G.menuSel===i; rr(x,130,240,360,14,sel?'#3a3060':'#221e34',sel?'#ffd84a':'#555',3);
    drawCreature(sp,x+120,260,sel?170:140,{t:G.time}); text(sp,x+120,390,{size:24,bold:true,align:'center'}); typeBadge(SPECIES[sp].type,x+89,402); wrap(SPECIES[sp].desc,210,13).forEach((l,k)=>text(l,x+120,445+k*18,{size:13,align:'center',color:'#ccc'})); });
  text('←/→ choose · Enter confirm',W/2,560,{size:15,align:'center',color:'#ccc'});
}
function drawWin(){
  ctx.fillStyle='rgba(10,5,20,.9)'; ctx.fillRect(0,0,W,H); text('VICTORY!',W/2,160,{size:64,bold:true,align:'center',color:'#ffd84a'});
  text('Umbrax is defeated and the shadow lifts from Shadowvale.',W/2,220,{size:20,align:'center'});
  const st=[`Tamer level: ${G.player.level}`,`Species caught: ${Object.keys(G.dex.caught).length}/${DEX_ORDER.length}`,`Relics: ${G.relics.length}/8`,`Side quests: ${SIDE_QUESTS.filter(q=>G.quests[q.id]==='done').length}/${SIDE_QUESTS.length}`,`Talents: ${TALENTS.map((b,i)=>b.branch+' '+pointsInBranch(i)).join(', ')}`];
  st.forEach((s,i)=>text(s,W/2,290+i*32,{size:18,align:'center',color:'#e0c0ff'}));
  text('Press Enter to keep exploring (finish your collection!)',W/2,520,{size:16,align:'center',color:'#ccc'});
}
