exports.up = function (knex) {
  return knex.schema.alterTable("users", (table) => {
    table.integer("pokedollars").notNullable().defaultTo(0);
    table.integer("watts").notNullable().defaultTo(0);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("users", (table) => {
    table.dropColumn("pokedollars");
    table.dropColumn("watts");
  });
};
