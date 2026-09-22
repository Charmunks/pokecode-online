exports.up = function (knex) {
  return knex.schema.alterTable("user_pokemon", (table) => {
    table.integer("level").notNullable().defaultTo(1);
    table.integer("friendship").notNullable().defaultTo(50);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("user_pokemon", (table) => {
    table.dropColumns("level", "friendship");
  });
};
