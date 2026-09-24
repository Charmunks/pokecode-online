let selectedGender = "male";
let currentUser = null;

function selectGender(gender) {
  selectedGender = gender;
  document.querySelectorAll(".gender-option").forEach((el) => {
    el.classList.toggle("selected", el.dataset.gender === gender);
  });
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.add("hidden"));
  const screen = document.getElementById(screenId);
  if (screen) screen.classList.remove("hidden");
}

async function submitSetup() {
  const usernameInput = document.getElementById("setup-username");
  const errorEl = document.getElementById("setup-error");
  const username = usernameInput.value.trim();
  errorEl.textContent = "";

  if (!username) {
    usernameInput.style.borderColor = "#ec3750";
    usernameInput.focus();
    return;
  }

  try {
    const res = await fetch("api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, gender: selectedGender }),
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || "Something went wrong";
      return;
    }

    currentUser = data.user;
    launchGame();
  } catch (err) {
    errorEl.textContent = "Connection error";
  }
}

document.getElementById("setup-username").addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitSetup();
});

function launchGame() {
  showScreen(null);
  document.querySelectorAll(".screen").forEach((el) => el.classList.add("hidden"));
  document.getElementById("game-container").style.display = "block";
  startGame(currentUser);
}

// Check auth state on load
async function init() {
  try {
    const res = await fetch("api/me");
    const data = await res.json();

    if (data.user) {
      currentUser = data.user;
      if (!currentUser.username) {
        showScreen("setup-screen");
      } else {
        launchGame();
      }
    } else {
      showScreen("login-screen");
    }
  } catch (err) {
    showScreen("login-screen");
  }
}

init();

// ─── Map layout ───
// 0=grass, 1=path, 2=water, 3=tree, 4=tallgrass
// prettier-ignore
const MAP_DATA = [
  [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,3,3,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,3],
  [3,0,0,4,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,3],
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
const ENCOUNTER_STEP_SIZE = 8;
const MAP_COLS = MAP_DATA[0].length;
const MAP_ROWS = MAP_DATA.length;
const WALKABLE = new Set([0, 1, 4]);

function startGame(user) {
  const socket = io({ path: new URL("socket.io", document.baseURI).pathname });
  const otherPlayers = {};
  const gender = user.gender;
  const name = user.username;
  let chatOpen = false;
  let chatMuted = false;
  const chatMessages = [];
  const maxChatMessages = 50;
  let chatFadeTimer = null;
  let pokemonMenuOpen = false;
  let battleOpen = false;
  let speciesData = {};
  let movesData = {};
  let itemData = {};
  let areaData = {};
  let myPokemon = { party: [], box: [] };
  let myItems = [];
  let selectedItemType = null;
  let encounterPending = false;

  const config = {
    type: Phaser.AUTO,
    parent: "game-container",
    width: window.innerWidth,
    height: window.innerHeight,
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: { debug: false },
    },
    scene: {
      preload,
      create,
      update,
    },
  };

  const game = new Phaser.Game(config);
  let player;
  let cursors;
  let wasd;
  let playerSprite;
  let nameText;
  let lastSentX = 0;
  let lastSentY = 0;
  let lastSentDir = "down";
  let lastSentMoving = false;
  let lastStepChunk = null;

  function pokemonStats(species, level) {
    const base = species.stats || {};
    const scaledStat = (stat) => Math.floor(((base[stat] || 0) * 2 * level) / 100) + 5;
    return {
      HP: Math.floor(((base.HP || 0) * 2 * level) / 100) + level + 10,
      ATTACK: scaledStat("ATTACK"),
      DEFENSE: scaledStat("DEFENSE"),
      SPA: scaledStat("SPA"),
      SPD: scaledStat("SPD"),
      SPEED: scaledStat("SPEED"),
    };
  }

  async function tryWildEncounter(x, y) {
    const area = Object.values(areaData).find(({ coordinates }) =>
      x >= coordinates.x.min &&
      x <= coordinates.x.max &&
      y >= coordinates.y.min &&
      y <= coordinates.y.max
    );
    if (!area || Math.random() * 100 >= area.encounterChance) return;

    const encounters = area.pokemon.filter(
      (encounter) => speciesData[encounter.speciesId] && encounter.percentSpawn > 0
    );
    const totalWeight = encounters.reduce(
      (total, encounter) => total + encounter.percentSpawn,
      0
    );
    let spawnRoll = Math.random() * totalWeight;
    const encounter = encounters.find((candidate) => {
      spawnRoll -= candidate.percentSpawn;
      return spawnRoll < 0;
    });
    if (!encounter) return;

    const level = Phaser.Math.Between(
      encounter.levelRange.min,
      encounter.levelRange.max
    );
    const species = speciesData[encounter.speciesId];
    const moves = species.moves
      .filter((learnedMove) => learnedMove.level <= level)
      .map((learnedMove) => learnedMove.move)
      .slice(-4);

    encounterPending = true;
    playerSprite.setVelocity(0, 0);
    try {
      await startBattle({
        type: "wild",
        enemyPokemon: [{
          species: encounter.speciesId,
          level,
          stats: pokemonStats(species, level),
          moves,
        }],
      });
    } catch (error) {
      console.error("Could not start wild encounter:", error);
    } finally {
      encounterPending = false;
    }
  }

  function preload() {
    this.load.spritesheet("male", "assets/brendan.png", {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet("female", "assets/may.png", {
      frameWidth: 48,
      frameHeight: 48,
    });

    this.load.image("grass", "assets/tiles/grass.png");
    this.load.image("grasstree", "assets/tiles/grasstree.png");
    this.load.image("path", "assets/tiles/path.png");
    this.load.image("water", "assets/tiles/water.png");
    this.load.image("tree", "assets/tiles/tree.png");
    this.load.image("treetree", "assets/tiles/treetree.png");
    this.load.image("tallgrass", "assets/tiles/tallgrass.png");
  }

  function create() {
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

        this.add
          .image(col * TILE_SIZE + half, row * TILE_SIZE + half, tileKey)
          .setDepth(0);
      }
    }

    const dirFrames = {
      down: [0, 1, 2, 3],
      left: [4, 5, 6, 7],
      right: [8, 9, 10, 11],
      up: [12, 13, 14, 15],
    };

    ["male", "female"].forEach((g) => {
      Object.entries(dirFrames).forEach(([dir, frames]) => {
        this.anims.create({
          key: `${g}-walk-${dir}`,
          frames: frames.map((f) => ({ key: g, frame: f })),
          frameRate: 8,
          repeat: -1,
        });
        this.anims.create({
          key: `${g}-idle-${dir}`,
          frames: [{ key: g, frame: frames[0] }],
          frameRate: 1,
        });
      });
    });

    // Spawn at saved position from DB
    const spawnX = user.x;
    const spawnY = user.y;

    playerSprite = this.physics.add.sprite(spawnX, spawnY, gender);
    playerSprite.setScale(24 / 48);
    playerSprite.setDepth(10);
    playerSprite.setCollideWorldBounds(true);
    playerSprite.body.setSize(36, 24);
    playerSprite.body.setOffset(6, 22);

    nameText = this.add
      .text(spawnX, spawnY - 20, name, {
        fontSize: "8px",
        fontFamily: "monospace",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.physics.world.setBounds(
      0,
      0,
      MAP_COLS * TILE_SIZE,
      MAP_ROWS * TILE_SIZE
    );

    this.cameras.main.setBounds(
      0,
      0,
      MAP_COLS * TILE_SIZE,
      MAP_ROWS * TILE_SIZE
    );
    this.cameras.main.startFollow(playerSprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(2);

    cursors = this.input.keyboard.createCursorKeys();
    wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Send userId so server can look up DB record
    socket.emit("playerJoin", { userId: user.id });

    socket.on("currentPlayers", (players) => {
      Object.values(players).forEach((p) => {
        if (p.id !== socket.id) {
          addOtherPlayer(this, p);
        }
      });
    });

    socket.on("playerJoined", (p) => {
      addOtherPlayer(this, p);
    });

    socket.on("playerMoved", (data) => {
      const other = otherPlayers[data.id];
      if (!other) return;

      other.sprite.setPosition(data.x, data.y);
      other.nameText.setPosition(data.x, data.y - 20);

      if (data.moving) {
        other.sprite.anims.play(
          `${other.gender}-walk-${data.direction}`,
          true
        );
      } else {
        other.sprite.anims.play(
          `${other.gender}-idle-${data.direction}`,
          true
        );
      }
    });

    socket.on("playerDisconnected", (id) => {
      if (otherPlayers[id]) {
        otherPlayers[id].sprite.destroy();
        otherPlayers[id].nameText.destroy();
        delete otherPlayers[id];
      }
    });

    // ─── Chat UI ───
    const chatContainer = document.createElement("div");
    chatContainer.id = "chat-container";
    chatContainer.style.cssText =
      "position:fixed;left:12px;top:50%;transform:translateY(-50%);width:360px;z-index:200;pointer-events:none;font-family:'Press Start 2P',monospace;";

    const chatLog = document.createElement("div");
    chatLog.id = "chat-log";
    chatLog.style.cssText =
      "max-height:160px;overflow-y:auto;padding:6px;pointer-events:auto;";

    const chatInputWrap = document.createElement("div");
    chatInputWrap.id = "chat-input-wrap";
    chatInputWrap.style.cssText =
      "display:none;background:rgba(0,0,0,0.85);border:2px solid #383838;padding:6px;pointer-events:auto;";

    const chatInput = document.createElement("input");
    chatInput.type = "text";
    chatInput.maxLength = 200;
    chatInput.placeholder = "Type a message...";
    chatInput.style.cssText =
      "width:100%;background:transparent;border:none;color:#fff;font-size:8px;font-family:'Press Start 2P',monospace;outline:none;";

    const chatHint = document.createElement("div");
    chatHint.textContent = "Press T to chat";
    chatHint.style.cssText =
      "font-size:8px;color:#fff;background:rgba(0,0,0,0.6);padding:6px 10px;pointer-events:none;";

    chatInputWrap.appendChild(chatInput);
    chatContainer.appendChild(chatLog);
    chatContainer.appendChild(chatHint);
    chatContainer.appendChild(chatInputWrap);
    document.body.appendChild(chatContainer);

    const chatCommands = {
      mute: () => {
        chatMuted = !chatMuted;
        appendChatMessage({
          message: chatMuted ? "Chat muted." : "Chat unmuted.",
          type: "system",
        });
      },
    };

    function appendChatMessage(msg) {
      chatMessages.push(msg);
      if (chatMessages.length > maxChatMessages) chatMessages.shift();

      const el = document.createElement("div");
      el.style.cssText =
        "font-size:7px;padding:2px 4px;color:#fff;background:rgba(0,0,0,0.6);margin-bottom:1px;line-height:1.6;word-break:break-word;";

      if (msg.type === "system") {
        el.style.color = "#f1c40f";
        el.textContent = msg.message;
      } else {
        const nameSpan = document.createElement("span");
        nameSpan.style.color = "#5bc0de";
        nameSpan.textContent = msg.username + ": ";
        el.appendChild(nameSpan);
        el.appendChild(document.createTextNode(msg.message));
      }

      chatLog.appendChild(el);
      chatLog.scrollTop = chatLog.scrollHeight;

      // Show log, then schedule fade
      chatLog.style.opacity = "1";
      scheduleChatFade();
    }

    function scheduleChatFade() {
      if (chatOpen) return;
      clearTimeout(chatFadeTimer);
      chatFadeTimer = setTimeout(() => {
        if (!chatOpen) {
          chatLog.style.transition = "opacity 1s";
          chatLog.style.opacity = "0";
        }
      }, 5000);
    }

    function openChat() {
      chatOpen = true;
      clearTimeout(chatFadeTimer);
      chatLog.style.transition = "none";
      chatLog.style.opacity = "1";
      chatInputWrap.style.display = "block";
      chatHint.remove();
      chatInput.focus();
    }

    function closeChat() {
      chatOpen = false;
      chatInputWrap.style.display = "none";
      chatInput.value = "";
      chatInput.blur();
      scheduleChatFade();
    }

    function sendChat() {
      const text = chatInput.value.trim();
      if (!text) {
        closeChat();
        return;
      }

      // Handle commands
      if (text.startsWith("/")) {
        const parts = text.slice(1).split(" ");
        const cmd = parts[0].toLowerCase();
        if (chatCommands[cmd]) {
          chatCommands[cmd](parts.slice(1));
        } else {
          appendChatMessage({
            message: `Unknown command: /${cmd}`,
            type: "system",
          });
        }
        chatInput.value = "";
        closeChat();
        return;
      }

      socket.emit("chatMessage", { message: text });
      chatInput.value = "";
      closeChat();
    }

    chatInput.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        sendChat();
      } else if (e.key === "Escape") {
        closeChat();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (chatOpen || battleOpen) return;
      if (e.key === "t" || e.key === "T") {
        if (document.activeElement === chatInput) return;
        e.preventDefault();
        openChat();
      } else if (e.key === "1") {
        e.preventDefault();
        togglePokemonMenu();
      } else if (e.key === "Escape" && pokemonMenuOpen) {
        closePokemonMenu();
      }
    });

    socket.on("chatMessage", (msg) => {
      if (chatMuted && msg.type !== "system") return;
      appendChatMessage(msg);
    });

    window.addEventListener("battle:start", () => {
      battleOpen = true;
      if (pokemonMenuOpen) closePokemonMenu();
      if (chatOpen) closeChat();
    });
    window.addEventListener("battle:end", () => {
      battleOpen = false;
    });

    // ─── Pokémon menu ───
    const pokemonOverlay = document.createElement("div");
    pokemonOverlay.id = "pokemon-menu-overlay";
    pokemonOverlay.style.cssText =
      "display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:300;justify-content:center;align-items:center;font-family:'Press Start 2P',monospace;";

    const pokemonPanel = document.createElement("div");
    pokemonPanel.style.cssText =
      "background:#f8f8f0;border:4px solid #383838;padding:20px;width:640px;max-width:90vw;max-height:80vh;overflow-y:auto;color:#383838;";

    const pokemonTitle = document.createElement("h2");
    pokemonTitle.textContent = "YOUR POKÉMON";
    pokemonTitle.style.cssText = "font-size:14px;margin-bottom:16px;letter-spacing:2px;";

    const menuNavigation = document.createElement("div");
    menuNavigation.style.cssText = "display:flex;gap:8px;margin-bottom:16px;";

    const pokemonMenuButton = document.createElement("button");
    pokemonMenuButton.type = "button";
    pokemonMenuButton.textContent = "POKÉMON";
    pokemonMenuButton.style.cssText =
      "padding:9px 12px;border:2px solid #383838;background:#ec3750;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";

    const bagMenuButton = document.createElement("button");
    bagMenuButton.type = "button";
    bagMenuButton.textContent = "BAG";
    bagMenuButton.style.cssText =
      "padding:9px 12px;border:2px solid #383838;background:#fff;color:#383838;font:8px 'Press Start 2P',monospace;cursor:pointer;";

    const testBattleButton = document.createElement("button");
    testBattleButton.type = "button";
    testBattleButton.textContent = "TEST BATTLE";
    testBattleButton.style.cssText =
      "padding:9px 12px;border:2px solid #383838;background:#338eda;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";

    menuNavigation.appendChild(pokemonMenuButton);
    menuNavigation.appendChild(bagMenuButton);
    menuNavigation.appendChild(testBattleButton);

    const pokemonListView = document.createElement("div");

    const partyLabel = document.createElement("div");
    partyLabel.style.cssText = "font-size:9px;color:#ec3750;margin-bottom:8px;";

    const partyGrid = document.createElement("div");
    partyGrid.style.cssText =
      "display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:20px;";

    const boxLabel = document.createElement("div");
    boxLabel.style.cssText = "font-size:9px;color:#ec3750;margin-bottom:8px;";

    const boxGrid = document.createElement("div");
    boxGrid.style.cssText = "display:grid;grid-template-columns:repeat(6,1fr);gap:8px;";

    const adminControls = document.createElement("div");
    adminControls.style.cssText =
      "display:none;margin-top:20px;padding-top:16px;border-top:2px solid #c0c0c0;";

    const adminLabel = document.createElement("div");
    adminLabel.textContent = "ADMIN: ADD TO PARTY";
    adminLabel.style.cssText = "font-size:9px;color:#ec3750;margin-bottom:8px;";

    const adminRow = document.createElement("div");
    adminRow.style.cssText = "display:flex;gap:8px;";

    const speciesSelect = document.createElement("select");
    speciesSelect.style.cssText =
      "min-width:0;flex:1;padding:8px;border:2px solid #383838;background:#fff;color:#383838;font:8px 'Press Start 2P',monospace;";

    const addPokemonButton = document.createElement("button");
    addPokemonButton.type = "button";
    addPokemonButton.textContent = "ADD";
    addPokemonButton.style.cssText =
      "padding:8px 12px;border:2px solid #383838;background:#ec3750;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";

    const adminMessage = document.createElement("div");
    adminMessage.style.cssText = "min-height:12px;margin-top:8px;font-size:7px;color:#585858;";

    adminRow.appendChild(speciesSelect);
    adminRow.appendChild(addPokemonButton);
    adminControls.appendChild(adminLabel);
    adminControls.appendChild(adminRow);
    adminControls.appendChild(adminMessage);

    const pokemonHint = document.createElement("div");
    pokemonHint.textContent = "Press 1 or ESC to close";
    pokemonHint.style.cssText =
      "font-size:8px;color:#585858;margin-top:20px;text-align:center;";

    const pokemonSummary = document.createElement("div");
    pokemonSummary.style.display = "none";

    const bagView = document.createElement("div");
    bagView.style.display = "none";

    const itemTypeTabs = document.createElement("div");
    itemTypeTabs.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;";

    const itemList = document.createElement("div");
    itemList.style.cssText = "display:grid;gap:8px;";

    const itemAdminControls = document.createElement("div");
    itemAdminControls.style.cssText =
      "display:none;margin-top:20px;padding-top:16px;border-top:2px solid #c0c0c0;";

    const itemAdminLabel = document.createElement("div");
    itemAdminLabel.textContent = "ADMIN: ADD TO BAG";
    itemAdminLabel.style.cssText = "font-size:9px;color:#ec3750;margin-bottom:8px;";

    const itemAdminRow = document.createElement("div");
    itemAdminRow.style.cssText = "display:flex;gap:8px;";

    const itemSelect = document.createElement("select");
    itemSelect.style.cssText =
      "min-width:0;flex:1;padding:8px;border:2px solid #383838;background:#fff;color:#383838;font:8px 'Press Start 2P',monospace;";

    const itemQuantity = document.createElement("input");
    itemQuantity.type = "number";
    itemQuantity.min = "1";
    itemQuantity.max = "999";
    itemQuantity.value = "1";
    itemQuantity.setAttribute("aria-label", "Item quantity");
    itemQuantity.style.cssText =
      "width:75px;padding:8px;border:2px solid #383838;background:#fff;color:#383838;font:8px 'Press Start 2P',monospace;";

    const addItemButton = document.createElement("button");
    addItemButton.type = "button";
    addItemButton.textContent = "ADD";
    addItemButton.style.cssText =
      "padding:8px 12px;border:2px solid #383838;background:#ec3750;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";

    const itemAdminMessage = document.createElement("div");
    itemAdminMessage.style.cssText =
      "min-height:12px;margin-top:8px;font-size:7px;color:#585858;";

    const bagHint = document.createElement("div");
    bagHint.textContent = "Press 1 or ESC to close";
    bagHint.style.cssText = "font-size:8px;color:#585858;margin-top:20px;text-align:center;";

    itemAdminRow.appendChild(itemSelect);
    itemAdminRow.appendChild(itemQuantity);
    itemAdminRow.appendChild(addItemButton);
    itemAdminControls.appendChild(itemAdminLabel);
    itemAdminControls.appendChild(itemAdminRow);
    itemAdminControls.appendChild(itemAdminMessage);
    bagView.appendChild(itemTypeTabs);
    bagView.appendChild(itemList);
    bagView.appendChild(itemAdminControls);
    bagView.appendChild(bagHint);

    pokemonPanel.appendChild(menuNavigation);
    pokemonPanel.appendChild(pokemonTitle);
    pokemonListView.appendChild(partyLabel);
    pokemonListView.appendChild(partyGrid);
    pokemonListView.appendChild(boxLabel);
    pokemonListView.appendChild(boxGrid);
    pokemonListView.appendChild(adminControls);
    pokemonListView.appendChild(pokemonHint);
    pokemonPanel.appendChild(pokemonListView);
    pokemonPanel.appendChild(pokemonSummary);
    pokemonPanel.appendChild(bagView);
    pokemonOverlay.appendChild(pokemonPanel);
    document.body.appendChild(pokemonOverlay);

    function pokemonPlaceholderSprite(label) {
      const colors = ["#ec3750", "#33d6a6", "#338eda", "#f1c40f", "#a463f2", "#ff8c42"];
      let hash = 0;
      for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) | 0;
      const color = colors[Math.abs(hash) % colors.length];
      const letter = label.charAt(0).toUpperCase();
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="${color}"/><text x="32" y="42" font-size="28" font-family="monospace" fill="#fff" text-anchor="middle">${letter}</text></svg>`;
      return "data:image/svg+xml;base64," + btoa(svg);
    }

    function pokemonSlotEl(mon) {
      const slot = document.createElement(mon ? "button" : "div");
      slot.style.cssText =
        "display:flex;flex-direction:column;align-items:center;background:#fff;border:2px solid " +
        (mon ? "#383838" : "#c0c0c0") +
        ";padding:6px 4px;min-height:88px;justify-content:center;font-family:'Press Start 2P',monospace;";

      if (!mon) {
        slot.style.borderStyle = "dashed";
        const empty = document.createElement("div");
        empty.textContent = "—";
        empty.style.cssText = "font-size:16px;color:#c0c0c0;";
        slot.appendChild(empty);
        return slot;
      }

      slot.type = "button";
      slot.style.cursor = "pointer";
      slot.setAttribute("aria-label", `View ${mon.nickname || mon.speciesId} summary`);
      slot.addEventListener("click", () => renderPokemonSummary(mon));

      const species = speciesData[mon.speciesId] || {};
      const img = document.createElement("img");
      img.src = species.mainSprite || "";
      img.width = 48;
      img.height = 48;
      img.style.cssText = "image-rendering:pixelated;margin-bottom:4px;";
      img.onerror = () => {
        img.onerror = null;
        img.src = pokemonPlaceholderSprite(species.name || mon.speciesId || "?");
      };

      const label = document.createElement("div");
      label.textContent = mon.nickname || species.name || mon.speciesId;
      label.style.cssText = "font-size:7px;text-align:center;word-break:break-word;";

      const level = document.createElement("div");
      level.textContent = `Lv. ${mon.level}`;
      level.style.cssText = "font-size:6px;color:#585858;margin-top:4px;";

      const health = document.createElement("div");
      health.textContent = `HP ${mon.health}/${pokemonStats(species, mon.level).HP}`;
      health.style.cssText = "font-size:6px;color:#ec3750;margin-top:4px;";

      slot.appendChild(img);
      slot.appendChild(label);
      slot.appendChild(level);
      slot.appendChild(health);
      return slot;
    }

    function learnableMoves(mon) {
      return (speciesData[mon.speciesId]?.moves || [])
        .filter((learnedMove) => learnedMove.level <= mon.level)
        .map((learnedMove) => learnedMove.move);
    }

    function renderMovePicker(mon) {
      const availableMoves = learnableMoves(mon);
      const selectedMoves = new Set(
        (mon.moves || []).filter((moveId) => availableMoves.includes(moveId)).slice(0, 4)
      );

      pokemonSummary.innerHTML = "";

      const heading = document.createElement("div");
      heading.textContent = "CHOOSE 4 MOVES";
      heading.style.cssText = "font-size:11px;color:#ec3750;margin-bottom:8px;";

      const instructions = document.createElement("div");
      instructions.style.cssText = "font-size:7px;color:#585858;line-height:1.7;margin-bottom:14px;";

      const choices = document.createElement("div");
      choices.style.cssText =
        "display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px;";

      const actions = document.createElement("div");
      actions.style.cssText = "display:flex;gap:8px;";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.textContent = "CANCEL";
      cancelButton.style.cssText =
        "padding:8px 10px;border:2px solid #383838;background:#fff;color:#383838;font:8px 'Press Start 2P',monospace;cursor:pointer;";
      cancelButton.addEventListener("click", () => renderPokemonSummary(mon));

      const saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.textContent = "SAVE MOVES";
      saveButton.style.cssText =
        "padding:8px 10px;border:2px solid #383838;background:#ec3750;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";

      const message = document.createElement("div");
      message.style.cssText = "min-height:12px;margin-top:10px;font-size:7px;color:#ec3750;";

      function updateMovePicker() {
        instructions.textContent = `${selectedMoves.size}/4 selected. Select exactly four moves.`;
        saveButton.disabled = selectedMoves.size !== 4;
        saveButton.style.background = saveButton.disabled ? "#a0a0a0" : "#ec3750";
        saveButton.style.cursor = saveButton.disabled ? "not-allowed" : "pointer";
      }

      availableMoves.forEach((moveId) => {
        const move = movesData[moveId] || { name: moveId };
        const label = document.createElement("label");
        label.style.cssText =
          "display:flex;align-items:center;gap:8px;background:#fff;border:2px solid #383838;padding:10px;font-size:8px;line-height:1.5;cursor:pointer;";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = selectedMoves.has(moveId);
        checkbox.addEventListener("change", () => {
          message.textContent = "";
          if (checkbox.checked && selectedMoves.size >= 4) {
            checkbox.checked = false;
            message.textContent = "A Pokémon can only know four moves.";
          } else if (checkbox.checked) {
            selectedMoves.add(moveId);
          } else {
            selectedMoves.delete(moveId);
          }
          updateMovePicker();
        });

        const moveText = document.createElement("span");
        moveText.textContent = `${move.name} · ${move.type || "Unknown"}`;
        label.appendChild(checkbox);
        label.appendChild(moveText);
        choices.appendChild(label);
      });

      saveButton.addEventListener("click", async () => {
        if (selectedMoves.size !== 4) return;
        saveButton.disabled = true;
        message.style.color = "#585858";
        message.textContent = "Saving...";

        try {
          const response = await fetch(`api/my-pokemon/${mon.id}/moves`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ moves: Array.from(selectedMoves) }),
          });
          const data = await response.json();
          if (!response.ok) {
            message.style.color = "#ec3750";
            message.textContent = data.error || "Could not save moves.";
            updateMovePicker();
            return;
          }

          mon.moves = data.pokemon.moves;
          renderPokemonSummary(mon);
        } catch (err) {
          message.style.color = "#ec3750";
          message.textContent = "Connection error.";
          updateMovePicker();
        }
      });

      actions.appendChild(cancelButton);
      actions.appendChild(saveButton);
      pokemonSummary.appendChild(heading);
      pokemonSummary.appendChild(instructions);
      pokemonSummary.appendChild(choices);
      pokemonSummary.appendChild(actions);
      pokemonSummary.appendChild(message);
      updateMovePicker();
    }

    function renderPokemonSummary(mon) {
      const species = speciesData[mon.speciesId] || {};
      const displayName = mon.nickname || species.name || mon.speciesId;
      const stats = pokemonStats(species, mon.level);

      pokemonTitle.textContent = "POKÉMON SUMMARY";
      pokemonListView.style.display = "none";
      pokemonSummary.style.display = "block";
      pokemonSummary.innerHTML = "";

      const backButton = document.createElement("button");
      backButton.type = "button";
      backButton.textContent = "◀ BACK";
      backButton.style.cssText =
        "padding:7px 10px;border:2px solid #383838;background:#fff;color:#383838;font:8px 'Press Start 2P',monospace;cursor:pointer;margin-bottom:16px;";
      backButton.addEventListener("click", renderPokemonMenu);

      const header = document.createElement("div");
      header.style.cssText = "display:flex;align-items:center;gap:18px;margin-bottom:18px;";

      const img = document.createElement("img");
      img.src = species.mainSprite || "";
      img.width = 96;
      img.height = 96;
      img.style.cssText = "image-rendering:pixelated;object-fit:contain;";
      img.onerror = () => {
        img.onerror = null;
        img.src = pokemonPlaceholderSprite(displayName);
      };

      const identity = document.createElement("div");
      const summaryName = document.createElement("div");
      summaryName.textContent = displayName;
      summaryName.style.cssText = "font-size:13px;margin-bottom:10px;";

      const summaryDetails = document.createElement("div");
      summaryDetails.style.cssText = "font-size:8px;color:#585858;line-height:2;";
      [
        species.name || mon.speciesId,
        `Lv. ${mon.level}`,
        `Health: ${mon.health}/${stats.HP}`,
        `Friendship: ${mon.friendship}`,
      ].forEach((detail) => {
        const line = document.createElement("div");
        line.textContent = detail;
        summaryDetails.appendChild(line);
      });

      identity.appendChild(summaryName);
      identity.appendChild(summaryDetails);
      header.appendChild(img);
      header.appendChild(identity);

      if (user.admin) {
        const adminEditor = document.createElement("div");
        adminEditor.style.cssText =
          "display:flex;flex-direction:column;gap:10px;margin-bottom:18px;padding:12px;background:#fff;border:2px solid #c0c0c0;";

        const levelEditor = document.createElement("form");
        levelEditor.style.cssText =
          "display:flex;align-items:center;gap:8px;";

        const levelLabel = document.createElement("label");
        levelLabel.textContent = "ADMIN LEVEL";
        levelLabel.style.cssText = "font-size:8px;color:#ec3750;";

        const levelInput = document.createElement("input");
        levelInput.type = "number";
        levelInput.min = "1";
        levelInput.max = "100";
        levelInput.step = "1";
        levelInput.required = true;
        levelInput.value = mon.level;
        levelInput.setAttribute("aria-label", `${displayName} level`);
        levelInput.style.cssText =
          "width:70px;padding:7px;border:2px solid #383838;color:#383838;font:8px 'Press Start 2P',monospace;";

        const saveLevelButton = document.createElement("button");
        saveLevelButton.type = "submit";
        saveLevelButton.textContent = "SAVE";
        saveLevelButton.style.cssText =
          "padding:8px 10px;border:2px solid #383838;background:#ec3750;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";

        const levelMessage = document.createElement("div");
        levelMessage.style.cssText = "font-size:7px;color:#ec3750;line-height:1.5;";

        levelEditor.addEventListener("submit", async (event) => {
          event.preventDefault();
          const level = Number(levelInput.value);
          if (!Number.isInteger(level) || level < 1 || level > 100) {
            levelMessage.textContent = "Choose a whole number from 1 to 100.";
            return;
          }

          saveLevelButton.disabled = true;
          levelMessage.style.color = "#585858";
          levelMessage.textContent = "Saving...";

          try {
            const response = await fetch(`api/my-pokemon/${mon.id}/level`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ level }),
            });
            const data = await response.json();
            if (!response.ok) {
              levelMessage.style.color = "#ec3750";
              levelMessage.textContent = data.error || "Could not save level.";
              saveLevelButton.disabled = false;
              return;
            }

            mon.level = data.pokemon.level;
            renderPokemonSummary(mon);
          } catch (err) {
            levelMessage.style.color = "#ec3750";
            levelMessage.textContent = "Connection error.";
            saveLevelButton.disabled = false;
          }
        });

        levelEditor.appendChild(levelLabel);
        levelEditor.appendChild(levelInput);
        levelEditor.appendChild(saveLevelButton);
        levelEditor.appendChild(levelMessage);

        const healthEditor = document.createElement("form");
        healthEditor.style.cssText = "display:flex;align-items:center;gap:8px;";

        const healthLabel = document.createElement("label");
        healthLabel.textContent = "ADMIN HEALTH";
        healthLabel.style.cssText = "font-size:8px;color:#ec3750;";

        const healthInput = document.createElement("input");
        healthInput.type = "number";
        healthInput.min = "0";
        healthInput.max = String(stats.HP);
        healthInput.step = "1";
        healthInput.required = true;
        healthInput.value = mon.health;
        healthInput.setAttribute("aria-label", `${displayName} health`);
        healthInput.style.cssText =
          "width:70px;padding:7px;border:2px solid #383838;color:#383838;font:8px 'Press Start 2P',monospace;";

        const saveHealthButton = document.createElement("button");
        saveHealthButton.type = "submit";
        saveHealthButton.textContent = "SAVE";
        saveHealthButton.style.cssText =
          "padding:8px 10px;border:2px solid #383838;background:#ec3750;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";

        const healthMessage = document.createElement("div");
        healthMessage.style.cssText = "font-size:7px;color:#ec3750;line-height:1.5;";

        healthEditor.addEventListener("submit", async (event) => {
          event.preventDefault();
          const health = Number(healthInput.value);
          if (!Number.isInteger(health) || health < 0 || health > stats.HP) {
            healthMessage.textContent = `Choose a whole number from 0 to ${stats.HP}.`;
            return;
          }

          saveHealthButton.disabled = true;
          healthMessage.style.color = "#585858";
          healthMessage.textContent = "Saving...";

          try {
            const response = await fetch(`api/my-pokemon/${mon.id}/health`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ health }),
            });
            const data = await response.json();
            if (!response.ok) {
              healthMessage.style.color = "#ec3750";
              healthMessage.textContent = data.error || "Could not save health.";
              saveHealthButton.disabled = false;
              return;
            }

            mon.health = data.pokemon.health;
            renderPokemonSummary(mon);
          } catch (err) {
            healthMessage.style.color = "#ec3750";
            healthMessage.textContent = "Connection error.";
            saveHealthButton.disabled = false;
          }
        });

        healthEditor.appendChild(healthLabel);
        healthEditor.appendChild(healthInput);
        healthEditor.appendChild(saveHealthButton);
        healthEditor.appendChild(healthMessage);

        const deleteEditor = document.createElement("div");
        deleteEditor.style.cssText =
          "display:flex;align-items:center;gap:8px;padding-top:10px;border-top:2px solid #c0c0c0;";

        const deletePokemonButton = document.createElement("button");
        deletePokemonButton.type = "button";
        deletePokemonButton.textContent = "DELETE POKÉMON";
        deletePokemonButton.style.cssText =
          "padding:8px 10px;border:2px solid #383838;background:#b42318;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";

        const deleteMessage = document.createElement("div");
        deleteMessage.style.cssText = "font-size:7px;color:#ec3750;line-height:1.5;";

        deletePokemonButton.addEventListener("click", async () => {
          if (!window.confirm(`Permanently delete ${displayName}? This cannot be undone.`)) {
            return;
          }

          deletePokemonButton.disabled = true;
          deleteMessage.style.color = "#585858";
          deleteMessage.textContent = "Deleting...";

          try {
            const response = await fetch(`api/my-pokemon/${mon.id}`, {
              method: "DELETE",
            });
            const data = await response.json();
            if (!response.ok) {
              deleteMessage.style.color = "#ec3750";
              deleteMessage.textContent = data.error || "Could not delete Pokémon.";
              deletePokemonButton.disabled = false;
              return;
            }

            await loadMyPokemon();
            renderPokemonMenu();
            adminMessage.style.color = "#198754";
            adminMessage.textContent = `${displayName} was deleted.`;
          } catch (err) {
            deleteMessage.style.color = "#ec3750";
            deleteMessage.textContent = "Connection error.";
            deletePokemonButton.disabled = false;
          }
        });

        deleteEditor.appendChild(deletePokemonButton);
        deleteEditor.appendChild(deleteMessage);
        adminEditor.appendChild(levelEditor);
        adminEditor.appendChild(healthEditor);
        adminEditor.appendChild(deleteEditor);
        pokemonSummary.appendChild(backButton);
        pokemonSummary.appendChild(header);
        pokemonSummary.appendChild(adminEditor);
      } else {
        pokemonSummary.appendChild(backButton);
        pokemonSummary.appendChild(header);
      }

      const statsLabel = document.createElement("div");
      statsLabel.textContent = "STATS";
      statsLabel.style.cssText = "font-size:9px;color:#ec3750;margin-bottom:8px;";

      const statsGrid = document.createElement("div");
      statsGrid.style.cssText =
        "display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:18px;";
      Object.entries(stats).forEach(([name, value]) => {
        const stat = document.createElement("div");
        stat.style.cssText =
          "background:#fff;border:2px solid #c0c0c0;padding:8px;font-size:7px;line-height:1.7;";
        stat.textContent = `${name}  ${value}`;
        statsGrid.appendChild(stat);
      });

      const movesLabel = document.createElement("div");
      movesLabel.textContent = "KNOWN MOVES";
      movesLabel.style.cssText = "font-size:9px;color:#ec3750;margin-bottom:8px;";

      const movesList = document.createElement("div");
      movesList.style.cssText = "display:grid;grid-template-columns:repeat(2,1fr);gap:8px;";
      if (!mon.moves || mon.moves.length === 0) {
        movesList.textContent = "This Pokémon does not know any moves.";
        movesList.style.cssText = "font-size:8px;color:#585858;line-height:1.7;";
      } else {
        mon.moves.forEach((moveId) => {
          const move = movesData[moveId] || { name: moveId };
          const moveCard = document.createElement("div");
          moveCard.style.cssText = "background:#fff;border:2px solid #383838;padding:10px;";

          const moveName = document.createElement("div");
          moveName.textContent = move.name;
          moveName.style.cssText = "font-size:9px;margin-bottom:7px;";

          const moveDetails = document.createElement("div");
          const damage = move.damage > 0 ? move.damage : "—";
          moveDetails.textContent = `${move.type || "Unknown"} · ${move.category || "Unknown"} · PP ${move.pp ?? "—"} · DMG ${damage}`;
          moveDetails.style.cssText = "font-size:6px;color:#585858;line-height:1.7;";

          moveCard.appendChild(moveName);
          moveCard.appendChild(moveDetails);
          movesList.appendChild(moveCard);
        });
      }

      pokemonSummary.appendChild(statsLabel);
      pokemonSummary.appendChild(statsGrid);
      pokemonSummary.appendChild(movesLabel);
      pokemonSummary.appendChild(movesList);

      if (learnableMoves(mon).length > 4) {
        const chooseMovesButton = document.createElement("button");
        chooseMovesButton.type = "button";
        chooseMovesButton.textContent = "CHOOSE MOVES";
        chooseMovesButton.style.cssText =
          "margin-top:14px;padding:8px 10px;border:2px solid #383838;background:#ec3750;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";
        chooseMovesButton.addEventListener("click", () => renderMovePicker(mon));
        pokemonSummary.appendChild(chooseMovesButton);
      }
    }

    function renderPokemonMenu() {
      pokemonTitle.textContent = "YOUR POKÉMON";
      bagView.style.display = "none";
      pokemonSummary.style.display = "none";
      pokemonListView.style.display = "block";
      pokemonMenuButton.style.background = "#ec3750";
      pokemonMenuButton.style.color = "#fff";
      bagMenuButton.style.background = "#fff";
      bagMenuButton.style.color = "#383838";
      partyLabel.textContent = `PARTY (${myPokemon.party.length}/6)`;
      partyGrid.innerHTML = "";
      for (let i = 0; i < 6; i++) {
        partyGrid.appendChild(pokemonSlotEl(myPokemon.party[i] || null));
      }

      boxLabel.textContent = `BOX (${myPokemon.box.length})`;
      boxGrid.innerHTML = "";
      if (myPokemon.box.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = "Your box is empty.";
        empty.style.cssText = "font-size:8px;color:#585858;grid-column:1/-1;";
        boxGrid.appendChild(empty);
      } else {
        myPokemon.box.forEach((mon) => boxGrid.appendChild(pokemonSlotEl(mon)));
      }

      adminControls.style.display = user.admin ? "block" : "none";
      addPokemonButton.disabled = myPokemon.party.length >= 6;
      addPokemonButton.style.background = addPokemonButton.disabled ? "#a0a0a0" : "#ec3750";
      testBattleButton.disabled = !myPokemon.party.some((pokemon) => pokemon.health > 0);
      testBattleButton.style.background = testBattleButton.disabled ? "#a0a0a0" : "#338eda";
      testBattleButton.style.cursor = testBattleButton.disabled ? "not-allowed" : "pointer";
    }

    function renderBag() {
      pokemonTitle.textContent = "YOUR BAG";
      pokemonListView.style.display = "none";
      pokemonSummary.style.display = "none";
      bagView.style.display = "block";
      pokemonMenuButton.style.background = "#fff";
      pokemonMenuButton.style.color = "#383838";
      bagMenuButton.style.background = "#ec3750";
      bagMenuButton.style.color = "#fff";

      const ownedTypes = Array.from(
        new Set(
          myItems
            .map((ownedItem) => itemData[ownedItem.itemId]?.type)
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));
      if (!ownedTypes.includes(selectedItemType)) {
        selectedItemType = ownedTypes[0] || null;
      }

      itemTypeTabs.innerHTML = "";
      ownedTypes.forEach((type) => {
        const typeButton = document.createElement("button");
        typeButton.type = "button";
        typeButton.textContent = type.toUpperCase();
        const selected = type === selectedItemType;
        typeButton.style.cssText =
          `padding:7px 9px;border:2px solid #383838;background:${selected ? "#338eda" : "#fff"};color:${selected ? "#fff" : "#383838"};font:7px 'Press Start 2P',monospace;cursor:pointer;`;
        typeButton.addEventListener("click", () => {
          selectedItemType = type;
          renderBag();
        });
        itemTypeTabs.appendChild(typeButton);
      });

      itemList.innerHTML = "";
      const visibleItems = myItems
        .filter((ownedItem) => itemData[ownedItem.itemId]?.type === selectedItemType)
        .sort((a, b) =>
          itemData[a.itemId].name.localeCompare(itemData[b.itemId].name)
        );

      if (visibleItems.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = "Your bag is empty.";
        empty.style.cssText = "font-size:8px;color:#585858;line-height:1.7;padding:12px 0;";
        itemList.appendChild(empty);
      } else {
        visibleItems.forEach((ownedItem) => {
          const item = itemData[ownedItem.itemId];
          const row = document.createElement("div");
          row.style.cssText =
            "display:grid;grid-template-columns:minmax(120px,1fr) 3fr auto;gap:12px;align-items:center;background:#fff;border:2px solid #c0c0c0;padding:12px;";

          const itemName = document.createElement("div");
          itemName.textContent = item.name;
          itemName.style.cssText = "font-size:9px;line-height:1.5;";

          const itemDescription = document.createElement("div");
          itemDescription.textContent = item.description;
          itemDescription.style.cssText = "font-size:7px;color:#585858;line-height:1.7;";

          const quantity = document.createElement("div");
          quantity.textContent = `×${ownedItem.quantity}`;
          quantity.style.cssText = "font-size:10px;color:#ec3750;";

          row.appendChild(itemName);
          row.appendChild(itemDescription);
          row.appendChild(quantity);
          itemList.appendChild(row);
        });
      }

      itemAdminControls.style.display = user.admin ? "block" : "none";
    }

    function populateSpeciesSelect() {
      speciesSelect.innerHTML = "";
      Object.entries(speciesData)
        .sort(([, a], [, b]) => a.name.localeCompare(b.name))
        .forEach(([id, species]) => {
          const option = document.createElement("option");
          option.value = id;
          option.textContent = species.name;
          speciesSelect.appendChild(option);
        });
    }

    function populateItemSelect() {
      itemSelect.innerHTML = "";
      Object.entries(itemData)
        .sort(([, a], [, b]) => a.name.localeCompare(b.name))
        .forEach(([id, item]) => {
          const option = document.createElement("option");
          option.value = id;
          option.textContent = `${item.name} (${item.type})`;
          itemSelect.appendChild(option);
        });
    }

    pokemonMenuButton.addEventListener("click", renderPokemonMenu);
    bagMenuButton.addEventListener("click", renderBag);
    testBattleButton.addEventListener("click", async () => {
      if (testBattleButton.disabled || !speciesData.charmander) return;
      testBattleButton.disabled = true;
      closePokemonMenu();

      try {
        await startBattle({
          type: "trainer",
          trainer: {
            name: "Brendan",
            sprite: "assets/npc/brendan.png",
            dialogue: "Let’s test your battle skills!",
          },
          enemyPokemon: [
            {
              species: "charmander",
              level: 5,
              stats: pokemonStats(speciesData.charmander, 5),
              moves: ["scratch", "growl"],
            },
          ],
          onVictory: () => {
            appendChatMessage({
              message: "Test battle won!",
              type: "system",
            });
          },
        });
      } catch (error) {
        appendChatMessage({
          message: error.message || "Could not start the test battle.",
          type: "system",
        });
        testBattleButton.disabled = false;
      }
    });

    addPokemonButton.addEventListener("click", async () => {
      if (!user.admin || !speciesSelect.value) return;
      addPokemonButton.disabled = true;
      adminMessage.style.color = "#585858";
      adminMessage.textContent = "Adding...";

      try {
        const res = await fetch("api/my-pokemon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ speciesId: speciesSelect.value }),
        });
        const data = await res.json();
        if (!res.ok) {
          adminMessage.style.color = "#ec3750";
          adminMessage.textContent = data.error || "Could not add Pokémon.";
        } else {
          await loadMyPokemon();
          renderPokemonMenu();
          adminMessage.style.color = "#198754";
          adminMessage.textContent = "Pokémon added to your party.";
        }
      } catch (err) {
        adminMessage.style.color = "#ec3750";
        adminMessage.textContent = "Connection error.";
      } finally {
        addPokemonButton.disabled = myPokemon.party.length >= 6;
      }
    });

    addItemButton.addEventListener("click", async () => {
      const quantity = Number(itemQuantity.value);
      if (
        !user.admin ||
        !itemSelect.value ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 999
      ) {
        itemAdminMessage.style.color = "#ec3750";
        itemAdminMessage.textContent = "Choose a quantity from 1 to 999.";
        return;
      }

      addItemButton.disabled = true;
      itemAdminMessage.style.color = "#585858";
      itemAdminMessage.textContent = "Adding...";

      try {
        const res = await fetch("api/my-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: itemSelect.value, quantity }),
        });
        const data = await res.json();
        if (!res.ok) {
          itemAdminMessage.style.color = "#ec3750";
          itemAdminMessage.textContent = data.error || "Could not add item.";
        } else {
          selectedItemType = itemData[itemSelect.value].type;
          await loadMyItems();
          renderBag();
          itemAdminMessage.style.color = "#198754";
          itemAdminMessage.textContent = "Item added to your bag.";
        }
      } catch (err) {
        itemAdminMessage.style.color = "#ec3750";
        itemAdminMessage.textContent = "Connection error.";
      } finally {
        addItemButton.disabled = false;
      }
    });

    async function loadMyPokemon() {
      try {
        const res = await fetch("api/my-pokemon");
        if (res.ok) {
          myPokemon = await res.json();
        }
      } catch (err) {
        // Keep whatever we had before; menu just renders as empty.
      }
    }

    async function loadMyItems() {
      try {
        const res = await fetch("api/my-items");
        if (res.ok) {
          const data = await res.json();
          myItems = data.items;
        }
      } catch (err) {
        // Keep the previous inventory if it cannot be refreshed.
      }
    }

    async function openPokemonMenu() {
      pokemonMenuOpen = true;
      await Promise.all([loadMyPokemon(), loadMyItems()]);
      renderPokemonMenu();
      pokemonOverlay.style.display = "flex";
    }

    function closePokemonMenu() {
      pokemonMenuOpen = false;
      pokemonOverlay.style.display = "none";
      renderPokemonMenu();
    }

    function togglePokemonMenu() {
      if (pokemonMenuOpen) {
        closePokemonMenu();
      } else {
        openPokemonMenu();
      }
    }

    Promise.all([
      fetch("data/pokemon.json"),
      fetch("data/moves.json"),
      fetch("data/items.json"),
      fetch("data/area.json"),
    ])
      .then(async ([pokemonResponse, movesResponse, itemsResponse, areaResponse]) => {
        speciesData = await pokemonResponse.json();
        movesData = await movesResponse.json();
        itemData = await itemsResponse.json();
        areaData = await areaResponse.json();
        populateSpeciesSelect();
        populateItemSelect();
      })
      .catch(() => {});

    player = { sprite: playerSprite, nameText, direction: user.direction || "down" };
  }

  function addOtherPlayer(scene, data) {
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
      sprite,
      nameText: label,
      gender: data.gender,
    };
  }

  function isWalkable(px, py) {
    const col = Math.floor(px / TILE_SIZE);
    const row = Math.floor(py / TILE_SIZE);
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return false;
    return WALKABLE.has(MAP_DATA[row][col]);
  }

  function canMove(cx, cy) {
    const hw = 6;
    const hh = 4;
    return (
      isWalkable(cx - hw, cy - hh) &&
      isWalkable(cx + hw, cy - hh) &&
      isWalkable(cx - hw, cy + hh) &&
      isWalkable(cx + hw, cy + hh)
    );
  }

  function update() {
    if (!player) return;

    const speed = 80;
    let vx = 0;
    let vy = 0;
    let direction = player.direction;
    let moving = false;

    if (chatOpen || pokemonMenuOpen || battleOpen || encounterPending) {
      playerSprite.setVelocity(0, 0);
      playerSprite.anims.play(`${gender}-idle-${direction}`, true);
      nameText.setPosition(playerSprite.x, playerSprite.y - 20);
      return;
    }

    if (cursors.left.isDown || wasd.left.isDown) {
      vx = -speed;
      direction = "left";
      moving = true;
    }
    if (cursors.right.isDown || wasd.right.isDown) {
      vx = speed;
      direction = "right";
      moving = true;
    }
    if (cursors.up.isDown || wasd.up.isDown) {
      vy = -speed;
      direction = "up";
      moving = true;
    }
    if (cursors.down.isDown || wasd.down.isDown) {
      vy = speed;
      direction = "down";
      moving = true;
    }

    // Normalize diagonal speed so it doesn't exceed cardinal speed
    if (vx !== 0 && vy !== 0) {
      const factor = Math.SQRT1_2;
      vx *= factor;
      vy *= factor;
    }

    const footX = playerSprite.x;
    const footY = playerSprite.y + 14;
    const step = 4;
    const stepChunk =
      `${Math.floor(footX / ENCOUNTER_STEP_SIZE)},` +
      `${Math.floor(footY / ENCOUNTER_STEP_SIZE)}`;

    if (lastStepChunk === null) {
      lastStepChunk = stepChunk;
    } else if (stepChunk !== lastStepChunk) {
      lastStepChunk = stepChunk;
      const tileCol = Math.floor(footX / TILE_SIZE);
      const tileRow = Math.floor(footY / TILE_SIZE);
      if (MAP_DATA[tileRow]?.[tileCol] === 4) {
        tryWildEncounter(footX, footY);
        if (encounterPending) {
          playerSprite.setVelocity(0, 0);
          playerSprite.anims.play(`${gender}-idle-${direction}`, true);
          return;
        }
      }
    }

    if (vx !== 0 && !canMove(footX + Math.sign(vx) * step, footY)) {
      vx = 0;
    }
    if (vy !== 0 && !canMove(footX, footY + Math.sign(vy) * step)) {
      vy = 0;
    }

    playerSprite.setVelocity(vx, vy);
    player.direction = direction;

    if (moving && (vx !== 0 || vy !== 0)) {
      playerSprite.anims.play(`${gender}-walk-${direction}`, true);
    } else {
      playerSprite.anims.play(`${gender}-idle-${direction}`, true);
      moving = false;
    }

    nameText.setPosition(playerSprite.x, playerSprite.y - 20);

    playerSprite.setDepth(playerSprite.y);
    nameText.setDepth(playerSprite.y + 1);

    Object.values(otherPlayers).forEach((other) => {
      other.sprite.setDepth(other.sprite.y);
      other.nameText.setDepth(other.sprite.y + 1);
    });

    const dx = Math.abs(playerSprite.x - lastSentX);
    const dy = Math.abs(playerSprite.y - lastSentY);
    if (
      dx > 1 ||
      dy > 1 ||
      direction !== lastSentDir ||
      moving !== lastSentMoving
    ) {
      socket.emit("playerMove", {
        x: playerSprite.x,
        y: playerSprite.y,
        direction,
        moving,
      });
      lastSentX = playerSprite.x;
      lastSentY = playerSprite.y;
      lastSentDir = direction;
      lastSentMoving = moving;
    }
  }
}
