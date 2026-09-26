// Mouse-only flow: sign up (real Firebase) → click New Game → click starter → click dialog → battle via clicks. Deletes the account after.
const {chromium}=require('playwright-core');
const URL=process.env.URL||'http://localhost:8765/index.html'; const CDN='https://www.gstatic.com/firebasejs/10.12.2';
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1000,height:680}}); const errs=[]; const res={};
  page.on('pageerror',e=>errs.push('pageerror '+e.message)); page.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  await page.goto(URL+'?t='+Date.now()); await page.waitForFunction(()=>window.NET&&NET.ready,null,{timeout:20000});
  const box=await page.locator('#game').boundingBox(); const click=async(x,y)=>{ await page.mouse.click(box.x+x*box.width/960, box.y+y*box.height/640); await page.waitForTimeout(250); };
  const offline = process.env.OFFLINE==='1' || !(await page.evaluate(()=>NET.configured));
  const rnd=Math.random().toString(36).slice(2,8);
  if(offline) await page.click('#lg-offline');
  else { await page.click('#lg-toggle'); await page.fill('#lg-name','Clk'+rnd.slice(0,4)); await page.fill('#lg-email',`shadowvale.qa3+${rnd}@example.com`); await page.fill('#lg-pass','Qa-test-'+rnd); await page.click('#lg-submit'); }
  await page.waitForFunction(()=>__sv.G.mode==='title',null,{timeout:20000}); await page.waitForTimeout(800);
  res.signedToasts=await page.evaluate(()=>toasts.filter(t=>t.t.startsWith('Signed in')).length);
  res.focusOnCanvas=await page.evaluate(()=>document.activeElement===canvas);
  await page.locator('#wrap').screenshot({path:'shots/33-title-after-login.png'});
  await click(480,422); res.afterNewGameClick=await page.evaluate(()=>__sv.G.mode);
  await click(220+270,300); res.afterStarterClick=await page.evaluate(()=>__sv.G.mode+':'+(__sv.G.party[0]||{}).sp);
  for(let i=0;i<4;i++) await click(480,500); res.dialogClosed=await page.evaluate(()=>!__sv.G.dialog);
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(300); res.keyboardWorks=await page.evaluate(()=>__sv.G.player.ty===21);
  await page.evaluate(()=>__sv.startBattle(__sv.makeCreature('Fluffwool',2)));
  for(let i=0;i<30 && await page.evaluate(()=>__sv.G.mode==='battle');i++){ const m=await page.evaluate(()=>__sv.G.battle.menu);
    if(m==='main') await click(W_=960-380+100,640-180+10); else if(m==='fight') await click(960-380+80,640-180+15); else await click(300,560); }
  res.battleByClicks=await page.evaluate(()=>__sv.G.mode); res.wins=await page.evaluate(()=>__sv.G.wildWins);
  for(let i=0;i<3;i++) if(await page.evaluate(()=>!!__sv.G.dialog)) await click(480,500);
  await page.keyboard.press('Escape'); await click(480,222+18); res.systemMenuResumeClick=await page.evaluate(()=>__sv.G.menu===null);
  await page.keyboard.press('KeyT'); await click(W_=960-33,20); res.talentCloseClick=await page.evaluate(()=>__sv.G.menu===null);
  if(!offline) res.cleanup=await page.evaluate(async CDN=>{ const A=await import(CDN+'/firebase-auth.js'),D=await import(CDN+'/firebase-database.js'); const u=A.getAuth().currentUser; const db=D.getDatabase();
    await D.remove(D.ref(db,'presence/'+u.uid)).catch(()=>{}); await D.remove(D.ref(db,'users/'+u.uid)).catch(()=>{}); await A.deleteUser(u); return 'account deleted'; },CDN);
  console.log(JSON.stringify(res,null,1)); console.log('ERRORS:',errs.length?errs:'none'); await browser.close(); })();
