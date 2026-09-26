const {chromium}=require('playwright-core');
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1000,height:680}});
  const errors=[]; page.on('pageerror',e=>errors.push('pageerror: '+e.message)); page.on('console',m=>{ if(m.type()==='error') errors.push('console: '+m.text()); });
  await page.goto(process.env.URL||'http://localhost:8765/index.html'); await page.evaluate(()=>localStorage.clear()); await page.reload();
  const shot=async n=>{ await page.waitForTimeout(250); await page.locator('#game').screenshot({path:`shots/${n}.png`}); };
  const key=async(k,n=1,wait=120)=>{ for(let i=0;i<n;i++){ await page.keyboard.press(k); await page.waitForTimeout(wait);} };
  const G=()=>page.evaluate(()=>{ const g=__sv.G; return {mode:g.mode, menu:g.menu, dialog:!!g.dialog, pos:[g.player.tx,g.player.ty], lvl:g.player.level, pts:g.player.points, party:g.party.map(c=>c.sp+':'+c.level+':'+c.moves.join('/')), battle:g.battle&&{menu:g.battle.menu,msg:g.battle.msg}}; });
  await page.waitForTimeout(500); await page.click('#lg-offline'); await page.waitForTimeout(200); await shot('01-title');
  await key('Enter'); await shot('02-starter'); await key('ArrowRight',2); await key('Enter'); // Sproutle
  console.log('after starter', await G());
  while((await G()).dialog) await key('Space');
  // walk to elder: elder at (7,19); player at (12,22). go up 2 to y=20, left 5 to x=7, face up
  await key('ArrowUp',2,260); await key('ArrowLeft',5,260); await key('ArrowUp',1,260);
  console.log('near elder', await G());
  await key('KeyE'); await shot('03-elder-dialog'); for(let i=0;i<8;i++){ if(!(await G()).dialog) break; await key('Space'); }
  await shot('04-world-hud');
  // Force a wild battle, test level-up + learned moves
  await page.evaluate(()=>{ const g=__sv.G; g.party[0].xp=__sv.G.party[0].xp; __sv.startBattle(__sv.makeCreature('Fluffwool',3)); });
  await shot('05-battle-start');
  let guard=0;
  while((await G()).mode==='battle' && guard++<80){ const s=await G(); const b=s.battle;
    if(b.menu==='main'){ await key('Enter'); await key('Enter'); } // Fight -> first move
    else if(b.menu==='learn'){ await shot('07-learn-prompt'); await key('ArrowDown'); await key('Enter'); }
    else { if(/learned|grew to/.test(b.msg)) await shot('06-levelup-'+guard); await key('Space'); } }
  console.log('after battle 1', await G());
  // Give player levels → talent points
  await page.evaluate(()=>{ __sv.grantPlayerXP(900); });
  console.log('after xp', await G());
  await key('KeyT'); await shot('08-talents-empty');
  // spend: ferocity x3 then rally, secondwind; keen eye; tracker etc
  for(let i=0;i<3;i++) await key('Enter');       // ferocity 3/3
  await key('ArrowDown'); await key('Enter');     // rally (tier2)
  await key('ArrowDown'); await key('Enter');     // unleash? needs 5 pts -> should be locked (4 pts)
  await key('ArrowRight'); await key('ArrowRight'); await key('ArrowRight'); await key('ArrowUp'); await key('ArrowUp');
  await page.mouse.move(0,0);
  const st=await page.evaluate(()=>({t:__sv.G.player.talents,pts:__sv.G.player.points,sel:__sv.G.talentSel}));
  console.log('talents', JSON.stringify(st));
  // click keen eye node via mouse
  const box=await page.locator('#game').boundingBox();
  const clickNode=async id=>{ const [x,y]=await page.evaluate(id=>talentNodePos(TALENT_BY_ID[id]),id); await page.mouse.click(box.x+(x+32)*box.width/960, box.y+(y+32)*box.height/640); await page.waitForTimeout(150); };
  await clickNode('keeneye'); await clickNode('keeneye'); await clickNode('camo'); await clickNode('medic');
  await clickNode('unleash');
  await page.mouse.move(box.x+(talentPos=await page.evaluate(()=>talentNodePos(TALENT_BY_ID['unleash'])))[0]*box.width/960+30, box.y+talentPos[1]*box.height/640+30);
  await shot('09-talent-tree');
  console.log('talents2', JSON.stringify(await page.evaluate(()=>({t:__sv.G.player.talents,pts:__sv.G.player.points}))));
  await key('Escape');
  await key('Digit1'); await shot('10-camo-hud'); await key('Digit2'); await key('Digit3');
  console.log('after abilities', JSON.stringify(await page.evaluate(()=>({cd:__sv.G.cooldowns,camo:__sv.G.camoUntil,t:__sv.G.time}))));
  // battle ability + catch test
  await page.evaluate(()=>{ __sv.G.items.soulstone=20; __sv.startBattle(__sv.makeCreature('Glowmoth',3)); });
  guard=0; let usedAbility=false, threw=0;
  while((await G()).mode==='battle' && guard++<120){ const b=(await G()).battle;
    if(b.menu==='main'){ if(!usedAbility){ await key('ArrowDown'); await key('Enter'); await shot('11-battle-ability-menu'); await key('Enter'); usedAbility=true; }
      else { await key('ArrowDown',2); await key('Enter'); await key('Enter'); threw++; } }
    else if(b.menu==='learn'){ await key('Enter'); }
    else if(b.menu==='swap'){ await key('Enter'); }
    else { if(/Rallying/.test(b.msg)) await shot('12-rally'); await key('Space'); } }
  console.log('catch result', await G(), 'throws', threw);
  await key('KeyP'); await shot('13-party'); await key('Escape');
  await key('KeyQ'); await shot('14-quests'); await key('Escape');
  await key('KeyB'); await key('ArrowRight'); await shot('15-bestiary'); await key('Escape');
  // Guardian & learn-replace: force 4-move mon to learn new move
  await page.evaluate(()=>{ const c=__sv.G.party[0]; c.level=9; c.xp=0; calcStats(c); c.hp=c.maxhp; ['Tackle','Vine Lash','Leech Seed','Regrow'].forEach((m,i)=>c.moves[i]=m); c.xp=__sv.G.party[0].xp; __sv.startBattle(__sv.makeCreature('Pebblit',9)); __sv.G.party[0].xp= monXpNeed(9)-1; });
  guard=0; let sawLearn=false;
  while((await G()).mode==='battle' && guard++<120){ const b=(await G()).battle;
    if(b.menu==='main'){ await key('Enter'); await key('ArrowRight'); await key('Enter'); }
    else if(b.menu==='learn'){ sawLearn=true; await shot('16-learn-replace'); await key('Enter'); }
    else if(b.menu==='swap'){ await key('Enter'); }
    else { if(/Poof|learned/.test(b.msg)) await shot('17-learned'); await key('Space'); } }
  console.log('learn test', sawLearn, await G());
  await shot('18-world-end');
  while((await G()).dialog) await key('Space');
  // Showcase: mid-game talent build + HUD with unlocked abilities
  await page.evaluate(()=>{ __sv.grantPlayerXP(3000); const g=__sv.G; g.player.talents={}; g.player.points=g.player.level-1+g.player.bonusPoints;
    ['ferocity','ferocity','ferocity','rally','thickhide','unleash','keeneye','keeneye','keeneye','tracker','camo','silver'].forEach(id=>spendTalent(TALENT_BY_ID[id])); g.talentSel='snare'; });
  await key('KeyT'); await page.waitForTimeout(3500); await shot('19-talent-tree-build'); await key('Escape');
  await key('Digit1'); await page.waitForTimeout(3500); await key('Digit3'); await page.waitForTimeout(300); await shot('20-hud-abilities');
  // Real encounter: walk into tall grass east of town
  await page.evaluate(()=>{ __sv.G.camoUntil=0; warpTo(24,16); healParty(1); });
  let steps=0; while((await G()).mode==='world' && steps++<80){ await key(steps%2?'ArrowRight':'ArrowLeft',1,260); }
  console.log('grass encounter after', steps, 'steps:', (await G()).battle);
  await shot('21-wild-encounter');
  console.log('ERRORS:', errors.length? errors.join('\n'):'none');
  await browser.close();
})();
