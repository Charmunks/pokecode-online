exports.up = function (knex) {
  return knex.schema.createTable("user_projects", (table) => {
    table.increments("id").primary();
    table
      .integer("userId")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("name", 100).notNullable();
    table.text("description");
    table.string("icon", 500);
    table.string("hackatimeProject");
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("user_projects");
};
