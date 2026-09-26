// ===== Shadowvale: input handling & main loop =====
'use strict';
const isConfirm=c=>c==='Enter'||c==='Space'||c==='KeyE';
const isBack=c=>c==='Escape'||c==='Backspace'||c==='KeyX';
function vert(c){ return (c==='ArrowUp'||c==='KeyW')?-1:(c==='ArrowDown'||c==='KeyS')?1:0; }
function horiz(c){ return (c==='ArrowLeft'||c==='KeyA')?-1:(c==='ArrowRight'||c==='KeyD')?1:0; }

function onKey(e){
  const c=e.code; if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(c)) e.preventDefault();
  if(G.mode==='login') return;
  if(G.mode==='title'){ const n=hasSave()?2:1; G.menuSel=(G.menuSel+vert(c)+n)%n;
    if(isConfirm(c)){ if(hasSave()&&G.menuSel===0){ loadGame(); toast('Welcome back!'); } else { G.mode='starter'; G.menuSel=0; } } return; }
  if(G.mode==='starter'){ G.menuSel=(G.menuSel+horiz(c)+3)%3;
    if(isConfirm(c)){ const sp=['Emberpup','Tidefin','Sproutle'][G.menuSel]; const keepSel=0; const name=G.player.name; G=newState(); G.player.name=name; G.mode='world'; G.menuSel=keepSel; addCreature(makeCreature(sp,5));
      showDialog('Elder Maren',[`${sp} has chosen you! Welcome to Brightvale, young tamer.`,'Come speak with me — I am just west of here, in front of my hall.','(Controls: WASD/Arrows to move, E to talk, T for talents, P party, Q quests, B bag)']); saveGame(); } return; }
  if(G.mode==='win'){ if(isConfirm(c)) G.mode='world'; return; }
  if(G.mode==='battle') return battleKey(c);
  // world
  if(G.dialog){ const d=G.dialog; if(d.choice && d.i===d.lines.length-1){ const h=horiz(c)||vert(c); if(h) d.sel=(d.sel+h+d.choice.options.length)%d.choice.options.length; }
    if(isConfirm(c)) advanceDialog(); else if(isBack(c) && d.choice && d.i===d.lines.length-1){ d.sel=d.choice.options.length-1; advanceDialog(); } return; }
  if(G.menu) return menuKey(c);
  if(c==='Enter' && window.NET && NET.user){ openChat(); return; }
  if(c==='Escape'){ G.menu='system'; G.menuSel=0; return; }
  const mv={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'}[c];
  if(mv){ tryMove(mv); return; }
  if(c==='KeyE'||c==='Space'||c==='Enter') interact();
  if(c==='KeyT'){ G.menu='talents'; if(!G.talentSel) G.talentSel='ferocity'; }
  if(c==='KeyP'){ G.menu='party'; G.menuSel=0; }
  if(c==='KeyQ'||c==='KeyJ') G.menu='quests';
  if(c==='KeyB'||c==='KeyI'){ G.menu='bag'; G.bagTab=G.bagTab||0; }
  if(c==='Digit1') useAbility('camo'); if(c==='Digit2') useAbility('medic'); if(c==='Digit3') useAbility('hearth');
}
function menuKey(c){
  const m=G.menu;
  if(m==='system'){ if(c==='Escape') G.menu=null; else systemKey(c); return; }
  if(isBack(c) && c!=='KeyX' || (m==='talents'&&c==='KeyT') || (m==='party'&&c==='KeyP') || (m==='quests'&&(c==='KeyQ'||c==='KeyJ')) || (m==='bag'&&(c==='KeyB'||c==='KeyI'))){ G.menu=null; return; }
  if(m==='talents'){ if(vert(c)) talentNav(vert(c)<0?'up':'down'); if(horiz(c)) talentNav(horiz(c)<0?'left':'right');
    if(c==='Enter'||c==='Space'||c==='KeyE'){ const t=TALENT_BY_ID[G.talentSel]; if(spendTalent(t)){ const [x,y]=talentNodePos(t); burst(x+32,y+32,TALENTS[t.bi].color); } }
    if(c==='KeyR') resetTalents(); return; }
  if(m==='party'){ const n=G.party.length; G.menuSel=(G.menuSel+vert(c)+n)%n;
    if(isConfirm(c) && G.menuSel>0){ const c0=G.party.splice(G.menuSel,1)[0]; G.party.unshift(c0); G.menuSel=0; toast(`${c0.sp} is now your lead`); }
    if(c==='KeyH'){ const cr=G.party[G.menuSel]; const k=G.items.superpotion>0&&cr.maxhp-cr.hp>40?'superpotion':G.items.potion>0?'potion':G.items.superpotion>0?'superpotion':null;
      if(cr.hp<=0 && G.items.revive>0){ G.items.revive--; cr.hp=Math.ceil(cr.maxhp/2); toast(`${cr.sp} revived!`); }
      else if(!k) toast('No potions!'); else if(cr.hp<=0) toast('Fainted — needs a Phoenix Feather'); else if(cr.hp>=cr.maxhp) toast('Already at full HP'); else { G.items[k]--; cr.hp=Math.min(cr.maxhp,cr.hp+ITEMS[k].heal); toast(`${cr.sp} healed`); } }
    return; }
  if(m==='bag'){ G.bagTab=(G.bagTab+horiz(c)+3)%3; return; }
  if(m==='shop'){ G.menuSel=(G.menuSel+vert(c)+SHOP_ITEMS.length)%SHOP_ITEMS.length;
    if(isConfirm(c)){ const k=SHOP_ITEMS[G.menuSel]; if(G.player.gold>=price(k)){ G.player.gold-=price(k); G.items[k]=(G.items[k]||0)+1; toast(`Bought ${ITEMS[k].name}`,'#ffd84a'); saveGame(); } else toast('Not enough gold','#ff6060'); }
    return; }
}
function battleKey(c){
  const b=G.battle; if(!b) return;
  if(b.menu==='msg'){ if(isConfirm(c)) nextStep(); return; }
  const opts=battleMenuOptions(), n=opts.length;
  const grid = b.menu==='fight' || b.menu==='learn';
  if(grid){ const v=vert(c), h=horiz(c); let s=b.sel;
    if(b.menu==='learn' && s===4){ if(v<0) s=Math.min(2,b.learn.mon.moves.length-1); }
    else { if(h) s = (s%2===0 && h>0 && s+1<Math.min(n,4)) ? s+1 : (s%2===1 && h<0) ? s-1 : s; if(v>0){ s = s+2 < Math.min(n,4) ? s+2 : (b.menu==='learn'?4:s); } if(v<0 && s>=2) s-=2; }
    b.sel=clamp(s,0,n-1); }
  else if(vert(c)) b.sel=(b.sel+vert(c)+n)%n;
  if(isBack(c) && c!=='KeyX'){ if(b.menu==='learn'){ b.sel=4; } else if(!(b.menu==='swap'&&b.forced) && b.menu!=='main'){ b.menu='main'; b.sel=0; return; } }
  if(!isConfirm(c)) return;
  const s=b.sel;
  if(b.menu==='main'){ const o=opts[s];
    if(o==='Fight'){ b.menu='fight'; b.sel=0; } else if(o==='Ability'){ b.menu='ability'; b.sel=0; } else if(o==='Bag'){ b.menu='bag'; b.sel=0; }
    else if(o==='Creatures'){ b.menu='swap'; b.sel=0; } else if(o==='Run') playerTurn({kind:'run'}); return; }
  if(b.menu==='fight') return playerTurn({kind:'move',move:opts[s]});
  if(b.menu==='ability'){ const a=BATTLE_ABILITIES[s]; if(!rank(a.id)){ b.msg=`${a.name} is locked. Learn it in the talent tree (T) after the battle.`; return; } if(b.used[a.id]){ b.msg='Already used this battle.'; return; } if(a.wildOnly&&!b.wild){ b.msg='Only works on wild creatures.'; return; } return playerTurn({kind:'ability',id:a.id}); }
  if(b.menu==='bag'){ const k=BATTLE_ITEMS[s]; if(!(G.items[k]>0)){ b.msg="You don't have any."; return; } const it=ITEMS[k];
    if(it.catchMult){ if(!b.wild){ b.msg="You can't capture a guardian!"; return; } return playerTurn({kind:'item',item:k}); }
    if(it.revive){ const ti=G.party.findIndex(c=>c.hp<=0); if(ti<0){ b.msg='No fainted creatures.'; return; } return playerTurn({kind:'item',item:k,target:ti}); }
    if(cur(b).hp>=cur(b).maxhp){ b.msg=`${cur(b).sp} is already at full HP.`; return; } return playerTurn({kind:'item',item:k,target:b.pi}); }
  if(b.menu==='swap'){ const cr=G.party[s]; if(cr.hp<=0){ b.msg=`${cr.sp} has fainted!`; return; } if(s===b.pi){ b.msg=`${cr.sp} is already out!`; return; } return playerTurn({kind:'swap',idx:s}); }
  if(b.menu==='learn'){ const {mon,move}=b.learn; b.learn=null;
    if(s===4) front(b,[{text:`${mon.sp} did not learn ${move}.`}]);
    else { const old=mon.moves[s]; mon.moves[s]=move; burst(W-230,380,'#8ff0ff'); front(b,[{text:`1, 2 and... Poof! ${mon.sp} forgot ${old}...`},{text:`✨ ...and ${mon.sp} learned ${move}!`}]); }
    nextStep(); }
}
function onMouse(e,click){
  const r=canvas.getBoundingClientRect(); const x=(e.clientX-r.left)*W/r.width, y=(e.clientY-r.top)*H/r.height; mouse={x,y};
  if(G.menu==='talents'){ const t=Object.values(TALENT_BY_ID).find(t=>{ const [nx,ny]=talentNodePos(t); return x>=nx&&x<=nx+64&&y>=ny&&y<=ny+64; });
    if(t){ G.talentSel=t.id; if(click && spendTalent(t)) burst(x,y,TALENTS[t.bi].color); } }
}

function frame(ts){
  const dt=Math.min(0.05,(ts-lastT)/1000||0); lastT=ts;
  if(G.mode==='title'||G.mode==='starter') G.time+=dt; else update(dt);
  ctx.clearRect(0,0,W,H);
  if(G.mode==='title') drawTitle();
  else if(G.mode==='login') drawTitle(true);
  else if(G.mode==='starter') drawStarter();
  else if(G.mode==='battle') drawBattle();
  else { drawWorld(); drawHUD();
    if(G.menu==='system') drawSystemMenu(); else if(G.menu==='talents') drawTalents(); else if(G.menu==='party') drawParty(); else if(G.menu==='quests') drawQuests(); else if(G.menu==='bag') drawBag(); else if(G.menu==='shop') drawShop();
    drawDialog(); if(G.mode==='win') drawWin(); }
  drawParticles(); if(G.menu!=='talents') drawToasts();
  requestAnimationFrame(frame);
}
window.addEventListener('load',()=>{
  canvas=document.getElementById('game'); ctx=canvas.getContext('2d');
  initWorld(); G=newState(); G.menuSel=0; G.mode='login'; showLogin(true);
  $('chat-input').addEventListener('keydown',chatKey); setTimeout(()=>{ if(!window.NET){ MP.netMissing=true; if(G.mode==='login') renderLogin(); } },4000);
  $('lg-submit').onclick=()=>doAuth('email'); $('lg-google').onclick=()=>doAuth('google'); $('lg-offline').onclick=playOffline;
  $('lg-toggle').onclick=()=>{ MP.signup=!MP.signup; loginMsg(''); renderLogin(); };
  $('lg-pass').addEventListener('keydown',e=>{ if(e.key==='Enter') doAuth('email'); e.stopPropagation(); }); ['lg-email','lg-name'].forEach(id=>$(id).addEventListener('keydown',e=>e.stopPropagation()));
  window.addEventListener('keydown',e=>{ keys[e.code]=true; if(!e.repeat) onKey(e); else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault(); });
  window.addEventListener('keyup',e=>{ keys[e.code]=false; });
  window.addEventListener('blur',()=>{ keys={}; });
  canvas.addEventListener('mousemove',e=>onMouse(e,false)); canvas.addEventListener('click',e=>onMouse(e,true));
  requestAnimationFrame(frame);
  window.__sv={MP, get G(){return G;}, set G(v){G=v;}, WORLD:()=>WORLD, startBattle, makeCreature, grantPlayerXP, addCreature, saveGame};
});
