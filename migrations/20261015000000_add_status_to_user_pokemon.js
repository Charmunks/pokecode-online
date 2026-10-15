// Status condition that lasts between battles: { name, turns } or null.
exports.up = function (knex) {
  return knex.schema.alterTable("user_pokemon", (table) => {
    table.jsonb("status");
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("user_pokemon", (table) => {
    table.dropColumn("status");
  });
};
