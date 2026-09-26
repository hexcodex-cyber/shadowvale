// ===== Shadowvale: world logic, UI screens, input & main loop =====
'use strict';
let WORLD, canvas, keys={}, lastT=0, toasts=[], mouse={x:0,y:0};
const DIRS={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
const ENCOUNTER_RATE={',':0.12,'c':0.07};

// ---------------- world setup ----------------
function initWorld(){
  WORLD=buildWorld();
  WORLD.relics=RELIC_SPOTS.map(([x,y])=>nearestWalkable(WORLD.tiles,x,y));
  WORLD.petals=PETAL_SPOTS.map(([x,y])=>nearestWalkable(WORLD.tiles,x,y));
  WORLD.lambs=LAMB_SPOTS.map(([x,y])=>nearestWalkable(WORLD.tiles,x,y));
}
function tileAt(x,y){ if(x<0||y<0||x>=MAP_W||y>=MAP_H) return 'T'; if(x===47&&y===22&&G&&G.flags.gateOpen) return 'r'; return WORLD.tiles[y][x]; }
const npcAt=(x,y)=>NPCS.find(n=>n.x===x&&n.y===y);
const guardianAt=(x,y)=>GUARDIANS.find(g=>g.x===x&&g.y===y&&!G.flags['g_'+g.id]);
const lambAt=(x,y)=>WORLD.lambs.findIndex(([lx,ly],i)=>lx===x&&ly===y&&!G.lambs.includes(i));
function blocked(x,y){ const t=tileAt(x,y); if(SOLID.has(t)) return true; if(npcAt(x,y)||guardianAt(x,y)) return true; if(x===RIFT.x&&y===RIFT.y&&riftActive()) return true; if(lambAt(x,y)>=0) return true; return false; }
function warpTo(x,y){ const p=G.player; p.tx=p.x=p.fromX=x; p.ty=p.y=p.fromY=y; p.moving=false; }

// ---------------- toasts / dialog ----------------
function toast(t,color='#fff',dur=3.2){ toasts.push({t,color,life:dur}); if(toasts.length>5) toasts.shift(); }
function showDialog(name,lines,onDone,choice){ G.dialog={name,lines:[].concat(lines),i:0,onDone,choice,sel:0}; }
function advanceDialog(){ const d=G.dialog; if(!d) return;
  if(d.i<d.lines.length-1){ d.i++; return; }
  if(d.choice){ const c=d.choice; G.dialog=null; c.cb(d.sel); return; }
  G.dialog=null; if(d.onDone) d.onDone(); }

// ---------------- quests ----------------
function sideQuest(id){ return SIDE_QUESTS.find(q=>q.id===id); }
function giveReward(r){ const msgs=[]; if(r.gold) msgs.push(`Received ${grantGold(r.gold)} gold.`);
  if(r.items) for(const [k,n] of Object.entries(r.items)){ G.items[k]=(G.items[k]||0)+n; msgs.push(`Received ${n}x ${ITEMS[k].name}.`); }
  if(r.points){ G.player.points+=r.points; G.player.bonusPoints+=r.points; msgs.push(`★ +${r.points} Talent Point! Press [T] to spend it.`); toast('★ +1 Talent Point (press T)','#ffd84a',5); }
  if(r.flag){ G.flags[r.flag]=true; if(r.flag==='crown') msgs.push('Equipped the Ancient Crown (+10% XP).'); }
  if(r.xp) msgs.push(...grantPlayerXP(r.xp));
  return msgs; }
function talkSideQuest(npc,q){
  const st=G.quests[q.id];
  if(!st){ showDialog(npc.name,q.intro,()=>{ G.quests[q.id]='active'; toast(`New quest: ${q.name}`,'#8fd0ff'); saveGame(); }); return true; }
  if(st==='active'){ const p=Math.min(q.progress(G),q.goal);
    if(p>=q.goal){ showDialog(npc.name,q.done,()=>{ G.quests[q.id]='done'; toast(`Quest complete: ${q.name}`,'#4cd964'); burst(W/2,H/2,'#4cd964',40);
        showDialog('Reward',giveReward(q.reward),saveGame); }); }
    else showDialog(npc.name,[`${q.obj}: ${p}/${q.goal}. Keep at it!`]);
    return true; }
  return false;
}
function checkQuestToasts(){ SIDE_QUESTS.forEach(q=>{ if(G.quests[q.id]==='active' && q.progress(G)>=q.goal && !G.flags['ready_'+q.id]){ G.flags['ready_'+q.id]=true; toast(`✔ ${q.name}: return to ${NPCS.find(n=>n.id===q.giver).name}`,'#4cd964',5); } }); }
function mainStage(){ return G.flags.mainStage||0; }

const NPC_TALK = {
  elder(n){ const s=mainStage();
    if(s===0) showDialog(n.name,["Ah, a young tamer! Shadowvale needs you.","The Shadow Wyrm UMBRAX has awoken in the ruins east of town, and its darkness spreads.","The ruins are sealed by three Rune Shards, held by the guardians: Thornwarden (Whisperwood), Magmaw (Ember Cave) and Tidecaller (Mirror Lake).","Defeat the guardians, claim the shards, then open the gate and defeat Umbrax!","As you grow stronger you will earn TALENT POINTS. Press [T] to open your talent tree.","Take these potions. Good luck!"],
      ()=>{ G.flags.mainStage=1; G.items.potion+=3; toast('Main quest: The Shadow Wyrm','#ffd84a'); saveGame(); });
    else if(s===1) showDialog(n.name,[`You hold ${G.shards.length}/3 Rune Shards.`, "Guardians are strong — train your creatures in the tall grass, and spend your talent points wisely.", "Thornwarden: Whisperwood glade (north-east). Magmaw: deep in Ember Cave. Tidecaller: the island on Mirror Lake."]);
    else if(s===2) showDialog(n.name,["You have all three shards! Go east along the road to the Shadow Ruins gate.","Umbrax is weak to ARCANE attacks. May the light guide you."]);
    else showDialog(n.name,["You saved us all. Shadowvale will sing of you for generations!"]); },
  rosa(n){ showDialog(n.name,["Welcome to the Inn! Let me tend to your creatures..."],()=>{ healParty(1); burst(W/2,H/2,'#ff9ad0',30); showDialog(n.name,["Your creatures are fully healed. Come back any time!"]); saveGame(); }); },
  gil(n){ showDialog(n.name,[rank('haggler')?"A fellow haggler! Fine, fine, I'll give you a discount.":"Soulstones, potions — the best in Shadowvale!"],()=>{ G.menu='shop'; G.menuSel=0; }); },
  pip(n){ if(talkSideQuest(n,sideQuest('collector'))) return; if(talkSideQuest(n,sideQuest('relics'))) return; showDialog(n.name,["My Bestiary and relic collection are complete thanks to you!"]); },
  kael(n){ if(!talkSideQuest(n,sideQuest('ranger'))) showDialog(n.name,["Keep training. Guardians hit hard — Thick Hide from the Beastmaster tree helps."]); },
  lyra(n){ if(!talkSideQuest(n,sideQuest('petals'))) showDialog(n.name,["Thanks to you the village is recovering. Moonpetal tea, anyone?"]); },
  tobin(n){ if(!talkSideQuest(n,sideQuest('lambs'))) showDialog(n.name,["The lambs are safe and happy. Baaa-rilliant!"]); },
};

function onGuardianDefeated(g){
  G.flags['g_'+g.id]=true;
  if(g.final){ G.flags.mainStage=3; G.mode='win'; burst(W/2,H/2,'#ff3fbf',80); saveGame(); return; }
  G.shards.push(g.shard);
  const lines=[`${g.sp} is calmed. It leaves behind the ${g.shard}! (${G.shards.length}/3)`];
  if(G.shards.length>=3){ G.flags.mainStage=2; lines.push('The three shards resonate... The gate of the Shadow Ruins can now be opened! (east of town)'); }
  showDialog('Rune Shard',lines); toast(`◈ ${g.shard} obtained!`,'#ff9ad0',5);
}

// ---------------- interaction ----------------
function interact(){
  const p=G.player, [dx,dy]=DIRS[p.dir], fx=p.tx+dx, fy=p.ty+dy;
  const n=npcAt(fx,fy); if(n){ NPC_TALK[n.id](n); return; }
  const g=guardianAt(fx,fy);
  if(g){ if(!g.final && mainStage()<1){ showDialog(g.sp,['A mighty guardian slumbers here. Perhaps speak with Elder Maren first.']); return; }
    showDialog(g.sp,[g.line, `(Recommended level: ${g.level}+. Your lead: ${G.party[0].sp} Lv ${G.party[0].level})`],null,{options:['Fight!','Not yet'],cb:i=>{ if(i===0){ if(!partyAlive().length){showDialog('',['Your creatures are too tired to fight. Heal at the Inn.']);return;} startBattle(makeCreature(g.sp,g.level),{guardian:g}); } }}); return; }
  if(fx===RIFT.x&&fy===RIFT.y&&riftActive()){ showDialog('Riftmaw',[RIFT.line,`Shared HP: ${NET.boss.hp}/${NET.boss.max}. Every hit you land is subtracted for everyone.`],null,{options:['Fight!','Not yet'],cb:i=>{ if(i===0){ if(!partyAlive().length){showDialog('',['Your creatures are too tired to fight.']);return;} startBattle(makeCreature(RIFT.sp,RIFT.level),{guardian:RIFT}); } }}); return; }
  const li=lambAt(fx,fy); if(li>=0){ G.lambs.push(li); toast(`🐑 Lamb found! (${G.lambs.length}/3) It trots home.`,'#fff',4); burst(W/2,H/2,'#fff'); checkQuestToasts(); saveGame(); return; }
  const t=tileAt(fx,fy);
  if(t==='S'){ const s=WORLD.signs.find(s=>s.x===fx&&s.y===fy); showDialog('Signpost',[s.text]); return; }
  if(t==='G'){ if(G.shards.length>=3){ G.flags.gateOpen=true; burst(W/2,H/2,'#ff3fbf',50); showDialog('Shadow Gate',['The three Rune Shards blaze with light... The gate crumbles open!']); saveGame(); }
    else showDialog('Shadow Gate',[`A sealed gate with three empty sockets. (${G.shards.length}/3 Rune Shards)`]); return; }
  if(t==='~') showDialog('',['The water glitters. Something powerful stirs on the island.']);
}

function onStep(){
  const p=G.player, x=p.tx, y=p.ty;
  const z=zoneAt(x,y); if(z!==G.zone){ G.zone=z; toast(`— ${ZONE_NAMES[z]} —`,'#ffe9a8',2.5); }
  WORLD.relics.forEach(([rx,ry],i)=>{ if(rx===x&&ry===y&&!G.relics.includes(i)){ G.relics.push(i); const gold=grantGold(40); grantPlayerXP(25);
    toast(`✦ Glimmer Relic found! (${G.relics.length}/8) +${gold}g`,'#9ae6ff',4); burst(W/2,H/2,'#9ae6ff'); checkQuestToasts(); saveGame(); } });
  WORLD.petals.forEach(([rx,ry],i)=>{ if(rx===x&&ry===y&&!G.petals.includes(i)){ G.petals.push(i); toast(`❀ Moonpetal gathered (${G.petals.length}/5)`,'#8fd0ff'); burst(W/2,H/2,'#8fd0ff'); checkQuestToasts(); } });
  const t=tileAt(x,y);
  if(ENCOUNTER_RATE[t] && G.time>=G.camoUntil && ZONES[z] && partyAlive().length){
    if(Math.random()<ENCOUNTER_RATE[t]){ const zz=ZONES[z]; const tot=zz.table.reduce((s,e)=>s+e[1],0); let r=Math.random()*tot, sp=zz.table[0][0];
      for(const [s,w] of zz.table){ if((r-=w)<0){sp=s;break;} }
      startBattle(makeCreature(sp,rand(zz.lv[0],zz.lv[1]))); }
  }
}

// ---------------- overworld abilities ----------------
const OVERWORLD_ABILITIES=['camo','medic','hearth'];
function useAbility(id){
  const t=TALENT_BY_ID[id];
  if(!rank(id)){ toast(`🔒 ${t.name} — unlock it in the ${TALENTS[t.bi].branch} talent tree (T)`,'#aaa'); return; }
  const ready=G.cooldowns[id]||0; if(G.time<ready){ toast(`${t.name} is on cooldown (${Math.ceil(ready-G.time)}s)`,'#aaa'); return; }
  G.cooldowns[id]=G.time+t.cd;
  if(id==='camo'){ G.camoUntil=G.time+25; toast('🍃 Camouflage! No wild encounters for 25s','#7be07b'); }
  if(id==='medic'){ healParty(0.5,true); toast('✚ Field Medic: party healed 50%','#ff9ad0'); }
  if(id==='hearth'){ warpTo(INN_SPOT[0],INN_SPOT[1]); G.player.dir='down'; toast('🏠 Hearthstone: returned to Brightvale','#ffd84a'); }
  burst(W/2,H/2,TALENTS[t.bi].color,30);
}

// ---------------- update ----------------
function update(dt){
  mpUpdate(dt);
  G.time+=dt; toasts.forEach(t=>t.life-=dt); toasts=toasts.filter(t=>t.life>0); updParticles(dt);
  if(G.battle){ const b=G.battle; b.t+=dt; b.shake.p=Math.max(0,b.shake.p-dt); b.shake.e=Math.max(0,b.shake.e-dt); b.flash=Math.max(0,b.flash-dt); b.intro=Math.max(0,b.intro-dt*2); }
  if(G.mode!=='world' || G.dialog || G.menu) return;
  const p=G.player;
  if(p.moving){ p.prog+=dt*5*speedMult(); if(p.prog>=1){ p.moving=false; p.x=p.tx; p.y=p.ty; onStep(); } else { p.x=p.fromX+(p.tx-p.fromX)*p.prog; p.y=p.fromY+(p.ty-p.fromY)*p.prog; } }
  if(!p.moving && G.mode==='world'){
    let d=null; if(keys.ArrowUp||keys.KeyW) d='up'; else if(keys.ArrowDown||keys.KeyS) d='down'; else if(keys.ArrowLeft||keys.KeyA) d='left'; else if(keys.ArrowRight||keys.KeyD) d='right';
    if(d) tryMove(d);
  }
}
function tryMove(d){ const p=G.player; if(p.moving||G.mode!=='world'||G.dialog||G.menu) return; p.dir=d; const [dx,dy]=DIRS[d];
  if(!blocked(p.tx+dx,p.ty+dy)){ p.fromX=p.tx; p.fromY=p.ty; p.tx+=dx; p.ty+=dy; p.moving=true; p.prog=0; } }
