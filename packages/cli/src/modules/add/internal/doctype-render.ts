// The files a doctype is scaffolded into (CX-from-doctype): the thing, its machine and events, a verb per move and the
// read, each line's thing, and the link values. Who may act is the only blank.
import { Names } from "orthograph/server";
import type { Written } from "../types.ts";
import type { Doctype } from "./doctype-read.ts";
import { flag } from "./doctype-read.ts";
import type { Imports, Kept } from "./doctype-fields.ts";
import { article, camelName } from "./doctype-names.ts";

/** A thing this run writes: its doctype, names, and kept fields. */
export interface Planned {
  readonly doctype: Doctype;
  readonly folder: string;
  readonly identifier: string;
  readonly prefix: string;
  readonly code: string;
  readonly kept: ReadonlyArray<Kept>;
  readonly imports: Imports;
  readonly locals: ReadonlyArray<string>;
}

/** A line: the thing, the parent it belongs to and the Table field that holds it. */
export interface PlannedLine extends Planned {
  readonly tableKey: string;
  readonly tableLabel: string;
}

const say = JSON.stringify;
export const scaffoldLine = (d: Doctype, from: Doctype = d) => `// Scaffolded from ${from.file}, ERPNext's ${from.name}. Yours from now on.`;

const importsOf = (imports: Imports, asset: string | undefined, extra: ReadonlyArray<string> = []) => {
  const lines = [`import { Blueprint${imports.schema ? ", Schema" : ""} } from "${Names.frontDoor}";`];
  if (imports.asset && asset !== undefined) lines.push(`import ${assetName(asset)} from "../../assets/${asset}.ts";`);
  for (const [folder, identifier] of [...imports.things].sort(([a], [b]) => (a < b ? -1 : 1))) lines.push(`import { ${identifier} } from "../${folder}/thing.ts";`);
  for (const [file, identifier] of [...imports.links].sort(([a], [b]) => (a < b ? -1 : 1))) lines.push(`import { ${identifier} } from "../../values/${file}.ts";`);
  return [...lines, ...extra].join("\n");
};

/** The asset's import name: `usdc`, `euro-cash` → `euroCash`. */
export const assetName = (asset: string) => asset.replace(/[^A-Za-z0-9]+([A-Za-z0-9])/g, (_, c: string) => c.toUpperCase()).replace(/^[^A-Za-z_]+/, "");

const thingFile = (p: Planned, asset: string | undefined, description: string, before: ReadonlyArray<string>, parent?: Planned) => {
  const imports: Imports = parent ? { ...p.imports, things: new Map([...p.imports.things, [parent.folder, parent.identifier]]) } : p.imports;
  const fields = [`    id: Blueprint.id(${say(p.prefix)}),`, ...before, ...p.kept.map((k) => `    ${k.key}: ${k.declaration},`)];
  return `${scaffoldLine(p.doctype)}
${importsOf(imports, asset)}
${p.locals.length > 0 ? `\n${p.locals.join("\n\n")}\n` : ""}
export const ${p.identifier} = Blueprint.thing({
  code: ${say(p.code)},
  description: ${say(description)},
  fields: {
${fields.join("\n")}
  },
});
`;
};

/** The moves of the doctype's machine, each with its states and the event it emits. */
const movesOf = (d: Doctype) =>
  d.submittable
    ? ([["create", [], "draft", "Created"], ["save", ["draft"], "draft", "Saved"], ["submit", ["draft"], "submitted", "Submitted"], ["cancel", ["submitted"], "cancelled", "Cancelled"]] as const)
    : ([["create", [], "active", "Created"], ["save", ["active"], "active", "Saved"]] as const);
/** The right ERPNext's permission row gives for each move, and for the read. */
const RIGHT: Readonly<Record<string, string>> = { create: "create", save: "write", submit: "submit", cancel: "cancel", get: "read" };

/** Who may act, blank: the roles whose permission row at level 0 holds the right, each once, in the JSON's order. */
const whoMayAct = (p: Planned, verb: string) => {
  const right = RIGHT[verb] ?? verb;
  const roles = [...new Set(p.doctype.permissions.filter((row) => Number(row["permlevel"] ?? 0) === 0 && flag(row[right]) && typeof row["role"] === "string").map((row) => String(row["role"])))];
  const quoted = roles.map((r) => `"${r}"`);
  const to = quoted.length === 0 ? "to no role" : `to ${quoted.length === 1 ? quoted[0] : `${quoted.slice(0, -1).join(", ")} and ${quoted[quoted.length - 1]}`}`;
  return `Blueprint.todo<never>(${say(`who may ${verb} ${article(p.doctype.name)} ${p.doctype.name.toLowerCase()}: ERPNext gives ${right} ${to}`)})`;
};

const payloadOf = (p: Planned, lines: ReadonlyArray<PlannedLine>) => [
  ...p.kept.filter((k) => k.field.reqd && !k.field.readOnly).map((k) => `    ${k.key}: ${p.identifier}.fields.${k.key},`),
  ...lines.map((l) => {
    const row = l.kept.filter((k) => k.field.reqd && !k.field.readOnly).map((k) => `${k.key}: ${l.identifier}.fields.${k.key}.value.schema`);
    return `    ${l.tableKey}: Blueprint.described(Blueprint.list(Blueprint.value(Schema.Struct({ ${row.join(", ")} }))), ${say(l.tableLabel)}),`;
  }),
];

const VERB: Readonly<Record<string, string>> = { create: "Create", save: "Save", submit: "Submit", cancel: "Cancel" };

const verbFile = (p: Planned, lines: ReadonlyArray<PlannedLine>, verb: string) => {
  const id = camelName(p.doctype.name);
  const withRows = verb === "create" || verb === "save";
  const rows = withRows ? lines : [];
  const payload = [...(verb === "create" ? [] : [`    ${id}: ${p.identifier}.fields.id,`]), ...(withRows ? payloadOf(p, lines) : [])];
  const imports = [
    `import { Blueprint${rows.length > 0 ? ", Schema" : ""} } from "${Names.frontDoor}";`,
    `import { ${p.identifier} } from "../thing.ts";`,
    `import { machine } from "../machine.ts";`,
    ...rows.map((l) => `import { ${l.identifier} } from "../../${l.folder}/thing.ts";`),
  ];
  const what = `${article(p.doctype.name)} ${p.doctype.name.toLowerCase()}`;
  const lineNote = rows.length > 0 ? `, with its ${rows.map((l) => l.tableLabel.toLowerCase()).join(" and ")}` : "";
  return `${scaffoldLine(p.doctype)}
${imports.join("\n")}

// ERPNext's ${verb}. What it does beyond the move and the record (the controller's Python) is translated by hand.
export default Blueprint.operation(${p.identifier}, {
  description: ${say(`${VERB[verb] ?? verb} ${what}${lineNote}.`)},
  payload: {
${payload.join("\n")}
  },
  answer: { ${id}: ${p.identifier}.fields.id },
  move: machine.moves.${verb},
  allowed: ${whoMayAct(p, verb)},
  steps: { record: Blueprint.step.database({ writes: [${[p.identifier, ...rows.map((l) => l.identifier)].join(", ")}] }) },
});
`;
};

const readFile = (p: Planned) => `${scaffoldLine(p.doctype)}
import { Blueprint } from "${Names.frontDoor}";
import { ${p.identifier} } from "../thing.ts";

// A read changes nothing, so it has no move and no handler: it answers from the record.
export default Blueprint.read(${p.identifier}, {
  by: "id",
  fields: ${say(["state", ...p.kept.map((k) => k.key)])},
  allowed: ${whoMayAct(p, "get")},
});
`;

const machineFile = (p: Planned) => {
  const moves = movesOf(p.doctype);
  const states = [...new Set(moves.map(([, , to]) => to))];
  const status = p.doctype.submittable ? p.doctype.fields.find((f) => f.fieldname === "status" && f.fieldtype === "Select") : undefined;
  const options = status ? status.options.split("\n").map((o) => o.trim()).filter((o) => o !== "") : [];
  const statusNote = options.length > 0 ? `// ERPNext's status is worked out from docstatus, amounts and dates, not moved to, so it is no state here: ${options.join(", ")}.\n` : "";
  return `${scaffoldLine(p.doctype)}
import { Blueprint } from "${Names.frontDoor}";
import { ${p.identifier} } from "./thing.ts";
import * as Events from "./events.ts";

// ${p.doctype.submittable ? "ERPNext's docstatus: a draft, saved while it is one, then submitted, then cancelled. Amend is left out." : "A record that isn't submittable: made, then saved."}
${statusNote}export const machine = Blueprint.machine(${p.identifier}, {
  states: ${say(states)},
  moves: {
${moves.map(([verb, from, to, past]) => `    ${verb}: { from: ${say(from)}, to: ${say(to)}, emits: Events.${p.identifier}${past} },`).join("\n")}
  },
  notFrom: { exit: 40 },
});
`;
};

const eventsFile = (p: Planned) => `${scaffoldLine(p.doctype)}
import { Blueprint } from "${Names.frontDoor}";
import { ${p.identifier} } from "./thing.ts";

${movesOf(p.doctype).map(([, , , past]) => `export const ${p.identifier}${past} = Blueprint.event({ ${camelName(p.doctype.name)}: ${p.identifier}.fields.id });`).join("\n")}
`;

/** Every file of the doctype and its lines, in a fixed order. */
export const render = (p: Planned, lines: ReadonlyArray<PlannedLine>, asset: string | undefined): ReadonlyArray<Written> => {
  const at = `blueprint/things/${p.folder}`;
  return [
    { path: `${at}/thing.ts`, content: thingFile(p, asset, p.doctype.description ?? `${p.doctype.name}, as ERPNext keeps it.`, []) },
    { path: `${at}/machine.ts`, content: machineFile(p) },
    { path: `${at}/events.ts`, content: eventsFile(p) },
    ...movesOf(p.doctype).map(([verb]) => ({ path: `${at}/verbs/${verb}.ts`, content: verbFile(p, lines, verb) })),
    { path: `${at}/verbs/get.ts`, content: readFile(p) },
    ...lines.map((l) => ({
      path: `blueprint/things/${l.folder}/thing.ts`,
      content: thingFile(l, asset, `One row of ${article(p.doctype.name)} ${p.doctype.name}'s ${l.tableLabel}.`, [
        `    parent: Blueprint.described(${p.identifier}.fields.id, ${say(`The ${p.doctype.name} this row belongs to.`)}),`,
        `    idx: Blueprint.described(Blueprint.uint(32), "Its place in the table, from 1."),`,
      ], p),
    })),
  ];
};

/** A link value: the target's name, as ERPNext keys a record, until the target is scaffolded and the field made its id by hand. */
export const linkFile = (from: Doctype, target: string, identifier: string) => `${scaffoldLine(from)}
import { Blueprint } from "${Names.frontDoor}";

/**
 * ${article(target).replace(/^a/, "A")} ${target}, by its name: ERPNext keys a record by its name, and ${target} isn't scaffolded. Once it is,
 * a field holding this is changed to its id by hand, a migration of names to ids.
 */
export const ${identifier} = Blueprint.value(Blueprint.text({ max: 140 }));
`;
