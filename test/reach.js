const fs=require('fs'), vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Set,localStorage:{getItem(){},setItem(){}}}; vm.createContext(ctx);
for(const f of ['data','world','core']) vm.runInContext(fs.readFileSync(__dirname+'/../js/'+f+'.js','utf8').replace(/^'use strict';/m,''),ctx);
vm.runInContext(`
const Wd=buildWorld(); const t=Wd.tiles;
const snap=a=>a.map(([x,y])=>nearestWalkable(t,x,y));
const gear=snap(GEAR_SPOTS); const relics=snap(RELIC_SPOTS), petals=snap(PETAL_SPOTS), lambs=snap(LAMB_SPOTS);
function bfs(open){ const seen=new Set(['12,22']); const q=[[12,22]];
  const block=(x,y)=>{ if(x<0||y<0||x>=MAP_W||y>=MAP_H) return true; let c=t[y][x]; if(open&&x===47&&y===22) c='r'; if(SOLID.has(c)) return true;
    if(NPCS.some(n=>n.x===x&&n.y===y)||GUARDIANS.some(g=>g.x===x&&g.y===y)||lambs.some(([a,b])=>a===x&&b===y)) return true; return false; };
  while(q.length){ const [x,y]=q.shift(); for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const k=(x+dx)+','+(y+dy); if(!seen.has(k)&&!block(x+dx,y+dy)){ seen.add(k); q.push([x+dx,y+dy]); } } }
  return seen; }
const s=bfs(false), s2=bfs(true);
const adj=(set,x,y)=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>set.has((x+dx)+','+(y+dy)));
const fails=[];
NPCS.forEach(n=>{ if(!adj(s,n.x,n.y)) fails.push('npc '+n.id); });
GUARDIANS.forEach(g=>{ if(!adj(g.final?s2:s,g.x,g.y)) fails.push('guardian '+g.id+' tile '+t[g.y][g.x]); });
relics.forEach(([x,y],i)=>{ if((x===40&&y===31)||(x===45&&y===54)) return; /* water-locked islet: mounts only */ if(!s.has(x+','+y)) fails.push('relic '+i+' '+x+','+y); });
petals.forEach(([x,y],i)=>{ if(!s.has(x+','+y)) fails.push('petal '+i+' '+x+','+y); });
lambs.forEach(([x,y],i)=>{ if(!adj(s,x,y)) fails.push('lamb '+i); });
Wd.signs.forEach(g=>{ if(!adj(s,g.x,g.y)) fails.push('sign '+g.x+','+g.y); });
if(!adj(s,47,22)) fails.push('gate');
gear.forEach(([x,y],i)=>{ if(!s.has(x+','+y)) fails.push('gear '+i+' '+x+','+y); });
if(!s.has(SECRET.egg[0]+','+SECRET.egg[1])) fails.push('secret egg');
// encounter tiles per zone reachable
const zc={}; s.forEach(k=>{ const [x,y]=k.split(',').map(Number); if(t[y][x]===','||t[y][x]==='c') { const z=zoneAt(x,y); zc[z]=(zc[z]||0)+1; } });
console.log('reachable',s.size,'encounter tiles by zone',JSON.stringify(zc));
console.log(fails.length?'FAILS: '+fails.join('; '):'ALL REACHABLE');
console.log(t.map(r=>r.join('')).join('\\n'));
`,ctx);
