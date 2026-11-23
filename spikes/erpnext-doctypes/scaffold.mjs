#!/usr/bin/env node
// Spike code, never imported. Reads ERPNext doctype JSON files and writes an Orthograph blueprint project:
//   node scaffold.mjs <fixtures-dir> <out-dir> [--roles todo|open] <Doctype> ...
// Each top-level doctype becomes a thing (fields, machine, events, roles, verbs); each child table it holds becomes a
// thing of its own pointing at its parent. What the JSON cannot say is a Blueprint.todo or a line in report.json.
import { mkdirSync, readFileSync, symlinkSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const args = process.argv.slice(2);
const rolesMode = args.includes("--roles") ? args.splice(args.indexOf("--roles"), 2)[1] : "todo";
const [fixtures, out, ...wanted] = args;
const here = dirname(new URL(import.meta.url).pathname);

const kebab = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const pascal = (s) => kebab(s).split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");
const camel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
const file = (d) => join(fixtures, `${d.toLowerCase().replace(/ /g, "_")}.json`);
const load = (d) => (existsSync(file(d)) ? JSON.parse(readFileSync(file(d), "utf8")) : undefined);
const say = (s) => JSON.stringify(s);

const LAYOUT = new Set(["Section Break", "Column Break", "Tab Break", "HTML", "Button", "Read Only", "Fold", "Heading", "Image"]);
const report = { doctypes: {}, unknownTypes: {}, linksOut: {}, skippedTables: [], dropped: [], blanks: 0 };

// The doctypes to write: the ones asked for, and every child table of theirs whose file is there.
const docs = new Map();
for (const name of wanted) {
  const d = load(name);
  if (!d) throw new Error(`no fixture for ${name}`);
  docs.set(name, { d, parent: undefined });
  for (const f of d.fields) if (f.fieldtype === "Table") {
    const child = load(f.options);
    if (child) docs.set(f.options, { d: child, parent: name, table: f.fieldname });
    else report.skippedTables.push(`${name}.${f.fieldname} → ${f.options} (no fixture)`);
  }
}

// One id prefix per thing, from its naming series (ACC-SINV-.YYYY.- → sinv) or its initials, never twice.
const prefixes = new Map();
const prefixOf = (name) => {
  if (prefixes.has(name)) return prefixes.get(name);
  const series = /^[A-Z]+-([A-Z]+)-/.exec(docs.get(name)?.d.autoname ?? "")?.[1] ??
    /^[A-Z]+-([A-Z]+)-/.exec((docs.get(name)?.d.fields.find((f) => f.fieldname === "naming_series")?.options ?? "").split("\n")[0])?.[1];
  let p = (series ?? name.split(/\s+/).map((w) => w[0]).join("")).toLowerCase();
  while ([...prefixes.values()].includes(p)) p += "x";
  prefixes.set(name, p);
  return p;
};
for (const name of docs.keys()) prefixOf(name);

// Links between scaffolded things, and which of them would close an import cycle: a thing.ts reads the other's
// fields.id while it loads, so two things pointing at each other fail with a ReferenceError. The edge that closes a
// cycle, taken in the order the doctypes are written, becomes a plain id value instead (report.cyclesBroken).
const edges = new Map([...docs].map(([n, { d, parent }]) => [n, new Set([...(parent ? [parent] : []), ...d.fields.filter((f) => f.fieldtype === "Link" && docs.has(f.options) && f.options !== n).map((f) => f.options)])]));
const reaches = (from, to, seen = new Set()) => from === to || (!seen.has(from) && (seen.add(from), [...(edges.get(from) ?? [])].some((x) => reaches(x, to, seen))));
report.cyclesBroken = [];
for (const [n, out] of edges) for (const t of [...out]) {
  out.delete(t);
  if (reaches(t, n)) report.cyclesBroken.push(`${n} → ${t}`); else out.add(t);
}

// A field's value, as an expression in the thing's file, and what it needs imported.
const valueOf = (doc, f, T, imports, locals) => {
  const t = f.fieldtype;
  if (t === "Link" && docs.has(f.options) && f.options !== doc && !edges.get(doc).has(f.options)) return `Blueprint.id(${say(prefixOf(f.options))})`;
  if (t === "Link" && docs.has(f.options) && f.options !== doc) return (imports.add(`thing:${f.options}`), `${pascal(f.options)}.fields.id`);
  if (t === "Link" && f.options === doc) return `Blueprint.id(${say(prefixOf(doc))})`; // amended_from, return_against: itself, before it exists
  if (t === "Link" && f.options === "Currency") return (imports.add("v:CurrencyCode"), "CurrencyCode");
  if (t === "Link" && f.options === "DocType") return (imports.add("v:DoctypeName"), "DoctypeName");
  if (t === "Link") {
    const ref = `${pascal(f.options)}Ref`;
    (report.linksOut[f.options] ??= []).push(`${doc}.${f.fieldname}`);
    return (imports.add(`l:${ref}`), ref);
  }
  if (t === "Dynamic Link") return "Blueprint.refAny()";
  if (t === "Currency") return (imports.add("v:Money"), "Money");
  if (t === "Float" || t === "Percent") return (imports.add("v:Decimal"), "Decimal");
  if (t === "Int") return (imports.add("v:Count"), "Count");
  if (t === "Check") return (imports.add("v:Flag"), "Flag");
  if (t === "Date") return (imports.add("v:Day"), "Day");
  if (t === "Time") return (imports.add("v:TimeOfDay"), "TimeOfDay");
  if (t === "Datetime") return "Blueprint.instant()";
  if (t === "Data" && f.options === "Email") return "Blueprint.email()";
  if (t === "Data" || t === "Attach" || t === "Attach Image") return "Blueprint.text({ max: 140 })";
  if (["Small Text", "Text", "Text Editor", "Code", "Long Text"].includes(t)) return "Blueprint.text({ max: 65535 })";
  if (t === "Select") {
    const options = String(f.options ?? "").split("\n").filter((o) => o !== "");
    const name = `${T}${pascal(f.fieldname)}`;
    locals.push(`export const ${name} = Blueprint.value(Schema.Literals(${say(options)}));`);
    return name;
  }
  (report.unknownTypes[t] ??= []).push(`${doc}.${f.fieldname}`);
  return "Blueprint.text({ max: 140 })";
};

const header = `// Scaffolded from ERPNext's ${"%s"} doctype (erpnext@a6f54f9c, GPL v3) by spikes/erpnext-doctypes/scaffold.mjs.`;
const files = [];
const put = (path, content) => files.push({ path, content });

for (const [name, { d, parent, table }] of docs) {
  const T = pascal(name), k = kebab(name), at = `blueprint/things/${k}`;
  const imports = new Set(), locals = [], lines = [], rep = { fields: 0, kept: 0, nullable: 0, layout: 0, dropped: [] };
  report.doctypes[name] = rep;
  const submittable = d.is_submittable === 1, cancelFlag = d.fields.some((f) => f.fieldname === "is_cancelled");
  const dynamicTypes = new Set(d.fields.filter((f) => f.fieldtype === "Dynamic Link").map((f) => f.options));
  if (parent) {
    imports.add(`thing:${parent}`), imports.add("v:Count");
    lines.push(`    parent: Blueprint.described(${pascal(parent)}.fields.id, "The ${parent} this row belongs to (ERPNext's parent)."),`);
    lines.push(`    idx: Blueprint.described(Count, "The row's place in the table, from 1 (ERPNext's idx)."),`);
  }
  for (const f of d.fields) {
    rep.fields++;
    if (LAYOUT.has(f.fieldtype)) { rep.layout++; continue; }
    const drop = (why) => rep.dropped.push(`${f.fieldname}: ${why}`);
    if (f.is_virtual) { drop("virtual, computed on read"); continue; }
    if (f.fieldtype === "Table") { drop(docs.has(f.options) ? `a child table, now the thing ${kebab(f.options)}` : `a child table with no fixture: ${f.options}`); continue; }
    if (f.fieldname === "naming_series") { drop("the name's series; ids are Orthograph's"); continue; }
    if (dynamicTypes.has(f.fieldname)) { drop("the doctype half of a Dynamic Link; refAny carries it"); continue; }
    if (submittable && f.fieldname === "status") { drop("derived status; its options are written beside the machine"); continue; }
    if (cancelFlag && f.fieldname === "is_cancelled") { drop("the machine's cancelled state"); continue; }
    let v = valueOf(name, f, T, imports, locals);
    // Things have no optional fields: anything not required and without a default may be empty, so it is nullable.
    const empty = !f.reqd && f.default === undefined && f.fieldtype !== "Check";
    if (empty) {
      // A Field can't be wrapped: a link that may be empty keeps the id's schema and loses the edge (report.edgesLost).
      if (v.endsWith(".fields.id")) (report.edgesLost ??= []).push(`${name}.${f.fieldname} → ${f.options}`), v = `${v}.value`;
      // The host keeps a struct as JSON only when it isn't nullable (store/internal/rows.ts): a nullable Dynamic Link is
      // written as JSON text itself, so it reaches D1 as a string (report.jsonText).
      if (v === "Blueprint.refAny()") (report.jsonText ??= []).push(`${name}.${f.fieldname}`), v = "Blueprint.value(Schema.fromJsonString(Blueprint.refAny().schema))";
      v = `Blueprint.value(Schema.NullOr(${v}.schema))`; rep.nullable++;
    }
    const label = (f.label ?? f.fieldname).replace(/"/g, "'") + (f.fetch_from ? ` (copied from ${f.fetch_from})` : "");
    lines.push(`    ${camel(f.fieldname)}: Blueprint.described(${v}, ${say(label)}),`);
    rep.kept++;
    // The row a handler starts from: ERPNext's default where the JSON gives one, else null. Today and Now stay a handler's.
    const dv = f.default;
    const start = f.fieldtype === "Check" ? (dv === "1" || dv === 1 ? '"1"' : '"0"') : dv === undefined || dv === "Today" || dv === "Now" || String(dv).startsWith("{") ? "null"
      : f.fieldtype === "Currency" ? `${BigInt(Math.round(Number(dv)))}n` : f.fieldtype === "Int" ? String(Number(dv)) : say(String(dv));
    (rep.start ??= []).push(`  ${camel(f.fieldname)}: ${start},`);
  }
  const importLines = [`import { Blueprint, Schema } from "orthograph";`];
  for (const i of [...imports].sort()) {
    if (i.startsWith("thing:")) importLines.push(`import { ${pascal(i.slice(6))} } from "../${kebab(i.slice(6))}/thing.ts";`);
  }
  const vs = [...imports].filter((i) => i.startsWith("v:")).map((i) => i.slice(2));
  const ls = [...imports].filter((i) => i.startsWith("l:")).map((i) => i.slice(2));
  if (vs.length) importLines.push(`import { ${vs.sort().join(", ")} } from "../../values/erpnext.ts";`);
  if (ls.length) importLines.push(`import { ${ls.sort().join(", ")} } from "../../values/links.ts";`);
  put(`${at}/thing.ts`, `${header.replace("%s", name)}
${importLines.join("\n")}
${locals.length ? "\n" + locals.join("\n") + "\n" : ""}
export const ${T} = Blueprint.thing({
  code: ${say(prefixOf(name).toUpperCase().slice(0, 4))}, // two things named Sales … would share SA-
  description: ${say(d.description || `${name}, as ERPNext keeps it${parent ? `: one row of a ${parent}` : ""}.`)},
  fields: {
    id: Blueprint.id(${say(prefixOf(name))}),
${lines.join("\n")}
  },
});
`);
  put(`src/erpnext/${k}.start.ts`, `${header.replace("%s", name)} Yours from now on.
// A new ${name} before its handler fills it: ERPNext's defaults, null where it has none. Spread it under a payload.
export const start${T} = {
${rep.start.join("\n")}
} as const;
`);
  delete rep.start;
  if (parent) continue; // a child row lives and dies with its parent: no machine, no verbs of its own

  // The machine: docstatus for a submittable doctype; posted and cancelled for a ledger row with is_cancelled.
  const statusOptions = String(d.fields.find((f) => f.fieldname === "status")?.options ?? "").split("\n").filter(Boolean);
  const moves = submittable
    ? { create: [[], "draft"], save: [["draft"], "draft"], submit: [["draft"], "submitted"], cancel: [["submitted"], "cancelled"] }
    : cancelFlag ? { post: [[], "posted"], cancel: [["posted"], "cancelled"] } : { create: [[], "active"] };
  const states = [...new Set(Object.values(moves).map(([, to]) => to))];
  const past = { create: "Created", save: "Saved", submit: "Submitted", cancel: "Cancelled", post: "Posted" };
  put(`${at}/events.ts`, `${header.replace("%s", name)}
import { Blueprint } from "orthograph";
import { ${T} } from "./thing.ts";

${Object.keys(moves).map((m) => `export const ${T}${past[m]} = Blueprint.event({ ${camel(k.replace(/-/g, "_"))}: ${T}.fields.id });`).join("\n")}
`);
  put(`${at}/machine.ts`, `${header.replace("%s", name)}
import { Blueprint } from "orthograph";
import { ${T} } from "./thing.ts";
import * as Events from "./events.ts";
${statusOptions.length ? `\n// ERPNext's derived status, worked out from docstatus, amounts and dates, not moved to: ${statusOptions.join(", ")}.\n` : ""}
export const machine = Blueprint.machine(${T}, {
  states: ${say(states)},
  moves: {
${Object.entries(moves).map(([m, [from, to]]) => `    ${m}: { from: ${say(from)}, to: ${say(to)}, emits: Events.${T}${past[m]} },`).join("\n")}
  },
  notFrom: { exit: 40 },
});
`);
  // Roles: ERPNext grants by role name across a company; an Orthograph role is a rule on one instance.
  const perms = d.permissions ?? [];
  const roleNames = [...new Set(perms.filter((p) => p.role !== "All" && (p.create || p.submit || p.cancel || p.write || p.read)).map((p) => p.role))];
  const roleId = (r) => camel(kebab(r).replace(/-/g, "_"));
  const rule = rolesMode === "open" ? "() => true" : `Blueprint.todo("when a person acts as ERPNext's %s on this ${name}")`;
  if (rolesMode !== "open") report.blanks += roleNames.length;
  put(`${at}/roles.ts`, `${header.replace("%s", name)}
import { Blueprint } from "orthograph";
import { ${T} } from "./thing.ts";

${roleNames.map((r) => `// ERPNext's "${r}": ${perms.filter((p) => p.role === r).map((p) => Object.entries(p).filter(([key, x]) => x === 1 && !["permlevel"].includes(key)).map(([key]) => key).join(" ")).join("; ")}.
export const ${roleId(r)} = Blueprint.role(${T}, { rule: ${rule.replace("%s", r)} });`).join("\n")}
`);
  // Nobody granted it (GL Entry's create): only the system does it. ERPNext's "All" is anyone signed in.
  const who = (right) => {
    const granted = [...new Set(perms.filter((p) => p[right] === 1).map((p) => (p.role === "All" ? "Blueprint.signedIn" : roleId(p.role))))];
    return granted.length ? granted : ["Blueprint.system"];
  };
  const fromRoles = (names) => names.filter((n) => !n.startsWith("Blueprint.")).join(", ");
  // From the controllers, not the JSON: submitting or cancelling a voucher posts or reverses its ledger lines.
  const postsLedger = submittable && docs.has("GL Entry");
  const idKey = camel(k.replace(/-/g, "_"));
  const writable = d.fields.filter((f) => f.reqd && !f.read_only && !LAYOUT.has(f.fieldtype) && f.fieldtype !== "Table" && f.fieldname !== "naming_series" && !dynamicTypes.has(f.fieldname));
  for (const [m, [from]] of Object.entries(moves)) {
    const right = { create: "create", post: "create", save: "write", submit: "submit", cancel: "cancel" }[m];
    // A role is a rule on one instance, and a create has none yet: ERPNext's company-wide grant becomes a role on Company,
    // `.of("company")`, once Company is a thing. Until then: a blank, or anyone signed in with --roles open.
    const creates = from.length === 0 && !who(right).includes("Blueprint.system");
    if (creates && rolesMode !== "open") report.blanks++;
    // A todo stands for the whole list, as `ortho add` writes it: one inside the list crashes the compiler (allowed.ts).
    const allowed = creates ? [rolesMode === "open" ? "Blueprint.signedIn" : `Blueprint.todo("ERPNext's ${perms.filter((p) => p[right] === 1).map((p) => p.role).join(" or ")} in the company: a role on Company, .of(\\"company\\")")`] : [...new Set(who(right))];
    const payload = from.length === 0 ? writable.map((f) => `${camel(f.fieldname)}: ${T}.fields.${camel(f.fieldname)}`) : [`${idKey}: ${T}.fields.id`];
    put(`${at}/verbs/${m}.ts`, `${header.replace("%s", name)}
import { Blueprint } from "orthograph";
import { ${T} } from "../thing.ts";
import { machine } from "../machine.ts";
${fromRoles(allowed) ? `import { ${fromRoles(allowed)} } from "../roles.ts";` : ""}${postsLedger && (m === "submit" || m === "cancel") ? `\nimport { GlEntry } from "../../gl-entry/thing.ts";` : ""}

export default Blueprint.operation(${T}, {
  description: ${say(`${past[m]} ${name.toLowerCase()} (ERPNext's ${right}).`.replace(/^\w+ /, (w) => ({ "Created ": "Create a ", "Saved ": "Save a draft ", "Submitted ": "Submit a ", "Cancelled ": "Cancel a ", "Posted ": "Post a " })[w]))},
  payload: { ${payload.join(", ")} },
  answer: { ${idKey}: ${T}.fields.id },
  move: machine.moves.${m},
  allowed: ${allowed[0].startsWith("Blueprint.todo") ? allowed[0] : `[${allowed.join(", ")}]`},
  steps: { record: Blueprint.step.database(${postsLedger && (m === "submit" || m === "cancel") ? `{ writes: [${T}, GlEntry] }` : ""}) },
});
`);
  }
  put(`${at}/verbs/get.ts`, `${header.replace("%s", name)}
import { Blueprint } from "orthograph";
import { ${T} } from "../thing.ts";
${fromRoles(who("read")) ? `import { ${fromRoles(who("read"))} } from "../roles.ts";` : ""}

export default Blueprint.read(${T}, { by: "id", fields: ${say(["state", ...d.fields.filter((f) => f.reqd && !LAYOUT.has(f.fieldtype) && f.fieldtype !== "Table" && f.fieldname !== "naming_series" && !dynamicTypes.has(f.fieldname)).map((f) => camel(f.fieldname))])}, allowed: [${who("read").join(", ")}] });
`);
}

// The shared values: ERPNext's field types that Orthograph has no value for are written here as schemas.
put("blueprint/values/erpnext.ts", `// Scaffolded by spikes/erpnext-doctypes/scaffold.mjs: ERPNext's field types, as values.
import { Blueprint, Schema } from "orthograph";

/** ERPNext's Currency: a signed amount (a return is negative) in the currency's smallest unit, as a decimal string on the wire. */
export const Money = Blueprint.value(Schema.BigIntFromString);
/** ERPNext's Float and Percent: exact decimal text (rates, quantities, percentages), never a binary float. */
export const Decimal = Blueprint.value(Schema.String.check(Schema.isPattern(/^-?\\d+(\\.\\d+)?$/)));
// The Cloudflare host keeps every field in a TEXT column and reads back text, so each value here encodes to text:
// a Schema.Boolean or Schema.Int would come back as "1" and fail to decode.
/** ERPNext's Int. */
export const Count = Blueprint.value(Schema.FiniteFromString);
/** ERPNext's Check: "1" or "0", as ERPNext itself stores it. */
export const Flag = Blueprint.value(Schema.Literals(["0", "1"]));
/** ERPNext's Date: a calendar day, YYYY-MM-DD, with no time and no zone. */
export const Day = Blueprint.value(Schema.String.check(Schema.isPattern(/^\\d{4}-\\d{2}-\\d{2}$/)));
/** ERPNext's Time: a time of day, HH:MM:SS. */
export const TimeOfDay = Blueprint.value(Schema.String.check(Schema.isPattern(/^\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?$/)));
/** A link to ERPNext's Currency doctype: an ISO 4217 code. */
export const CurrencyCode = Blueprint.value(Schema.String.check(Schema.isPattern(/^[A-Z]{3}$/)));
/** A link to ERPNext's DocType: the name of a record type. */
export const DoctypeName = Blueprint.value(Blueprint.text({ max: 140 }));
`);
put("blueprint/values/links.ts", `// Scaffolded by spikes/erpnext-doctypes/scaffold.mjs: an id per doctype linked to but not scaffolded yet.
import { Blueprint } from "orthograph";

${Object.keys(report.linksOut).sort().map((t) => `/** An id of ${t} (${report.linksOut[t].length} links). */\nexport const ${pascal(t)}Ref = Blueprint.value(Blueprint.id(${say(kebab(t).split("-").map((w) => w.slice(0, 2)).join("").slice(0, 6))}));`).join("\n")}
`);

const root = resolve(out);
rmSync(root, { recursive: true, force: true });
for (const f of files) mkdirSync(dirname(join(root, f.path)), { recursive: true }), writeFileSync(join(root, f.path), f.content);
writeFileSync(join(root, "package.json"), say({ name: "@spike/erpnext-books", private: true, type: "module" }) + "\n");
writeFileSync(join(root, "tsconfig.json"), JSON.stringify({ extends: join(here, "../../tsconfig.base.json"), include: ["blueprint/**/*.ts", "generated/**/*.ts", "src/**/*.ts", "journeys/**/*.ts", "blueprint/journeys/**/*.ts"], compilerOptions: { types: ["node", "@cloudflare/workers-types"] } }, null, 2));
symlinkSync(join(here, "../../examples/starter/node_modules"), join(root, "node_modules"));
writeFileSync(join(root, "report.json"), JSON.stringify(report, null, 2));
console.log(`wrote ${files.length} files for ${docs.size} doctypes into ${out} (${report.blanks} blanks)`);
