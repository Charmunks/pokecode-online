(function () {
  function chance(context, probability) {
    return context.random() < probability;
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
    if (target.status) {
      context.log(`${target.name} is already affected by ${target.status.name}!`);
      return;
    }
    target.status = { name: condition, turns: turns || null };
    context.log(`${target.name} is now ${condition}!`);
  }

  const effects = {
    growl(context) {
      if (context.phase === "after") stage(context, context.defender, "ATTACK", -1);
    },
    "leech-seed"(context) {
      if (context.phase !== "after") return;
      context.defender.leechSeeded = true;
      context.log(`${context.defender.name} was seeded!`);
    },
    "poison-powder"(context) {
      if (context.phase === "after") status(context, context.defender, "poisoned");
    },
    "sleep-powder"(context) {
      if (context.phase === "after") status(context, context.defender, "asleep", 2);
    },
    "razor-leaf"(context) {
      if (context.phase === "before" && chance(context, 0.25)) {
        context.damageMultiplier *= 2;
        context.critical = true;
      }
    },
    growth(context) {
      if (context.phase !== "after") return;
      stage(context, context.attacker, "ATTACK", 1);
      stage(context, context.attacker, "SPA", 1);
    },
    ember(context) {
      if (context.phase === "after" && chance(context, 0.1)) {
        status(context, context.defender, "burned");
      }
    },
    smokescreen(context) {
      if (context.phase === "after") stage(context, context.defender, "ACCURACY", -1);
    },
    rage(context) {
      if (context.phase === "after") context.attacker.raging = true;
    },
    "scary-face"(context) {
      if (context.phase === "after") stage(context, context.defender, "SPEED", -2);
    },
    slash(context) {
      if (context.phase === "before" && chance(context, 0.25)) {
        context.damageMultiplier *= 2;
        context.critical = true;
      }
    },
    flamethrower(context) {
      if (context.phase === "after" && chance(context, 0.1)) {
        status(context, context.defender, "burned");
      }
    },
    "tail-whip"(context) {
      if (context.phase === "after") stage(context, context.defender, "DEFENSE", -1);
    },
    bubble(context) {
      if (context.phase === "after" && chance(context, 0.1)) {
        stage(context, context.defender, "SPEED", -1);
      }
    },
    withdraw(context) {
      if (context.phase === "after") stage(context, context.attacker, "DEFENSE", 1);
    },
    bite(context) {
      if (context.phase === "after" && chance(context, 0.3)) {
        context.defender.flinched = true;
      }
    },
    "rapid-spin"(context) {
      if (context.phase !== "after") return;
      context.attacker.leechSeeded = false;
      context.log(`${context.attacker.name} shook off binding effects!`);
    },
    protect(context) {
      if (context.phase !== "before") return;
      context.attacker.protected = true;
      context.log(`${context.attacker.name} protected itself!`);
    },
    "thunder-shock"(context) {
      if (context.phase === "after" && chance(context, 0.1)) {
        status(context, context.defender, "paralyzed");
      }
    },
    "thunder-wave"(context) {
      if (context.phase === "after") status(context, context.defender, "paralyzed");
    },
    "quick-attack": Object.assign(() => {}, { priority: true }),
    "double-team"(context) {
      if (context.phase === "after") stage(context, context.attacker, "EVASION", 1);
    },
    "helping-hand"(context) {
      if (context.phase === "after") context.log("But there was no ally to help!");
    },
    "sand-attack"(context) {
      if (context.phase === "after") stage(context, context.defender, "ACCURACY", -1);
    },
    "take-down"(context) {
      if (context.phase !== "after" || !context.damage) return;
      const recoil = Math.max(1, Math.floor(context.damage / 4));
      context.attacker.health = Math.max(0, context.attacker.health - recoil);
      context.log(`${context.attacker.name} took ${recoil} recoil damage!`);
    },
    amnesia(context) {
      if (context.phase === "after") stage(context, context.attacker, "SPD", 2);
    },
    "defense-curl"(context) {
      if (context.phase === "after") stage(context, context.attacker, "DEFENSE", 1);
    },
    "belly-drum"(context) {
      if (context.phase !== "after") return;
      const cost = Math.floor(context.attacker.maxHealth / 2);
      if (context.attacker.health <= cost) {
        context.log(`${context.attacker.name} does not have enough HP!`);
        return;
      }
      context.attacker.health -= cost;
      context.attacker.stages.ATTACK = 6;
      context.log(`${context.attacker.name} maximized its ATTACK!`);
    },
    yawn(context) {
      if (context.phase !== "after" || context.defender.status) return;
      context.defender.yawnTurns = 2;
      context.log(`${context.defender.name} grew drowsy!`);
    },
    rest(context) {
      if (context.phase !== "after") return;
      context.attacker.health = context.attacker.maxHealth;
      context.attacker.status = { name: "asleep", turns: 2 };
      context.log(`${context.attacker.name} slept and restored its HP!`);
    },
    snore(context) {
      if (context.phase === "before" && context.attacker.status?.name !== "asleep") {
        context.preventMove = true;
        context.log(`${context.attacker.name} can only use Snore while asleep!`);
      }
      if (context.phase === "after" && chance(context, 0.3)) {
        context.defender.flinched = true;
      }
    },
    "body-slam"(context) {
      if (context.phase === "after" && chance(context, 0.3)) {
        status(context, context.defender, "paralyzed");
      }
    },
  };

  window.BattleMoveEffects = effects;
})();
