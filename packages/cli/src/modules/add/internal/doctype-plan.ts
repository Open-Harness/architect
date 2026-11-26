// `ortho add thing --from-doctype <file>` (CX-from-doctype): one doctype and its tables, planned against the project's
// model (the prefixes and codes it holds, the things a link may be an edge to), refused whole or written whole.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import type { Model } from "@orthograph/compiler";
import { AddRefused, type FromDoctype, type Written } from "../types.ts";
import { readDoctype, readTables, type Doctype } from "./doctype-read.ts";
import { codeFor, kebabOf, pascalOf, prefixFor, camelField } from "./doctype-names.ts";
import { mapFields, type LinkOut, type Mapped } from "./doctype-fields.ts";
import { assetName, linkFile, render, type Planned, type PlannedLine } from "./doctype-render.ts";

/** D1's limit on a table's columns. A thing is a table: its fields, `state` when it has a machine, and `version`. */
const COLUMNS = 100;

const refuse = (message: string) => Effect.fail(new AddRefused({ message }));

/** The id prefixes and refusal codes the project's things hold already. */
const heldBy = (model: Model) => {
  const things = Object.values(model.things);
  const prefixes = things.flatMap((t) => {
    const id = t.fields["id"]?.value as { readonly type?: string; readonly prefix?: string } | undefined;
    return id?.type === "id" && id.prefix !== undefined ? [id.prefix] : [];
  });
  return { prefixes: new Set(prefixes), codes: new Set(things.map((t) => t.code)) };
};

/** Each project thing's file that still names `identifier`, a link value for the record type now scaffolded. */
const stillNamed = (root: string, model: Model, target: string, identifier: string): ReadonlyArray<string> =>
  Object.keys(model.things).sort().flatMap((thing) => {
    const path = join(root, "blueprint/things", thing, "thing.ts");
    const text = existsSync(path) ? readFileSync(path, "utf8") : "";
    return text.split("\n").flatMap((line) => {
      const field = new RegExp(`^\\s*([A-Za-z0-9_$]+):.*\\b${identifier}\\b`).exec(line)?.[1];
      return field === undefined ? [] : [`${thing}.${field} holds ${/^[aeiou]/i.test(target) ? "an" : "a"} ${target}'s name (${identifier}): change it to ${pascalOf(target)}.fields.id by hand`];
    });
  });

export interface Input {
  readonly root: string;
  /** The doctype's file, as an absolute path. */
  readonly file: string;
  readonly asset: string | undefined;
}

export const planDoctype = (model: Model, input: Input): Effect.Effect<FromDoctype, AddRefused> =>
  Effect.gen(function* () {
    const doctype = yield* readDoctype(input.file);
    if (doctype.table) return yield* refuse(`${doctype.name} is a child table (istable): it is scaffolded with the doctype that holds it`);
    const tables = yield* readTables(doctype);
    const all: ReadonlyArray<Doctype> = [doctype, ...tables.map((t) => t.line)];
    const there = all.map((d) => kebabOf(d.name)).filter((folder) => model.things[folder] !== undefined || existsSync(join(input.root, "blueprint/things", folder)));
    if (there.length > 0) return yield* refuse(`already there, so nothing was written: ${there.join(", ")}${there.length < all.length && !there.includes(kebabOf(doctype.name)) ? " (one parent per line: sharing a table is a modelling call)" : ""}`);


    // Names, in the run's order: the doctype, then its lines in its tables' order, each against the project and the run.
    const held = heldBy(model);
    const names = new Map<string, { readonly folder: string; readonly identifier: string; readonly prefix: string; readonly code: string }>();
    for (const d of all) {
      const code = codeFor(d.name, held.codes);
      if ("none" in code) return yield* refuse(`${d.name}: every refusal code up to four letters is taken (the last tried was ${code.none}), so nothing was written; set \`code\` on a thing to free one`);
      const prefix = prefixFor(d.name, held.prefixes);
      held.codes.add(code.code);
      held.prefixes.add(prefix);
      names.set(d.name, { folder: kebabOf(d.name), identifier: pascalOf(d.name), prefix, code: code.code });
    }

    const asset = input.asset === undefined ? undefined : assetName(input.asset);
    const known = (target: string) => {
      const run = names.get(target);
      if (run !== undefined) return { folder: run.folder, identifier: run.identifier };
      const thing = model.things[kebabOf(target)];
      return thing === undefined ? undefined : { folder: thing.name, identifier: thing.identifier };
    };
    const mapped = new Map<string, Mapped>(all.map((d) => [d.name, mapFields({ doctype: d, prefix: names.get(d.name)?.prefix ?? "", known, asset })]));
    const every = [...mapped.values()];

    const unknown = every.flatMap((m) => m.unknown);
    if (unknown.length > 0) return yield* refuse(`no mapping for these field types yet, so nothing was written: ${unknown.join(", ")}`);
    const currency = every.flatMap((m) => m.currency);
    if (currency.length > 0 && input.asset === undefined) return yield* refuse(`Currency fields need --asset <name>, the asset they count: ${currency.join(", ")}`);
    if (currency.length > 0 && input.asset !== undefined && !existsSync(join(input.root, "blueprint/assets", `${input.asset}.ts`))) return yield* refuse(`--asset ${input.asset}: there is no blueprint/assets/${input.asset}.ts`);

    for (const d of all) {
      const columns = (mapped.get(d.name)?.kept.length ?? 0) + (d === doctype ? 3 : 4);
      if (columns > COLUMNS) return yield* refuse(`${d.name} needs ${columns} columns; the host allows ${COLUMNS}`);
    }

    const planned = (d: Doctype): Planned => {
      const n = names.get(d.name);
      const m = mapped.get(d.name);
      return { doctype: d, folder: n?.folder ?? "", identifier: n?.identifier ?? "", prefix: n?.prefix ?? "", code: n?.code ?? "", kept: m?.kept ?? [], imports: m?.imports ?? { things: new Map(), links: new Map(), asset: false, schema: false }, locals: m?.locals ?? [] };
    };
    const lines: ReadonlyArray<PlannedLine> = tables.map((t) => ({ ...planned(t.line), tableKey: camelField(t.field.fieldname), tableLabel: t.field.label ?? t.field.fieldname }));
    const files = render(planned(doctype), lines, input.asset);
    const clash = files.filter((f) => existsSync(join(input.root, f.path))).map((f) => f.path);
    if (clash.length > 0) return yield* refuse(`already there, so nothing was written: ${clash.join(", ")}`);

    // Link values: written when missing, kept when there; one per target, headed by the doctype given.
    const links = new Map<string, LinkOut>(every.flatMap((m) => m.links).map((l) => [l.file, l]));
    const values: Array<Written> = [];
    const kept: Array<string> = [];
    for (const l of [...links.values()].sort((a, b) => (a.file < b.file ? -1 : 1))) {
      const path = `blueprint/values/${l.file}.ts`;
      if (existsSync(join(input.root, path))) kept.push(path);
      else values.push({ path, content: linkFile(doctype, l.target, l.identifier) });
    }
    const notes = all.flatMap((d) => stillNamed(input.root, model, d.name, `${pascalOf(d.name)}Link`));
    return { write: [...files, ...values], kept, notes };
  });
