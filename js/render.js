// ===== Shadowvale: drawing helpers & procedural sprites =====
'use strict';
const W=960, H=640, TILE=32;
let ctx;
function rr(x,y,w,h,r,fill,stroke,lw=2){ ctx.beginPath(); ctx.roundRect(x,y,w,h,r); if(fill){ctx.fillStyle=fill;ctx.fill();} if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();} }
function panel(x,y,w,h,alpha=0.88){ rr(x,y,w,h,8,`rgba(18,16,30,${alpha})`,'#c8a458',2); }
function text(t,x,y,{size=16,color='#fff',align='left',bold=false,base='alphabetic',font='Trebuchet MS, sans-serif',shadow=true}={}){
  ctx.font=`${bold?'bold ':''}${size}px ${font}`; ctx.textAlign=align; ctx.textBaseline=base;
  if(shadow){ ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillText(t,x+1,y+1); }
  ctx.fillStyle=color; ctx.fillText(t,x,y);
}
function wrap(t,maxW,size=16){ ctx.font=`${size}px Trebuchet MS, sans-serif`; const words=String(t).split(' '); const lines=[]; let cur='';
  for(const w of words){ const test=cur?cur+' '+w:w; if(ctx.measureText(test).width>maxW && cur){ lines.push(cur); cur=w; } else cur=test; } if(cur) lines.push(cur); return lines; }
function bar(x,y,w,h,frac,color,bg='#222'){ rr(x,y,w,h,h/2,bg); if(frac>0) rr(x,y,Math.max(h,w*clamp(frac,0,1)),h,h/2,color); ctx.strokeStyle='rgba(0,0,0,.5)'; ctx.lineWidth=1; ctx.beginPath(); ctx.roundRect(x,y,w,h,h/2); ctx.stroke(); }
function hpColor(f){ return f>0.5?'#4cd964':f>0.2?'#ffcc00':'#ff3b30'; }
function typeBadge(t,x,y){ rr(x,y,62,18,9,TYPE_COLORS[t]); text(t,x+31,y+13,{size:12,align:'center',bold:true}); }

// ---------- creatures ----------
function drawCreature(sp,cx,cy,s,{flip=false,t=0,alpha=1,shadow=true}={}){
  const L=SPECIES[sp].look; ctx.save(); ctx.globalAlpha=alpha; ctx.translate(cx,cy+Math.sin(t*3)*s*0.03); if(flip) ctx.scale(-1,1);
  if(shadow){ ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0,s*0.48,s*0.42,s*0.1,0,0,7); ctx.fill(); }
  const body=L.body==='rainbow'?`hsl(${(performance.now()/8)%360},85%,62%)`:L.body, acc=L.accent, f=L.feat;
  const ell=(x,y,rx,ry,c,rot=0)=>{ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot,0,7);ctx.fill();};
  const tri=(pts,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)ctx.lineTo(pts[i],pts[i+1]);ctx.closePath();ctx.fill();};
  if(f==='wings'){ ell(-s*.32,-s*.1,s*.28,s*.36,acc,-.5); ell(s*.32,-s*.1,s*.28,s*.36,acc,.5); ell(-s*.3,-s*.1,s*.18,s*.24,body,-.5); ell(s*.3,-s*.1,s*.18,s*.24,body,.5); }
  if(f==='dragon'){ tri([-s*.2,-s*.1,-s*.75,-s*.55,-s*.55,s*.1],'#1a0f2a'); tri([s*.2,-s*.1,s*.75,-s*.55,s*.55,s*.1],'#1a0f2a'); tri([-s*.15,-s*.3,-s*.25,-s*.62,-s*.02,-s*.36],acc); tri([s*.15,-s*.3,s*.25,-s*.62,s*.02,-s*.36],acc); }
  if(f==='flame'){ for(let i=-2;i<=2;i++) tri([i*s*.12-s*.08,-s*.25,i*s*.12,-s*.6-Math.abs(Math.sin(t*6+i))*s*.12,i*s*.12+s*.08,-s*.25],i%2?'#ffcf3f':'#ff6a00'); }
  if(f==='wisp'){ ctx.globalAlpha=alpha*0.5; ell(0,0,s*.5,s*.5,body); ctx.globalAlpha=alpha; tri([-s*.2,s*.2,0,s*.6+Math.sin(t*5)*s*.05,s*.2,s*.2],body); }
  if(f==='fin') tri([-s*.05,-s*.28,s*.12,-s*.62,s*.25,-s*.22],acc);
  if(f==='shell'){ ell(0,-s*.05,s*.42,s*.3,acc); ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=2; for(let i=-1;i<=1;i++){ctx.beginPath();ctx.arc(i*s*.18,-s*.08,s*.1,0,7);ctx.stroke();} }
  // body
  if(f==='wool'){ for(let i=0;i<7;i++){ const a=i/7*Math.PI*2; ell(Math.cos(a)*s*.25,Math.sin(a)*s*.2,s*.18,s*.18,body);} ell(0,0,s*.3,s*.26,body); ell(0,s*.02,s*.2,s*.18,acc); }
  else if(f==='rock'){ tri([-s*.38,s*.3,-s*.3,-s*.2,0,-s*.36,s*.32,-s*.18,s*.4,s*.3],body); }
  else ell(0,s*.05,s*.34,s*.32,body);
  if(f!=='wool' && f!=='rock') ell(0,s*.15,s*.2,s*.16,acc);
  if(f==='rock') ell(0,s*.12,s*.16,s*.1,acc);
  if(f==='ears'){ tri([-s*.28,-s*.12,-s*.3,-s*.48,-s*.08,-s*.24],body); tri([s*.28,-s*.12,s*.3,-s*.48,s*.08,-s*.24],body); tri([-s*.25,-s*.18,-s*.26,-s*.38,-s*.14,-s*.24],acc); tri([s*.25,-s*.18,s*.26,-s*.38,s*.14,-s*.24],acc);
    ctx.strokeStyle=body; ctx.lineWidth=s*.07; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(s*.3,s*.2); ctx.quadraticCurveTo(s*.55,s*.1,s*.5,-s*.12); ctx.stroke(); if(SPECIES[sp].type==='Fire') ell(s*.5,-s*.16,s*.07,s*.1,'#ffcf3f'); }
  if(f==='leaf'){ ctx.strokeStyle='#2d6a2d'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(0,-s*.25); ctx.lineTo(0,-s*.42); ctx.stroke(); ell(s*.1,-s*.46,s*.14,s*.07,acc,-.5); ell(-s*.1,-s*.44,s*.12,s*.06,'#7be07b',.5); }
  if(f==='horns'){ tri([-s*.22,-s*.18,-s*.36,-s*.5,-s*.1,-s*.26],acc); tri([s*.22,-s*.18,s*.36,-s*.5,s*.1,-s*.26],acc); }
  if(f==='toad'){ ell(-s*.17,-s*.24,s*.1,s*.1,body); ell(s*.17,-s*.24,s*.1,s*.1,body); }
  // eyes
  const ey = f==='toad'? -s*.24 : -s*.05, ex = f==='toad'? s*.17 : s*.13;
  const eyeC = f==='dragon'? '#ff3fbf' : (SPECIES[sp].type==='Shadow'?'#e0c0ff':'#fff');
  ell(-ex,ey,s*.07,s*.08,eyeC); ell(ex,ey,s*.07,s*.08,eyeC);
  ell(-ex+s*.015,ey+s*.01,s*.035,s*.045,'#111'); ell(ex+s*.015,ey+s*.01,s*.035,s*.045,'#111');
  ell(-ex+s*.03,ey-s*.02,s*.012,s*.012,'#fff'); ell(ex+s*.03,ey-s*.02,s*.012,s*.012,'#fff');
  if(L.body==='rainbow'){ for(let i=0;i<5;i++){ const an=performance.now()/400+i*1.26; ctx.fillStyle=`hsla(${(i*72+performance.now()/5)%360},90%,70%,.8)`; ctx.beginPath(); ctx.arc(Math.cos(an)*s*.5,Math.sin(an)*s*.35,s*.04,0,7); ctx.fill(); } }
  if(SPECIES[sp].boss){ ctx.strokeStyle=acc; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-ex-s*.08,ey-s*.12); ctx.lineTo(-ex+s*.06,ey-s*.07); ctx.moveTo(ex+s*.08,ey-s*.12); ctx.lineTo(ex-s*.06,ey-s*.07); ctx.stroke(); }
  ctx.restore();
}

// ---------- people ----------
function drawPerson(px,py,color,hat,dir,step=0,isPlayer=false){
  ctx.save(); ctx.translate(px+16,py+16);
  ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0,13,10,4,0,0,7); ctx.fill();
  const leg = Math.sin(step*Math.PI*2)*3;
  ctx.fillStyle='#3b2a20'; ctx.fillRect(-6,6+leg*0.3,5,8); ctx.fillRect(1,6-leg*0.3,5,8);
  rr(-9,-4,18,14,4,color);
  if(isPlayer){ ctx.fillStyle='#c0392b'; ctx.fillRect(-9,-2,18,3); }
  ctx.fillStyle='#f1c27d'; ctx.beginPath(); ctx.arc(0,-9,7,0,7); ctx.fill();
  ctx.fillStyle=hat; ctx.beginPath(); ctx.arc(0,-11,7.5,Math.PI,0); ctx.fill(); ctx.fillRect(-8,-12,16,3);
  ctx.fillStyle='#111';
  if(dir==='down'){ ctx.fillRect(-3,-9,2,2); ctx.fillRect(2,-9,2,2); }
  else if(dir==='left') ctx.fillRect(-4,-9,2,2); else if(dir==='right') ctx.fillRect(3,-9,2,2);
  ctx.restore();
}

// ---------- tiles ----------
function tileHash(x,y){ return ((x*73856093)^(y*19349663))>>>0; }
function drawTile(c,x,y,px,py,t){
  const h=tileHash(x,y);
  const grass = (h%3===0)?'#5fae4a':'#63b34e';
  switch(c){
    case '.': case 'f': case 'S': ctx.fillStyle=grass; ctx.fillRect(px,py,TILE,TILE);
      if(h%5===0){ ctx.fillStyle='#4f9a3d'; ctx.fillRect(px+(h%20)+4,py+((h>>5)%20)+4,2,5); }
      if(c==='f'){ const cols=['#ff6b9d','#fff36b','#ffffff','#9ad0ff']; for(let i=0;i<3;i++){ ctx.fillStyle=cols[(h>>i)%4]; ctx.beginPath(); ctx.arc(px+6+((h>>(i*3))%20),py+6+((h>>(i*4+2))%20),3,0,7); ctx.fill(); } }
      if(c==='S'){ ctx.fillStyle='#6b4a2a'; ctx.fillRect(px+14,py+14,4,16); rr(px+5,py+5,22,13,2,'#a57a48','#5a3d1f'); ctx.fillStyle='#5a3d1f'; ctx.fillRect(px+9,py+9,14,2); ctx.fillRect(px+9,py+13,10,2); }
      break;
    case ',': ctx.fillStyle='#4a9a3a'; ctx.fillRect(px,py,TILE,TILE); ctx.fillStyle='#2f7a2a';
      for(let i=0;i<4;i++){ const bx=px+4+i*7, sway=Math.sin(t*2+x+i)*1.5; ctx.beginPath(); ctx.moveTo(bx,py+30); ctx.lineTo(bx+3+sway,py+8+(i%2)*4); ctx.lineTo(bx+6,py+30); ctx.fill(); }
      ctx.fillStyle='#3d8c30'; for(let i=0;i<3;i++){ const bx=px+8+i*8, sway=Math.sin(t*2+y+i)*1.5; ctx.beginPath(); ctx.moveTo(bx,py+22); ctx.lineTo(bx+3+sway,py+2+(i%2)*3); ctx.lineTo(bx+6,py+22); ctx.fill(); } break;
    case 'Y': ctx.fillStyle=grass; ctx.fillRect(px,py,TILE,TILE); ctx.fillStyle='#5b3a1e'; ctx.fillRect(px+13,py+18,6,12);
      ctx.fillStyle=`hsl(${130+Math.sin(t*1.3)*14},${42+Math.sin(t*2)*8}%,${31+Math.sin(t*1.7)*3}%)`; ctx.beginPath(); ctx.arc(px+16,py+13,13,0,7); ctx.fill();
      ctx.fillStyle=`hsla(${(t*90)%360},90%,75%,${0.10+0.08*Math.sin(t*3)})`; ctx.beginPath(); ctx.arc(px+12,py+9,6,0,7); ctx.fill(); break;
    case 'p': if(G.zone!=='grove'){ drawTile('T',x,y,px,py,t); break; } ctx.fillStyle=`hsl(${((x*40+y*25)+t*40)%360},55%,${38+((x+y)%2)*6}%)`; ctx.fillRect(px,py,TILE,TILE); ctx.fillStyle='rgba(255,255,255,.18)'; if(h%3===0){ ctx.beginPath(); ctx.arc(px+8+(h%16),py+8+((h>>4)%16),2+Math.sin(t*4+h)*1,0,7); ctx.fill(); } break;
    case 'T': ctx.fillStyle=grass; ctx.fillRect(px,py,TILE,TILE); ctx.fillStyle='#5b3a1e'; ctx.fillRect(px+13,py+18,6,12);
      ctx.fillStyle=(h%2)?'#2e7d32':'#2a6e2e'; ctx.beginPath(); ctx.arc(px+16,py+13,13,0,7); ctx.fill(); ctx.fillStyle='rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(px+12,py+9,6,0,7); ctx.fill(); break;
    case '~': ctx.fillStyle='#2f78c4'; ctx.fillRect(px,py,TILE,TILE); ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=2; ctx.beginPath(); const o=Math.sin(t*1.5+x*0.7+y)*4; ctx.moveTo(px+4+o,py+12); ctx.quadraticCurveTo(px+10+o,py+8,px+16+o,py+12); ctx.moveTo(px+14-o,py+24); ctx.quadraticCurveTo(px+20-o,py+20,px+26-o,py+24); ctx.stroke(); break;
    case '=': ctx.fillStyle='#c9a86a'; ctx.fillRect(px,py,TILE,TILE); ctx.fillStyle='#b8965a'; if(h%3===0) ctx.fillRect(px+(h%24),py+((h>>4)%24),5,4); break;
    case 's': ctx.fillStyle='#e8d59a'; ctx.fillRect(px,py,TILE,TILE); ctx.fillStyle='#d6c182'; if(h%2) ctx.fillRect(px+(h%26),py+((h>>3)%26),3,3); break;
    case 'R': ctx.fillStyle='#3a2f2a'; ctx.fillRect(px,py,TILE,TILE); ctx.fillStyle='#4e413a'; ctx.fillRect(px+2,py+2,13,12); ctx.fillRect(px+17,py+16,13,13); ctx.fillStyle='#2a211d'; ctx.fillRect(px+16,py+2,14,12); break;
    case 'c': ctx.fillStyle=(h%4===0)?'#5a4538':'#634c3d'; ctx.fillRect(px,py,TILE,TILE); if(h%7===0){ ctx.fillStyle='rgba(255,120,40,.5)'; ctx.fillRect(px+(h%20)+3,py+((h>>4)%20)+3,4,4);} break;
    case 'W': ctx.fillStyle='#2b2438'; ctx.fillRect(px,py,TILE,TILE); ctx.strokeStyle='#453a5c'; ctx.lineWidth=2; ctx.strokeRect(px+1,py+1,30,14); ctx.strokeRect(px+1,py+16,30,15); break;
    case 'r': ctx.fillStyle=((x+y)%2)?'#3c3350':'#433a58'; ctx.fillRect(px,py,TILE,TILE); ctx.fillStyle=`rgba(255,63,191,${0.08+0.06*Math.sin(t*2+x)})`; ctx.fillRect(px,py,TILE,TILE); break;
    case 'G': ctx.fillStyle='#2b2438'; ctx.fillRect(px,py,TILE,TILE); rr(px+3,py+2,26,28,4,'#5a3d7a','#ff3fbf'); ctx.fillStyle='#ff3fbf'; ctx.font='bold 14px sans-serif'; ctx.textAlign='center'; ctx.fillText('◈',px+16,py+21); break;
    case 'b': ctx.fillStyle='#2f78c4'; ctx.fillRect(px,py,TILE,TILE); ctx.fillStyle='#8b5a2b'; ctx.fillRect(px,py+4,TILE,24); ctx.fillStyle='#6b4420'; for(let i=0;i<4;i++) ctx.fillRect(px+i*8,py+4,2,24); break;
    case 'F': ctx.fillStyle=grass; ctx.fillRect(px,py,TILE,TILE); ctx.fillStyle='#8b5a2b'; ctx.fillRect(px,py+12,TILE,4); ctx.fillRect(px,py+22,TILE,4); ctx.fillRect(px+4,py+8,4,22); ctx.fillRect(px+24,py+8,4,22); break;
    case 'B': ctx.fillStyle=grass; ctx.fillRect(px,py,TILE,TILE); break;
    default: ctx.fillStyle='#f0f'; ctx.fillRect(px,py,TILE,TILE);
  }
}
function drawBuilding(b,ox,oy){
  const px=b.x*TILE-ox, py=b.y*TILE-oy, w=b.w*TILE, h=b.h*TILE;
  ctx.fillStyle='#e8dcc0'; ctx.fillRect(px+2,py+h*0.4,w-4,h*0.6);
  ctx.fillStyle=b.roof; ctx.beginPath(); ctx.moveTo(px-4,py+h*0.45); ctx.lineTo(px+w/2,py-6); ctx.lineTo(px+w+4,py+h*0.45); ctx.fill();
  ctx.fillStyle='rgba(0,0,0,.15)'; ctx.fillRect(px+2,py+h*0.45,w-4,4);
  const dx=px+w/2-12; ctx.fillStyle='#6b4420'; ctx.fillRect(dx,py+h-34,24,34); ctx.fillStyle='#ffcf3f'; ctx.fillRect(dx+18,py+h-18,3,3);
  ctx.fillStyle='#8fd0ff'; ctx.fillRect(px+10,py+h-40,18,14); ctx.fillRect(px+w-28,py+h-40,18,14);
  text(b.name,px+w/2,py+h*0.4-2,{size:11,align:'center',bold:true});
}
// ---------- rainbow cosmetics (Prismatic Egg) ----------
function rainbowColor(off=0){ return `hsl(${(performance.now()/6+off*50)%360},90%,68%)`; }
function rainbowTrail(x,y,moving){ if(moving && Math.random()<0.6) particles.push({x:x+(Math.random()-0.5)*10,y:y+(Math.random()-0.5)*4,vx:(Math.random()-0.5)*20,vy:-20-Math.random()*20,life:0.8,color:rainbowColor(Math.random()*7)});
  for(let i=0;i<3;i++){ const a=performance.now()/300+i*2.1; ctx.fillStyle=rainbowColor(i*2); ctx.globalAlpha=0.7; ctx.beginPath(); ctx.arc(x+Math.cos(a)*14,y-14+Math.sin(a)*6,2.5,0,7); ctx.fill(); } ctx.globalAlpha=1; }
// ---------- particles ----------
let particles=[];
function burst(x,y,color,n=24){ for(let i=0;i<n;i++){ const a=Math.random()*7, v=40+Math.random()*120; particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,life:1,color}); } }
function updParticles(dt){ particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=120*dt;p.life-=dt*1.2;}); particles=particles.filter(p=>p.life>0); }
function drawParticles(){ particles.forEach(p=>{ ctx.globalAlpha=Math.max(0,p.life); ctx.fillStyle=p.color; ctx.fillRect(p.x-2,p.y-2,4,4); }); ctx.globalAlpha=1; }
