exports.up = function (knex) {
  return knex.schema.createTable("user_pokemon", (table) => {
    table.increments("id").primary();
    table
      .integer("userId")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("speciesId").notNullable();
    table.string("nickname");
    table.string("location").notNullable().defaultTo("box"); // 'party' or 'box'
    table.integer("slot").notNullable().defaultTo(0);
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("user_pokemon");
};
