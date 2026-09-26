const {chromium}=require('playwright-core');
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const page=await browser.newPage(); page.on('pageerror',e=>console.log('ERR',e.message));
  await page.goto('file://'+__dirname+'/../index.html'); await page.waitForTimeout(300);
  const r=await page.evaluate(()=>{
    function run(team, boss, lvl, talents){ let wins=0;
      for(let n=0;n<40;n++){ G=newState(); G.mode='world'; G.player.talents=talents||{}; team.forEach(([s,l])=>addCreature(makeCreature(s,l)));
        const g=GUARDIANS.find(x=>x.sp===boss); startBattle(makeCreature(boss,g.level),{guardian:g}); let guard=0;
        while(G.battle && guard++<3000){ const b=G.battle;
          if(b.menu==='msg') nextStep();
          else if(b.menu==='learn'){ b.learn=null; nextStep(); }
          else if(b.menu==='swap'){ playerTurn({kind:'swap',idx:G.party.findIndex(c=>c.hp>0)}); }
          else { const c=cur(b); let best=c.moves[0],bs=-1; c.moves.forEach(m=>{const mv=MOVES[m]; const s=mv.power*typeMult(mv.type,SPECIES[b.enemy.sp].type)*(mv.type===SPECIES[c.sp].type?1.25:1)*mv.acc; if(s>bs){bs=s;best=m;}}); playerTurn({kind:'move',move:best}); } }
        if(G.flags['g_'+g.id]) wins++; }
      return wins/40; }
    return {
      thorn_ember10: run([['Emberpup',10],['Glowmoth',7]],'Thornwarden'),
      thorn_sprout9: run([['Sproutle',9],['Fluffwool',7],['Shadekit',8]],'Thornwarden'),
      magma_tide12: run([['Tidefin',12],['Mossback',10],['Shadekit',10]],'Magmaw'),
      magma_sprout12: run([['Sproutle',12],['Mossback',11],['Glowmoth',10]],'Magmaw'),
      tide_sprout14: run([['Sproutle',14],['Pebblit',12],['Glowmoth',12]],'Tidecaller'),
      umbrax_16: run([['Emberpup',16],['Glowmoth',15],['Rippletoad',14],['Pebblit',14]],'Umbrax'),
      umbrax_16_tal: run([['Emberpup',16],['Glowmoth',15],['Rippletoad',14],['Pebblit',14]],'Umbrax',0,{ferocity:3,thickhide:2}),
    }; });
  console.log(r); await browser.close(); })();
