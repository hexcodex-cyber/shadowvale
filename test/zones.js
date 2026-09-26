const {chromium}=require('playwright-core');
const URL=process.env.URL||'http://localhost:8765/index.html';
(async()=>{ const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}); const p=await b.newPage({viewport:{width:1000,height:680}}); const e=[]; const res={};
  p.on('pageerror',x=>e.push('pageerror '+x.message)); p.on('console',m=>{if(m.type()==='error')e.push(m.text())});
  await p.goto(URL+'?t='+Date.now()); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(500); await p.click('#lg-offline');
  await p.keyboard.press('Enter'); await p.keyboard.press('Enter'); for(let i=0;i<4;i++) await p.keyboard.press('Space');
  const shot=async n=>{ await p.waitForTimeout(400); await p.locator('#wrap').screenshot({path:`shots/${n}.png`}); };
  // walk through the Frostpeak pass from the lake side
  await p.evaluate(()=>{ __sv.G.camoUntil=1e9; warpTo(60,27); __sv.G.player.dir='right'; });
  for(let i=0;i<5;i++){ await p.keyboard.press('ArrowRight'); await p.waitForTimeout(260); }
  res.frostZone=await p.evaluate(()=>__sv.G.zone+' @'+__sv.G.player.tx+','+__sv.G.player.ty);
  await p.keyboard.press('ArrowUp'); await p.waitForTimeout(300);
  await p.keyboard.press('KeyE'); await p.waitForTimeout(200); res.brann=await p.evaluate(()=>__sv.G.dialog&&__sv.G.dialog.name);
  for(let i=0;i<3;i++){ await p.keyboard.press('Space'); await p.waitForTimeout(80); } res.gearQuest=await p.evaluate(()=>__sv.G.quests.gear);
  await shot('53-new-zone');
  await p.evaluate(()=>{ warpTo(67,6); }); await p.waitForTimeout(100); await p.evaluate(()=>onStep(true)); res.gear=await p.evaluate(()=>__sv.G.gear.length);
  // frost encounter
  await p.evaluate(()=>{ __sv.G.camoUntil=0; warpTo(71,15); }); let n=0; while(await p.evaluate(()=>__sv.G.mode==='world') && n++<60){ await p.keyboard.press(n%2?'ArrowRight':'ArrowLeft'); await p.waitForTimeout(260); }
  res.frostEncounter=await p.evaluate(()=>__sv.G.battle&&__sv.G.battle.enemy.sp); await shot('55-frost-battle');
  await p.evaluate(()=>{ __sv.G.battle=null; __sv.G.mode='world'; __sv.G.camoUntil=1e9; warpTo(20,43); __sv.G.player.dir='down'; });
  for(let i=0;i<2;i++){ await p.keyboard.press('ArrowDown'); await p.waitForTimeout(260); } res.coastZone=await p.evaluate(()=>__sv.G.zone);
  await shot('56-coast-zone');
  // orca to island B relic
  await p.evaluate(()=>{ __sv.G.mounts={orca:true,dragon:true}; warpTo(45,47); __sv.G.player.dir='down'; summonMount('orca'); __sv.G.ride.a=Math.PI/2; });
  await p.keyboard.down('KeyW'); await p.waitForTimeout(900); await p.keyboard.up('KeyW'); await shot('57-coast-orca-fp');
  res.orcaAt=await p.evaluate(()=>[__sv.G.ride.x.toFixed(1),__sv.G.ride.y.toFixed(1),__sv.G.zone]);
  await p.evaluate(()=>{ dismount(true); warpTo(45,47); summonMount('dragon'); __sv.G.ride.a=Math.PI/2; }); await p.keyboard.down('KeyW'); await p.waitForTimeout(1900); await p.keyboard.up('KeyW');
  res.relicsAfterFlight=await p.evaluate(()=>__sv.G.relics.length+'/'+RELIC_SPOTS.length);
  await p.keyboard.press('KeyB'); await p.keyboard.press('ArrowRight'); await shot('58-bestiary-new');
  console.log(JSON.stringify(res,null,1)); console.log('ERRORS',e.length?e:'none'); await b.close(); })();
