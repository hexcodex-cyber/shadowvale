// Multiplayer / login tests: offline fallback, login screen (fake config), mocked second player HUD.
const {chromium}=require('playwright-core');
const FAKE=`window.FIREBASE_CONFIG={apiKey:"AIzaSyFAKE-test-key-000000000000000000",authDomain:"shadowvale-test.firebaseapp.com",databaseURL:"https://shadowvale-test-default-rtdb.firebaseio.com",projectId:"shadowvale-test",appId:"1:1:web:1"};`;
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const url=process.env.URL||'http://localhost:8765/index.html';
  const snap=async(page,n)=>{ await page.waitForTimeout(300); await page.locator('#wrap').screenshot({path:`shots/${n}.png`}); };
  // 1) Offline fallback with placeholder config
  let page=await browser.newPage({viewport:{width:1000,height:680}}); const errs=[];
  page.on('pageerror',e=>errs.push('pageerror '+e.message)); page.on('console',m=>{ if(m.type()==='error') errs.push('console '+m.text()); });
  await page.goto(url); await page.evaluate(()=>localStorage.clear()); await page.reload(); await page.waitForTimeout(600);
  const status=await page.textContent('#lg-status'); console.log('offline status:', status, '| form visible:', await page.isVisible('#lg-form'));
  await snap(page,'22-login-offline');
  await page.click('#lg-offline'); await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  for(let i=0;i<5;i++) await page.keyboard.press('Space');
  await page.keyboard.press('Escape'); await snap(page,'23-system-menu-offline'); await page.keyboard.press('Escape');
  console.log('offline mode:', await page.evaluate(()=>__sv.G.mode), 'party', await page.evaluate(()=>__sv.G.party.length));
  // 2) Mock multiplayer HUD: fake signed-in user + second player + chat + world boss
  await page.evaluate(()=>{ const N=window.NET; N.user={uid:'me123',name:'Kym'}; N.online=true; const now=Date.now();
    N.players={ other1:{name:'Ash',zone:'town',x:14,y:21,dir:'left',lead:'Emberpup',lvl:7,ts:now}, other2:{name:'Misty',zone:'town',x:10,y:23,dir:'up',lead:'Tidefin',lvl:9,ts:now}, far:{name:'Brock',zone:'cave',x:50,y:10,dir:'down',lead:'Pebblit',lvl:12,ts:now} };
    N.chat=[{uid:'other1',name:'Ash',text:'anyone want to team up on the Riftmaw?',ts:now,_t:performance.now()},{uid:'me123',name:'Kym',text:'yes! meet at the east road',ts:now,_t:performance.now()},{uid:'other2',name:'Misty',text:'Tidecaller is weak to Nature btw',ts:now,_t:performance.now()}];
    N.boss={hp:2710,max:4000,hits:12}; __sv.G.player.name='Kym'; });
  await page.waitForTimeout(400);
  // move the fake player to show interpolation
  await page.evaluate(()=>{ NET.players.other1.x=15; });
  await page.keyboard.press('Enter'); await page.keyboard.type('hello world'); await snap(page,'24-multiplayer-hud-mock');
  await page.keyboard.press('Escape');
  const remote=await page.evaluate(()=>JSON.stringify(__sv.MP.remote));
  console.log('remote interpolated:', remote);
  // walk to rift & open battle to show shared HP
  await page.evaluate(()=>{ warpTo(36,24); __sv.G.player.dir='right'; }); await page.waitForTimeout(200); await snap(page,'25-world-boss-overworld');
  await page.keyboard.press('KeyE'); await page.keyboard.press('Space'); await page.keyboard.press('Space'); await page.keyboard.press('Enter');
  await page.waitForTimeout(900); for(let i=0;i<2;i++){ await page.keyboard.press('Space'); await page.waitForTimeout(100);} await snap(page,'26-world-boss-battle');
  console.log('boss battle mode:', await page.evaluate(()=>__sv.G.mode));
  console.log('OFFLINE/MOCK ERRORS:', errs.length?errs.join('\n'):'none');
  await page.close();
  // 3) Login screen with a (fake) real-looking config → form renders, error message on bad sign-in
  page=await browser.newPage({viewport:{width:1000,height:680}}); const errs2=[];
  page.on('pageerror',e=>errs2.push('pageerror '+e.message));
  await page.route('**/js/firebase-config.js',r=>r.fulfill({contentType:'application/javascript',body:FAKE}));
  await page.goto(url); await page.waitForFunction(()=>window.NET&&NET.ready,null,{timeout:20000}).catch(()=>{});
  console.log('configured:', await page.evaluate(()=>NET.configured), 'status:', await page.textContent('#lg-status'), '| form visible:', await page.isVisible('#lg-form'));
  await snap(page,'27-login-screen');
  await page.click('#lg-toggle'); await snap(page,'28-login-signup');
  await page.click('#lg-toggle');
  await page.fill('#lg-email','test@example.com'); await page.fill('#lg-pass','hunter22'); await page.click('#lg-submit');
  await page.waitForFunction(()=>document.getElementById('lg-msg').textContent.length>0,null,{timeout:15000}).catch(()=>{});
  console.log('bad sign-in message:', await page.textContent('#lg-msg')); await snap(page,'29-login-error');
  console.log('LOGIN PAGE ERRORS:', errs2.length?errs2.join('\n'):'none');
  await browser.close();
})();
