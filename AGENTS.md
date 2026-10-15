# PokeCode MMO — Development Guide

## Project Overview

A Pokemon Emerald-styled MMO template built with **Phaser 3** (client) and **Socket.IO + Express** (server). Players pick a name and gender, then move around a shared overworld map together in real-time.

## Tech Stack

- **Server**: Node.js + Express + Socket.IO (`server.js`)
- **Client**: Phaser 3 (loaded via CDN), vanilla JS, Socket.IO client
- **Sprites**: Real character spritesheets (48x48 frames) loaded from `public/assets/`, real 32x32 tile images from `public/assets/tiles/`

## Architecture

```
pokecode/
├── server.js              # Express + Socket.IO server, game state
├── public/
│   ├── index.html         # Login screen + game container
│   ├── js/
│   │   ├── onboarding.js  # Login/setup/starter screens; calls startGame() when done
│   │   ├── game.js        # Phaser game scene, networking, input, encounters
│   │   ├── render.js      # MAP_DATA, collision, tile + character sprite rendering
│   │   ├── buildings.js   # BUILDINGS definitions, building collision/entrances/rendering
│   │   ├── chat.js        # Chat UI and slash commands
│   │   ├── playersMenu.js # TAB online players overlay
│   │   ├── pokemonMenu.js # "1" menu: Pokémon, bag, shop, admin tools
│   │   ├── adminDashboard.js # "9" admin dashboard: accounts, editing, impersonation
│   │   ├── battle.js      # Battle system (window.startBattle)
│   │   ├── moveEffects.js # Move effect handlers
│   │   └── itemEffects.js # Item effect handlers
│   └── assets/
│       ├── brendan.png    # Male character spritesheet (48x48 frames)
│       ├── may.png        # Female character spritesheet (48x48 frames)
│       └── tiles/         # 32x32 tile images (grass, grasstree, path, water, tree, treetree, tallgrass)
├── AGENTS.md
└── package.json
```

## Key Concepts

### Map System
- Map is a 2D array in `render.js` (`MAP_DATA`), using tile IDs: 0=grass, 1=path, 2=water, 3=tree, 4=tallgrass
- Tiles are 32x32 pixels, loaded from `public/assets/tiles/`. Walkable tiles: grass (0), path (1), tallgrass (4)
- To add new tile types: add a PNG to `public/assets/tiles/`, add a `this.load.image()` call in preload, add the ID to `MAP_DATA`, and update `WALKABLE` set if needed

### Map Tile Rules
- **Context-aware rendering**: The renderer checks neighboring tiles to pick variant textures at render time — `MAP_DATA` only stores base tile IDs
- **treetree**: When a tree tile (3) has another tree tile (3) directly below it, the upper tree renders with `treetree.png` instead of `tree.png`
- **grasstree**: When a grass tile (0) has a tree tile (3) directly below it, the grass renders with `grasstree.png` instead of `grass.png`
- **Path-tree spacing**: Path tiles (1) must never be placed directly above a tree tile (3) in `MAP_DATA` — there must be at least one non-path tile between them vertically

### Buildings
- Defined in the `BUILDINGS` array in `buildings.js`. Each entry has a unique `id`, `name`, `type`, `sprite` (image path), `position` (top-left tile), `size` (`width`/`height` in tiles), `entrance` (tile rect relative to the building's top-left; `width`/`height` default to 1) and `onEnter(context)`
- The sprite is stretched to cover `size` tiles. The whole footprint is solid (`isWalkable()` returns false for it); walking into the entrance calls `onEnter({ building, user, gameData, appendChatMessage })` once per contact
- Keep the `MAP_DATA` tiles under a building as grass (0), and keep the tile below the entrance walkable (players respawn there after blacking out)
- **Pokémarts**: add one with `pokemart({ id, name, x, y })` in `BUILDINGS` (4×4 tiles, x/y = top-left tile). The default one is `northeast-pokemart` in the top-right corner (tiles 45–48, rows 1–4). The door (bottom row, tile 1) asks "Do you want to heal your Pokémon?" via `showChoiceDialog()`; on YES it calls `POST /api/my-pokemon/heal-party` with `{ pokemartId }`, which restores every party Pokémon to max health and saves the id to `users.lastPokemartId`
- **Blacking out**: after every battle (`battle:end`), if all party Pokémon have 0 health, `checkBlackout()` in `game.js` shows a "YOU BLACKED OUT!" screen and teleports the player in front of their last-used Pokémart (or the first Pokémart in `BUILDINGS` if they haven't used one), then heals the party via `POST /api/my-pokemon/heal-party`
- `showChoiceDialog(message, choices)` in `buildings.js` shows a text box with buttons and resolves with the chosen string (Escape picks the last choice)

### Character Sprites
- Spritesheets are 4×4 grids of 48×48 frames (192×192 total)
- Row order: down, left, right, up (4 walk frames each)
- Male = "brendan" (`assets/brendan.png`), Female = "may" (`assets/may.png`)
- Loaded via `this.load.spritesheet()` with `frameWidth: 48, frameHeight: 48`
- Scaled to 0.5 (24px display size) in-game

### Networking Protocol (Socket.IO events)
| Event | Direction | Payload |
|---|---|---|
| `playerJoin` | Client → Server | `{ name, gender }` |
| `currentPlayers` | Server → Client | `{ [id]: playerData }` |
| `playerJoined` | Server → Others | `playerData` |
| `playerMove` | Client → Server | `{ x, y, direction, moving }` |
| `playerMoved` | Server → Others | `{ id, x, y, direction, moving }` |
| `playerDisconnected` | Server → All | `socketId` |
| `playerCharacterChanged` | Server → All | `{ id, gender }` (sent when a user switches character in the PROFILE tab) |

### Collision
- Tile-based collision check via `isWalkable()` in `render.js`
- Checks player foot hitbox corners against the tile grid

### Pokémon System
- Species data lives in `public/data/pokemon.json`, served statically at `/data/pokemon.json`. Each entry has `name`, `mainSprite`, `battleSprite`, and a `stats` object with `HP`, `ATTACK`, `SPA`, `SPD`, `SPEED`, `DEFENSE`, `EXPRATE`
- Sprite paths point at `public/assets/pokemon/<id>.png` and `<id>_battle.png` — these image files don't exist yet; add real sprites there using the species id as the filename. The client falls back to a generated placeholder (colored square + initial) if a sprite fails to load
- Owned Pokémon are stored per-user in the `user_pokemon` table: `speciesId`, optional `nickname`, `location` (`party` or `box`), `slot` for ordering, `level` (defaults to 1), and `friendship` (defaults to 50)
- **Experience**: `user_pokemon.exp` holds EXP toward the next level. Leveling from `level` to `level + 1` needs `ceil(level * 0.2 * EXPRATE)` EXP (`expToLevelUp()` in `server.js`). Defeating a wild Pokémon gives the active party Pokémon `floor(wildLevel * area.encounterChance * 0.25)` EXP (`wildExpReward()`). The client sends `defeatedWild: { areaId, speciesId, level, pokemonId }` to `POST /api/battle/results`; the server checks it against `area.json`, computes the EXP, applies any level-ups (max health rises with level) and returns `expGain`. `Battle.awardExp()` in `battle.js` saves the results as soon as the last wild Pokémon faints, animates the player's EXP bar (using a client copy of `expToLevelUp()`), and for each move learned at a new level shows a `popup()` asking to learn it (and which move to forget if four are known). Changed moves are saved via `PATCH /api/my-pokemon/:id/moves`, which accepts 1–4 learnable moves. The win screen shows afterwards. The admin level editor resets `exp` to 0
- **Status**: `user_pokemon.status` (jsonb, nullable) holds a status condition that lasts between battles: `{ name, turns }` where `name` is one of `burned`, `frozen`, `paralyzed`, `poisoned`, `asleep` (`turns` is only set for sleep). Battles load it into `makeCombatant()` and send it back in each `health` entry of `POST /api/battle/results` (and on `caughtPokemon`); the server validates it with `parseStatus()`. Fainting (health 0) and healing at a Pokémart clear it, and an Antidote from the bag cures it
- Party is capped at 6 in the UI; box has no limit. There is currently no way for a user to obtain a Pokémon — rows must be inserted directly for now
- `GET /api/my-pokemon` (auth required) returns `{ party: [...], box: [...] }` for the current user
- Client fetches species data in `game.js` and owned data in `pokemonMenu.js`, and shows them in a DOM overlay menu (`pokemon-menu-overlay`) when the player presses `1`; `Escape` or `1` again closes it. Movement is frozen while the menu is open, same as chat

### Currency
- Two currencies are stored as integer columns on `users`: `pokedollars` and `watts` (both default 0)
- `GET /api/my-currency` (auth required) returns `{ pokedollars, watts }`; balances are shown at the top of the `1` menu
- Trainer battles can pass `prizeMoney` (non-negative integer) to `startBattle()`; on victory it is sent with `POST /api/battle/results` and added to `pokedollars`
- There is currently no way to earn watts

### Admin Dashboard
- Admins (`users.admin`) press `9` to open `createAdminDashboard()` in `adminDashboard.js`; `Escape` or `9` closes it. It lists every account (`GET /api/admin/users`) and clicking one loads its Pokémon, items and last 200 chat messages (`GET /api/admin/users/:userId`)
- Editing: `POST /api/admin/users/:userId/pokemon` (`{ speciesId, level, location }`), `PATCH /api/admin/users/:userId/pokemon/:id` (any of `nickname`, `level`, `health`, `friendship`, `location`), `DELETE /api/admin/users/:userId/pokemon/:id`, and `PUT /api/admin/users/:userId/items/:itemId` (`{ quantity }`, 0 removes the item)
- `DELETE /api/admin/users/:userId` deletes the account with its Pokémon, items and chat messages, and sends `forceLogout` to its open sockets. Admins cannot delete themselves
- Onboarding order: login → setup (name + character) → starter → tutorial (`#tutorial-screen` in `index.html`, controls and how the game works) → game. The tutorial only shows right after a starter is picked; update it when controls or core mechanics change
- TEST ONBOARDING FLOW calls `POST /api/admin/users/:userId/reset-onboarding`, which clears `username` and `starterReceived` (Pokémon and items are kept) and sends `forceLogout` to the user's open sockets so their game reloads into the setup and starter screens. `needsStarter` is just `!starterReceived`; a starter picked with a full party goes to the box
- `POST /api/admin/users/:userId/impersonate` switches the session to that user and stores the admin's id in `req.session.impersonatorId`; `/api/me` then returns `impersonating: true` and a banner offers `POST /api/admin/stop-impersonating` to switch back

### Hackatime Integration
- Links a Hackatime account to an already logged-in user via Hackatime OAuth ([docs](https://hackatime.hackclub.com/docs/oauth/oauth-apps)). Login itself still uses Hack Club Auth (`/auth/login`)
- Env vars: `HACKATIME_CLIENT_ID` and `HACKATIME_CLIENT_SECRET` (secret optional — omit it for a public/non-confidential app; PKCE is always sent). Register `${BASE_URL}/auth/hackatime/callback` as the redirect URI in the Hackatime OAuth app
- There is no in-game button yet; start the flow by visiting `/auth/hackatime` directly
- `GET /auth/hackatime`: requires a session, generates a random `state` and a PKCE `code_verifier` (stored in the cookie session as `hackatimeState`/`hackatimeVerifier`), and redirects to `https://hackatime.hackclub.com/oauth/authorize` with scope `profile read` and an S256 `code_challenge`
- `GET /auth/hackatime/callback`: checks `state`, exchanges the code at `POST /oauth/token` (form-encoded, with `code_verifier`), fetches `GET /api/v1/authenticated/me`, and saves `hackatimeId`, `hackatimeAccessToken`, `hackatimeScope` and `hackatimeConnectedAt` on `users`. Redirects to `/?hackatime=connected` on success, or `/?error=<code>` with one of `not_logged_in`, `hackatime_not_configured`, `hackatime_denied`, `hackatime_invalid_state`, `hackatime_token_failed`, `hackatime_user_fetch_failed`, `hackatime_already_linked` (that Hackatime account is linked to another user; `hackatimeId` is unique) or `hackatime_oauth_error`
- Hackatime tokens are long-lived and have no refresh token. Use the stored token as `Authorization: Bearer <hackatimeAccessToken>` against `https://hackatime.hackclub.com/api/v1/authenticated/*` (`hours`, `streak`, `projects`, `heartbeats/latest` need the `read` scope). Never send the token to the client
- `/api/me` and `/api/setup` return `hackatimeConnected` (boolean) on the user object

### Projects
- The PROJECTS tab of the `1` menu lists the user's projects (`user_projects` table: `name` (required), `description`, `iconData`/`iconType` (uploaded image bytes, stored in the database so they survive redeploys), `hackatimeProjects` (jsonb array of Hackatime project names), `codeUrl` and `playableUrl` (optional http(s) links, shown as CODE / PLAY buttons on each project)). If Hackatime isn't linked it shows a LINK HACKATIME button pointing at `/auth/hackatime`. Clicking a project opens the same form as ADD PROJECT, pre-filled for editing
- `GET /api/my-projects` returns `{ hackatimeConnected, projects }`. `GET /api/hackatime/projects` proxies Hackatime's `/api/v1/authenticated/projects` and returns `{ projects: [{ name, totalSeconds }] }`, used for the Hackatime project checkboxes and the summed tracked time
- `POST /api/my-projects` and `PATCH /api/my-projects/:id` take `{ name, description?, codeUrl?, playableUrl?, hackatimeProjects? }` (up to 50 names), require a linked Hackatime account, and check each newly linked name against the user's Hackatime projects (names already on the project are kept even if Hackatime no longer reports them)
- Icons are uploaded afterwards with `PUT /api/my-projects/:id/icon`, whose body is the raw image file (PNG, JPEG, GIF or WebP, max 256 KB; the type is checked from the file's bytes). They're served from `GET /api/projects/:id/icon`, and each project's `icon` field holds that URL with a `?v=` cache-busting version, or `null` if it has no icon. `DELETE /api/my-projects/:id/icon` removes it
- The edit form has a DELETE PROJECT button (with a confirm prompt) that calls `DELETE /api/my-projects/:id`

### Profile
- The PROFILE tab of the `1` menu edits the user's character (Brendan = `male`, May = `female`, stored in `users.gender`) and personal details stored on `users`: `firstName`, `lastName`, `addressLine1`, `addressLine2`, `city`, `state`, `country`, `postalCode` and `birthday` (DATE, sent as `YYYY-MM-DD`). All personal details are optional
- `GET /api/profile` returns `{ profile }`; `PATCH /api/profile` takes any of those fields plus `gender` (blank strings clear a field) and returns the updated `{ profile }`. Changing `gender` updates the in-memory player and emits `playerCharacterChanged`, and `game.js` swaps the sprite texture for that player
- Validation lives in `parseProfileBody()` in `server.js`

### Bag
- Items in `public/data/items.json` have `battleUsable` (usable from the battle bag, via `BattleItemEffects`) and `bagUsable` (usable from the BAG tab of the `1` menu, via `BagItemEffects`). Both effect maps live in `public/js/itemEffects.js`, which is loaded by the client and also `require()`d by `server.js`
- Bag-usable items show a USE button; the player picks a party Pokémon and the client calls `POST /api/my-items/use` with `{ itemId, pokemonId }`. The server runs `BagItemEffects[itemId]({ target })` on the stored Pokémon, saves `level`/`exp`/`health`, removes one item, and returns `{ message, pokemon, item }` (or a 400 with the effect's message if it had no effect)
- Current bag effects: `potion` (+20 HP), `antidote` (cures the saved status) and `rare-candy` (+1 level, resets `exp` to 0, raises health with max HP). New moves unlocked by a level-up are picked from the Pokémon's summary
- To add one: add a function to `bagEffects` in `itemEffects.js` that mutates `context.target` and returns `{ used, message }`, set `bagUsable: true` in `items.json`, and make sure the server saves any new fields it changes

### Shop
- Items in `public/data/items.json` with `shopPrice` (integer) and `shopType` (`pokedollars` or `watts`) are sold in the SHOP tab of the `1` menu, grouped by currency. Items without these fields are not sold
- `POST /api/shop/buy` (auth required) takes `{ itemId, quantity }` (1–99), deducts the cost from the matching currency column, adds the items to `user_items`, and returns `{ item, currency }`

## How to Replace Placeholder Sprites with Real Ones

Real spritesheets are already in place (`brendan.png`, `may.png` at 48×48 frames, and 32×32 tile PNGs in `assets/tiles/`). To update them:

1. Download sprite sheets from [The Spriters Resource](https://www.spriters-resource.com/game_boy_advance/pokemonemerald/)
   - Brendan: asset/8324
   - May: asset/8325
   - Exterior Tileset: asset/61816
2. Extract individual walking frames into a 4×4 grid (48×48 per frame)
3. Place them in `public/assets/`
4. Tile images go in `public/assets/tiles/` as 32×32 PNGs (grass.png, grasstree.png, path.png, water.png, tree.png, treetree.png, tallgrass.png)

## Deployment

- Designed for Coolify deployment
- Set `PORT` env var (defaults to 3000)
- Run: `npm start`
- The server serves static files from `public/` and handles Socket.IO connections

## Future Development Ideas

### High Priority
- [ ] Add a proper tilemap editor (Tiled) integration for map design
- [ ] Server-side position validation to prevent cheating
- [ ] Rate-limit movement packets

### Medium Priority
- [ ] Chat system (text bubbles above players)
- [ ] Multiple rooms/zones with transitions
- [ ] NPC characters with dialogue
- [ ] Emote system
- [ ] Player count display

### Low Priority / Advanced
- [ ] Pokemon battle system (PvP or PvE)
- [ ] Inventory system
- [ ] Player persistence (database storage)
- [ ] Admin tools / moderation
- [ ] Mobile touch controls

## Code Conventions

- Use camelCase for variables and functions
- Vanilla JS — no build tools or bundlers
- Keep client-side code in `public/js/`
- Server state is kept in memory (no database yet)
- Phaser loaded via CDN, Socket.IO served by the server

# Important: Do not attempt to test your code or run commands such as migrations. Tell the user the changes made and what commands need to be run
