// A project can link to several Hackatime projects, stored as a JSON array of names.
exports.up = async function (knex) {
  await knex.schema.alterTable("user_projects", (table) => {
    table.jsonb("hackatimeProjects").notNullable().defaultTo("[]");
  });
  await knex("user_projects")
    .whereNotNull("hackatimeProject")
    .update({ hackatimeProjects: knex.raw('jsonb_build_array("hackatimeProject")') });
  await knex.schema.alterTable("user_projects", (table) => {
    table.dropColumn("hackatimeProject");
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("user_projects", (table) => {
    table.string("hackatimeProject");
  });
  await knex("user_projects").update({
    hackatimeProject: knex.raw(`"hackatimeProjects"->>0`),
  });
  await knex.schema.alterTable("user_projects", (table) => {
    table.dropColumn("hackatimeProjects");
  });
};
