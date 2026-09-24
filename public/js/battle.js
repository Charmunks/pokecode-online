(function () {
  let activeBattle = null;

  function placeholder(label) {
    const safeLabel = String(label || "?");
    const colors = ["#ec3750", "#33d6a6", "#338eda", "#f1c40f", "#a463f2"];
    let hash = 0;
    for (const character of safeLabel) hash = (hash * 31 + character.charCodeAt(0)) | 0;
    const color = colors[Math.abs(hash) % colors.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="${color}"/><text x="64" y="82" font-size="54" font-family="monospace" fill="#fff" text-anchor="middle">${safeLabel.charAt(0).toUpperCase()}</text></svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  function stageMultiplier(stage) {
    return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
  }

  function pokemonStats(species, level) {
    const base = species.stats;
    const scaled = (stat) => Math.floor((base[stat] * 2 * level) / 100) + 5;
    return {
      HP: Math.floor((base.HP * 2 * level) / 100) + level + 10,
      ATTACK: scaled("ATTACK"),
      DEFENSE: scaled("DEFENSE"),
      SPA: scaled("SPA"),
      SPD: scaled("SPD"),
      SPEED: scaled("SPEED"),
    };
  }

  function makeCombatant(data, species, owned) {
    const stats = owned ? pokemonStats(species, data.level) : { ...data.stats };
    const maxHealth = stats.HP;
    return {
      id: data.id || null,
      speciesId: data.species || data.speciesId,
      name: data.nickname || species.name || data.species || data.speciesId,
      level: data.level,
      stats,
      maxHealth,
      health: Math.max(0, Math.min(maxHealth, data.health ?? maxHealth)),
      moves: data.moves.slice(0, 4),
      sprite: owned
        ? species.battleSprite || species.mainSprite
        : species.mainSprite || species.battleSprite,
      status: null,
      stages: { ATTACK: 0, DEFENSE: 0, SPA: 0, SPD: 0, SPEED: 0, ACCURACY: 0, EVASION: 0 },
      leechSeeded: false,
      yawnTurns: 0,
      flinched: false,
      protected: false,
      raging: false,
    };
  }

  function validateOptions(options, pokemonData, movesData) {
    if (!options || !["wild", "trainer"].includes(options.type)) {
      throw new Error('Battle type must be "wild" or "trainer".');
    }
    if (!Array.isArray(options.enemyPokemon) || options.enemyPokemon.length < 1) {
      throw new Error("A battle needs at least one enemy Pokémon.");
    }
    if (options.type === "wild" && options.enemyPokemon.length !== 1) {
      throw new Error("A wild battle must have exactly one enemy Pokémon.");
    }
    if (options.enemyPokemon.length > 6) {
      throw new Error("A trainer can have at most six Pokémon.");
    }
    if (
      options.type === "trainer" &&
      (!options.trainer?.name ||
        !options.trainer?.sprite ||
        typeof options.trainer?.dialogue !== "string" ||
        typeof options.onVictory !== "function")
    ) {
      throw new Error(
        "Trainer battles require trainer name, sprite, dialogue, and an onVictory function."
      );
    }
    options.enemyPokemon.forEach((pokemon) => {
      const speciesId = pokemon?.species;
      if (
        !pokemonData[speciesId] ||
        !Number.isInteger(pokemon.level) ||
        pokemon.level < 1 ||
        pokemon.level > 100 ||
        !pokemon.stats ||
        !["HP", "ATTACK", "DEFENSE", "SPA", "SPD", "SPEED"].every(
          (stat) => Number.isFinite(pokemon.stats[stat]) && pokemon.stats[stat] > 0
        ) ||
        !Array.isArray(pokemon.moves) ||
        pokemon.moves.length < 1 ||
        pokemon.moves.length > 4 ||
        pokemon.moves.some((moveId) => !movesData[moveId])
      ) {
        throw new Error("Each enemy Pokémon needs valid species, level, stats, and 1–4 moves.");
      }
    });
  }

  class Battle {
    constructor(options, data) {
      this.options = options;
      this.species = data.species;
      this.moves = data.moves;
      this.items = data.items;
      this.party = data.party.map((pokemon) =>
        makeCombatant(pokemon, this.species[pokemon.speciesId], true)
      );
      this.inventory = data.inventory.map((item) => ({ ...item }));
      this.enemies = options.enemyPokemon.map((pokemon) =>
        makeCombatant(pokemon, this.species[pokemon.species], false)
      );
      this.playerIndex = this.party.findIndex((pokemon) => pokemon.health > 0);
      this.enemyIndex = 0;
      this.usedItems = new Map();
      this.caughtPokemon = null;
      this.busy = false;
      this.finished = false;
      this.saved = false;
      this.victoryCallbackRun = false;
      this.random = options.random || Math.random;
    }

    get player() { return this.party[this.playerIndex]; }
    get enemy() { return this.enemies[this.enemyIndex]; }

    mount() {
      const overlay = document.createElement("div");
      overlay.id = "battle-overlay";
      overlay.innerHTML = `
        <div class="battle-shell" role="dialog" aria-modal="true" aria-label="Pokémon battle">
          <div class="battle-field">
            <div class="battle-trainer" hidden><img alt=""><div></div></div>
            <div class="battle-combatant enemy"><div class="battle-info"></div><img class="battle-sprite" alt=""></div>
            <div class="battle-combatant player"><img class="battle-sprite" alt=""><div class="battle-info"></div></div>
          </div>
          <div class="battle-bottom"><div class="battle-log" aria-live="polite"></div><div class="battle-controls"></div></div>
        </div>`;
      document.body.appendChild(overlay);
      this.overlay = overlay;
      this.logElement = overlay.querySelector(".battle-log");
      this.controls = overlay.querySelector(".battle-controls");
      if (this.options.type === "trainer") {
        const trainer = overlay.querySelector(".battle-trainer");
        trainer.hidden = false;
        const image = trainer.querySelector("img");
        image.src = this.options.trainer.sprite;
        image.alt = this.options.trainer.name;
        trainer.querySelector("div").textContent = `${this.options.trainer.name}: ${this.options.trainer.dialogue || "Let's battle!"}`;
      }
      window.dispatchEvent(new CustomEvent("battle:start"));
      this.log(
        this.options.type === "wild"
          ? `A wild ${this.enemy.name} appeared!`
          : `${this.options.trainer.name} sent out ${this.enemy.name}!`
      );
      this.log(`Go, ${this.player.name}!`);
      this.render();
      this.showActions();
    }

    log(message) {
      const line = document.createElement("p");
      line.textContent = message;
      this.logElement.appendChild(line);
      while (this.logElement.children.length > 8) this.logElement.firstChild.remove();
      this.logElement.scrollTop = this.logElement.scrollHeight;
    }

    renderCombatant(side, pokemon) {
      const root = this.overlay.querySelector(`.battle-combatant.${side}`);
      const image = root.querySelector("img");
      image.src = pokemon.sprite || "";
      image.alt = pokemon.name;
      image.onerror = () => {
        image.onerror = null;
        image.src = placeholder(pokemon.name);
      };
      const ratio = pokemon.health / pokemon.maxHealth;
      const healthClass = ratio <= 0.2 ? "critical" : ratio <= 0.5 ? "low" : "";
      const info = root.querySelector(".battle-info");
      if (!info.querySelector(".battle-health-fill")) {
        info.innerHTML = `
          <div class="battle-name-line"><span class="battle-pokemon-name"></span><span class="battle-level"></span></div>
          <div class="battle-health-track"><div class="battle-health-fill"></div></div>
          <div class="battle-health-text"></div>
          <div class="battle-status"></div>`;
      }
      info.querySelector(".battle-pokemon-name").textContent = pokemon.name;
      info.querySelector(".battle-level").textContent = `Lv. ${pokemon.level}`;
      const healthFill = info.querySelector(".battle-health-fill");
      healthFill.className = `battle-health-fill ${healthClass}`;
      healthFill.style.width = `${ratio * 100}%`;
      info.querySelector(".battle-health-text").textContent =
        `HP ${pokemon.health}/${pokemon.maxHealth}`;
      info.querySelector(".battle-status").textContent = pokemon.status?.name || "";
    }

    render() {
      this.renderCombatant("player", this.player);
      this.renderCombatant("enemy", this.enemy);
    }

    button(label, action, details, disabled) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "battle-button";
      button.disabled = Boolean(disabled);
      button.textContent = label;
      if (details) {
        const small = document.createElement("small");
        small.textContent = details;
        button.appendChild(small);
      }
      button.addEventListener("click", action);
      return button;
    }

    setControls(buttons, wide) {
      this.controls.innerHTML = "";
      this.controls.classList.toggle("wide", Boolean(wide));
      buttons.forEach((button) => this.controls.appendChild(button));
    }

    showActions() {
      if (this.finished) return;
      const buttons = [
        this.button("ATTACK", () => this.showMoves()),
        this.button("SWITCH", () => this.showSwitch(false)),
      ];
      if (this.options.type === "wild") {
        buttons.splice(1, 0, this.button("BAG", () => this.showBag()));
        buttons.push(this.button("RUN", () => this.run()));
      }
      this.setControls(buttons);
    }

    showMoves() {
      const buttons = this.player.moves.map((moveId) => {
        const move = this.moves[moveId];
        return this.button(move.name, () => this.attackTurn(moveId), `${move.category} · DMG ${move.damage}`);
      });
      buttons.push(this.button("BACK", () => this.showActions()));
      this.setControls(buttons);
    }

    showSwitch(forced) {
      const buttons = this.party.map((pokemon, index) =>
        this.button(
          pokemon.name,
          () => this.switchPokemon(index, forced),
          `Lv. ${pokemon.level} · HP ${pokemon.health}/${pokemon.maxHealth}`,
          pokemon.health <= 0 || index === this.playerIndex
        )
      );
      if (!forced) buttons.push(this.button("BACK", () => this.showActions()));
      this.setControls(buttons, true);
      if (forced) this.log("Choose a Pokémon to continue!");
    }

    showBag() {
      const usable = this.inventory.filter(
        (owned) => owned.quantity > 0 && this.items[owned.itemId]?.battleUsable
      );
      const buttons = usable.map((owned) => {
        const item = this.items[owned.itemId];
        return this.button(item.name, () => this.chooseItem(owned.itemId), `×${owned.quantity} · ${item.description}`);
      });
      if (!buttons.length) buttons.push(this.button("Your bag has no battle items", () => {}, "", true));
      buttons.push(this.button("BACK", () => this.showActions()));
      this.setControls(buttons, true);
    }

    chooseItem(itemId) {
      if (["potion", "antidote"].includes(itemId)) {
        const buttons = this.party.map((pokemon) =>
          this.button(
            pokemon.name,
            () => this.itemTurn(itemId, pokemon),
            `HP ${pokemon.health}/${pokemon.maxHealth}${pokemon.status ? ` · ${pokemon.status.name}` : ""}`,
            pokemon.health <= 0
          )
        );
        buttons.push(this.button("BACK", () => this.showBag()));
        this.setControls(buttons, true);
        return;
      }
      this.itemTurn(itemId, null);
    }

    adjustedStat(pokemon, stat) {
      let value = pokemon.stats[stat] * stageMultiplier(pokemon.stages[stat] || 0);
      if (stat === "SPEED" && pokemon.status?.name === "paralyzed") value *= 0.5;
      return value;
    }

    predictedDamage(attacker, defender, moveId) {
      const move = this.moves[moveId];
      if (!move || move.category === "Status" || move.damage <= 0) return 0;
      const attackStat = move.category === "Physical" ? "ATTACK" : "SPA";
      const defenseStat = move.category === "Physical" ? "DEFENSE" : "SPD";
      return Math.max(
        1,
        Math.floor(
          ((this.adjustedStat(attacker, attackStat) /  this.adjustedStat(defender, defenseStat))*
            move.damage * ((2 * attacker.level / 5) + 2)) / 50 + 2
        )
      );
    }

    enemyMove() {
      const weighted = this.enemy.moves.map((moveId) => {
        const damage = this.predictedDamage(this.enemy, this.player, moveId);
        return { moveId, weight: damage > 0 ? damage * damage : 1 };
      });
      const total = weighted.reduce((sum, choice) => sum + choice.weight, 0);
      let roll = this.random() * total;
      for (const choice of weighted) {
        roll -= choice.weight;
        if (roll <= 0) return choice.moveId;
      }
      return weighted[weighted.length - 1].moveId;
    }

    canAct(pokemon, moveId) {
      if (pokemon.flinched) {
        pokemon.flinched = false;
        this.log(`${pokemon.name} flinched and could not move!`);
        return false;
      }
      if (pokemon.status?.name === "asleep" && moveId !== "snore") {
        pokemon.status.turns -= 1;
        this.log(`${pokemon.name} is fast asleep.`);
        if (pokemon.status.turns <= 0) {
          pokemon.status = null;
          this.log(`${pokemon.name} woke up!`);
        }
        return false;
      }
      if (pokemon.status?.name === "paralyzed" && this.random() < 0.25) {
        this.log(`${pokemon.name} is paralyzed and cannot move!`);
        return false;
      }
      return true;
    }

    wait(milliseconds) {
      return new Promise((resolve) => setTimeout(resolve, milliseconds));
    }

    animateAttack(attacker) {
      const side = this.party.includes(attacker) ? "player" : "enemy";
      const combatant = this.overlay.querySelector(`.battle-combatant.${side}`);
      combatant.classList.remove("battle-attacking");
      void combatant.offsetWidth;
      combatant.classList.add("battle-attacking");
      return new Promise((resolve) => {
        let complete = false;
        const finish = () => {
          if (complete) return;
          complete = true;
          combatant.classList.remove("battle-attacking");
          resolve();
        };
        combatant.addEventListener("animationend", finish, { once: true });
        setTimeout(finish, 500);
      });
    }

    async executeMove(attacker, defender, moveId) {
      const snoringWhileAsleep =
        moveId === "snore" && attacker.status?.name === "asleep";
      if (attacker.health <= 0 || !this.canAct(attacker, moveId)) return;
      const move = this.moves[moveId];
      this.log(`${attacker.name} used ${move.name}!`);
      await this.animateAttack(attacker);
      const accuracy = Math.max(
        0.33,
        Math.min(1, stageMultiplier(attacker.stages.ACCURACY) / stageMultiplier(defender.stages.EVASION))
      );
      if (this.random() > accuracy) {
        this.log(`${attacker.name}'s attack missed!`);
        return;
      }

      const effect = move.secondaryEffect ? window.BattleMoveEffects[moveId] : null;
      const context = {
        phase: "before",
        attacker,
        defender,
        move,
        damage: 0,
        damageMultiplier: 1,
        critical: false,
        preventMove: false,
        random: this.random,
        log: (message) => this.log(message),
      };
      if (effect) effect(context);
      if (context.preventMove) return;
      if (defender.protected && moveId !== "protect") {
        this.log(`${defender.name} protected itself!`);
        return;
      }

      const previousAttackerHealth = attacker.health;
      const previousDefenderHealth = defender.health;
      if (move.damage > 0 && move.category !== "Status") {
        context.damage = Math.max(
          1,
          Math.floor(this.predictedDamage(attacker, defender, moveId) * context.damageMultiplier)
        );
        defender.health = Math.max(0, defender.health - context.damage);
        this.log(`${defender.name} took ${context.damage} damage!`);
        if (context.critical) this.log("A critical hit!");
        if (defender.raging && defender.health > 0) {
          defender.stages.ATTACK = Math.min(6, defender.stages.ATTACK + 1);
          this.log(`${defender.name}'s rage raised its ATTACK!`);
        }
      }
      context.phase = "after";
      if (effect && defender.health > 0) effect(context);
      if (snoringWhileAsleep) {
        attacker.status.turns -= 1;
        if (attacker.status.turns <= 0) {
          attacker.status = null;
          this.log(`${attacker.name} woke up!`);
        }
      }
      this.render();
      if (
        attacker.health !== previousAttackerHealth ||
        defender.health !== previousDefenderHealth
      ) {
        await this.wait(700);
      }
    }

    beginTurn() {
      this.player.protected = false;
      this.enemy.protected = false;
      this.player.flinched = false;
      this.enemy.flinched = false;
    }

    async attackTurn(playerMoveId) {
      if (this.busy) return;
      this.busy = true;
      this.setControls([], false);
      this.beginTurn();
      const enemyMoveId = this.enemyMove();
      const playerSpeed = this.adjustedStat(this.player, "SPEED");
      const enemySpeed = this.adjustedStat(this.enemy, "SPEED");
      const playerPriority = window.BattleMoveEffects[playerMoveId]?.priority === true;
      const enemyPriority = window.BattleMoveEffects[enemyMoveId]?.priority === true;
      const playerFirst = playerPriority !== enemyPriority
        ? playerPriority
        : playerSpeed === enemySpeed
          ? this.random() < 0.5
          : playerSpeed > enemySpeed;
      const actions = playerFirst
        ? [[this.player, this.enemy, playerMoveId], [this.enemy, this.player, enemyMoveId]]
        : [[this.enemy, this.player, enemyMoveId], [this.player, this.enemy, playerMoveId]];
      for (const action of actions) {
        if (action[0].health > 0 && action[1].health > 0) await this.executeMove(...action);
      }
      await this.finishTurn();
    }

    async enemyResponse() {
      if (this.enemy.health > 0 && this.player.health > 0) {
        await this.executeMove(this.enemy, this.player, this.enemyMove());
      }
      await this.finishTurn();
    }

    endTurnEffect(pokemon, opponent) {
      if (pokemon.health <= 0) return;
      if (["poisoned", "burned"].includes(pokemon.status?.name)) {
        const damage = Math.max(1, Math.floor(pokemon.maxHealth / 8));
        pokemon.health = Math.max(0, pokemon.health - damage);
        this.log(`${pokemon.name} was hurt by being ${pokemon.status.name}!`);
      }
      if (pokemon.leechSeeded && pokemon.health > 0) {
        const damage = Math.max(1, Math.floor(pokemon.maxHealth / 8));
        const dealt = Math.min(damage, pokemon.health);
        pokemon.health -= dealt;
        opponent.health = Math.min(opponent.maxHealth, opponent.health + dealt);
        this.log(`Leech Seed drained ${dealt} HP from ${pokemon.name}!`);
      }
      if (pokemon.yawnTurns > 0) {
        pokemon.yawnTurns -= 1;
        if (pokemon.yawnTurns === 0 && !pokemon.status) {
          pokemon.status = { name: "asleep", turns: 2 };
          this.log(`${pokemon.name} fell asleep!`);
        }
      }
    }

    async finishTurn() {
      const previousPlayerHealth = this.player.health;
      const previousEnemyHealth = this.enemy.health;
      this.endTurnEffect(this.player, this.enemy);
      this.endTurnEffect(this.enemy, this.player);
      this.render();
      if (
        this.player.health !== previousPlayerHealth ||
        this.enemy.health !== previousEnemyHealth
      ) {
        await this.wait(700);
      }
      if (this.enemy.health <= 0) {
        this.log(`${this.enemy.name} fainted!`);
        const nextEnemy = this.enemies.findIndex(
          (pokemon, index) => index > this.enemyIndex && pokemon.health > 0
        );
        if (nextEnemy === -1) {
          await this.finish("victory", "YOU WON!");
          return;
        }
        this.enemyIndex = nextEnemy;
        this.log(`${this.options.trainer.name} sent out ${this.enemy.name}!`);
        this.render();
      }
      if (this.player.health <= 0) {
        this.log(`${this.player.name} fainted!`);
        if (!this.party.some((pokemon) => pokemon.health > 0)) {
          await this.finish("defeat", "ALL YOUR POKÉMON FAINTED");
          return;
        }
        this.busy = false;
        this.showSwitch(true);
        return;
      }
      this.busy = false;
      this.showActions();
    }

    async switchPokemon(index, forced) {
      if (this.busy || index === this.playerIndex || this.party[index].health <= 0) return;
      this.busy = true;
      this.setControls([], false);
      this.playerIndex = index;
      this.log(`Go, ${this.player.name}!`);
      this.render();
      if (forced) {
        this.busy = false;
        this.showActions();
      } else {
        this.beginTurn();
        await this.enemyResponse();
      }
    }

    async itemTurn(itemId, target) {
      if (this.busy) return;
      const owned = this.inventory.find((item) => item.itemId === itemId);
      const effect = window.BattleItemEffects[itemId];
      if (!owned || owned.quantity <= 0 || !effect) return;
      this.busy = true;
      this.setControls([], false);
      this.beginTurn();
      const previousTargetHealth = target?.health;
      const result = effect({
        type: this.options.type,
        target,
        player: this.player,
        enemy: this.enemy,
        random: this.random,
      });
      this.log(result.message);
      if (!result.used) {
        this.busy = false;
        this.showBag();
        return;
      }
      owned.quantity -= 1;
      this.usedItems.set(itemId, (this.usedItems.get(itemId) || 0) + 1);
      this.render();
      if (target && target.health !== previousTargetHealth) {
        await this.wait(700);
      }
      if (result.caught) {
        this.showCatchDestination();
        return;
      }
      await this.enemyResponse();
    }

    showCatchDestination() {
      const catchData = {
        speciesId: this.enemy.speciesId,
        level: this.enemy.level,
        health: Math.min(
          this.enemy.health,
          pokemonStats(this.species[this.enemy.speciesId], this.enemy.level).HP
        ),
        moves: this.enemy.moves,
      };
      const buttons = [];
      if (this.party.length < 6) {
        buttons.push(this.button("SEND TO PARTY", () => this.completeCatch(catchData, "party")));
      }
      buttons.push(this.button("SEND TO BOX", () => this.completeCatch(catchData, "box")));
      this.setControls(buttons, true);
    }

    async completeCatch(catchData, destination) {
      this.caughtPokemon = { ...catchData, destination };
      await this.finish("caught", `${this.enemy.name.toUpperCase()} WAS CAUGHT!`);
    }

    async run() {
      if (this.busy || this.options.type !== "wild") return;
      this.log("You got away safely!");
      await this.finish("ran", "GOT AWAY SAFELY");
    }

    async save() {
      const response = await fetch("api/battle/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          health: this.party.map((pokemon) => ({ id: pokemon.id, health: pokemon.health })),
          usedItems: Array.from(this.usedItems, ([itemId, quantity]) => ({ itemId, quantity })),
          caughtPokemon: this.caughtPokemon,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save battle results.");
    }

    async finish(result, title) {
      if (this.finished) return;
      this.finished = true;
      this.busy = true;
      this.log(title);
      const resultScreen = document.createElement("div");
      resultScreen.className = "battle-result";
      resultScreen.textContent = title;
      this.overlay.querySelector(".battle-field").appendChild(resultScreen);
      const continueButton = this.button("CONTINUE", async () => {
        continueButton.disabled = true;
        try {
          if (!this.saved) {
            await this.save();
            this.saved = true;
          }
          if (
            result === "victory" &&
            typeof this.options.onVictory === "function" &&
            !this.victoryCallbackRun
          ) {
            this.victoryCallbackRun = true;
            await this.options.onVictory();
          }
          this.close();
        } catch (error) {
          this.log(error.message);
          continueButton.disabled = false;
        }
      });
      continueButton.classList.add("primary");
      this.setControls([continueButton], true);
    }

    close() {
      this.overlay.remove();
      activeBattle = null;
      window.dispatchEvent(new CustomEvent("battle:end"));
    }
  }

  async function startBattle(options) {
    if (activeBattle) throw new Error("A battle is already in progress.");
    const [pokemonResponse, movesResponse, itemsResponse, partyResponse, inventoryResponse] =
      await Promise.all([
        fetch("data/pokemon.json"),
        fetch("data/moves.json"),
        fetch("data/items.json"),
        fetch("api/my-pokemon"),
        fetch("api/my-items"),
      ]);
    if (![pokemonResponse, movesResponse, itemsResponse, partyResponse, inventoryResponse].every((r) => r.ok)) {
      throw new Error("Could not load battle data.");
    }
    const [species, moves, items, pokemon, inventory] = await Promise.all([
      pokemonResponse.json(),
      movesResponse.json(),
      itemsResponse.json(),
      partyResponse.json(),
      inventoryResponse.json(),
    ]);
    validateOptions(options, species, moves);
    const livingParty = pokemon.party.filter((owned) => owned.health > 0);
    if (!livingParty.length) throw new Error("You do not have a healthy Pokémon to battle with.");
    const invalidParty = pokemon.party.some(
      (owned) => !species[owned.speciesId] || !Array.isArray(owned.moves) || owned.moves.some((id) => !moves[id])
    );
    if (invalidParty) throw new Error("Your party contains invalid Pokémon or move data.");

    activeBattle = new Battle(options, {
      species,
      moves,
      items,
      party: pokemon.party,
      inventory: inventory.items,
    });
    activeBattle.mount();
    return activeBattle;
  }

  window.startBattle = startBattle;
})();
