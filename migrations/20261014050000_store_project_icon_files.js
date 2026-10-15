// Project icons are uploaded image files stored in the database instead of URLs.
exports.up = function (knex) {
  return knex.schema.alterTable("user_projects", (table) => {
    table.dropColumn("icon");
    table.binary("iconData");
    table.string("iconType");
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("user_projects", (table) => {
    table.dropColumn("iconData");
    table.dropColumn("iconType");
    table.string("icon", 500);
  });
};
