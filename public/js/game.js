const ENCOUNTER_STEP_SIZE = 8;

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

function startGame(user) {
  const socket = io({ path: new URL("socket.io", document.baseURI).pathname });
  const otherPlayers = {};
  const gender = user.gender;
  const name = user.username;
  let battleOpen = false;
  const gameData = { species: {}, moves: {}, items: {}, areas: {} };
  let encounterPending = false;
  let chat;
  let playersMenu;
  let pokemonMenu;

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

  async function tryWildEncounter(x, y) {
    const area = Object.values(gameData.areas).find(({ coordinates }) =>
      x >= coordinates.x.min &&
      x <= coordinates.x.max &&
      y >= coordinates.y.min &&
      y <= coordinates.y.max
    );
    if (!area || Math.random() * 100 >= area.encounterChance) return;

    const encounters = area.pokemon.filter(
      (encounter) => gameData.species[encounter.speciesId] && encounter.percentSpawn > 0
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
    const species = gameData.species[encounter.speciesId];
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
    preloadRenderAssets(this);
  }

  function getOnlinePlayers() {
    const list = [
      {
        id: socket.id || "self",
        name: name,
        gender: gender,
        isSelf: true,
      },
    ];
    const others = Object.values(otherPlayers).map((p) => ({
      id: p.id,
      name: p.name || (p.nameText ? p.nameText.text : "Unknown"),
      gender: p.gender,
      isSelf: false,
    }));
    others.sort((a, b) => a.name.localeCompare(b.name));
    return list.concat(others);
  }

  function create() {
    renderMap(this);
    createCharacterAnimations(this);

    ({ sprite: playerSprite, nameText } = createPlayerSprite(this, user));

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

    // ─── UI overlays ───
    chat = createChat({
      socket,
      getOnlinePlayers,
      onOpen: () => {
        if (playersMenu.isOpen()) playersMenu.close();
      },
    });

    playersMenu = createPlayersMenu({
      getOnlinePlayers,
      onOpen: () => {
        if (pokemonMenu.isOpen()) pokemonMenu.close();
        if (chat.isOpen()) chat.close();
      },
    });

    pokemonMenu = createPokemonMenu({
      user,
      gameData,
      appendChatMessage: chat.appendMessage,
      onOpen: () => {
        if (playersMenu.isOpen()) playersMenu.close();
      },
    });

    // Send userId so server can look up DB record
    socket.emit("playerJoin", { userId: user.id });

    socket.on("currentPlayers", (players) => {
      Object.values(players).forEach((p) => {
        if (p.id !== socket.id) {
          addOtherPlayer(this, otherPlayers, p);
        }
      });
      playersMenu.refresh();
    });

    socket.on("playerJoined", (p) => {
      addOtherPlayer(this, otherPlayers, p);
      playersMenu.refresh();
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
      playersMenu.refresh();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        if (e.repeat) return;
        if (chat.isOpen() || battleOpen) return;
        playersMenu.toggle();
        return;
      }

      if (e.key === "Escape") {
        if (playersMenu.isOpen()) {
          e.preventDefault();
          playersMenu.close();
          return;
        }
        if (pokemonMenu.isOpen()) {
          e.preventDefault();
          pokemonMenu.close();
          return;
        }
      }

      if (chat.isOpen() || battleOpen || playersMenu.isOpen()) return;

      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        chat.open();
      } else if (e.key === "1") {
        e.preventDefault();
        pokemonMenu.toggle();
      }
    });

    window.addEventListener("battle:start", () => {
      battleOpen = true;
      if (pokemonMenu.isOpen()) pokemonMenu.close();
      if (playersMenu.isOpen()) playersMenu.close();
      if (chat.isOpen()) chat.close();
    });
    window.addEventListener("battle:end", () => {
      battleOpen = false;
    });

    Promise.all([
      fetch("data/pokemon.json"),
      fetch("data/moves.json"),
      fetch("data/items.json"),
      fetch("data/area.json"),
    ])
      .then(async ([pokemonResponse, movesResponse, itemsResponse, areaResponse]) => {
        gameData.species = await pokemonResponse.json();
        gameData.moves = await movesResponse.json();
        gameData.items = await itemsResponse.json();
        gameData.areas = await areaResponse.json();
        pokemonMenu.populateAdminSelects();
      })
      .catch(() => {});

    player = { sprite: playerSprite, nameText, direction: user.direction || "down" };
  }

  function update() {
    if (!player) return;

    const speed = 80;
    let vx = 0;
    let vy = 0;
    let direction = player.direction;
    let moving = false;

    if (
      chat.isOpen() ||
      pokemonMenu.isOpen() ||
      playersMenu.isOpen() ||
      battleOpen ||
      encounterPending
    ) {
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
