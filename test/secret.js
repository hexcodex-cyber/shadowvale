const {chromium}=require('playwright-core');
const URL=process.env.URL||'http://localhost:8765/index.html';
(async()=>{ const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}); const p=await b.newPage({viewport:{width:1000,height:680}}); const e=[]; const res={};
  p.on('pageerror',x=>e.push('pageerror '+x.message)); p.on('console',m=>{if(m.type()==='error')e.push(m.text())});
  await p.goto(URL+'?t='+Date.now()); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(500); await p.click('#lg-offline');
  await p.keyboard.press('Enter'); await p.keyboard.press('Enter'); for(let i=0;i<4;i++) await p.keyboard.press('Space');
  const shot=async n=>{ await p.waitForTimeout(350); await p.locator('#wrap').screenshot({path:`shots/${n}.png`}); };
  const step=async(k,n=1)=>{ for(let i=0;i<n;i++){ await p.keyboard.press(k); await p.waitForTimeout(260);} };
  // read the hint sign
  await p.evaluate(()=>{ __sv.G.camoUntil=1e9; warpTo(22,5); __sv.G.player.dir='down'; }); await p.keyboard.press('KeyE'); await p.waitForTimeout(200);
  res.hint=await p.evaluate(()=>__sv.G.dialog&&__sv.G.dialog.lines[0]); await shot('50-secret-hint'); await p.keyboard.press('Space');
  await p.keyboard.press('KeyB'); await step('ArrowRight'); await shot('50b-bestiary-before'); await p.keyboard.press('Escape');
  // walk through the dreaming tree into the grotto
  await p.evaluate(()=>{ warpTo(23,4); __sv.G.player.dir='right'; });
  await step('ArrowRight',1); res.throughTree=await p.evaluate(()=>__sv.G.player.tx===24); await step('ArrowRight',1);
  res.zone=await p.evaluate(()=>__sv.G.zone); await shot('51-secret-area');
  await step('ArrowRight',2); res.eggFound=await p.evaluate(()=>!!__sv.G.flags.prismEgg); res.toast=await p.evaluate(()=>toasts.map(t=>t.t).join(' | '));
  await shot('51b-egg-found'); for(let i=0;i<4;i++){ await p.keyboard.press('Space'); await p.waitForTimeout(80); }
  res.party=await p.evaluate(()=>__sv.G.party.map(c=>c.sp+':'+c.level));
  await p.keyboard.press('KeyP'); await shot('52-prismatic-creature'); await p.keyboard.press('Escape');
  await p.keyboard.press('KeyB'); await step('ArrowRight'); res.dexCaught=await p.evaluate(()=>!!__sv.G.dex.caught.Prismewl); await shot('52b-bestiary-after'); await p.keyboard.press('Escape');
  // saved?
  res.saved=await p.evaluate(()=>JSON.parse(localStorage.getItem(saveKey())).flags.prismEgg===true);
  // first person: ride horse through the dreaming tree
  await p.evaluate(()=>{ __sv.G.flags.prismEgg=false; __sv.G.mounts={horse:true}; warpTo(21,4); __sv.G.player.dir='right'; summonMount('horse'); });
  await p.keyboard.down('KeyW'); await p.waitForTimeout(700); await p.keyboard.up('KeyW'); res.fp_tile=await p.evaluate(()=>tileAt(Math.floor(__sv.G.ride.x),Math.floor(__sv.G.ride.y)));
  await shot('54-secret-fp'); await p.keyboard.down('KeyW'); await p.waitForTimeout(700); await p.keyboard.up('KeyW'); res.fp_egg=await p.evaluate(()=>!!__sv.G.flags.prismEgg);
  console.log(JSON.stringify(res,null,1)); console.log('ERRORS',e.length?e:'none'); await b.close(); })();
