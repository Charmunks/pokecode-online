// ─── Map layout ───
// 0=grass, 1=path, 2=water, 3=tree, 4=tallgrass
// prettier-ignore
const MAP_DATA = [
  [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,3,3,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,4,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,3,3,3,3,3,3,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,4,0,4,0,4,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,3,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,4,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,3,3,3,3,3,3,0,0,0,0,0,0,1,0,0,0,4,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,3,3,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,3,3,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,3,3,0,0,3],
  [3,0,0,3,3,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,3,3,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,4,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,4,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
];

const TILE_SIZE = 32;
const MAP_COLS = MAP_DATA[0].length;
const MAP_ROWS = MAP_DATA.length;
const WALKABLE = new Set([0, 1, 4]);

function isWalkable(px, py) {
  const col = Math.floor(px / TILE_SIZE);
  const row = Math.floor(py / TILE_SIZE);
  if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return false;
  return WALKABLE.has(MAP_DATA[row][col]) && !buildingAt(px, py);
}

function footHitboxCorners(cx, cy) {
  const hw = 6;
  const hh = 4;
  return [
    [cx - hw, cy - hh],
    [cx + hw, cy - hh],
    [cx - hw, cy + hh],
    [cx + hw, cy + hh],
  ];
}

function canMove(cx, cy) {
  return footHitboxCorners(cx, cy).every(([px, py]) => isWalkable(px, py));
}

// ─── Assets ───
function preloadRenderAssets(scene) {
  scene.load.spritesheet("male", "assets/brendan.png", {
    frameWidth: 48,
    frameHeight: 48,
  });
  scene.load.spritesheet("female", "assets/may.png", {
    frameWidth: 48,
    frameHeight: 48,
  });

  scene.load.image("grass", "assets/tiles/grass.png");
  scene.load.image("grasstree", "assets/tiles/grasstree.png");
  scene.load.image("path", "assets/tiles/path.png");
  scene.load.image("water", "assets/tiles/water.png");
  scene.load.image("tree", "assets/tiles/tree.png");
  scene.load.image("treetree", "assets/tiles/treetree.png");
  scene.load.image("tallgrass", "assets/tiles/tallgrass.png");
}

// ─── Map tiles ───
function renderMap(scene) {
  const tileKeys = ["grass", "path", "water", "tree", "tallgrass"];

  const half = TILE_SIZE / 2;
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      const tileId = MAP_DATA[row][col];
      let tileKey = tileKeys[tileId];
      const below = row < MAP_ROWS - 1 ? MAP_DATA[row + 1][col] : -1;

      if (tileId === 3 && below === 3) {
        tileKey = "treetree";
      }
      if (tileId === 0 && below === 3) {
        tileKey = "grasstree";
      }

      scene.add
        .image(col * TILE_SIZE + half, row * TILE_SIZE + half, tileKey)
        .setDepth(0);
    }
  }
}

// ─── Character sprites ───
function createCharacterAnimations(scene) {
  const dirFrames = {
    down: [0, 1, 2, 3],
    left: [4, 5, 6, 7],
    right: [8, 9, 10, 11],
    up: [12, 13, 14, 15],
  };

  ["male", "female"].forEach((g) => {
    Object.entries(dirFrames).forEach(([dir, frames]) => {
      scene.anims.create({
        key: `${g}-walk-${dir}`,
        frames: frames.map((f) => ({ key: g, frame: f })),
        frameRate: 8,
        repeat: -1,
      });
      scene.anims.create({
        key: `${g}-idle-${dir}`,
        frames: [{ key: g, frame: frames[0] }],
        frameRate: 1,
      });
    });
  });
}

function createPlayerSprite(scene, user) {
  // Spawn at saved position from DB
  const spawnX = user.x;
  const spawnY = user.y;

  const sprite = scene.physics.add.sprite(spawnX, spawnY, user.gender);
  sprite.setScale(24 / 48);
  sprite.setDepth(10);
  sprite.setCollideWorldBounds(true);
  sprite.body.setSize(36, 24);
  sprite.body.setOffset(6, 22);

  const nameText = scene.add
    .text(spawnX, spawnY - 20, user.username, {
      fontSize: "8px",
      fontFamily: "monospace",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
      align: "center",
    })
    .setOrigin(0.5)
    .setDepth(20);

  return { sprite, nameText };
}

function addOtherPlayer(scene, otherPlayers, data) {
  if (otherPlayers[data.id]) {
    otherPlayers[data.id].sprite.destroy();
    otherPlayers[data.id].nameText.destroy();
  }

  const sprite = scene.add.sprite(data.x, data.y, data.gender);
  sprite.setScale(24 / 48);
  sprite.setDepth(10);

  const label = scene.add
    .text(data.x, data.y - 20, data.name, {
      fontSize: "8px",
      fontFamily: "monospace",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
      align: "center",
    })
    .setOrigin(0.5)
    .setDepth(20);

  sprite.anims.play(`${data.gender}-idle-${data.direction || "down"}`, true);

  otherPlayers[data.id] = {
    id: data.id,
    name: data.name,
    sprite,
    nameText: label,
    gender: data.gender,
  };
}
