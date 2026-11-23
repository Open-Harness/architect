import type { FieldModel, ThingModel } from "../../project-evidence/types.ts";
import { Reading } from "../../reading/service.ts";
import { over, typeName } from "./over.ts";

/** What a field's row must show beyond its name and type: its optionality, visibility and description, each only when the model declares one. */
const extras = (field: FieldModel): ReadonlyArray<{ readonly what: string; readonly shown: string }> => [
  ...(field.optional === true ? [{ what: "optional", shown: "optional" }] : []),
  ...(field.visibility === undefined ? [] : [{ what: "visibility", shown: typeof field.visibility === "string" ? field.visibility : "private" }]),
  ...(field.description === undefined ? [] : [{ what: "description", shown: field.description }]),
];

const rowProblems = (where: string, thing: ThingModel, rows: ReadonlyArray<ReadonlyArray<string>>): ReadonlyArray<string> =>
  Object.entries(thing.fields).flatMap(([name, field]) => {
    const row = rows.find((r) => r[0] === name);
    if (row === undefined) return [`${where} has no row for the field ${name}`];
    return [
      ...(row.slice(1).some((cell) => Reading.hasName(cell, typeName(field))) ? [] : [`${where}'s row for ${name} does not show its type ${typeName(field)}`]),
      ...extras(field).filter((x) => !row.join(" ").includes(x.shown)).map((x) => `${where}'s row for ${name} does not show its ${x.what} (${x.shown})`),
    ];
  });

/** thing.docs: the thing's reference page: description, where it lives, and a field table with a row per field showing its type and whatever the model declares of it. */
export const docs = over("thing.docs", (thing, e) => {
  const path = `generated/docs/${thing.name}/index.md`;
  const page = e.files[path];
  if (page === undefined) return [`${path} was not generated`];
  const fields = Reading.mdSection(page, "Fields");
  return [
    ...(Reading.mdTitle(page) === thing.name ? [] : [`${path} has no heading "# ${thing.name}"`]),
    ...(Reading.plain(page.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, " ")).replace(/\s+/g, " ").includes(Reading.plain(thing.description ?? "\0")) ? [] : [`${path} does not carry the description`]),
    ...(fields === undefined ? [`${path} has no Fields section`] : rowProblems("the Fields table", thing, Reading.mdRows(fields))),
  ];
});

/** thing.portal: home lists the thing with its description, and the thing's page shows every field with its type and whatever the model declares of it. */
export const portal = over("thing.portal", (thing, e) => {
  const route = `/portal/things/${thing.name}`;
  const page = e.portal[route];
  if (page === undefined) return [`${route} could not be rendered`];
  const own = Reading.portalOwn(page);
  const fields = Reading.htmlSection(own, 2, "Fields");
  const things = Reading.htmlItems(Reading.htmlSection(e.portal["/portal"] ?? "", 2, "Things") ?? "");
  return [
    ...(things.some((t) => t.startsWith(thing.name) && t.includes(thing.description ?? "\0")) ? [] : [`home shows no card for ${thing.name} with its description`]),
    ...(Reading.htmlHeadings(own, 1).includes(thing.name) ? [] : [`${route} has no heading ${thing.name}`]),
    ...(Reading.htmlText(own).includes(thing.description ?? "\0") ? [] : [`${route} does not carry the description`]),
    ...(fields === undefined ? [`${route} has no Fields table`] : rowProblems("the Fields table", thing, Reading.htmlRows(fields))),
  ];
});
