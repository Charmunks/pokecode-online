exports.up = function (knex) {
  return knex.schema.alterTable("users", (table) => {
    table.string("hackatimeId").unique();
    table.text("hackatimeAccessToken");
    table.string("hackatimeScope");
    table.timestamp("hackatimeConnectedAt");
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("users", (table) => {
    table.dropColumn("hackatimeId");
    table.dropColumn("hackatimeAccessToken");
    table.dropColumn("hackatimeScope");
    table.dropColumn("hackatimeConnectedAt");
  });
};
