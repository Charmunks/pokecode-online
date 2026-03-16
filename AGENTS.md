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
│   │   ├── game.js        # Phaser game scene, networking, input
│   │   └── generateSprites.js  # Placeholder sprite generators (unused, kept as reference)
│   └── assets/
│       ├── brendan.png    # Male character spritesheet (48x48 frames)
│       ├── may.png        # Female character spritesheet (48x48 frames)
│       └── tiles/         # 32x32 tile images (grass, grasstree, path, water, tree, treetree, tallgrass)
├── AGENTS.md
└── package.json
```

## Key Concepts

### Map System
- Map is a 2D array in `game.js` (`MAP_DATA`), using tile IDs: 0=grass, 1=path, 2=water, 3=tree, 4=tallgrass
- Tiles are 32x32 pixels, loaded from `public/assets/tiles/`. Walkable tiles: grass (0), path (1), tallgrass (4)
- To add new tile types: add a PNG to `public/assets/tiles/`, add a `this.load.image()` call in preload, add the ID to `MAP_DATA`, and update `WALKABLE` set if needed

### Map Tile Rules
- **Context-aware rendering**: The renderer checks neighboring tiles to pick variant textures at render time — `MAP_DATA` only stores base tile IDs
- **treetree**: When a tree tile (3) has another tree tile (3) directly below it, the upper tree renders with `treetree.png` instead of `tree.png`
- **grasstree**: When a grass tile (0) has a tree tile (3) directly below it, the grass renders with `grasstree.png` instead of `grass.png`
- **Path-tree spacing**: Path tiles (1) must never be placed directly above a tree tile (3) in `MAP_DATA` — there must be at least one non-path tile between them vertically

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

### Collision
- Tile-based collision check via `isWalkable()` in `game.js`
- Checks player foot hitbox corners against the tile grid

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
