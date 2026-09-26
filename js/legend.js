// ===== Shadowvale: context-aware keyboard legend (toggle with H) =====
'use strict';
const LEGENDS = {
  world:   [[['W','A','S','D'],'Move'],[['E'],'Talk'],[['Q'],'Quests'],[['T'],'Talents'],[['P'],'Party'],[['B'],'Bag'],[['1','2','3'],'Abilities'],[['M'],'Mount'],[['Enter'],'Chat'],[['Esc'],'Menu'],[['H'],'Hide keys']],
  mounted: [[['W','S'],'Move'],[['A','D'],'Turn'],[['Drag'],'Look'],[['M'],'Dismount'],[['Enter'],'Chat'],[['H'],'Hide keys']],
  battle:  [[['↑','↓','←','→'],'Choose'],[['Enter'],'Confirm'],[['Esc'],'Back'],[['Click'],'Select']],
  title:   [[['↑','↓'],'Choose'],[['Enter'],'Start'],[['Click'],'Select']],
  menu:    [[['↑','↓','←','→'],'Choose'],[['Enter'],'Select'],[['Esc'],'Close'],[['Click'],'Select']],
};
function legendContext(){ if(G.mode==='title'||G.mode==='starter') return 'title'; if(G.mode==='battle') return 'battle'; if(G.menu||G.dialog) return 'menu'; if(G.ride) return 'mounted'; return 'world'; }
function drawLegend(){
  if(G.flags && G.flags.hideKeys && G.mode!=='title' && G.mode!=='starter') return;
  const items=LEGENDS[legendContext()]; ctx.font='bold 10px Trebuchet MS';
  // layout into rows no wider than maxW, anchored bottom-left above the hint strip
  const maxW=G.mode==='battle'?560:(G.mode==='title'||G.mode==='starter')?620:290, pad=6; const rows=[[]]; let wRow=0;
  const itemW=([ks,l])=>ks.reduce((s,k)=>s+Math.max(16,ctx.measureText(k).width+8)+2,0)+ctx.measureText(l).width+14;
  items.forEach(it=>{ const w=itemW(it); if(wRow+w>maxW && rows[rows.length-1].length){ rows.push([]); wRow=0; } rows[rows.length-1].push(it); wRow+=w; });
  const h=rows.length*20+pad*2, w=Math.max(...rows.map(r=>r.reduce((s,it)=>s+itemW(it),0)))+pad*2;
  const x0=G.mode==='battle'? W/2-w/2 : 10, y0=G.mode==='battle'? 4 : (G.mode==='title'||G.mode==='starter')? H-h-8 : H-10-h;
  const drawX = (G.mode==='title'||G.mode==='starter')? W/2-w/2 : x0;
  ctx.save(); ctx.globalAlpha=0.82; rr(drawX,y0,w,h,6,'rgba(10,8,20,.7)','rgba(200,164,88,.6)',1); ctx.globalAlpha=1;
  rows.forEach((r,ri)=>{ let x=drawX+pad; const y=y0+pad+ri*20;
    r.forEach(([ks,l])=>{ ks.forEach(k=>{ ctx.font='bold 10px Trebuchet MS'; const kw=Math.max(16,ctx.measureText(k).width+8);
        rr(x,y+1,kw,16,3,'#e8e2d0','#6b5f45',1); ctx.fillStyle='#6b5f45'; ctx.fillRect(x+1,y+14,kw-2,2);
        text(k,x+kw/2,y+12,{size:10,bold:true,align:'center',color:'#222',shadow:false}); x+=kw+2; });
      text(l,x+3,y+13,{size:11,color:'#eee'}); ctx.font='11px Trebuchet MS'; x+=ctx.measureText(l).width+11; }); });
  ctx.restore();
}
