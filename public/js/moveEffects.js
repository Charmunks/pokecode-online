(function () {
  const statKeys = {
    attack: "ATTACK",
    defense: "DEFENSE",
    "special-attack": "SPA",
    "special-defense": "SPD",
    speed: "SPEED",
    accuracy: "ACCURACY",
    evasion: "EVASION",
  };

  const fixedDamage = {
    "dragon-rage": 40,
    "sonic-boom": 20,
  };
  const levelDamage = new Set(["night-shade", "seismic-toss"]);
  const oneHitKnockouts = new Set(["fissure", "guillotine", "horn-drill", "sheer-cold"]);
  const chargingMoves = new Set(["bounce", "dig", "skull-bash", "sky-attack", "solar-beam"]);
  const selfDestructMoves = new Set(["explosion", "self-destruct"]);
  const highCriticalMoves = new Set([
    "air-cutter", "crabhammer", "cross-chop", "karate-chop", "razor-leaf", "slash",
  ]);
  const rampageMoves = new Set(["outrage", "petal-dance", "thrash", "uproar"]);

  function chance(context, percentage) {
    return context.random() * 100 < percentage;
  }

  function stage(context, target, stat, amount) {
    const before = target.stages[stat] || 0;
    target.stages[stat] = Math.max(-6, Math.min(6, before + amount));
    if (target.stages[stat] === before) {
      context.log(`${target.name}'s ${stat} cannot change further!`);
      return;
    }
    context.log(`${target.name}'s ${stat} ${amount > 0 ? "rose" : "fell"}!`);
  }

  function status(context, target, condition, turns) {
    if (
      condition === "asleep" &&
      [context.attacker, context.defender].some((pokemon) => pokemon.lockedMove === "uproar")
    ) {
      context.log(`${target.name} stayed awake because of the uproar!`);
      return;
    }
    if (target.safeguardTurns > 0) {
      context.log(`${target.name} is protected by Safeguard!`);
      return;
    }
    if (target.status) {
      context.log(`${target.name} is already affected by ${target.status.name}!`);
      return;
    }
    target.status = { name: condition, turns: turns || null };
    context.log(`${target.name} is now ${condition}!`);
  }

  function heal(context, target, amount) {
    const healed = Math.min(amount, target.maxHealth - target.health);
    target.health += healed;
    context.log(healed > 0 ? `${target.name} restored ${healed} HP!` : `${target.name}'s HP is full!`);
  }

  function prepareCharge(context) {
    if (!chargingMoves.has(context.moveId) || context.phase !== "before") return false;
    if (context.attacker.chargingMove === context.moveId) {
      context.attacker.chargingMove = null;
      context.attacker.invulnerable = false;
      return false;
    }
    context.attacker.chargingMove = context.moveId;
    context.attacker.invulnerable = ["bounce", "dig"].includes(context.moveId);
    if (context.moveId === "skull-bash") stage(context, context.attacker, "DEFENSE", 1);
    context.preventMove = true;
    context.log(`${context.attacker.name} began charging ${context.move.name}!`);
    return true;
  }

  function applyBefore(context) {
    const { attacker, defender, move, moveId } = context;
    if (prepareCharge(context)) return;

    if (attacker.disabledMove === moveId) {
      context.preventMove = true;
      context.log(`${attacker.name}'s ${move.name} is disabled!`);
      return;
    }
    if (moveId === "snore" && attacker.status?.name !== "asleep") {
      context.preventMove = true;
      context.log(`${attacker.name} can only use Snore while asleep!`);
      return;
    }
    if (moveId === "dream-eater" && defender.status?.name !== "asleep") {
      context.preventMove = true;
      context.log("Dream Eater only works on a sleeping target!");
      return;
    }
    if (moveId === "fake-out" && !context.firstTurn) {
      context.preventMove = true;
      context.log("Fake Out only works on the user's first turn in battle!");
      return;
    }

    if (fixedDamage[moveId]) context.fixedDamage = fixedDamage[moveId];
    if (levelDamage.has(moveId)) context.fixedDamage = attacker.level;
    if (oneHitKnockouts.has(moveId)) {
      if (attacker.level < defender.level) {
        context.preventMove = true;
        context.log("It failed!");
      } else {
        context.accuracy = Math.min(100, 30 + attacker.level - defender.level);
        context.fixedDamage = defender.health;
      }
    }
    if (moveId === "super-fang") context.fixedDamage = Math.max(1, Math.floor(defender.health / 2));
    if (moveId === "endeavor") {
      if (attacker.health >= defender.health) {
        context.preventMove = true;
        context.log("It failed!");
      } else {
        context.fixedDamage = defender.health - attacker.health;
      }
    }
    if (moveId === "counter" || moveId === "mirror-coat") {
      const expectedCategory = moveId === "counter" ? "Physical" : "Special";
      if (!attacker.lastDamage || attacker.lastDamageCategory !== expectedCategory) {
        context.preventMove = true;
        context.log("It failed!");
      } else {
        context.fixedDamage = attacker.lastDamage * 2;
      }
    }
    if (["flail", "reversal"].includes(moveId)) {
      const ratio = attacker.health / attacker.maxHealth;
      context.power = ratio <= 1 / 48 ? 200 : ratio <= 1 / 5 ? 100 : ratio <= 1 / 3 ? 80 : ratio <= 7 / 20 ? 40 : 20;
    }
    if (moveId === "low-kick") context.power = 60;
    if (moveId === "revenge" && attacker.lastDamage > 0) context.power *= 2;
    if (moveId === "brick-break") {
      defender.reflectTurns = 0;
      defender.lightScreenTurns = 0;
    }
    if (moveId === "magnitude") {
      const roll = context.random();
      const magnitude = roll < 0.05 ? 4 : roll < 0.15 ? 5 : roll < 0.35 ? 6 : roll < 0.65 ? 7 : roll < 0.85 ? 8 : roll < 0.95 ? 9 : 10;
      context.power = [0, 0, 0, 0, 10, 30, 50, 70, 90, 110, 150][magnitude];
      context.log(`Magnitude ${magnitude}!`);
    }
    if (moveId === "spit-up") {
      if (!attacker.stockpile) {
        context.preventMove = true;
        context.log("But nothing was stockpiled!");
      } else {
        context.power = attacker.stockpile * 100;
      }
    }
    if (["fury-cutter", "rollout"].includes(moveId)) {
      context.power = move.damage * (2 ** Math.min(attacker.consecutiveCount || 0, 4));
    }
    if (moveId === "false-swipe") context.leaveAtOne = true;
    if (moveId === "protect" || moveId === "detect") {
      attacker.protected = true;
      context.preventMove = true;
      context.log(`${attacker.name} protected itself!`);
    }
    if (moveId === "endure") {
      attacker.enduring = true;
      context.preventMove = true;
      context.log(`${attacker.name} braced itself!`);
    }
    if (moveId === "focus-energy") {
      attacker.focusEnergy = true;
      context.preventDamage = true;
    }
    if (highCriticalMoves.has(moveId) || move.critRate > 0 || attacker.focusEnergy) {
      const criticalChance = Math.min(100, 12.5 * (1 + (move.critRate || 0) + (attacker.focusEnergy ? 1 : 0)));
      if (chance(context, criticalChance)) {
        context.damageMultiplier *= 2;
        context.critical = true;
      }
    }
    if (attacker.charged && move.type === "Electric") {
      context.damageMultiplier *= 2;
      attacker.charged = false;
    }
    if (attacker.waterSportTurns > 0 && move.type === "Fire") context.damageMultiplier *= 0.5;
    if (attacker.mudSportTurns > 0 && move.type === "Electric") context.damageMultiplier *= 0.5;
  }

  function applyAilment(context) {
    const { attacker, defender, move } = context;
    if (
      defender.health <= 0 ||
      defender.substituteHealth > 0 ||
      context.hitSubstitute ||
      rampageMoves.has(context.moveId)
    ) return;
    const percentage = move.ailmentChance || (move.category === "Status" ? 100 : 0);
    if (!percentage || !chance(context, percentage)) return;
    const turns = move.ailment === "sleep" ? 2 + Math.floor(context.random() * 2) : null;
    const names = {
      burn: "burned",
      freeze: "frozen",
      paralysis: "paralyzed",
      poison: "poisoned",
      sleep: "asleep",
    };
    if (names[move.ailment]) status(context, defender, names[move.ailment], turns);
    if (move.ailment === "unknown" && context.moveId === "tri-attack") {
      const conditions = ["burned", "frozen", "paralyzed"];
      status(context, defender, conditions[Math.floor(context.random() * conditions.length)]);
    }
    if (move.ailment === "confusion") {
      defender.confusionTurns = 2 + Math.floor(context.random() * 4);
      context.log(`${defender.name} became confused!`);
    }
    if (move.ailment === "trap") {
      defender.trappedTurns = 4 + Math.floor(context.random() * 2);
      defender.trapSource = attacker;
      context.log(`${defender.name} was trapped!`);
    }
    if (move.ailment === "leech-seed") {
      defender.leechSeeded = true;
      context.log(`${defender.name} was seeded!`);
    }
    if (move.ailment === "yawn" && !defender.status) {
      defender.yawnTurns = 2;
      context.log(`${defender.name} grew drowsy!`);
    }
    if (move.ailment === "perish-song") {
      attacker.perishTurns = 3;
      defender.perishTurns = 3;
      context.log("Both Pokémon heard the perish song!");
    }
  }

  function applyStats(context) {
    const { attacker, defender, move } = context;
    if (defender.health <= 0 || context.hitSubstitute || context.moveId === "belly-drum") return;
    if (!move.statChanges?.length) return;
    const percentage = move.statChance || (move.category === "Status" ? 100 : 0);
    if (!percentage || !chance(context, percentage)) return;
    const target = move.target.includes("user") ? attacker : defender;
    if (target.mistTurns > 0 && target === defender && move.statChanges.some(({ stages }) => stages < 0)) {
      context.log(`${target.name} is protected by Mist!`);
      return;
    }
    move.statChanges.forEach(({ stat, stages }) => {
      if (statKeys[stat]) stage(context, target, statKeys[stat], stages);
    });
  }

  function applySpecialAfter(context) {
    const { attacker, defender, moveId } = context;
    if (moveId === "belly-drum") {
      const cost = Math.floor(attacker.maxHealth / 2);
      if (attacker.health <= cost) context.log(`${attacker.name} does not have enough HP!`);
      else {
        attacker.health -= cost;
        attacker.stages.ATTACK = 6;
        context.log(`${attacker.name} maximized its ATTACK!`);
      }
    }
    if (moveId === "rest") {
      attacker.health = attacker.maxHealth;
      attacker.status = { name: "asleep", turns: 2 };
      context.log(`${attacker.name} slept and restored its HP!`);
    }
    if (moveId === "stockpile") {
      if (attacker.stockpile >= 3) context.log(`${attacker.name} cannot stockpile any more!`);
      else {
        attacker.stockpile += 1;
        context.log(`${attacker.name} stockpiled ${attacker.stockpile}!`);
      }
    }
    if (moveId === "spit-up" && context.damage > 0) attacker.stockpile = 0;
    if (moveId === "swallow") {
      if (!attacker.stockpile) context.log("But nothing was stockpiled!");
      else {
        const fractions = [0, 0.25, 0.5, 1];
        heal(context, attacker, Math.floor(attacker.maxHealth * fractions[attacker.stockpile]));
        attacker.stockpile = 0;
      }
    }
    if (moveId === "haze") {
      [attacker, defender].forEach((pokemon) => Object.keys(pokemon.stages).forEach((stat) => { pokemon.stages[stat] = 0; }));
      context.log("All stat changes were eliminated!");
    }
    if (moveId === "psych-up") {
      attacker.stages = { ...defender.stages };
      context.log(`${attacker.name} copied the target's stat changes!`);
    }
    if (["aromatherapy", "refresh"].includes(moveId)) {
      attacker.status = null;
      context.log(`${attacker.name} was cured of its status condition!`);
    }
    if (moveId === "charge") {
      attacker.charged = true;
      context.log(`${attacker.name} began charging power!`);
    }
    if (rampageMoves.has(moveId) && !attacker.lockedMove) {
      attacker.lockedMove = moveId;
      attacker.lockedTurns = 2 + Math.floor(context.random() * 2);
    }
    if (moveId === "rollout" && !attacker.lockedMove) {
      attacker.lockedMove = moveId;
      attacker.lockedTurns = 5;
    }
    if (moveId === "hyper-beam") attacker.rechargeTurns = 1;
    if (moveId === "rage") attacker.raging = true;
    if (moveId === "rapid-spin") {
      attacker.leechSeeded = false;
      attacker.trappedTurns = 0;
      attacker.spiked = false;
      context.log(`${attacker.name} shook off binding effects!`);
    }
    if (["block", "mean-look"].includes(moveId)) {
      defender.cannotSwitch = true;
      context.log(`${defender.name} can no longer escape!`);
    }
    if (moveId === "disable") {
      if (!defender.lastMove) context.log("It failed!");
      else {
        defender.disabledMove = defender.lastMove;
        defender.disableTurns = 4;
        context.log(`${defender.name}'s last move was disabled!`);
      }
    }
    if (moveId === "encore") {
      if (!defender.lastMove) context.log("It failed!");
      else {
        defender.encoredMove = defender.lastMove;
        defender.encoreTurns = 3;
        context.log(`${defender.name} received an encore!`);
      }
    }
    if (moveId === "ingrain") {
      attacker.ingrained = true;
      context.log(`${attacker.name} planted its roots!`);
    }
    if (moveId === "light-screen") attacker.lightScreenTurns = 5;
    if (moveId === "reflect") attacker.reflectTurns = 5;
    if (moveId === "safeguard") attacker.safeguardTurns = 5;
    if (moveId === "mist") attacker.mistTurns = 5;
    if (moveId === "spikes") {
      defender.spiked = true;
      context.log("Spikes were scattered around the opposing side!");
    }
    if (moveId === "water-sport") {
      attacker.waterSportTurns = 5;
      defender.waterSportTurns = 5;
    }
    if (moveId === "mud-sport") {
      attacker.mudSportTurns = 5;
      defender.mudSportTurns = 5;
    }
    if (moveId === "substitute") {
      const cost = Math.floor(attacker.maxHealth / 4);
      if (attacker.substituteHealth > 0 || attacker.health <= cost) context.log("It failed!");
      else {
        attacker.health -= cost;
        attacker.substituteHealth = cost;
        context.log(`${attacker.name} made a substitute!`);
      }
    }
    if (moveId === "transform") {
      context.log(`${attacker.name} transformed into ${defender.name}!`);
      attacker.stats = { ...defender.stats };
      attacker.stages = { ...defender.stages };
      attacker.moves = defender.moves.slice();
      attacker.name = defender.name;
      attacker.sprite = defender.sprite;
    }
    if (moveId === "memento") attacker.health = 0;
    if (selfDestructMoves.has(moveId)) attacker.health = 0;
    if (moveId === "destiny-bond") attacker.destinyBond = true;
    if (["lock-on", "mind-reader"].includes(moveId)) {
      attacker.lockedOnTarget = defender;
      context.log(`${attacker.name} took aim at ${defender.name}!`);
    }
    if (moveId === "imprison") {
      defender.imprisonedMoves = attacker.moves.slice();
      context.log(`${defender.name} can no longer use moves known by ${attacker.name}!`);
    }
    if (moveId === "mimic") {
      if (!defender.lastMove) context.log("It failed!");
      else {
        const index = attacker.moves.indexOf("mimic");
        if (index !== -1) attacker.moves[index] = defender.lastMove;
        context.log(`${attacker.name} learned ${defender.lastMove} for this battle!`);
      }
    }
    if (moveId === "teleport") context.escape();
    if (["roar", "whirlwind"].includes(moveId)) context.forceSwitch(defender);
    if (moveId === "baton-pass") context.forceSwitch(attacker, true);
    if (moveId === "splash") context.log("But nothing happened!");
    if (["follow-me", "helping-hand"].includes(moveId)) {
      context.log("But there was no ally to help in this one-on-one battle!");
    }
    if (["camouflage", "conversion", "conversion-2", "role-play"].includes(moveId)) {
      context.log("But it had no effect in this battle format!");
    }
    if (["grudge", "recycle", "spite", "trick"].includes(moveId)) {
      context.log("But it had no effect because held items and move PP are not tracked in battle!");
    }
  }

  function applyAfter(context) {
    const { attacker, defender, move } = context;
    applyAilment(context);
    applyStats(context);

    if (move.flinchChance > 0 && chance(context, move.flinchChance)) defender.flinched = true;
    if (move.healing > 0 && !["rest", "swallow"].includes(context.moveId)) {
      heal(context, attacker, Math.max(1, Math.floor(attacker.maxHealth * move.healing / 100)));
    }
    if (move.drain > 0 && context.damage > 0) {
      heal(context, attacker, Math.max(1, Math.floor(context.damage * move.drain / 100)));
    }
    if (move.drain < 0 && context.damage > 0) {
      const recoil = Math.max(1, Math.floor(context.damage * Math.abs(move.drain) / 100));
      attacker.health = Math.max(0, attacker.health - recoil);
      context.log(`${attacker.name} took ${recoil} recoil damage!`);
    }
    applySpecialAfter(context);
  }

  function apply(context) {
    if (context.phase === "before") applyBefore(context);
    else applyAfter(context);
  }

  window.BattleMoveEffects = { apply };
})();
