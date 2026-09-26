const {chromium}=require('playwright-core');
const URL=process.env.URL||'https://hexcodex-cyber.github.io/shadowvale/';
const CDN='https://www.gstatic.com/firebasejs/10.12.2';
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const rnd=Math.random().toString(36).slice(2,8); const res={}; const errs={p1:[],p2:[]};
  const players=[];
  for(const [id,name] of [['p1','QA1'+rnd.slice(0,3)],['p2','QA2'+rnd.slice(0,3)]]){
    const ctx=await browser.newContext({viewport:{width:1000,height:680}}); const page=await ctx.newPage();
    page.on('pageerror',e=>errs[id].push('pageerror '+e.message)); page.on('console',m=>{ if(m.type()==='error'||m.type()==='warning') errs[id].push(m.type()+' '+m.text()); });
    await page.goto(URL+'?t='+Date.now()); await page.waitForFunction(()=>window.NET&&NET.ready,null,{timeout:20000});
    const email=`shadowvale.qa${id.slice(1)}+${rnd}@example.com`;
    await page.click('#lg-toggle'); await page.fill('#lg-name',name); await page.fill('#lg-email',email); await page.fill('#lg-pass','Qa-test-'+rnd); await page.click('#lg-submit');
    await page.waitForFunction(()=>__sv.G.mode==='title',null,{timeout:20000}).catch(async()=>console.log(id,'signup msg:',await page.textContent('#lg-msg')));
    res[id+'_signup']=await page.evaluate(()=>__sv.G.mode==='title' && !!NET.user);
    await page.keyboard.press('Enter'); await page.waitForTimeout(150); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
    for(let i=0;i<5;i++){ await page.keyboard.press('Space'); await page.waitForTimeout(80); }
    players.push({id,name,email,page,ctx});
  }
  const [a,b]=players;
  await b.page.keyboard.press('ArrowRight'); await b.page.waitForTimeout(300); await b.page.keyboard.press('ArrowRight'); await b.page.waitForTimeout(300);
  await a.page.keyboard.press('ArrowUp'); await a.page.waitForTimeout(300);
  const seeOther=async(p,otherName)=>p.page.waitForFunction(n=>livePlayers().some(([,r])=>r.name===n && r.zone===__sv.G.zone) && Object.keys(__sv.MP.remote).length>0,otherName,{timeout:15000}).then(()=>true).catch(()=>false);
  res.p1_sees_p2=await seeOther(a,b.name); res.p2_sees_p1=await seeOther(b,a.name);
  res.p1_count2=await a.page.evaluate(()=>livePlayers().length+1); res.p2_count2=await b.page.evaluate(()=>livePlayers().length+1);
  const msg='hello from '+a.name+' '+rnd;
  await a.page.keyboard.press('Enter'); await a.page.keyboard.type(msg); await a.page.keyboard.press('Enter');
  res.chat_p2_received=await b.page.waitForFunction(m=>NET.chat.some(c=>c.text===m),msg,{timeout:15000}).then(()=>true).catch(()=>false);
  res.chat_p1_echo=await a.page.evaluate(m=>NET.chat.some(c=>c.text===m),msg);
  await a.page.waitForTimeout(600);
  await a.page.locator('#wrap').screenshot({path:'shots/31-live-mp-p1.png'}); await b.page.locator('#wrap').screenshot({path:'shots/32-live-mp-p2.png'});
  // cloud save check
  res.p1_hud_name=await a.page.evaluate(()=>__sv.G.player.name); res.p2_hud_name=await b.page.evaluate(()=>__sv.G.player.name);
  res.p1_cloud_save=await a.page.evaluate(async()=>{ saveGame(); await new Promise(r=>setTimeout(r,1500)); return !!(await NET.loadSave()); });
  // cleanup: remove users/{uid}, presence, then delete auth account
  for(const p of players){
    p.cleanup=await p.page.evaluate(async CDN=>{ const A=await import(CDN+'/firebase-auth.js'), D=await import(CDN+'/firebase-database.js'); const u=A.getAuth().currentUser; const db=D.getDatabase(); const out={uid:u.uid};
      try{ await D.remove(D.ref(db,'users/'+u.uid)); out.users='removed'; }catch(e){ out.users='ERR '+e.code; }
      try{ await D.remove(D.ref(db,'presence/'+u.uid)); out.presence='removed'; }catch(e){ out.presence='ERR '+e.code; }
      try{ const q=await D.get(D.query(D.ref(db,'chat'),D.orderByChild('ts'),D.limitToLast(50))); let n=0,f=0; for(const [k,v] of Object.entries(q.val()||{})) if(v.uid===u.uid){ try{ await D.remove(D.ref(db,'chat/'+k)); n++; }catch(e){ f++; } } out.chat=`removed ${n}, denied ${f}`; }catch(e){ out.chat='ERR '+e.code; }
      try{ await A.deleteUser(u); out.account='deleted'; }catch(e){ out.account='ERR '+e.code; }
      return out; },CDN);
  }
  console.log('RESULTS', JSON.stringify(res,null,1));
  players.forEach(p=>console.log('cleanup',p.email,JSON.stringify(p.cleanup)));
  console.log('ERRORS p1:',errs.p1.length?errs.p1:'none'); console.log('ERRORS p2:',errs.p2.length?errs.p2:'none');
  await browser.close();
})();
