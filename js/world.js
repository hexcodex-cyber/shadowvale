// ===== Shadowvale: world map generation =====
'use strict';
const MAP_W = 64, MAP_H = 44;
const SOLID = new Set(['T','~','R','W','G','B','F','S','K']);
function seededRand(seed){ let s = seed>>>0; return ()=>{ s = (s*1664525 + 1013904223)>>>0; return s/4294967296; }; }

function buildWorld(){
  const m = []; for(let y=0;y<MAP_H;y++){ m.push(new Array(MAP_W).fill('.')); }
  const rect=(x,y,w,h,c)=>{ for(let j=y;j<y+h;j++) for(let i=x;i<x+w;i++) if(i>=0&&j>=0&&i<MAP_W&&j<MAP_H) m[j][i]=c; };
  const set=(x,y,c)=>{ if(x>=0&&y>=0&&x<MAP_W&&y<MAP_H) m[y][x]=c; };
  const rnd = seededRand(1337);

  // ---- Whisperwood forest (north) ----
  rect(0,0,44,13,'T');
  rect(12,3,2,10,'=');            // main forest path north from town
  rect(4,7,38,2,'=');             // east-west trail
  rect(4,3,7,4,',');  rect(15,3,9,4,','); rect(16,9,9,3,','); rect(27,9,11,3,',');
  rect(4,9,7,3,',');
  rect(30,2,10,5,'.'); rect(33,3,4,3,'f'); // guardian glade
  rect(38,7,4,2,'=');
  // secret: Prism Grotto hidden inside the tree block east of the west clearing; (24,4) is a walk-through 'dreaming' tree
  rect(25,3,4,3,'p'); set(24,4,'Y');
  // ---- Ember Cave (north-east) ----
  rect(43,0,21,19,'R');
  rect(44,9,17,4,'c'); rect(44,13,3,6,'c'); rect(45,3,15,5,'c'); rect(51,7,3,2,'c');
  [[48,10],[55,11],[58,9],[47,4],[53,6]].forEach(([x,y])=>set(x,y,'R'));
  rect(42,7,3,2,'c'); rect(44,7,1,3,'c'); // side passage from the forest trail into the cave
  // ---- Brightvale town (west) ----
  rect(3,14,18,16,'.');
  rect(3,21,40,2,'=');            // main road east
  rect(12,13,2,17,'=');           // north-south street
  rect(4,14,1,1,'f'); rect(20,28,1,1,'f');
  // ---- Meadow patches ----
  rect(23,14,8,5,','); rect(33,14,7,6,','); rect(24,24,7,4,','); rect(4,32,10,6,','); rect(16,36,10,4,',');
  // ---- Farm pen ----
  rect(22,31,8,1,'F'); rect(22,36,8,1,'F'); rect(22,31,1,6,'F'); rect(29,31,1,6,'F'); set(25,31,'.'); set(26,31,'.');
  // ---- Shadow Ruins (east) ----
  rect(47,19,13,7,'W'); rect(48,20,11,5,'r'); set(47,22,'G');
  rect(43,21,4,2,'=');
  // ---- Mirror Lake (south-east) ----
  for(let y=26;y<MAP_H;y++) for(let x=32;x<MAP_W;x++){
    const dx=(x-48)/13, dy=(y-34)/6.5, d=dx*dx+dy*dy;
    if(d<1) m[y][x]='~'; else if(d<1.45 && m[y][x]==='.') m[y][x]='s';
  }
  for(let y=31;y<=37;y++) for(let x=49;x<=56;x++){ const dx=(x-52.5)/3.6, dy=(y-34)/2.8; if(dx*dx+dy*dy<1) m[y][x]='s'; }
  rect(36,34,14,1,'b');
  set(40,31,'s'); // tiny water-locked islet (orca / flying mounts only)
  rect(33,27,8,3,','); rect(34,38,7,3,',');
  // ---- border ----
  for(let y=0;y<MAP_H;y++) for(let x=0;x<MAP_W;x++) if(x<2||y<2||x>=MAP_W-2||y>=MAP_H-2){ if(m[y][x]!=='R') m[y][x]='T'; }
  // ---- decorative scatter ----
  for(let i=0;i<70;i++){
    const x=2+Math.floor(rnd()*60), y=13+Math.floor(rnd()*29);
    if(m[y][x]!=='.') continue;
    if(x>=3&&x<=21&&y>=13&&y<=30) continue; // keep town clear
    if(y>=20&&y<=23) continue;
    m[y][x] = rnd()<0.55 ? 'T' : 'f';
  }
  // ---- buildings (solid footprints) ----
  const buildings = [
    {x:5,y:15,w:5,h:4,name:"Elder's Hall",roof:'#8b3a3a'},
    {x:15,y:15,w:5,h:4,name:'Inn',roof:'#3a5f8b'},
    {x:5,y:24,w:5,h:4,name:'Shop',roof:'#3a8b4f'},
    {x:15,y:24,w:5,h:4,name:"Pip's House",roof:'#8b6f3a'},
    {x:23,y:27,w:4,h:3,name:'Farmhouse',roof:'#9b5a2a'},
  ];
  buildings.forEach(b=>rect(b.x,b.y,b.w,b.h,'B'));
  // signs
  const signs = [
    {x:14,y:20,text:'BRIGHTVALE — Inn (north-east), Shop (south-west). Whisperwood lies north.'},
    {x:41,y:20,text:'EAST: The Shadow Ruins. Sealed by three Rune Shards. Travellers beware!'},
    {x:43,y:19,text:'NORTH: Ember Cave — home of Magmaw, the fire guardian.'},
    {x:33,y:25,text:'SOUTH-EAST: Mirror Lake. The guardian Tidecaller rests on the island.'},
    {x:14,y:12,text:'Whisperwood. Thornwarden guards the glade to the north-east.'},
    {x:22,y:6,text:'Scratched into the post: "Count the trees east of here. One of them is dreaming in colour — and dreams let the curious pass."'},
  ];
  signs.forEach(s=>set(s.x,s.y,'S'));
  return {tiles:m, buildings, signs};
}

function nearestWalkable(tiles, x, y){
  for(let r=0;r<8;r++) for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){
    const nx=x+dx, ny=y+dy; if(nx<0||ny<0||nx>=MAP_W||ny>=MAP_H) continue;
    if(!SOLID.has(tiles[ny][nx]) && tiles[ny][nx]!=='b') return [nx,ny];
  }
  return [x,y];
}

function zoneAt(x,y){
  if(x>=47&&x<=59&&y>=19&&y<=25) return 'ruins';
  if(x>=25&&x<=28&&y>=3&&y<=5) return 'grove';
  if(x>=42&&y<=18) return 'cave';
  if(y<=12) return 'forest';
  if(x>=3&&x<=21&&y>=13&&y<=30) return 'town';
  if(x>=32&&y>=26) return 'lake';
  return 'meadow';
}
const ZONE_NAMES = {grove:'Prism Grotto', town:'Brightvale', meadow:'Sunny Meadow', forest:'Whisperwood', cave:'Ember Cave', lake:'Mirror Lake', ruins:'Shadow Ruins'};
