// needsStarter now only checks starterReceived, so mark everyone who already
// owns a Pokémon (e.g. inserted by hand before starters existed) as having one.
exports.up = function (knex) {
  return knex("users")
    .whereExists(
      knex("user_pokemon").whereRaw('"user_pokemon"."userId" = "users"."id"')
    )
    .update({ starterReceived: true });
};

exports.down = function () {};
