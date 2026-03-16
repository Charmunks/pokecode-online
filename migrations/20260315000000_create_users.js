exports.up = function (knex) {
  return knex.schema.createTable("users", (table) => {
    table.increments("id").primary();
    table.string("hackclubId").notNullable().unique();
    table.string("email").notNullable();
    table.string("slackId");
    table.string("username").unique();
    table.string("gender").defaultTo("male");
    table.float("x").defaultTo(25 * 32 + 16);
    table.float("y").defaultTo(15 * 32 + 16);
    table.string("direction").defaultTo("down");
    table.string("accessToken");
    table.string("refreshToken");
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("users");
};
