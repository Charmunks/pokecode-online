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
    const res = await fetch("/api/setup", {
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
    const res = await fetch("/api/me");
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
const MAP_COLS = MAP_DATA[0].length;
const MAP_ROWS = MAP_DATA.length;
const WALKABLE = new Set([0, 1, 4]);

function startGame(user) {
  const socket = io();
  const otherPlayers = {};
  const gender = user.gender;
  const name = user.username;
  let chatOpen = false;
  let chatMuted = false;
  const chatMessages = [];
  const maxChatMessages = 50;
  let chatFadeTimer = null;
  let pokemonMenuOpen = false;
  let speciesData = {};
  let myPokemon = { party: [], box: [] };

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
      if (chatOpen) return;
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

    pokemonPanel.appendChild(pokemonTitle);
    pokemonPanel.appendChild(partyLabel);
    pokemonPanel.appendChild(partyGrid);
    pokemonPanel.appendChild(boxLabel);
    pokemonPanel.appendChild(boxGrid);
    pokemonPanel.appendChild(adminControls);
    pokemonPanel.appendChild(pokemonHint);
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
      const slot = document.createElement("div");
      slot.style.cssText =
        "display:flex;flex-direction:column;align-items:center;background:#fff;border:2px solid " +
        (mon ? "#383838" : "#c0c0c0") +
        ";padding:6px 4px;min-height:88px;justify-content:center;";

      if (!mon) {
        slot.style.borderStyle = "dashed";
        const empty = document.createElement("div");
        empty.textContent = "—";
        empty.style.cssText = "font-size:16px;color:#c0c0c0;";
        slot.appendChild(empty);
        return slot;
      }

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

      slot.appendChild(img);
      slot.appendChild(label);
      return slot;
    }

    function renderPokemonMenu() {
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

    addPokemonButton.addEventListener("click", async () => {
      if (!user.admin || !speciesSelect.value) return;
      addPokemonButton.disabled = true;
      adminMessage.style.color = "#585858";
      adminMessage.textContent = "Adding...";

      try {
        const res = await fetch("/api/my-pokemon", {
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

    async function loadMyPokemon() {
      try {
        const res = await fetch("/api/my-pokemon");
        if (res.ok) {
          myPokemon = await res.json();
        }
      } catch (err) {
        // Keep whatever we had before; menu just renders as empty.
      }
    }

    async function openPokemonMenu() {
      pokemonMenuOpen = true;
      await loadMyPokemon();
      renderPokemonMenu();
      pokemonOverlay.style.display = "flex";
    }

    function closePokemonMenu() {
      pokemonMenuOpen = false;
      pokemonOverlay.style.display = "none";
    }

    function togglePokemonMenu() {
      if (pokemonMenuOpen) {
        closePokemonMenu();
      } else {
        openPokemonMenu();
      }
    }

    fetch("/data/pokemon.json")
      .then((res) => res.json())
      .then((data) => {
        speciesData = data;
        populateSpeciesSelect();
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

    if (chatOpen || pokemonMenuOpen) {
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
