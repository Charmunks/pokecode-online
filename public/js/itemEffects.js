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

  window.BattleItemEffects = effects;
})();
