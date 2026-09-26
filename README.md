# Shadowvale — Tamers of the Shadow Wyrm
A browser game that mixes Pokémon-style creature taming with World of Warcraft-style talents. No build step: open `index.html`, or run `python3 -m http.server` in this folder.

## Goal
**Main quest:** Elder Maren sends you to beat three guardians (Thornwarden in Whisperwood, Magmaw in Ember Cave, Tidecaller on the Mirror Lake island). Each one drops a Rune Shard. With all 3 shards you can open the Shadow Ruins gate and fight **Umbrax**.
**Side quests:** Lost Lambs (Tobin), Moonpetal Remedy (Lyra), Ranger's Trial (Kael, reward: +1 talent point), The Collector and Glimmering Past (Pip).
**Collectables:** an 11-species Bestiary, 8 hidden Glimmer Relics, 3 Rune Shards, Moonpetals, and the Ancient Crown.

## Progression
- **Player levels:** you earn XP from wins, catches, quests and relics. Each level gives 1 **talent point**.
- **Talent tree (T):** 3 branches (Beastmaster / Huntsman / Fortune) with 3 tiers each. Tier 2 needs 3 points in its branch and tier 3 needs 5. Each tier-3 talent also needs a specific tier-2 talent first. R resets your points.
  - Passives: +damage, -damage taken, +catch rate, +move speed, +gold, shop discount, +XP, and a heal after each win.
  - Overworld actives, shown on the hotbar with cooldowns: [1] Camouflage (no encounters), [2] Field Medic (heal the party), [3] Hearthstone (teleport to the Inn).
  - Battle actives, once per battle from the Ability menu: Rallying Cry, Primal Unleash, Soul Snare.
- **Creatures** level up and learn moves from their learnsets ("✨ X learned Y!"). If a creature already knows 4 moves, a prompt lets you pick one to forget or skip the new move.

## Multiplayer (Firebase)
- **Login screen:** sign in with email and password, create an account (you choose a tamer name), or **Continue with Google**. **Play offline** is always available. If `js/firebase-config.js` still has the placeholder values, only "Multiplayer not configured — play offline" is shown.
- **Cloud save:** stored at `users/{uid}/save` and mirrored to localStorage.
- **Shared world:** your presence goes to `presence/{uid}` (at most about 8 updates a second, removed on disconnect). Other players in your zone are drawn with name tags and smooth movement. The top bar shows how many players are online and who is in your zone.
- **Global chat:** press Enter to type. The last 50 messages are stored.
- **World boss (Riftmaw):** appears on the east road near (37,24). Every player's damage comes off one shared HP pool. It respawns 2 minutes after it's defeated.
- **Menu (Esc):** Resume, Save, and Sign out.
- See `FIREBASE_SETUP.md` and `database.rules.json`.

## Controls
WASD/Arrows move · E/Space talk/confirm · Esc back · T talents · P party (Enter = set lead, H = potion) · Q quests · B bag/bestiary/collection · 1/2/3 abilities. Mouse works in the talent tree. The game autosaves to localStorage.

## Code layout (data-driven)
- `js/data.js`: all config lives here: TYPES/chart, MOVES, SPECIES (+learnsets), ZONES (encounter tables), ITEMS, TALENTS, MAIN_QUEST, SIDE_QUESTS, GUARDIANS, collectable spots, NPCS
- `js/world.js`: map generation, zones
- `js/core.js`: state, talent effects (atkMult, catchBonus...), XP/levelling, save
- `js/render.js`: procedural sprites and tiles
- `js/battle.js`: battle engine (step queue), BATTLE_ABILITIES
- `js/main.js`: world logic, NPC_TALK, quests, overworld abilities
- `js/ui.js`: HUD, talent screen, menus, battle UI
- `js/input.js`: input and main loop
- `js/firebase-config.js`: the Firebase config · `js/net.js`: Firebase SDK module (window.NET) · `js/mp.js`: login overlay, chat, remote players, world boss
- Tests (`test/`, serve the folder with `python3 -m http.server 8765` first): `node mp.js` (login screen, offline fallback, mocked multiplayer HUD), `node reach.js` (map reachability), `node play.js` (Playwright playthrough with screenshots in `test/shots/`), `node sim.js` (boss balance sim)
