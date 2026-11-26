// Reading a doctype's JSON and its child tables' (CX-from-doctype). ERPNext's JSON is outside data: what it holds is
// read loosely, then put in a shape of our own, so a flag written `1`, `true` or `"1"` reads the same.
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { Effect, Schema } from "effect";
import { AddRefused } from "../types.ts";

const Loose = Schema.optionalKey(Schema.Unknown);
const FieldJson = Schema.Struct({
  fieldname: Schema.String,
  fieldtype: Schema.String,
  label: Loose,
  options: Loose,
  reqd: Loose,
  read_only: Loose,
  is_virtual: Loose,
  default: Loose,
  precision: Loose,
});
const DoctypeJson = Schema.Struct({
  name: Schema.String,
  description: Loose,
  istable: Loose,
  is_submittable: Loose,
  fields: Schema.Array(FieldJson),
  permissions: Schema.optionalKey(Schema.Array(Schema.Record(Schema.String, Schema.Unknown))),
});

/** One field of a doctype, as the command reads it. */
export interface DocField {
  readonly fieldname: string;
  readonly fieldtype: string;
  readonly label: string | undefined;
  readonly options: string;
  readonly reqd: boolean;
  readonly readOnly: boolean;
  readonly virtual: boolean;
  readonly default: string | undefined;
  readonly precision: number | undefined;
}

/** A doctype, with the file it came from: `file` is its name alone, for the scaffold line. */
export interface Doctype {
  readonly name: string;
  readonly description: string | undefined;
  readonly table: boolean;
  readonly submittable: boolean;
  readonly fields: ReadonlyArray<DocField>;
  readonly permissions: ReadonlyArray<Readonly<Record<string, unknown>>>;
  readonly path: string;
  readonly file: string;
}

export const flag = (x: unknown): boolean => x === 1 || x === true || x === "1";
const text = (x: unknown): string | undefined => (typeof x === "string" ? x : typeof x === "number" ? String(x) : undefined);
const nonEmpty = (x: unknown): string | undefined => {
  const t = text(x);
  return t === undefined || t === "" ? undefined : t;
};

const fieldOf = (f: typeof FieldJson.Type): DocField => {
  const precision = nonEmpty(f.precision);
  return {
    fieldname: f.fieldname,
    fieldtype: f.fieldtype,
    label: nonEmpty(f.label),
    options: text(f.options) ?? "",
    reqd: flag(f.reqd),
    readOnly: flag(f.read_only),
    virtual: flag(f.is_virtual),
    default: nonEmpty(f.default),
    precision: precision !== undefined && /^\d+$/.test(precision) ? Number(precision) : undefined,
  };
};

/** The doctype in `path`, or a refusal saying why it can't be read. */
export const readDoctype = (path: string): Effect.Effect<Doctype, AddRefused> =>
  Effect.try({ try: () => readFileSync(path, "utf8"), catch: () => new AddRefused({ message: `could not read ${path}` }) }).pipe(
    Effect.flatMap((raw) => Schema.decodeUnknownEffect(Schema.fromJsonString(DoctypeJson))(raw)),
    Effect.mapError((e) => (e instanceof AddRefused ? e : new AddRefused({ message: `${path} isn't a doctype's JSON (a name and its fields): ${e.message.split("\n")[0] ?? ""}` }))),
    Effect.map((d) => ({
      name: d.name,
      description: nonEmpty(d.description),
      table: flag(d.istable),
      submittable: flag(d.is_submittable),
      fields: d.fields.map(fieldOf),
      permissions: d.permissions ?? [],
      path,
      file: basename(path),
    })),
  );

/** Where a table's doctype is looked for: beside the file, then in ERPNext's own layout, a folder of its name beside the file's. */
export const tablePaths = (beside: string, doctype: string): readonly [string, string] => {
  const snake = doctype.toLowerCase().replace(/ /g, "_");
  const dir = dirname(beside);
  return [join(dir, `${snake}.json`), join(dir, "..", snake, `${snake}.json`)];
};

/** Each of the doctype's tables, read from beside it; a table whose file is in neither place is refused, naming both. */
export const readTables = (doctype: Doctype): Effect.Effect<ReadonlyArray<{ readonly field: DocField; readonly line: Doctype }>, AddRefused> => {
  const tables = doctype.fields.filter((f) => f.fieldtype === "Table" && !f.virtual);
  const missing = tables.flatMap((f) => {
    const paths = tablePaths(doctype.path, f.options);
    return paths.some((p) => existsSync(p)) ? [] : [`${doctype.name}.${f.fieldname} is a table of ${f.options}, whose file is in neither ${paths[0]} nor ${paths[1]}`];
  });
  if (missing.length > 0) return Effect.fail(new AddRefused({ message: `nothing was written: ${missing.join("; ")}` }));
  return Effect.forEach(tables, (field) => {
    const [first, second] = tablePaths(doctype.path, field.options);
    return readDoctype(existsSync(first) ? first : second).pipe(Effect.map((line) => ({ field, line })));
  });
};
