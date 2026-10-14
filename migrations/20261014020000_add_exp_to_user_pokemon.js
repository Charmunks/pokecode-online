exports.up = function (knex) {
  return knex.schema.alterTable("user_pokemon", (table) => {
    table.integer("exp").notNullable().defaultTo(0);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("user_pokemon", (table) => {
    table.dropColumn("exp");
  });
};
