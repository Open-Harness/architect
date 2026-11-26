// Check 24 (#899, from #670): the generated SDK types a field a caller may not get as optional. A member of a thing's type, or of one of
// its events, ends in `?` exactly when the model says the field may be missing: `optional: true` (`Blueprint.optional`) or a `visibility`
// (a field not every caller is shown). The expected marks come from the compiler's model, never from the generated text. The superagent is
// read as `ortho generate` writes it on a copy, and its checked-in `generated/sdk` must be that output. No app has a field with a
// visibility, so acme's model is given one (`allowance.limit` made secret, as the package's own sdk.test.ts changes a field) and the SDK
// generator is run on it; acme as checked in has neither, so every member stays required. CONTROLS: each planted wrong output (the mark from visibility only, as #670 wrote
// it; every member optional; the things right and the events not; the visibility mark dropped; a member left out) fails.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { pathToFileURL } from "node:url";
import { build, lazy, removeCopies, repo, superagent } from "./app.ts";

afterAll(removeCopies);

interface FieldM { readonly optional?: boolean; readonly visibility?: unknown }
interface ThingM { readonly name: string; readonly identifier: string; readonly fields: Record<string, FieldM>; readonly events: Record<string, Record<string, FieldM>> }
interface ModelM { readonly things: Record<string, ThingM> }
type Files = (thing: string) => string | undefined;

const modelOf = (app: string): ModelM => JSON.parse(execFileSync(process.execPath, [join(repo, "packages/compiler/src/main.ts"), app], { encoding: "utf8", maxBuffer: 1 << 28 })) as ModelM;
const fileOf = (thing: ThingM) => `generated/sdk/src/${thing.name}/types.ts`;

/** The members of `export type <name> = { ... };` in a types file: each name and whether it ends in `?`. */
const membersOf = (text: string, name: string): ReadonlyMap<string, boolean> | undefined => {
  const block = new RegExp(`^export type ${name} = \\{\\n([\\s\\S]*?)^\\};`, "m").exec(text)?.[1];
  return block === undefined ? undefined : new Map([...block.matchAll(/^ {2}readonly "([^"]+)"(\??):/gm)].map((m) => [m[1]!, m[2] === "?"] as const));
};

/** Every member whose mark is not the model's, and every field the type is missing. */
export const problemsOf = (model: ModelM, files: Files): ReadonlyArray<string> =>
  Object.values(model.things).flatMap((t) => {
    const text = files(t.name);
    if (text === undefined) return [`${fileOf(t)} is not there`];
    const types: ReadonlyArray<readonly [string, Record<string, FieldM>]> = [[t.identifier, t.fields], ...Object.entries(t.events)];
    return types.flatMap(([name, fields]) => {
      const got = membersOf(text, name);
      if (got === undefined) return [`${fileOf(t)} has no type ${name}`];
      return Object.entries(fields).flatMap(([k, f]) => {
        const want = f.optional === true || f.visibility !== undefined;
        if (!got.has(k)) return [`${name}.${k} is not in ${fileOf(t)}`];
        return got.get(k) === want ? [] : [`${name}.${k} is ${want ? "optional" : "always there"} in the model, and typed ${got.get(k) ? "optional" : "required"}`];
      });
    });
  });

const acme = join(repo, "examples/acme");
/** Acme's model with `allowance.limit` secret: a field with a visibility, which a caller may not be shown. */
const secretLimit = (m: ModelM): ModelM => {
  const a = m.things["allowance"]!;
  return { ...m, things: { ...m.things, allowance: { ...a, fields: { ...a.fields, limit: { ...a.fields["limit"]!, visibility: "secret" } } } } };
};
const models = { superagent: lazy(() => modelOf(superagent)), acme: lazy(() => secretLimit(modelOf(acme))) };
type SdkTypes = (model: unknown) => { readonly files: ReadonlyArray<{ readonly path: string; readonly content: string }> };
const sdkOf = lazy(async () => {
  const { sdkTypes } = (await import(pathToFileURL(join(repo, "packages/projections/src/modules/sdk/internal/types.ts")).href)) as { readonly sdkTypes: SdkTypes };
  const files = sdkTypes(models.acme()).files;
  return ((thing: string) => files.find((f) => f.path === `generated/sdk/src/${thing}/types.ts`)?.content) as Files;
});
const built = lazy(build);
const generated = (root: string): Files => (thing) => { try { return readFileSync(join(root, `generated/sdk/src/${thing}/types.ts`), "utf8"); } catch { return undefined; } };

describe("24 optional fields in the SDK: the apps", () => {
  it("the models hold what this check reads: optional fields on things and events in the superagent, fields with a visibility in acme", () => {
    const sa = Object.values(models.superagent().things);
    expect(sa.some((t) => Object.values(t.fields).some((f) => f.optional === true)), "an optional field on a superagent thing").toBe(true);
    expect(sa.some((t) => Object.values(t.events).some((e) => Object.values(e).some((f) => f.optional === true))), "an optional field on a superagent event").toBe(true);
  });

  it("the superagent's SDK, as `ortho generate` writes it, marks every field the model may leave out, and no other", () => {
    expect(problemsOf(models.superagent(), generated(built().root))).toEqual([]);
  });

  it("the superagent's checked-in SDK types are what `ortho generate` writes", () => {
    const stale = Object.values(models.superagent().things).filter((t) => generated(superagent)(t.name) !== generated(built().root)(t.name)).map(fileOf);
    expect(stale, "regenerate examples/superagent").toEqual([]);
  });

  it("the SDK still marks a field with a visibility, and no other: acme with a secret limit", async () => {
    expect(problemsOf(models.acme(), await sdkOf())).toEqual([]);
  });

  it("acme as checked in marks nothing: it has no optional field and no field with a visibility", () => {
    expect(problemsOf(modelOf(acme), generated(acme))).toEqual([]);
  });
});

describe("24 optional fields in the SDK: controls", () => {
  // A right output for each app, written from the model alone: each member line of its checked-in files given the model's mark.
  const mark = (model: ModelM, files: Files, how: (want: boolean, thing: string, type: string, field: string) => boolean | "drop"): Files => (thing) => {
    const t = Object.values(model.things).find((x) => x.name === thing);
    const text = files(thing);
    if (t === undefined || text === undefined) return text;
    const types: ReadonlyArray<readonly [string, Record<string, FieldM>]> = [[t.identifier, t.fields], ...Object.entries(t.events)];
    let out = text;
    for (const [name, fields] of types) {
      out = out.replace(new RegExp(`(^export type ${name} = \\{\\n)([\\s\\S]*?)(^\\};)`, "m"), (_all, open: string, body: string, close: string) =>
        open + body.split("\n").flatMap((line) => {
          const m = /^( {2}readonly "([^"]+)")\??(:.*)$/.exec(line);
          if (m === null || fields[m[2]!] === undefined) return [line];
          const f = fields[m[2]!]!;
          const r = how(f.optional === true || f.visibility !== undefined, thing, name, m[2]!);
          return r === "drop" ? [] : [`${m[1]}${r ? "?" : ""}${m[3]}`];
        }).join("\n") + close);
    }
    return out;
  };
  const right = (want: boolean) => want;
  const plants = (app: "superagent" | "acme") => {
    const model = () => models[app]();
    const base: Files = app === "acme" ? generated(acme) : generated(superagent);
    const visibilityOnly = (thing: string, type: string, field: string) => {
      const t = Object.values(model().things).find((x) => x.name === thing)!;
      const f = (type === t.identifier ? t.fields : t.events[type]!)[field]!;
      return f.visibility !== undefined;
    };
    const isOptional = (thing: string, type: string, field: string) => {
      const t = Object.values(model().things).find((x) => x.name === thing)!;
      return (type === t.identifier ? t.fields : t.events[type]!)[field]!.optional === true;
    };
    return { model, base, visibilityOnly, isOptional };
  };

  it("the right output, written from the model, passes for both apps", () => {
    for (const app of ["superagent", "acme"] as const) { const p = plants(app); expect(problemsOf(p.model(), mark(p.model(), p.base, right)), app).toEqual([]); }
  });

  const sa = plants("superagent");
  const ac = plants("acme");
  const planted: ReadonlyArray<readonly [string, () => ModelM, () => Files]> = [
    ["the mark from visibility only (#670)", sa.model, () => mark(sa.model(), sa.base, (_w, t, ty, f) => sa.visibilityOnly(t, ty, f))],
    ["every member optional", sa.model, () => mark(sa.model(), sa.base, () => true)],
    ["the things marked and the events not", sa.model, () => mark(sa.model(), sa.base, (w, t, ty) => (ty === Object.values(sa.model().things).find((x) => x.name === t)!.identifier ? w : false))],
    ["the events marked and the things not", sa.model, () => mark(sa.model(), sa.base, (w, t, ty) => (ty === Object.values(sa.model().things).find((x) => x.name === t)!.identifier ? false : w))],
    ["an optional member left out", sa.model, () => mark(sa.model(), sa.base, (w, t, ty, f) => (sa.isOptional(t, ty, f) ? "drop" : w))],
    ["the visibility mark dropped, optional only", ac.model, () => mark(ac.model(), ac.base, (_w, t, ty, f) => ac.isOptional(t, ty, f))],
    ["every member optional, in acme", ac.model, () => mark(ac.model(), ac.base, () => true)],
  ];
  it.each(planted)("an SDK with %s is refused", (_why, model, files) => {
    expect(problemsOf(model(), files())).not.toEqual([]);
  });
});
