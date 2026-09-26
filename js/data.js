// ===== Shadowvale: static game data =====
'use strict';
const TYPES = ['Normal','Fire','Water','Nature','Earth','Shadow','Arcane'];
const TYPE_COLORS = {Normal:'#b8b08d',Fire:'#f0692e',Water:'#3d8bff',Nature:'#4cbf4c',Earth:'#b0823f',Shadow:'#7a4fb8',Arcane:'#e05cd8'};
const SUPER = {Fire:['Nature'],Water:['Fire','Earth'],Nature:['Water','Earth'],Earth:['Fire','Arcane'],Shadow:['Arcane'],Arcane:['Shadow'],Normal:[]};
const RESIST = {Fire:['Water','Earth','Fire'],Water:['Nature','Water'],Nature:['Fire','Nature'],Earth:['Nature'],Shadow:['Shadow'],Arcane:['Earth'],Normal:['Earth']};
function typeMult(atk, def){ if(SUPER[atk].includes(def)) return 2; if(RESIST[atk].includes(def)) return 0.5; return 1; }

// effect: atkUp/defUp (self), atkDown/defDown (target), heal (self), drain
const MOVES = {
  'Tackle':      {type:'Normal', power:35, acc:100},
  'Scratch':     {type:'Normal', power:40, acc:95},
  'Headbutt':    {type:'Normal', power:55, acc:95},
  'Body Slam':   {type:'Normal', power:75, acc:90},
  'Growl':       {type:'Normal', power:0,  acc:100, effect:'atkDown', desc:'Lowers foe Attack'},
  'Harden':      {type:'Earth',  power:0,  acc:100, effect:'defUp',   desc:'Raises own Defense'},
  'Ember':       {type:'Fire',   power:45, acc:100},
  'Flame Fang':  {type:'Fire',   power:65, acc:95},
  'Inferno':     {type:'Fire',   power:90, acc:85},
  'Warm Up':     {type:'Fire',   power:0,  acc:100, effect:'atkUp',   desc:'Raises own Attack'},
  'Bubble':      {type:'Water',  power:45, acc:100},
  'Tidal Slam':  {type:'Water',  power:65, acc:95},
  'Hydro Surge': {type:'Water',  power:90, acc:85},
  'Mist Veil':   {type:'Water',  power:0,  acc:100, effect:'defUp',   desc:'Raises own Defense'},
  'Vine Lash':   {type:'Nature', power:45, acc:100},
  'Leech Seed':  {type:'Nature', power:40, acc:100, effect:'drain',   desc:'Heals half the damage dealt'},
  'Leaf Storm':  {type:'Nature', power:65, acc:95},
  'Solar Bloom': {type:'Nature', power:90, acc:85},
  'Regrow':      {type:'Nature', power:0,  acc:100, effect:'heal',    desc:'Restores 35% HP'},
  'Pebble Toss': {type:'Earth',  power:45, acc:100},
  'Rock Slide':  {type:'Earth',  power:65, acc:95},
  'Quake':       {type:'Earth',  power:90, acc:85},
  'Shade Bite':  {type:'Shadow', power:50, acc:100},
  'Nightmare':   {type:'Shadow', power:65, acc:95, effect:'drain',    desc:'Heals half the damage dealt'},
  'Void Rend':   {type:'Shadow', power:95, acc:85},
  'Terrify':     {type:'Shadow', power:0,  acc:100, effect:'atkDown', desc:'Lowers foe Attack'},
  'Arcane Bolt': {type:'Arcane', power:45, acc:100},
  'Mana Burst':  {type:'Arcane', power:70, acc:95},
  'Starfall':    {type:'Arcane', power:95, acc:85},
  'Focus':       {type:'Arcane', power:0,  acc:100, effect:'atkUp',   desc:'Raises own Attack'},
  'Corrode':     {type:'Shadow', power:0,  acc:100, effect:'defDown', desc:'Lowers foe Defense'},
};

// learnset: [level, move]
const SPECIES = {
  Emberpup:  {type:'Fire',   base:{hp:45,atk:60,def:40,spd:60}, catch:0.45, xp:60, look:{body:'#f07a3a',accent:'#ffd36b',feat:'ears'},
              learn:[[1,'Tackle'],[1,'Ember'],[4,'Growl'],[7,'Warm Up'],[10,'Flame Fang'],[14,'Shade Bite'],[18,'Inferno']], desc:'A loyal pup whose tail smoulders when happy.'},
  Tidefin:   {type:'Water',  base:{hp:55,atk:50,def:50,spd:50}, catch:0.45, xp:60, look:{body:'#3d8bff',accent:'#bfe3ff',feat:'fin'},
              learn:[[1,'Tackle'],[1,'Bubble'],[4,'Mist Veil'],[7,'Headbutt'],[10,'Tidal Slam'],[14,'Pebble Toss'],[18,'Hydro Surge']], desc:'Glides through rivers faster than any boat.'},
  Sproutle:  {type:'Nature', base:{hp:60,atk:48,def:55,spd:42}, catch:0.45, xp:60, look:{body:'#57c45a',accent:'#e8ff9e',feat:'leaf'},
              learn:[[1,'Tackle'],[1,'Vine Lash'],[4,'Leech Seed'],[7,'Regrow'],[10,'Leaf Storm'],[14,'Harden'],[18,'Solar Bloom']], desc:'Sunbathes for hours; the leaf on its head never wilts.'},
  Fluffwool: {type:'Normal', base:{hp:55,atk:40,def:45,spd:40}, catch:0.7, xp:40, look:{body:'#f2efe6',accent:'#6d5b4b',feat:'wool'},
              learn:[[1,'Tackle'],[3,'Growl'],[6,'Headbutt'],[10,'Harden'],[14,'Body Slam']], desc:'Soft, sleepy and surprisingly heavy.'},
  Glowmoth:  {type:'Arcane', base:{hp:40,atk:55,def:35,spd:65}, catch:0.55, xp:50, look:{body:'#e05cd8',accent:'#fff3a8',feat:'wings'},
              learn:[[1,'Arcane Bolt'],[4,'Focus'],[8,'Leech Seed'],[11,'Mana Burst'],[16,'Starfall']], desc:'Its wing dust glows with raw arcane energy.'},
  Mossback:  {type:'Earth',  base:{hp:65,atk:45,def:65,spd:25}, catch:0.5, xp:55, look:{body:'#8a6b3f',accent:'#5fae4a',feat:'shell'},
              learn:[[1,'Tackle'],[1,'Pebble Toss'],[5,'Harden'],[9,'Rock Slide'],[13,'Leech Seed'],[17,'Quake']], desc:'Moss grows on its shell; birds nest there.'},
  Shadekit:  {type:'Shadow', base:{hp:45,atk:62,def:38,spd:62}, catch:0.45, xp:60, look:{body:'#4a3470',accent:'#c9a0ff',feat:'ears'},
              learn:[[1,'Scratch'],[1,'Shade Bite'],[5,'Terrify'],[9,'Nightmare'],[13,'Corrode'],[16,'Void Rend']], desc:'Prowls the woods at dusk. Its eyes glow violet.'},
  Cindermole:{type:'Fire',   base:{hp:55,atk:62,def:50,spd:35}, catch:0.45, xp:65, look:{body:'#8f3b2a',accent:'#ff9a3c',feat:'horns'},
              learn:[[1,'Scratch'],[1,'Ember'],[5,'Harden'],[9,'Flame Fang'],[13,'Rock Slide'],[18,'Inferno']], desc:'Tunnels through magma as if it were soil.'},
  Pebblit:   {type:'Earth',  base:{hp:50,atk:55,def:70,spd:30}, catch:0.5, xp:60, look:{body:'#9a9a9a',accent:'#d8c49a',feat:'rock'},
              learn:[[1,'Tackle'],[1,'Pebble Toss'],[6,'Harden'],[10,'Rock Slide'],[15,'Quake']], desc:'Mistaken for a rock. Often sat on. Hates that.'},
  Rippletoad:{type:'Water',  base:{hp:60,atk:55,def:50,spd:45}, catch:0.45, xp:65, look:{body:'#2aa39a',accent:'#e6f5a0',feat:'toad'},
              learn:[[1,'Bubble'],[4,'Growl'],[8,'Tidal Slam'],[12,'Mist Veil'],[16,'Hydro Surge']], desc:'Its croak can be heard across Mirror Lake.'},
  Wispling:  {type:'Arcane', base:{hp:45,atk:65,def:40,spd:70}, catch:0.3, xp:75, look:{body:'#8fd8ff',accent:'#ffffff',feat:'wisp'},
              learn:[[1,'Arcane Bolt'],[1,'Corrode'],[7,'Focus'],[10,'Mana Burst'],[14,'Nightmare'],[17,'Starfall']], desc:'A rare spirit said to guide lost travellers.'},
  // Guardians & boss (cannot be caught)
  Thornwarden:{type:'Nature', base:{hp:80,atk:60,def:60,spd:40}, catch:0, xp:120, boss:true, look:{body:'#2f7a34',accent:'#b8e05a',feat:'horns'},
              learn:[[1,'Vine Lash'],[1,'Leech Seed'],[1,'Regrow'],[1,'Leaf Storm']], desc:'Guardian of Whisperwood.'},
  Magmaw:    {type:'Fire',   base:{hp:85,atk:70,def:60,spd:45}, catch:0, xp:150, boss:true, look:{body:'#b3261e',accent:'#ffcf3f',feat:'flame'},
              learn:[[1,'Flame Fang'],[1,'Rock Slide'],[1,'Warm Up'],[1,'Inferno']], desc:'Guardian of Ember Cave.'},
  Tidecaller:{type:'Water',  base:{hp:90,atk:70,def:65,spd:55}, catch:0, xp:170, boss:true, look:{body:'#1f5fbf',accent:'#8ff0ff',feat:'fin'},
              learn:[[1,'Tidal Slam'],[1,'Mist Veil'],[1,'Hydro Surge'],[1,'Headbutt']], desc:'Guardian of Mirror Lake.'},
  Prismewl:  {type:'Arcane', base:{hp:60,atk:70,def:55,spd:75}, catch:0, xp:120, secret:true, look:{body:'rainbow',accent:'#ffffff',feat:'ears'},
              learn:[[1,'Arcane Bolt'],[1,'Focus'],[8,'Mana Burst'],[8,'Leaf Storm'],[12,'Flame Fang'],[16,'Starfall']], desc:'Hatched from the Prismatic Egg. Its fur shifts through every colour. Only one exists.'},
  Riftmaw:   {type:'Arcane', base:{hp:95,atk:66,def:60,spd:50}, catch:0, xp:200, boss:true, look:{body:'#5b2a9a',accent:'#7ff0ff',feat:'wisp'},
              learn:[[1,'Mana Burst'],[1,'Nightmare'],[1,'Focus'],[1,'Rock Slide']], desc:'Multiplayer world boss from a tear in reality.'},
  Umbrax:    {type:'Shadow', base:{hp:100,atk:72,def:62,spd:60}, catch:0, xp:300, boss:true, look:{body:'#2a1840',accent:'#ff3fbf',feat:'dragon'},
              learn:[[1,'Void Rend'],[1,'Nightmare'],[1,'Terrify'],[1,'Corrode']], desc:'The Shadow Wyrm. Corrupter of Shadowvale.'},
};
const DEX_ORDER = ['Emberpup','Tidefin','Sproutle','Fluffwool','Glowmoth','Mossback','Shadekit','Cindermole','Pebblit','Rippletoad','Wispling','Prismewl'];
// ===== Easter egg (secret) =====
const SECRET = {egg:[27,4], door:[24,4], grove:{x:25,y:3,w:4,h:3}, name:'Prism Grotto', creature:'Prismewl', level:8,
  lore:'Bestiary note: "Whisperwood keeps one colour it never shows the sun."'};

const ZONES = {
  meadow: {name:'Sunny Meadow',  lv:[2,5],   table:[['Fluffwool',50],['Glowmoth',25],['Mossback',25]]},
  forest: {name:'Whisperwood',   lv:[4,8],   table:[['Shadekit',35],['Glowmoth',25],['Mossback',25],['Fluffwool',10],['Wispling',5]]},
  cave:   {name:'Ember Cave',    lv:[7,11],  table:[['Cindermole',45],['Pebblit',45],['Shadekit',10]]},
  lake:   {name:'Mirror Lake',   lv:[9,13],  table:[['Rippletoad',55],['Glowmoth',20],['Mossback',15],['Wispling',10]]},
};

const ITEMS = {
  soulstone:  {name:'Soulstone',       price:30, desc:'Captures a weakened wild creature.', catchMult:1},
  greater:    {name:'Greater Soulstone',price:75, desc:'Much better capture rate (x1.6).', catchMult:1.6},
  potion:     {name:'Potion',          price:25, desc:'Restores 30 HP to one creature.', heal:30},
  superpotion:{name:'Super Potion',    price:60, desc:'Restores 80 HP to one creature.', heal:80},
  revive:     {name:'Phoenix Feather', price:90, desc:'Revives a fainted creature with half HP.', revive:true},
};

// ===== Talent tree (WoW-style). tier gate: points in branch needed =====
const TIER_REQ = [0, 3, 5];
const TALENTS = [
  {branch:'Beastmaster', color:'#e0533d', icon:'⚔', desc:'Empower your party in battle.', talents:[
    {id:'ferocity',  name:'Ferocity',      tier:0, col:0, max:3, icon:'🗡', kind:'passive', text:r=>`Party creatures deal +${r*6}% damage.`},
    {id:'thickhide', name:'Thick Hide',    tier:0, col:1, max:2, icon:'🛡', kind:'passive', text:r=>`Party creatures take ${r*6}% less damage.`},
    {id:'rally',     name:'Rallying Cry',  tier:1, col:0, max:1, icon:'📯', kind:'battle',  text:()=>`BATTLE ABILITY: Your active creature's Attack is greatly raised (+2 stages). Once per battle.`},
    {id:'secondwind',name:'Second Wind',   tier:1, col:1, max:2, icon:'💚', kind:'passive', text:r=>`After winning a battle, your party recovers ${r*15}% max HP.`},
    {id:'unleash',   name:'Primal Unleash',tier:2, col:0.5, max:1, icon:'🐉', kind:'battle', req:'rally', text:()=>`BATTLE ABILITY: Your creature's next attack deals double damage, never misses and ignores resistances. Once per battle.`},
  ]},
  {branch:'Huntsman', color:'#4cbf4c', icon:'🏹', desc:'Track, tame and travel the wilds.', talents:[
    {id:'keeneye',   name:'Keen Eye',      tier:0, col:0, max:3, icon:'🎯', kind:'passive', text:r=>`+${r*10}% creature catch rate.`},
    {id:'stride',    name:'Swift Stride',  tier:0, col:1, max:2, icon:'👢', kind:'passive', text:r=>`+${r*15}% overworld movement speed.`},
    {id:'tracker',   name:"Tracker's Sense",tier:1, col:0, max:1, icon:'👁', kind:'passive', text:()=>`Hidden relics, lambs and moonpetals sparkle brightly and appear on your minimap.`},
    {id:'camo',      name:'Camouflage',    tier:1, col:1, max:1, icon:'🍃', kind:'overworld', key:'1', cd:60, text:()=>`OVERWORLD ABILITY [1]: No wild encounters for 25 seconds. 60s cooldown.`},
    {id:'snare',     name:'Soul Snare',    tier:2, col:0.5, max:1, icon:'🕸', kind:'battle', req:'tracker', text:()=>`BATTLE ABILITY: A free capture attempt with +40% catch rate - no Soulstone needed. Once per battle.`},
  ]},
  {branch:'Fortune', color:'#e8b83a', icon:'💰', desc:'Gold, wisdom and a way home.', talents:[
    {id:'silver',    name:'Silver Tongue', tier:0, col:0, max:3, icon:'🪙', kind:'passive', text:r=>`+${r*15}% gold from battles and quests.`},
    {id:'haggler',   name:'Haggler',       tier:0, col:1, max:2, icon:'⚖', kind:'passive', text:r=>`Shop prices reduced by ${r*10}%.`},
    {id:'medic',     name:'Field Medic',   tier:1, col:0, max:1, icon:'✚', kind:'overworld', key:'2', cd:45, text:()=>`OVERWORLD ABILITY [2]: Heal your whole party for 50% max HP (revives fainted). 45s cooldown.`},
    {id:'scholar',   name:'Scholar',       tier:1, col:1, max:2, icon:'📜', kind:'passive', text:r=>`+${r*10}% experience for you and your creatures.`},
    {id:'hearth',    name:'Hearthstone',   tier:2, col:0.5, max:1, icon:'🏠', kind:'overworld', key:'3', req:'medic', cd:90, text:()=>`OVERWORLD ABILITY [3]: Teleport back to Brightvale Inn. 90s cooldown.`},
  ]},
];
const TALENT_BY_ID = {}; TALENTS.forEach((b,bi)=>b.talents.forEach(t=>{t.bi=bi; TALENT_BY_ID[t.id]=t;}));
const MAX_PLAYER_LEVEL = 20;

// ===== Quests (data-driven). progress(G) -> number; goal = count needed =====
const MAIN_QUEST = {id:'main', name:'The Shadow Wyrm', giver:'elder',
  stages:[
    'Speak with Elder Maren in Brightvale.',
    'Defeat the three guardians and collect their Rune Shards.',
    'Open the gate of the Shadow Ruins (east) and defeat Umbrax.',
    'Shadowvale is saved!'
  ]};
const SIDE_QUESTS = [
  {id:'lambs',  name:'Lost Lambs',       giver:'tobin', goal:3, progress:g=>g.lambs.length, obj:'Find Farmer Tobin\'s lost lambs', reward:{gold:120, xp:120, items:{soulstone:3}},
   intro:["Three of my lambs wandered off in the storm!","One went towards the east meadow, one down south-west, and one near Mirror Lake.","Walk up to them and press E — they'll trot home on their own."],
   done:["My lambs! All three! You're a hero, friend.","Take these Soulstones, and a bit of coin."]},
  {id:'petals', name:'Moonpetal Remedy', giver:'lyra',  goal:5, progress:g=>g.petals.length, obj:'Gather glowing Moonpetals in Whisperwood', reward:{gold:80, xp:140, items:{superpotion:3, revive:1}},
   intro:["Umbrax's shadow is making the villagers ill.","I need 5 Moonpetals — they glow blue among the trees of Whisperwood."],
   done:["Wonderful, they're perfect! This remedy will help everyone.","Please take these potions for your journey."]},
  {id:'ranger', name:"Ranger's Trial",   giver:'kael',  goal:6, progress:g=>g.wildWins, obj:'Defeat wild creatures', reward:{gold:100, xp:160, points:1},
   intro:["You want to be a real tamer? Prove it.","Defeat 6 wild creatures in battle. Then we'll talk."],
   done:["Not bad at all. Take this Ranger's Tome.","Reading it grants you an extra TALENT POINT. Spend it wisely (press T)."]},
  {id:'collector', name:'The Collector', giver:'pip',   goal:6, progress:g=>Object.keys(g.dex.caught).length, obj:'Catch different species', reward:{gold:200, xp:200, items:{greater:5}},
   intro:["I'm writing the ultimate Bestiary of Shadowvale!","Catch 6 different species and show me. Check your Bestiary with [B]."],
   done:["SIX species! My Bestiary is coming along beautifully.","Here — Greater Soulstones. They'll help you catch the rare ones, like Wispling."]},
  {id:'relics', name:'Glimmering Past',  giver:'pip',   goal:8, progress:g=>g.relics.length, obj:'Find hidden Glimmer Relics', reward:{gold:300, xp:250, flag:'crown'},
   intro:["Also... legend says 8 Glimmer Relics are hidden across Shadowvale.","They sparkle faintly. A tracker's eye would spot them more easily..."],
   done:["All eight relics! Incredible!","Wear this Ancient Crown — it grants +10% experience forever."], after:'collector'},
];

// Guardians (fixed boss battles on the map)
const GUARDIANS = [
  {id:'thorn',  sp:'Thornwarden', level:7,  x:35, y:4,  shard:'Verdant Shard', zone:'forest', line:'The forest groans... Thornwarden rises to test you!'},
  {id:'magma',  sp:'Magmaw',      level:11, x:57, y:4,  shard:'Ember Shard',   zone:'cave',   line:'The cave shakes. Magmaw erupts from the lava!'},
  {id:'tide',   sp:'Tidecaller',  level:13, x:53, y:34, shard:'Tidal Shard',   zone:'lake',   line:'The lake churns. Tidecaller surges from the depths!'},
  {id:'umbrax', sp:'Umbrax',      level:16, x:55, y:22, final:true,            zone:'ruins',  line:'"FOOLISH TAMER. SHADOWVALE IS MINE." Umbrax attacks!'},
];

// Collectables placed in the world (snapped to nearest walkable tile at load)
const RELIC_SPOTS  = [[5,4],[39,3],[59,11],[47,5],[3,40],[60,28],[40,31],[20,39]]; // [40,31] is a water-locked islet: reach it by Orca or flying mount
const PETAL_SPOTS  = [[6,4],[20,3],[18,10],[33,10],[8,10]];
const LAMB_SPOTS   = [[37,17],[6,35],[38,29]];

// NPCs: talk handler names are resolved in game.js (NPC_TALK)
const NPCS = [
  {id:'elder', name:'Elder Maren',     x:7,  y:19, color:'#9b59b6', hat:'#ddd'},
  {id:'rosa',  name:'Innkeeper Rosa',  x:17, y:19, color:'#e67e22', hat:'#7a3b10'},
  {id:'gil',   name:'Merchant Gil',    x:7,  y:28, color:'#27ae60', hat:'#145a32'},
  {id:'pip',   name:'Collector Pip',   x:17, y:28, color:'#f1c40f', hat:'#8e44ad'},
  {id:'kael',  name:'Ranger Kael',     x:10, y:13, color:'#16a085', hat:'#0b5345'},
  {id:'lyra',  name:'Herbalist Lyra',  x:15, y:13, color:'#e84393', hat:'#fff'},
  {id:'tobin', name:'Farmer Tobin',    x:25, y:30, color:'#a0522d', hat:'#f4d03f'},
];
const INN_SPOT = [17,20];
NPCS.push({id:'hilda', name:'Stablemaster Hilda', x:10, y:29, color:'#6e4b2a', hat:'#c0392b'});
NPCS.push({id:'marlo', name:'Dockhand Marlo',    x:34, y:33, color:'#2c5d8a', hat:'#f0f0f0'});

// ===== Mounts (data-driven). terrain: land | air | water. speed = tiles/sec in first person =====
const MOUNTS = {
  horse:     {name:'Horse',           icon:'🐎', speed:4.2, turn:2.6, seats:2, terrain:'land',  eye:0.55, price:300,  source:'stable',
              colors:{body:'#8b5a2b', mane:'#3b2412', accent:'#f5deb3'}, desc:'Fast on land. 2 seats.'},
  dragonfly: {name:'Giant Dragonfly', icon:'🪰', speed:5.0, turn:3.0, seats:2, terrain:'air',   eye:1.9,  price:900,  source:'stable',
              colors:{body:'#2fbf8f', wing:'rgba(200,240,255,0.45)', accent:'#9ff5ff'}, desc:'Flies over everything, very fast. 2 seats.'},
  dragon:    {name:'Dragon',          icon:'🐉', speed:4.0, turn:2.2, seats:3, terrain:'air',   eye:2.6,  price:2500, source:'stable', unlockFlag:'g_thorn',
              colors:{body:'#b3261e', mane:'#5a0f0a', accent:'#f4d03f'}, desc:'Flies over trees, walls and water. 3 seats. FREE after defeating Thornwarden, or 2500g.'},
  orca:      {name:'Orca',            icon:'🐋', speed:3.6, turn:2.4, seats:2, terrain:'water', eye:0.3,  price:0,    source:'dock',
              colors:{body:'#141414', belly:'#f4f4f4', accent:'#9ad0ff'}, desc:'Swims lakes and seas (reaches the lake islet relic). 2 seats. Free from Dockhand Marlo.'},
};
// First-person renderer tile config: h = wall height (tiles), floor = ground colour
const FP_WALLS = { T:{h:1.35}, R:{h:1.7}, W:{h:1.5}, B:{h:1.9}, G:{h:1.5}, F:{h:0.45}, S:{h:0.55} };
const FP_FLOOR = { '.':[95,174,74], ',':[62,140,48], 'f':[110,180,90], '=':[201,168,106], 's':[232,213,154], '~':[47,120,196], 'b':[139,90,43],
                   'c':[99,76,61], 'p':[150,90,200], 'Y':[70,140,60], 'r':[67,58,88], 'T':[70,140,60], 'R':[58,47,42], 'W':[43,36,56], 'G':[43,36,56], 'B':[95,174,74], 'F':[95,174,74], 'S':[95,174,74] };
