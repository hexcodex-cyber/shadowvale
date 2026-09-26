// ===== Shadowvale: turn-based battle system =====
'use strict';
const BATTLE_ABILITIES = [ // talent-unlocked battle actives
  {id:'rally',   name:'Rallying Cry',   use:b=>{ b.stages.p.atk=clamp(b.stages.p.atk+2,-3,3); return [{text:`You let out a Rallying Cry! ${cur(b).sp}'s Attack rose sharply!`, fx:'p'}]; }},
  {id:'unleash', name:'Primal Unleash', use:b=>{ b.unleash=true; return [{text:`Primal Unleash! ${cur(b).sp} is overflowing with power! Its next attack will be devastating.`, fx:'p'}]; }},
  {id:'snare',   name:'Soul Snare',     wildOnly:true, use:b=>attemptCatch(b, 1, 0.40, 'You cast a Soul Snare!')},
];
const cur = b=>G.party[b.pi];
const stageMult = s=> s>=0 ? (2+s)/2 : 2/(2-s);

function startBattle(enemy, opts={}){
  const pi = G.party.findIndex(c=>c.hp>0);
  G.dex.seen[enemy.sp]=true;
  G.battle = {enemy, wild:!opts.guardian, guardian:opts.guardian||null, pi, menu:'msg', sel:0, queue:[], msg:'', used:{}, unleash:false,
              stages:{p:{atk:0,def:0}, e:{atk:0,def:0}}, participants:new Set([pi]), over:false, t:0, shake:{p:0,e:0}, flash:0, intro:1};
  G.mode='battle';
  const b=G.battle;
  push(b, {text: opts.guardian ? opts.guardian.line : `A wild ${enemy.sp} (Lv ${enemy.level}) appeared!`});
  push(b, {text:`Go, ${cur(b).sp}!`});
  nextStep();
}
function push(b,...steps){ b.queue.push(...steps); }
function front(b,steps){ b.queue.unshift(...steps); }

function nextStep(){
  const b=G.battle; if(!b) return;
  while(b.queue.length){
    const s=b.queue.shift();
    if(s.fn){ const more=s.fn(); if(more && more.length) front(b,more); continue; }
    if(s.learn){ // move learning prompt
      const {mon,move}=s.learn;
      if(mon.moves.length<4){ mon.moves.push(move); b.msg=`✨ ${mon.sp} learned ${move}!`; b.menu='msg'; burst(W-230,380,'#8ff0ff'); return; }
      b.learn={mon,move}; b.menu='learn'; b.sel=0; b.msg=`${mon.sp} wants to learn ${move}, but already knows 4 moves. Forget a move?`; return;
    }
    if(s.end){ endBattle(s.end); return; }
    if(s.fx==='p') b.shake.p=0.4; if(s.fx==='e') b.shake.e=0.4;
    if(s.sfx==='level') burst(W-230,380,'#ffd84a');
    b.msg=s.text; b.menu='msg'; return;
  }
  if(b.over) return;
  if(cur(b).hp<=0){ b.menu='swap'; b.forced=true; b.sel=G.party.findIndex(c=>c.hp>0); b.msg='Choose your next creature!'; return; }
  b.menu='main'; b.sel=0; b.msg=`What will ${cur(b).sp} do?`;
}

function calcDamage(att, def, move, attStage, defStage, isPlayer, b){
  const mv=MOVES[move]; let eff = typeMult(mv.type, SPECIES[def.sp].type);
  let power = mv.power;
  let a = att.atk*stageMult(attStage), d = def.def*stageMult(defStage);
  let dmg = ((2*att.level/5+2)*power*a/d)/50+2;
  if(mv.type===SPECIES[att.sp].type) dmg*=1.25;
  let unleashed=false;
  if(isPlayer && b.unleash){ unleashed=true; if(eff<1) eff=1; dmg*=2; }
  dmg*=eff;
  const crit = Math.random()<0.0625; if(crit) dmg*=1.5;
  dmg*= 0.85+Math.random()*0.15;
  if(isPlayer) dmg*=atkMult(); else dmg*=defMult();
  return {dmg:Math.max(1,Math.floor(dmg)), eff, crit, unleashed};
}

function performMove(side, move){
  const b=G.battle; const isP = side==='p';
  const att = isP?cur(b):b.enemy, def = isP?b.enemy:cur(b);
  if(att.hp<=0 || def.hp<=0) return [];
  const mv=MOVES[move]; const out=[]; const who = isP?att.sp:(b.wild?`Wild ${att.sp}`:att.sp);
  out.push({text:`${who} used ${move}!`});
  const never = isP && b.unleash;
  if(!never && Math.random()*100 >= mv.acc){ out.push({text:'But it missed!'}); return out; }
  const me=b.stages[side], them=b.stages[isP?'e':'p'];
  if(mv.power===0){
    const tgt = isP?b.enemy.sp:cur(b).sp;
    if(mv.effect==='atkUp'){ me.atk=clamp(me.atk+1,-3,3); out.push({text:`${att.sp}'s Attack rose!`}); }
    if(mv.effect==='defUp'){ me.def=clamp(me.def+1,-3,3); out.push({text:`${att.sp}'s Defense rose!`}); }
    if(mv.effect==='atkDown'){ them.atk=clamp(them.atk-1,-3,3); out.push({text:`${tgt}'s Attack fell!`}); }
    if(mv.effect==='defDown'){ them.def=clamp(them.def-1,-3,3); out.push({text:`${tgt}'s Defense fell!`}); }
    if(mv.effect==='heal'){ const h=Math.ceil(att.maxhp*0.35); att.hp=Math.min(att.maxhp,att.hp+h); out.push({text:`${att.sp} restored health!`}); }
    return out;
  }
  const r = calcDamage(att,def,move,me.atk,them.def,isP,b);
  if(isP && b.unleash) b.unleash=false;
  out.push({fn:()=>{ if(isP && b.guardian && b.guardian.world && window.NET) NET.bossDamage(Math.min(r.dmg,def.hp)); def.hp=Math.max(0,def.hp-r.dmg); b.shake[isP?'e':'p']=0.45; b.flash=0.15;
    if(mv.effect==='drain') att.hp=Math.min(att.maxhp, att.hp+Math.ceil(r.dmg/2));
    burst(isP? 700:250, isP? 190:360, TYPE_COLORS[mv.type], 18);
    const t=[]; if(r.unleashed) t.push({text:'PRIMAL UNLEASH! Double damage!'}); if(r.crit) t.push({text:'A critical hit!'});
    if(r.eff>1) t.push({text:"It's super effective!"}); else if(r.eff<1) t.push({text:"It's not very effective..."});
    if(mv.effect==='drain') t.push({text:`${att.sp} drained energy!`});
    return t; }});
  return out;
}

function enemyChooseMove(){
  const b=G.battle, e=b.enemy, p=cur(b);
  if(e.hp < e.maxhp*0.4 && e.moves.includes('Regrow') && !b.healed && Math.random()<0.5){ b.healed=true; return 'Regrow'; }
  let best=e.moves[0], bestScore=-1;
  e.moves.forEach(m=>{ const mv=MOVES[m]; let s = mv.power ? mv.power*typeMult(mv.type,SPECIES[p.sp].type)*(mv.acc/100) : 25;
    if(mv.effect==='heal') s = (e.hp<e.maxhp*0.5 && !b.healed)?60:0;
    s *= b.wild ? (0.5+Math.random()) : (0.8+Math.random()*0.4); if(s>bestScore){bestScore=s;best=m;} });
  return best;
}

function checkFaints(){
  const b=G.battle; if(b.over) return [];
  if(b.enemy.hp<=0){ b.queue.length=0; b.over=true; return victorySteps(); }
  if(cur(b).hp<=0){
    b.queue.length=0;
    const steps=[{text:`${cur(b).sp} fainted!`, fx:'p'}];
    if(partyAlive().length===0){ b.over=true; steps.push({text:'You have no creatures left...'}); steps.push({end:'lose'}); }
    return steps;
  }
  return [];
}

function victorySteps(){
  const b=G.battle, e=b.enemy; const steps=[{text:`${b.wild?'Wild ':''}${e.sp} fainted!`, fx:'e'}];
  const base = SPECIES[e.sp].xp*e.level/5*(b.wild?1:1.5);
  G.party.forEach((c,i)=>{ if(c.hp<=0) return; const share = b.participants.has(i)?1:0.35; steps.push(...giveMonXP(c, base*share)); });
  steps.push({fn:()=>{ const gold=grantGold(e.level*6*(b.wild?1:4)+rand(0,8)); const msgs=[{text:`You found ${gold} gold.`}];
    grantPlayerXP(e.level*10*(b.wild?1:3)).forEach(m=>msgs.push({text:m})); return msgs; }});
  if(rank('secondwind')) steps.push({fn:()=>{ healParty(0.15*rank('secondwind'), false); return [{text:`Second Wind: your party recovers ${15*rank('secondwind')}% HP.`}]; }});
  steps.push({end:'win'});
  return steps;
}

function attemptCatch(b, stoneMult, extra, intro){
  const e=b.enemy; const out=[{text:intro}];
  if(!b.wild){ out.push({text:'The guardian deflects it! Guardians cannot be captured.'}); return out; }
  const hpf=e.hp/e.maxhp;
  const chance = clamp(SPECIES[e.sp].catch*(1-hpf*0.65)*stoneMult + catchBonus() + extra, 0.03, 0.97);
  b.lastCatchChance = chance;
  const ok = Math.random()<chance;
  out.push({text:'...wobble...'}); out.push({text:'...wobble...'});
  if(ok){ b.over=true; out.push({fn:()=>{ const where=addCreature(e); b.caught=true; burst(700,190,'#ffd84a',40);
      const m=[{text:`Gotcha! ${e.sp} was caught!${where==='storage'?' (sent to storage — party is full)':''}`}];
      grantPlayerXP(e.level*6).forEach(x=>m.push({text:x})); m.push({end:'catch'}); return m; }}); }
  else out.push({text:`Argh! ${e.sp} broke free! (${Math.round(chance*100)}% chance)`});
  return out;
}

// ----- player turn entry -----
function playerTurn(action){
  const b=G.battle; b.menu='msg';
  const enemyAct = ()=>({fn:()=>performMove('e', enemyChooseMove())});
  const cf = {fn:checkFaints};
  if(action.kind==='move'){
    const pFirst = cur(b).spd*stageMult(0) >= b.enemy.spd || (cur(b).spd===b.enemy.spd && Math.random()<0.5);
    const pAct = {fn:()=>performMove('p', action.move)};
    push(b, ...(pFirst? [pAct,cf,enemyAct(),cf] : [enemyAct(),cf,pAct,cf]));
  } else if(action.kind==='swap'){
    const wasForced=b.forced; b.forced=false;
    push(b, {fn:()=>{ b.pi=action.idx; b.participants.add(action.idx); b.stages.p={atk:0,def:0}; return [{text:`Go, ${cur(b).sp}!`}]; }});
    if(!wasForced) push(b, enemyAct(), cf);
  } else if(action.kind==='item'){
    const it=ITEMS[action.item]; const c=G.party[action.target];
    G.items[action.item]--;
    if(it.catchMult){ push(b, {fn:()=>attemptCatch(b,it.catchMult,0,`You threw a ${it.name}!`)}); push(b, {fn:()=> b.over?[]:[enemyAct(),cf]}); }
    else { push(b, {fn:()=>{ if(it.revive){ c.hp=Math.ceil(c.maxhp/2); return [{text:`${c.sp} was revived!`}]; } const h=Math.min(it.heal,c.maxhp-c.hp); c.hp+=h; return [{text:`${c.sp} recovered ${h} HP.`}]; }}, enemyAct(), cf); }
  } else if(action.kind==='ability'){
    const ab=BATTLE_ABILITIES.find(a=>a.id===action.id); b.used[ab.id]=true;
    push(b, {fn:()=>ab.use(b)}); push(b, {fn:()=> b.over?[]:[enemyAct(),cf]});
  } else if(action.kind==='run'){
    if(!b.wild){ push(b,{text:"You can't flee from a guardian!"}); }
    else { const ok = Math.random() < clamp(0.5+0.5*cur(b).spd/b.enemy.spd,0,0.95);
      if(ok){ b.over=true; push(b,{text:'Got away safely!'},{end:'run'}); } else push(b,{text:"Couldn't get away!"}, enemyAct(), cf); }
  }
  nextStep();
}

function endBattle(result){
  const b=G.battle; G.battle=null; G.mode='world';
  if(result==='lose'){
    const lost=Math.floor(G.player.gold*0.1); G.player.gold-=lost; healParty(1);
    warpTo(INN_SPOT[0],INN_SPOT[1]);
    showDialog('Innkeeper Rosa',[`You blacked out and dropped ${lost} gold...`,'I patched up your creatures. Be careful out there, dear!']);
  }
  if(result==='win' && b.wild){ G.wildWins++; }
  if(result==='win' && b.guardian && b.guardian.world){ showDialog('Riftmaw',['The Riftmaw retreats into the rift, wounded! Your damage was added to the shared pool.', NET.boss?`Shared HP left: ${NET.boss.hp}/${NET.boss.max}`:'']); }
  else if(result==='win' && b.guardian){ onGuardianDefeated(b.guardian); }
  checkQuestToasts(); saveGame();
}
