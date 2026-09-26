const {chromium}=require('playwright-core');
const URL=process.env.URL||'http://localhost:8765/index.html';
(async()=>{ const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}); const p=await b.newPage({viewport:{width:1000,height:680}}); const e=[]; const res={};
  p.on('pageerror',x=>e.push('pageerror '+x.message)); p.on('console',m=>{if(m.type()==='error')e.push(m.text())});
  await p.goto(URL+'?t='+Date.now()); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(500); await p.click('#lg-offline');
  await p.keyboard.press('Enter'); await p.keyboard.press('Enter'); for(let i=0;i<4;i++) await p.keyboard.press('Space');
  const shot=async n=>{ await p.waitForTimeout(350); await p.locator('#wrap').screenshot({path:`shots/${n}.png`}); };
  await p.keyboard.press('KeyM'); await shot('39-mount-menu'); await p.keyboard.press('Escape');
  await p.evaluate(()=>{ __sv.G.mounts={horse:true,dragon:true,dragonfly:true,orca:true}; });
  const ride=async(name,x,y,dir,type,holdMs,shotName)=>{ await p.evaluate(([x,y,dir])=>{ if(__sv.G.ride) dismount(true); warpTo(x,y); __sv.G.player.dir=dir; },[x,y,dir]);
    await p.keyboard.press('KeyM'); const idx=['horse','dragonfly','dragon','orca'].indexOf(type); for(let i=0;i<idx;i++) await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
    res[name+'_mounted']=await p.evaluate(()=>__sv.G.ride&&__sv.G.ride.type);
    const before=await p.evaluate(()=>[__sv.G.ride.x,__sv.G.ride.y]); await p.keyboard.down('KeyW'); await p.waitForTimeout(holdMs); await p.keyboard.up('KeyW');
    const after=await p.evaluate(()=>[__sv.G.ride.x,__sv.G.ride.y]); res[name+'_moved']=Math.hypot(after[0]-before[0],after[1]-before[1]).toFixed(2);
    await shot(shotName); };
  await ride('horse',12,22,'right','horse',600,'40-horse-fp');
  await ride('horseforest',12,11,'up','horse',300,'46-horse-forest-fp');
  await ride('dragon',12,14,'up','dragon',900,'41-dragon-fp');
  res.dragon_over_trees=await p.evaluate(()=>tileAt(Math.floor(__sv.G.ride.x),Math.floor(__sv.G.ride.y)));
  await ride('dragonfly',30,21,'right','dragonfly',500,'42-dragonfly-fp');
  await ride('orca',35,32,'right','orca',700,'43-orca-fp');
  res.orca_tile=await p.evaluate(()=>tileAt(Math.floor(__sv.G.ride.x),Math.floor(__sv.G.ride.y)));
  await p.keyboard.press('KeyM'); res.orca_dismount=await p.evaluate(()=>!__sv.G.ride);
  // 2D: two riders on one remote mount (mocked multiplayer)
  await p.evaluate(()=>{ warpTo(12,22); const N=NET; N.user={uid:'me',name:'Kym'}; N.online=true; const now=Date.now();
    N.players={ d1:{name:'Ash',zone:'town',x:15,y:22,dir:'right',lead:'Emberpup',lvl:8,ts:now,ride:{id:'d1-x',type:'dragon',seat:0,driver:true,h:0}},
                p1:{name:'Misty',zone:'town',x:15,y:22,dir:'right',lead:'Tidefin',lvl:6,ts:now,ride:{id:'d1-x',type:'dragon',seat:1,driver:false,h:0,du:'d1'}},
                d2:{name:'Brock',zone:'town',x:9,y:21,dir:'left',lead:'Pebblit',lvl:9,ts:now,ride:{id:'d2-x',type:'horse',seat:0,driver:true,h:3.14}} }; });
  await shot('44-two-riders-2d');
  // board Ash's dragon as passenger (seat 3) and view shared first-person
  await p.evaluate(()=>{ warpTo(14,22); __sv.G.player.dir='right'; }); await p.keyboard.press('KeyE'); await p.waitForTimeout(300);
  res.boarded=await p.evaluate(()=>__sv.G.ride&&(__sv.G.ride.driver?'driver':'passenger seat '+__sv.G.ride.seat));
  await shot('45-passenger-fp');
  await p.keyboard.press('KeyM'); res.hopped_off=await p.evaluate(()=>!__sv.G.ride);
  console.log(JSON.stringify(res,null,1)); console.log('ERRORS',e.length?e:'none'); await b.close(); })();
