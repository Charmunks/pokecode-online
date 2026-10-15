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
  let gender = user.gender;
  const name = user.username;
  let battleOpen = false;
  const gameData = { species: {}, moves: {}, items: {}, areas: {} };
  let encounterPending = false;
  let chat;
  let playersMenu;
  let pokemonMenu;
  let adminDashboard;

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
  let touchedBuilding = null;
  let buildingOpen = false;
  let blackoutOpen = false;

  async function enterBuilding(building) {
    buildingOpen = true;
    try {
      await building.onEnter({
        building,
        user,
        gameData,
        appendChatMessage: chat.appendMessage,
      });
    } catch (error) {
      console.error(`Could not enter building ${building.id}:`, error);
    } finally {
      buildingOpen = false;
    }
  }

  // Full-screen "blacked out" notice; resolves when the player dismisses it.
  function showBlackoutScreen(pokemartName) {
    return new Promise((resolve) => {
      const screen = document.createElement("div");
      screen.style.cssText =
        "position:fixed;inset:0;z-index:400;background:#000;color:#f8f8f0;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:24px;padding:24px;text-align:center;font-family:'Press Start 2P',monospace;cursor:pointer;";

      const title = document.createElement("h2");
      title.textContent = "YOU BLACKED OUT!";
      title.style.cssText = "font-size:16px;margin:0;color:#ec3750;";

      const message = document.createElement("p");
      message.textContent = `You scurried back to the ${pokemartName}...`;
      message.style.cssText = "font-size:10px;line-height:1.8;margin:0;";

      const hint = document.createElement("p");
      hint.textContent = "Press ENTER or click to continue";
      hint.style.cssText = "font-size:7px;margin:0;color:#a0a0a0;";

      function onKeyDown(e) {
        if (e.repeat || !["Enter", " ", "Escape"].includes(e.key)) return;
        e.preventDefault();
        e.stopPropagation();
        close();
      }

      function close() {
        document.removeEventListener("keydown", onKeyDown, true);
        screen.remove();
        resolve();
      }

      screen.addEventListener("click", close);
      screen.appendChild(title);
      screen.appendChild(message);
      screen.appendChild(hint);
      document.body.appendChild(screen);
      document.addEventListener("keydown", onKeyDown, true);
    });
  }

  function teleportPlayer({ x, y }, direction) {
    playerSprite.body.reset(x, y);
    nameText.setPosition(x, y - 20);
    playerSprite.scene.cameras.main.centerOn(x, y);
    player.direction = direction;
    playerSprite.anims.play(`${gender}-idle-${direction}`, true);
    lastStepChunk = null;
    socket.emit("playerMove", { x, y, direction, moving: false });
    lastSentX = x;
    lastSentY = y;
    lastSentDir = direction;
    lastSentMoving = false;
  }

  // If every party Pokémon has fainted, send the player back to their last Pokémart.
  async function checkBlackout() {
    blackoutOpen = true;
    try {
      const res = await fetch("api/my-pokemon");
      if (!res.ok) return;
      const { party } = await res.json();
      if (!party.length || party.some((pokemon) => pokemon.health > 0)) return;

      const pokemart = respawnPokemart(user.lastPokemartId);
      if (!pokemart) return;
      const screenClosed = showBlackoutScreen(pokemart.name);
      teleportPlayer(buildingDoorstep(pokemart), "down");
      let healed = false;
      try {
        const healRes = await fetch("api/my-pokemon/heal-party", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pokemartId: pokemart.id }),
        });
        healed = healRes.ok;
      } catch (error) {
        console.error("Could not heal party after blackout:", error);
      }
      if (healed) {
        user.lastPokemartId = pokemart.id;
      } else {
        chat.appendMessage({ type: "system", message: "Could not heal your Pokémon." });
      }
      await screenClosed;
    } catch (error) {
      console.error("Could not check for blackout:", error);
    } finally {
      blackoutOpen = false;
    }
  }

  async function tryWildEncounter(x, y) {
    const [areaId, area] = Object.entries(gameData.areas).find(([, { coordinates }]) =>
      x >= coordinates.x.min &&
      x <= coordinates.x.max &&
      y >= coordinates.y.min &&
      y <= coordinates.y.max
    ) || [];
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
        areaId,
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
    preloadBuildingAssets(this);
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
    renderBuildings(this);
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
        if (adminDashboard.isOpen()) adminDashboard.close();
        if (chat.isOpen()) chat.close();
      },
    });

    pokemonMenu = createPokemonMenu({
      user,
      gameData,
      onOpen: () => {
        if (playersMenu.isOpen()) playersMenu.close();
      },
    });

    adminDashboard = createAdminDashboard({
      user,
      gameData,
      onOpen: () => {
        if (pokemonMenu.isOpen()) pokemonMenu.close();
        if (playersMenu.isOpen()) playersMenu.close();
        if (chat.isOpen()) chat.close();
      },
    });

    // An admin deleted this account; reloading returns to the login screen.
    socket.on("forceLogout", () => window.location.reload());

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
      other.direction = data.direction;

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

    // Someone (possibly this player, from the PROFILE tab) switched between Brendan and May.
    socket.on("playerCharacterChanged", ({ id, gender: newGender }) => {
      if (id === socket.id) {
        gender = newGender;
        user.gender = newGender;
        playerSprite.setTexture(gender);
        playerSprite.anims.play(`${gender}-idle-${player.direction}`, true);
      } else if (otherPlayers[id]) {
        const other = otherPlayers[id];
        other.gender = newGender;
        other.sprite.setTexture(newGender);
        other.sprite.anims.play(`${newGender}-idle-${other.direction}`, true);
      }
      playersMenu.refresh();
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
      if (e.key === "Tab" && !adminDashboard.isOpen()) {
        e.preventDefault();
        if (e.repeat) return;
        if (chat.isOpen() || battleOpen || buildingOpen || blackoutOpen) return;
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
        if (adminDashboard.isOpen()) {
          e.preventDefault();
          adminDashboard.close();
          return;
        }
      }

      // The dashboard has its own text/number fields, so only "9" outside them toggles it.
      if (adminDashboard.isOpen()) {
        const typing = ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName);
        if (e.key === "9" && !typing) {
          e.preventDefault();
          adminDashboard.close();
        }
        return;
      }

      if (
        chat.isOpen() ||
        battleOpen ||
        buildingOpen ||
        blackoutOpen ||
        playersMenu.isOpen()
      ) {
        return;
      }

      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        chat.open();
      } else if (e.key === "1") {
        e.preventDefault();
        pokemonMenu.toggle();
      } else if (e.key === "9" && user.admin) {
        e.preventDefault();
        adminDashboard.toggle();
      }
    });

    window.addEventListener("battle:start", () => {
      battleOpen = true;
      if (pokemonMenu.isOpen()) pokemonMenu.close();
      if (playersMenu.isOpen()) playersMenu.close();
      if (adminDashboard.isOpen()) adminDashboard.close();
      if (chat.isOpen()) chat.close();
    });
    window.addEventListener("battle:end", () => {
      battleOpen = false;
      checkBlackout();
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
      adminDashboard.isOpen() ||
      battleOpen ||
      buildingOpen ||
      blackoutOpen ||
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

    // Trigger a building's entrance once each time the player walks into it.
    const building = moving
      ? findBuildingEntrance(footX + Math.sign(vx) * step, footY + Math.sign(vy) * step)
      : null;
    if (building && building !== touchedBuilding) {
      touchedBuilding = building;
      playerSprite.setVelocity(0, 0);
      playerSprite.anims.play(`${gender}-idle-${direction}`, true);
      enterBuilding(building);
      return;
    }
    touchedBuilding = building;

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
