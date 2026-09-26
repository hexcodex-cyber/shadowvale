// ===== Shadowvale: core state, creatures, progression =====
'use strict';
const rand = (a,b)=>a+Math.floor(Math.random()*(b-a+1));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let G = null; // global game state

function newState(){
  return {
    mode:'title',
    player:{ name:'Kym', tx:12, ty:22, x:12, y:22, dir:'down', moving:false, fromX:12, fromY:22, prog:0,
             level:1, xp:0, gold:100, points:0, bonusPoints:0, talents:{} },
    items:{soulstone:5, potion:3, greater:0, superpotion:0, revive:0},
    party:[], storage:[],
    dex:{seen:{}, caught:{}},
    relics:[], petals:[], lambs:[], shards:[],
    wildWins:0, quests:{}, flags:{}, cooldowns:{}, camoUntil:0,
    zone:'town', time:0,
  };
}

// ---------- Talents ----------
function rank(id){ return (G && G.player.talents[id]) || 0; }
function pointsInBranch(bi){ return TALENTS[bi].talents.reduce((s,t)=>s+rank(t.id),0); }
function totalSpent(){ return Object.values(G.player.talents).reduce((a,b)=>a+b,0); }
function talentLockReason(t){
  if(pointsInBranch(t.bi) < TIER_REQ[t.tier]) return `Requires ${TIER_REQ[t.tier]} points in ${TALENTS[t.bi].branch}`;
  if(t.req && rank(t.req) < TALENT_BY_ID[t.req].max) return `Requires ${TALENT_BY_ID[t.req].name} (${TALENT_BY_ID[t.req].max}/${TALENT_BY_ID[t.req].max})`;
  return null;
}
function canSpend(t){ return G.player.points>0 && rank(t.id)<t.max && !talentLockReason(t); }
function spendTalent(t){
  if(!canSpend(t)) return false;
  G.player.talents[t.id] = rank(t.id)+1; G.player.points--;
  toast(`${t.icon} ${t.name} ${rank(t.id)}/${t.max}` + (t.kind==='overworld' ? ` — press [${t.key}] to use` : t.kind==='battle' ? ' — use it from the Ability menu in battle' : ''), TALENTS[t.bi].color);
  saveGame(); return true;
}
function resetTalents(){ const n = totalSpent(); G.player.talents={}; G.player.points+=n; toast(`Talents reset: ${n} point(s) refunded`); saveGame(); }
const atkMult = ()=>1+0.06*rank('ferocity');
const defMult = ()=>1-0.06*rank('thickhide');
const catchBonus = ()=>0.10*rank('keeneye');
const speedMult = ()=>1+0.15*rank('stride');
const goldMult = ()=>1+0.15*rank('silver');
const priceMult = ()=>1-0.10*rank('haggler');
const xpMult = ()=>1+0.10*rank('scholar') + (G.flags.crown?0.10:0);
function price(item){ return Math.max(1, Math.round(ITEMS[item].price*priceMult())); }

// ---------- Player progression ----------
function playerXpNeed(l){ return 40 + l*35; }
function grantPlayerXP(n){
  const p = G.player; const msgs=[];
  if(p.level>=MAX_PLAYER_LEVEL) return msgs;
  n = Math.round(n*xpMult()); p.xp += n; msgs.push(`You gained ${n} XP.`);
  while(p.level<MAX_PLAYER_LEVEL && p.xp >= playerXpNeed(p.level)){
    p.xp -= playerXpNeed(p.level); p.level++; p.points++;
    msgs.push(`★ LEVEL UP! You reached level ${p.level}! +1 Talent Point — press [T] to spend it.`);
    toast(`★ Level ${p.level}! +1 Talent Point (press T)`, '#ffd84a', 5);
    burst(W/2, 60, '#ffd84a');
  }
  if(p.level>=MAX_PLAYER_LEVEL) p.xp=0;
  return msgs;
}
function grantGold(n){ n=Math.round(n*goldMult()); G.player.gold+=n; return n; }

// ---------- Creatures ----------
function monXpNeed(l){ return Math.floor(12 + l*l*2.2); }
function calcStats(c){
  const b = SPECIES[c.sp].base, L=c.level, boss = SPECIES[c.sp].boss ? (c.sp==='Umbrax'?1.35:1.3) : 1;
  const oldMax = c.maxhp||0;
  c.maxhp = Math.floor((Math.floor(b.hp*L/20)+L+12)*boss);
  c.atk = Math.floor(b.atk*L/25)+5; c.def = Math.floor(b.def*L/25)+5; c.spd = Math.floor(b.spd*L/25)+5;
  if(c.hp===undefined) c.hp=c.maxhp; else if(c.hp>0) c.hp += c.maxhp-oldMax;
}
function makeCreature(sp, level){
  const c = {sp, level, xp:0, moves:[]};
  SPECIES[sp].learn.forEach(([l,mv])=>{ if(l<=level && !c.moves.includes(mv)){ c.moves.push(mv); if(c.moves.length>4) c.moves.shift(); } });
  calcStats(c); return c;
}
// returns array of battle steps (text / learn prompts) for XP gained
function giveMonXP(c, amount){
  const steps=[]; amount = Math.max(1, Math.round(amount*xpMult()));
  steps.push({text:`${c.sp} gained ${amount} XP!`});
  c.xp += amount;
  while(c.level<50 && c.xp >= monXpNeed(c.level)){
    c.xp -= monXpNeed(c.level); c.level++; calcStats(c);
    steps.push({text:`${c.sp} grew to level ${c.level}!`, sfx:'level'});
    SPECIES[c.sp].learn.filter(([l])=>l===c.level).forEach(([,mv])=>{
      if(c.moves.includes(mv)) return;
      steps.push({learn:{mon:c, move:mv}});
    });
  }
  return steps;
}
function partyAlive(){ return G.party.filter(c=>c.hp>0); }
function healParty(frac=1, revive=true){ G.party.forEach(c=>{ if(c.hp<=0 && !revive) return; c.hp = Math.min(c.maxhp, (c.hp>0?c.hp:0) + Math.ceil(c.maxhp*frac)); }); }
function addCreature(c){
  G.dex.caught[c.sp]=true; G.dex.seen[c.sp]=true;
  if(G.party.length<6){ G.party.push(c); return 'party'; } G.storage.push(c); return 'storage';
}

// ---------- Save / load ----------
const SAVE_KEY='shadowvale-save-v1';
function saveGame(){ try{ if(G && G.party.length) localStorage.setItem(SAVE_KEY, JSON.stringify(Object.assign({}, G, {mode:'world', dialog:null, battle:null, menu:null}))); }catch(e){} }
function hasSave(){ try{ return !!localStorage.getItem(SAVE_KEY); }catch(e){ return false; } }
function loadGame(){ const d = JSON.parse(localStorage.getItem(SAVE_KEY)); G = Object.assign(newState(), d); G.mode='world'; G.player.moving=false; G.cooldowns={}; G.camoUntil=0; }
