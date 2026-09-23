exports.up = function (knex) {
  return knex.schema.createTable("user_items", (table) => {
    table.increments("id").primary();
    table
      .integer("userId")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("itemId").notNullable();
    table.integer("quantity").unsigned().notNullable().defaultTo(1);
    table.unique(["userId", "itemId"]);
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("user_items");
};
