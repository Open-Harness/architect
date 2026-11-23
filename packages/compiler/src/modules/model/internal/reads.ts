// A read in the model: answered from the thing's records with no handler, so no move, no steps, no declared errors; a derived read
// also says what it looks at and adds, and a list read what it pins.
import { Duration } from "effect";
import type { AllowedModel, FieldsModel, OperationModel } from "../types.ts";
import { admitsAgent, type Allowed, type FieldsInput, type Read, type Thing } from "orthograph";
import { Times } from "#modules/time/service.js";
import { camel, type Layout } from "./layout.ts";
import { deriveModel } from "./derive.ts";
import { hashOf } from "./hash.ts";

export interface ReadContext {
  readonly layout: Layout;
  readonly thingNames: ReadonlyMap<Thing, string>;
  readonly problems: Array<string>;
  readonly allowedModel: (entry: Allowed, file: string) => AllowedModel;
  readonly fieldsModel: (fields: FieldsInput, where: string, place: "a payload" | "answer" | "a read answer") => FieldsModel;
  readonly openToAll: (allowed: ReadonlyArray<AllowedModel>) => boolean;
}

export const readModelOf = (c: ReadContext, thing: string, verb: string, file: string, from: OperationModel["from"], read: Read): OperationModel => {
  const { problems, fieldsModel } = c;
  const allowed = read.allowed.map((a) => c.allowedModel(a, file));
  problems.push(...Times.keeper({ file, name: `${thing}.${verb}`, kind: "read", move: undefined, allowed }));
  const list = read.by === "list";
  const t = c.layout.things.get(thing);
  if (list && t?.thing?.lives === "actor") problems.push(`${file}: a list read needs a thing that lives in the database, and ${thing} lives as actors`);
  if (list && read.where.includes("state") && !t?.machine) problems.push(`${file}: where "state" needs ${thing} to have a machine`);
  if (list && (!Number.isInteger(read.page) || (read.page ?? 0) < 1 || (read.page ?? 0) > 1000)) problems.push(`${file}: page must be a whole number from 1 to 1000`);
  const payload = Object.fromEntries(Object.entries(fieldsModel(read.payload, `${file} payload`, "a payload")).map(([k, f]) => [k, read.optional.includes(k) ? { ...f, optional: true as const } : f]));
  const adds = read.derive === undefined ? undefined : fieldsModel(read.derive.adds, `${file} derive adds`, "answer");
  const derive = read.derive === undefined ? undefined : deriveModel(read.derive, file, adds!, { thingNames: c.thingNames, problems });
  const known = (n: string) => n in (t?.thing?.fields ?? {}) || n === "state" || n in (read.derive?.adds ?? {});
  for (const n of read.where) if (!known(n)) problems.push(`${file}: where names ${n}, which is neither a stored field of ${thing} nor one a derive adds`);
  for (const n of Object.keys(read.only ?? {})) if (!known(n)) problems.push(`${file}: only pins ${n}, which is neither a stored field of ${thing} nor one a derive adds`);
  const pinned = Object.keys(read.only ?? {});
  const entry = {
    kind: "read" as const,
    name: `${thing}.${verb}`, thing, verb, identifier: camel(verb), file, from,
    description: list
      ? `List ${thing}s, ${read.order === "newest" ? "newest first" : "oldest first"}, ${read.page} to a page${read.where.length > 0 ? `, filtered by ${read.where.join(", ")}` : ""}.`
      : `Read one ${thing} by its id: ${read.fields.map(String).join(", ")}.`,
    payload, answer: fieldsModel(read.answer, `${file} answer`, "a read answer"),
    move: null, errors: [], breaks: [], refusals: c.openToAll(allowed) ? [] : ["NotAllowed"], allowed, agentTool: admitsAgent(read.allowed),
    steps: {}, idempotent: null, runs: "server" as const, test: "unit" as const,
    budget: read.budget ? { p95Ms: Duration.toMillis(read.budget.p95) } : null,
    ...(list ? { list: { where: read.where.filter((n) => !pinned.includes(n)), order: read.order ?? "newest", page: read.page ?? 0 } } : {}),
    ...(read.only === undefined ? {} : { only: read.only }),
    ...(derive === undefined ? {} : { derive }),
  };
  return { ...entry, hash: hashOf(entry) };
};
