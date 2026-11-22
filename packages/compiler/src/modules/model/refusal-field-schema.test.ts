// S-33 (design/goals/03-snags.md), the package half: the compiler refuses a rule's refusal that carries a key field of another schema than the rule's key field.
// Today `refusalOf` (internal/invariants.ts) checks only the NAMES of a refusal's fields against the key, so `HandleTaken({ name: Blueprint.uint(32) })` over a text key compiles;
// the runtime then copies the caller's text into a number field (`settleViolation`, language-effect) and a duplicate claim ends in an internal error (500) instead of the refusal.
// What this reads: only what `Compiler.model` returns (a failure, and what it says). Where the schemas are compared (the model's `ValueMeta`, the schema itself) is the builder's choice.
//   Planted wrongs, each of which must be refused: a number over text, text over a number, another text length, another number width, another id prefix, an optional (`undefined` or `null`)
//   over a required value, an unchecked string over a patterned one, a struct that lacks a member, a struct whose member is another type, one key field right and the other wrong (both ways round),
//   and the stated reproduction (Plugged In's `HandleTaken` carrying `name` as a number).
//   Controls, which must model: the key field itself, its value, a separately declared equal schema (so a builder who compares by reference fails here), an error no rule refuses
//   (its field may be anything), a rule that refuses nothing, a composite key of two equal schemas, and Plugged In itself with `HandleTaken` carrying `name` as its own value.
//   The message is judged: a line must name the thing and the rule (`handle.oneHolderPerTag`) and the field that differs, and never blame the field that matches.
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { Cause, Effect, Exit } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { nodeSource } from "#modules/source/service.js";
import { Compiler } from "./service.ts";

const scratch = resolve(import.meta.dirname, "../../../test/tmp/refusal-field-schema");
afterAll(() => rmSync(scratch, { recursive: true, force: true }));
const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));
/** What a failed model says: the typed failure's problems or message, and the cause as printed. Never a JSON dump of the whole cause. */
const said = (exit: Exit.Exit<unknown, unknown>): string => {
  if (!Exit.isFailure(exit)) return "";
  const own = exit.cause.reasons.filter(Cause.isFailReason).map((r) => r.error).flatMap((e) => {
    const f = e as { readonly problems?: ReadonlyArray<string>; readonly message?: string };
    return [...(f.problems ?? []), ...(typeof f.message === "string" ? [f.message] : [])];
  });
  return [...own, Cause.pretty(exit.cause)].join("\n");
};

// ---- a small project: one thing, `handle`, with the fields a case asks for, one rule and its refusal ----

const THING = (fields: Readonly<Record<string, string>>) => `import { Blueprint, Schema } from "orthograph";
void Schema;
export const Handle = Blueprint.thing({ description: "A name someone holds.", code: "HD", fields: { id: Blueprint.id("hdl"), ${Object.entries(fields).map(([k, d]) => `${k}: ${d}`).join(", ")} } });\n`;
const ERRORS = (refusal: Readonly<Record<string, string>>, busy = "{}") => `import { Blueprint, Schema } from "orthograph";
import { Handle } from "./thing.ts";
void Schema; void Handle;
export class HandleTaken extends Blueprint.error({ ${Object.entries(refusal).map(([k, d]) => `${k}: ${d}`).join(", ")} }, { exit: 10 }) {}
export class HandleBusy extends Blueprint.error(${busy}, { exit: 11 }) {}\n`;
const RULES = (key: ReadonlyArray<string>, refuse: boolean) => `import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";
import { HandleTaken } from "./errors.ts";
void HandleTaken;
export const oneHolderPerTag = Blueprint.invariant.unique(${key.length === 1 ? `Handle.fields.${key[0]}` : `[${key.map((k) => `Handle.fields.${k}`).join(", ")}]`}${refuse ? ", { refuse: HandleTaken }" : ""});\n`;

let n = 0;
const project = (files: Readonly<Record<string, string>>): string => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, `p${n++}-`));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, "blueprint", path)), { recursive: true });
    writeFileSync(join(root, "blueprint", path), text);
  }
  return root;
};

interface Case {
  /** The thing's fields beyond `id`, as written in `thing.ts`. */
  readonly fields: Readonly<Record<string, string>>;
  /** The rule's key. */
  readonly key: ReadonlyArray<string>;
  /** What the refusal carries, as written in `errors.ts`. */
  readonly refusal: Readonly<Record<string, string>>;
  /** The field that differs, when the case is a planted wrong. */
  readonly wrong?: string;
  /** A key field that matches, which a message must not blame. */
  readonly right?: string;
}
const run = (c: Case, extra: { readonly busy?: string; readonly refuse?: boolean } = {}) => modelOf(project({
  "things/handle/thing.ts": THING(c.fields),
  "things/handle/errors.ts": ERRORS(c.refusal, extra.busy),
  "things/handle/invariants.ts": RULES(c.key, extra.refuse ?? true),
}));

/**
 * Whether a message says what a builder needs, read from its lines: one line names the thing and the rule (`handle.oneHolderPerTag`) and the field that differs; no line
 * about the rule names a matching field without the differing one. A message that says only "compile failed" or names a field of another rule is hollow.
 */
const RULE = "handle.oneHolderPerTag";
const meaning = (text: string, wrong: string, right?: string) => {
  const lines = text.split("\n");
  const word = (line: string, w: string) => new RegExp(`(?<![A-Za-z0-9_])${w}(?![A-Za-z0-9_])`).test(line);
  const about = lines.filter((line) => line.includes(RULE));
  return {
    names: lines.some((line) => line.includes(RULE) && word(line, wrong)),
    blames: right === undefined ? false : about.some((line) => word(line, right) && !word(line, wrong)),
  };
};

describe("S-33 controls: the reader tells a good refusal from a hollow one", () => {
  it("passes one line with the rule and the field, and refuses each hollow or misdirected message", () => {
    const good = "blueprint/things/handle/invariants.ts: handle.oneHolderPerTag: HandleTaken carries tag as a number, and the key field tag is text";
    expect(meaning(good, "tag")).toEqual({ names: true, blames: false });
    expect(meaning("compile failed", "tag")).toEqual({ names: false, blames: false });
    expect(meaning("handle.oneHolderPerTag is wrong", "tag"), "the rule without the field").toEqual({ names: false, blames: false });
    expect(meaning("HandleTaken carries tag as a number", "tag"), "the field without the rule").toEqual({ names: false, blames: false });
    expect(meaning("blueprint/things/handle/invariants.ts: handle.otherRule: HandleTaken carries tag", "tag"), "another rule").toEqual({ names: false, blames: false });
    expect(meaning("handle.oneHolderPerTag: HandleTaken carries first", "second", "first"), "the matching field blamed").toEqual({ names: false, blames: true });
    expect(meaning("handle.oneHolderPerTag: HandleTaken carries second\nhandle.oneHolderPerTag: HandleTaken carries first", "second", "first"), "both blamed").toEqual({ names: true, blames: true });
    expect(meaning("handle.oneHolderPerTag: its key is first and second; second differs", "second", "first"), "a key listing both, differing one named").toEqual({ names: true, blames: false });
  });
});

const TEXT = "Blueprint.text({ max: 40 })";
const STRUCT = 'Blueprint.value(Schema.Struct({ kind: Schema.String, id: Schema.String }))';
const planted: Readonly<Record<string, Case>> = {
  "a number over a text key": { fields: { tag: TEXT }, key: ["tag"], refusal: { tag: "Blueprint.uint(32)" }, wrong: "tag" },
  "a text over a number key": { fields: { tag: "Blueprint.uint(32)" }, key: ["tag"], refusal: { tag: TEXT }, wrong: "tag" },
  "a text of another length": { fields: { tag: TEXT }, key: ["tag"], refusal: { tag: "Blueprint.text({ max: 80 })" }, wrong: "tag" },
  "a number of another width": { fields: { tag: "Blueprint.uint(32)" }, key: ["tag"], refusal: { tag: "Blueprint.uint(64)" }, wrong: "tag" },
  "an id of another prefix": { fields: { tag: 'Blueprint.id("per")' }, key: ["tag"], refusal: { tag: 'Blueprint.id("usr")' }, wrong: "tag" },
  "an optional (undefined or the text) over a required text": { fields: { tag: TEXT }, key: ["tag"], refusal: { tag: `Blueprint.value(Schema.UndefinedOr(${TEXT}.schema))` }, wrong: "tag" },
  "a nullable string over a required string": { fields: { tag: "Blueprint.value(Schema.String)" }, key: ["tag"], refusal: { tag: "Blueprint.value(Schema.NullOr(Schema.String))" }, wrong: "tag" },
  "an unchecked string over a patterned one": { fields: { tag: "Blueprint.value(Schema.String.check(Schema.isPattern(/^[a-z]+$/)))" }, key: ["tag"], refusal: { tag: "Blueprint.value(Schema.String)" }, wrong: "tag" },
  "a struct that lacks a member of the key's struct": { fields: { tag: STRUCT }, key: ["tag"], refusal: { tag: "Blueprint.value(Schema.Struct({ kind: Schema.String }))" }, wrong: "tag" },
  "a struct whose member is another type": { fields: { tag: STRUCT }, key: ["tag"], refusal: { tag: "Blueprint.value(Schema.Struct({ kind: Schema.String, id: Schema.Number }))" }, wrong: "tag" },
  // `Blueprint.email()` and `Blueprint.text({ max: 254 })` carry the same meta (`{ type: "text", max: 254 }`) but not the same schema: only email checks the pattern.
  "an email over a text of 254 characters": { fields: { tag: "Blueprint.text({ max: 254 })" }, key: ["tag"], refusal: { tag: "Blueprint.email()" }, wrong: "tag" },
  "a text of 254 characters over an email": { fields: { tag: "Blueprint.email()" }, key: ["tag"], refusal: { tag: "Blueprint.text({ max: 254 })" }, wrong: "tag" },
  "a composite key whose first field is right and second is wrong": {
    fields: { first: TEXT, second: "Blueprint.uint(32)" }, key: ["first", "second"], refusal: { first: TEXT, second: TEXT }, wrong: "second", right: "first",
  },
  "a composite key whose first field is wrong and second is right": {
    fields: { first: TEXT, second: "Blueprint.uint(32)" }, key: ["first", "second"], refusal: { first: "Blueprint.uint(32)", second: "Blueprint.uint(32)" }, wrong: "first", right: "second",
  },
};

describe.each(Object.entries(planted))("S-33: %s is refused", (_way, c) => {
  it("fails the model, on one line naming the thing, the rule and the field that differs, and never blaming the field that matches", async () => {
    const exit = await run(c);
    expect(Exit.isFailure(exit), "the model was made, and the refusal's field was left as another schema than the key's").toBe(true);
    expect(meaning(said(exit), c.wrong!, c.right), said(exit).slice(0, 600)).toEqual({ names: true, blames: false });
  });
});

const controls: Readonly<Record<string, { readonly c: Case; readonly extra?: { readonly busy?: string; readonly refuse?: boolean } }>> = {
  "the key field itself": { c: { fields: { tag: TEXT }, key: ["tag"], refusal: { tag: "Handle.fields.tag" } } },
  "the key field's own value": { c: { fields: { tag: TEXT }, key: ["tag"], refusal: { tag: "Handle.fields.tag.value" } } },
  "a separately declared equal text": { c: { fields: { tag: TEXT }, key: ["tag"], refusal: { tag: "Blueprint.text({ max: 40 })" } } },
  "a separately declared equal number": { c: { fields: { tag: "Blueprint.uint(32)" }, key: ["tag"], refusal: { tag: "Blueprint.uint(32)" } } },
  "a separately declared equal id": { c: { fields: { tag: 'Blueprint.id("per")' }, key: ["tag"], refusal: { tag: 'Blueprint.id("per")' } } },
  "the key field itself, of a struct": { c: { fields: { tag: STRUCT }, key: ["tag"], refusal: { tag: "Handle.fields.tag" } } },
  "a separately declared equal email": { c: { fields: { tag: "Blueprint.email()" }, key: ["tag"], refusal: { tag: "Blueprint.email()" } } },
  "a composite key whose two fields both match": { c: { fields: { first: TEXT, second: "Blueprint.uint(32)" }, key: ["first", "second"], refusal: { first: "Handle.fields.first", second: "Blueprint.uint(32)" } } },
  "an error no rule refuses, whose field is another schema than a key of the same name": {
    c: { fields: { tag: TEXT }, key: ["tag"], refusal: { tag: "Handle.fields.tag" } }, extra: { busy: "{ tag: Blueprint.uint(32) }" },
  },
  "a rule that refuses nothing, with an error of the same name whose field is another schema": {
    c: { fields: { tag: TEXT }, key: ["tag"], refusal: { tag: "Blueprint.uint(32)" } }, extra: { refuse: false },
  },
};

describe.each(Object.entries(controls))("S-33 control: %s models", (_name, { c, extra }) => {
  it("compiles", async () => {
    const exit = await run(c, extra);
    expect(Exit.isSuccess(exit), said(exit)).toBe(true);
  });
});

// ---- the stated reproduction: Plugged In's own handle thing ----

const visible = (from: string) => !basename(from).startsWith(".");
const pluggedIn = resolve(import.meta.dirname, "../../../../../examples/plugged-in");
const pluggedCopy = (taken?: string): string => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "plugged-in-"));
  cpSync(join(pluggedIn, "blueprint"), join(root, "blueprint"), { recursive: true, filter: (path) => visible(path) && basename(path) !== "projections" });
  if (taken === undefined) return root;
  const file = join(root, "blueprint/things/handle/errors.ts");
  const text = readFileSync(file, "utf8").replace('import { Blueprint } from "orthograph";', 'import { Blueprint } from "orthograph";\nimport { Handle } from "./thing.ts";\nvoid Handle;');
  writeFileSync(file, text.replace("class HandleTaken extends Blueprint.error({}", `class HandleTaken extends Blueprint.error({ name: ${taken} }`));
  return root;
};

describe("S-33: Plugged In's handle.oneHolderPerName", () => {
  it("control: an intact Plugged In models", async () => {
    const exit = await modelOf(pluggedCopy());
    expect(Exit.isSuccess(exit), said(exit)).toBe(true);
  });
  it("control: HandleTaken may carry `name` as the handle's own name", async () => {
    const exit = await modelOf(pluggedCopy("Handle.fields.name"));
    expect(Exit.isSuccess(exit), said(exit)).toBe(true);
  });
  it("HandleTaken carrying `name` as a number is refused, naming handle, oneHolderPerName and name (the reproduction)", async () => {
    const exit = await modelOf(pluggedCopy("Blueprint.uint(32)"));
    expect(Exit.isFailure(exit), "ortho model accepted it, and a duplicate claim ends in an internal error").toBe(true);
    const text = said(exit);
    const line = text.split("\n").find((l) => l.includes("handle.oneHolderPerName") && /(?<![A-Za-z0-9_])name(?![A-Za-z0-9_])/.test(l));
    expect(line, text.slice(0, 600)).toBeDefined();
    expect(text.split("\n").some((l) => l.includes("oneNamePerPerson") && /(?<![A-Za-z0-9_])name(?![A-Za-z0-9_])/.test(l)), "blamed the other rule").toBe(false);
  });
});
