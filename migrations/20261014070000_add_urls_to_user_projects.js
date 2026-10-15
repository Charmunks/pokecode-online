exports.up = function (knex) {
  return knex.schema.alterTable("user_projects", (table) => {
    table.string("codeUrl", 500);
    table.string("playableUrl", 500);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("user_projects", (table) => {
    table.dropColumn("codeUrl");
    table.dropColumn("playableUrl");
  });
};
