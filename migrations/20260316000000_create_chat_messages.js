exports.up = function (knex) {
  return knex.schema.createTable("chat_messages", (table) => {
    table.increments("id").primary();
    table.integer("userId").unsigned().references("id").inTable("users");
    table.string("username").notNullable();
    table.text("message").notNullable();
    table.string("type").defaultTo("chat"); // chat, system
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("chat_messages");
};
