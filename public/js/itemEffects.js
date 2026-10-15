(function () {
  const effects = {
    potion(context) {
      const target = context.target;
      if (!target || target.health <= 0 || target.health >= target.maxHealth) {
        return { used: false, message: "Potion would have no effect." };
      }
      const restored = Math.min(20, target.maxHealth - target.health);
      target.health += restored;
      return { used: true, message: `${target.name} restored ${restored} HP!` };
    },
    revive(context) {
      const target = context.target;
      if (!target || target.health > 0) {
        return { used: false, message: "Revive would have no effect." };
      }
      target.health = Math.max(1, Math.floor(target.maxHealth / 2));
      return { used: true, message: `${target.name} was revived!` };
    },
    antidote(context) {
      const target = context.target;
      if (!target?.status) {
        return { used: false, message: "Full Heal would have no effect." };
      }
      target.status = null;
      return { used: true, message: `${target.name}'s status was cured!` };
    },
    "poke-ball"(context) {
      if (context.type !== "wild") {
        return { used: false, message: "You cannot catch a trainer's Pokémon!" };
      }
      const missingHealth = 1 - context.enemy.health / context.enemy.maxHealth;
      const chance = Math.max(
        0.05,
        Math.min(
          0.95,
          0.15 + missingHealth * 0.7 + (context.player.level - context.enemy.level) * 0.03
        )
      );
      const caught = context.random() < chance;
      return {
        used: true,
        caught,
        message: caught
          ? `Gotcha! ${context.enemy.name} was caught!`
          : `${context.enemy.name} broke free!`,
      };
    },
  };

  // Effects for items marked bagUsable in items.json, used outside of battle from
  // the bag. These run on the server (POST /api/my-items/use), which saves the
  // changes. context.target is { name, level, exp, health, maxHealth, status,
  // maxHealthForLevel(level) }.
  const bagEffects = {
    potion: effects.potion,
    antidote: effects.antidote,
    "rare-candy"(context) {
      const target = context.target;
      if (!target || target.level >= 100) {
        return { used: false, message: "Rare Candy would have no effect." };
      }
      // Leveling up raises max health; keep the same amount of missing health.
      const newMaxHealth = target.maxHealthForLevel(target.level + 1);
      if (target.health > 0) target.health += newMaxHealth - target.maxHealth;
      target.maxHealth = newMaxHealth;
      target.level += 1;
      target.exp = 0;
      return { used: true, message: `${target.name} grew to Lv. ${target.level}!` };
    },
  };

  if (typeof window !== "undefined") {
    window.BattleItemEffects = effects;
    window.BagItemEffects = bagEffects;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { BattleItemEffects: effects, BagItemEffects: bagEffects };
  }
})();
