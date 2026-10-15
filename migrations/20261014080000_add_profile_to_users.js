// Personal details collected from the PROFILE tab and when submitting a project.
exports.up = function (knex) {
  return knex.schema.alterTable("users", (table) => {
    table.string("firstName", 100);
    table.string("lastName", 100);
    table.string("addressLine1", 200);
    table.string("addressLine2", 200);
    table.string("city", 100);
    table.string("state", 100);
    table.string("country", 100);
    table.string("postalCode", 20);
    table.date("birthday");
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("users", (table) => {
    table.dropColumn("firstName");
    table.dropColumn("lastName");
    table.dropColumn("addressLine1");
    table.dropColumn("addressLine2");
    table.dropColumn("city");
    table.dropColumn("state");
    table.dropColumn("country");
    table.dropColumn("postalCode");
    table.dropColumn("birthday");
  });
};
