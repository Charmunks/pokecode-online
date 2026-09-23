const pokemonData = require("../public/data/pokemon.json");

function maxHealth(speciesId, level) {
  const baseHp = pokemonData[speciesId]?.stats?.HP;
  if (!Number.isInteger(baseHp)) {
    throw new Error(`Cannot set health for unknown Pokémon species: ${speciesId}`);
  }

  return Math.floor((baseHp * 2 * level) / 100) + level + 10;
}

exports.up = async function (knex) {
  await knex.schema.alterTable("user_pokemon", (table) => {
    table.integer("health");
  });

  const pokemon = await knex("user_pokemon").select("id", "speciesId", "level");
  for (const ownedPokemon of pokemon) {
    await knex("user_pokemon")
      .where({ id: ownedPokemon.id })
      .update({ health: maxHealth(ownedPokemon.speciesId, ownedPokemon.level) });
  }

  await knex.schema.alterTable("user_pokemon", (table) => {
    table.integer("health").notNullable().alter();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("user_pokemon", (table) => {
    table.dropColumn("health");
  });
};
