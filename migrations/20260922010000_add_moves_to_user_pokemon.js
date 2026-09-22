const starterMoves = {
  bulbasaur: ["tackle"],
  charmander: ["scratch", "growl"],
  squirtle: ["tackle"],
  pikachu: ["thunder-shock", "growl"],
  eevee: ["tackle", "tail-whip", "helping-hand"],
  snorlax: ["tackle", "amnesia"],
};

exports.up = async function (knex) {
  await knex.schema.alterTable("user_pokemon", (table) => {
    table
      .jsonb("moves")
      .notNullable()
      .defaultTo(knex.raw("'[]'::jsonb"));
  });

  for (const [speciesId, moves] of Object.entries(starterMoves)) {
    await knex("user_pokemon")
      .where({ speciesId })
      .update({ moves: JSON.stringify(moves) });
  }
};

exports.down = function (knex) {
  return knex.schema.alterTable("user_pokemon", (table) => {
    table.dropColumn("moves");
  });
};
