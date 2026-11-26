// A doctype's fields as an Orthograph thing's (CX-from-doctype, "What it writes"): each ERPNext field type to its value,
// layout and derived fields dropped, a link to a thing in the project an edge, to one not scaffolded the target's name.
import type { DocField, Doctype } from "./doctype-read.ts";
import { article, camelField, kebabOf, pascalField, pascalOf } from "./doctype-names.ts";

/** Layout, not data: dropped whatever else the field says. */
const LAYOUT = new Set(["Section Break", "Column Break", "Tab Break", "HTML", "Button", "Heading", "Image", "Fold"]);
const SHORT = new Set(["Data", "Read Only", "Attach", "Attach Image"]);
const LONG = new Set(["Small Text", "Text", "Long Text", "Text Editor", "Code"]);

/** What a thing's file imports: things by folder, link values by file, the asset, and `Schema` for a Time value. */
export interface Imports {
  readonly things: Map<string, string>;
  readonly links: Map<string, string>;
  asset: boolean;
  schema: boolean;
}

/** One field kept: its key, the declaration written for it, and what the payloads need to know. */
export interface Kept {
  readonly key: string;
  readonly field: DocField;
  readonly declaration: string;
}

/** A link to a record type not scaffolded: its value's file and export, and the field that names it. */
export interface LinkOut {
  readonly target: string;
  readonly file: string;
  readonly identifier: string;
}

export interface Mapped {
  readonly kept: ReadonlyArray<Kept>;
  /** `<Doctype>.<fieldname> (<fieldtype>)`, each field whose type has no mapping. */
  readonly unknown: ReadonlyArray<string>;
  /** `<Doctype>.<fieldname>`, each Currency field kept. */
  readonly currency: ReadonlyArray<string>;
  readonly imports: Imports;
  /** Values declared in the thing's own file (a Time field's). */
  readonly locals: ReadonlyArray<string>;
  readonly links: ReadonlyArray<LinkOut>;
}

export interface Context {
  /** The doctype the fields are its, and its id prefix, for a link to itself. */
  readonly doctype: Doctype;
  readonly prefix: string;
  /** A thing in the project or written by this run, by its doctype's name: its folder and its export. */
  readonly known: (doctype: string) => { readonly folder: string; readonly identifier: string } | undefined;
  /** The asset's import name, when `--asset` was given. */
  readonly asset: string | undefined;
}

/** Whether the field is data the thing keeps (or a table): layout, virtual, naming and derived fields are not. */
export const keeps = (d: Doctype, f: DocField): boolean => {
  if (LAYOUT.has(f.fieldtype) || f.virtual || f.fieldname === "naming_series") return false;
  if (d.submittable && (f.fieldname === "status" || f.fieldname === "amended_from")) return false;
  // The Link naming a Dynamic Link's doctype: `refAny` carries it.
  return !d.fields.some((other) => other.fieldtype === "Dynamic Link" && !other.virtual && other.options === f.fieldname);
};

/** A field is required with `reqd`, a default, or as a Check. */
export const required = (f: DocField) => f.reqd || f.default !== undefined || f.fieldtype === "Check";

const TIME = String.raw`Blueprint.value(Schema.String.check(Schema.isPattern(/^\d{2}:\d{2}:\d{2}(\.\d+)?$/)))`;

/** The field's value, as written in the thing's file, and what its description adds; undefined for a type with no mapping. */
const valueOf = (ctx: Context, f: DocField, imports: Imports, locals: Array<string>, links: Array<LinkOut>): { readonly value: string; readonly note: string } | undefined => {
  const plain = (value: string) => ({ value, note: "" });
  const t = f.fieldtype;
  if (t === "Data" && f.options === "Email") return plain("Blueprint.email()");
  if (SHORT.has(t)) return plain("Blueprint.text({ max: 140 })");
  if (LONG.has(t)) return plain("Blueprint.text({ max: 65535 })");
  if (t === "Select") {
    const options = f.options.split("\n").map((o) => o.trim()).filter((o) => o !== "");
    return plain(options.length === 0 ? "Blueprint.text({ max: 140 })" : `Blueprint.oneOf(${JSON.stringify([...new Set(options)])})`);
  }
  if (t === "Check") return plain("Blueprint.bool()");
  if (t === "Int") return plain("Blueprint.decimal({ places: 0 })");
  if (t === "Float" || t === "Percent") return plain(`Blueprint.decimal({ places: ${f.precision ?? 9} })`);
  if (t === "Currency") {
    imports.asset = true;
    return plain(`Blueprint.money(${ctx.asset ?? "asset"}, { signed: true })`);
  }
  if (t === "Date") return plain("Blueprint.day()");
  if (t === "Datetime") return plain("Blueprint.instant()");
  if (t === "Time") {
    const name = `${pascalOf(ctx.doctype.name)}${pascalField(f.fieldname)}`;
    imports.schema = true;
    locals.push(`/** ${ctx.doctype.name}'s ${f.label ?? f.fieldname}: a time of day, HH:MM:SS, with optional fractions of a second. */\nexport const ${name} = ${TIME};`);
    return plain(name);
  }
  if (t === "Dynamic Link") return plain("Blueprint.refAny()");
  if (t === "Link" && f.options !== "") {
    if (f.options === ctx.doctype.name) return plain(`Blueprint.id(${JSON.stringify(ctx.prefix)})`);
    const there = ctx.known(f.options);
    if (there !== undefined) {
      imports.things.set(there.folder, there.identifier);
      return plain(`${there.identifier}.fields.id`);
    }
    const link = { target: f.options, file: `${kebabOf(f.options)}-link`, identifier: `${pascalOf(f.options)}Link` };
    imports.links.set(link.file, link.identifier);
    links.push(link);
    return { value: link.identifier, note: ` (${article(f.options)} ${f.options}'s name)` };
  }
  return undefined;
};

/** Every field the doctype keeps, in the JSON's order, with what it refuses and what it needs. Tables are left to the caller. */
export const mapFields = (ctx: Context): Mapped => {
  const imports: Imports = { things: new Map(), links: new Map(), asset: false, schema: false };
  const [kept, unknown, currency, locals, links] = [[] as Array<Kept>, [] as Array<string>, [] as Array<string>, [] as Array<string>, [] as Array<LinkOut>];
  for (const f of ctx.doctype.fields) {
    if (!keeps(ctx.doctype, f) || (f.fieldtype === "Table" && !ctx.doctype.table)) continue;
    const mapped = valueOf(ctx, f, imports, locals, links);
    if (mapped === undefined) {
      unknown.push(`${ctx.doctype.name}.${f.fieldname} (${f.fieldtype})`);
      continue;
    }
    if (f.fieldtype === "Currency") currency.push(`${ctx.doctype.name}.${f.fieldname}`);
    const description = `${f.label ?? f.fieldname}${mapped.note}${f.default === undefined ? "" : ` (ERPNext's default: ${f.default})`}`;
    const value = required(f) ? mapped.value : `Blueprint.optional(${mapped.value})`;
    kept.push({ key: camelField(f.fieldname), field: f, declaration: `Blueprint.described(${value}, ${JSON.stringify(description)})` });
  }
  return { kept, unknown, currency, imports, locals, links };
};
