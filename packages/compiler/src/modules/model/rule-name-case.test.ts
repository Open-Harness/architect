// S-34 (design/goals/03-snags.md), the package half: the compiler refuses two rules of one thing whose names match when case is ignored (`byURL` and `byUrl`).
// Today it accepts them, and the migration (`packages/projections/.../worker-config.ts`, `CREATE UNIQUE INDEX "<thing>_<rule>"`) writes two index names that SQLite compares without
// regard to case: the second fails with "index handle_byUrl already exists" and the world's migrations never finish.
// What this reads: only what `Compiler.model` returns (a failure, and what it says). Where the refusal is made is the builder's choice.
//   Planted wrongs, each refused: `byURL` and `byUrl`, an all-upper-case and an all-lower-case pair, a pair where one letter's case differs, and three rules of which two collide
//   (the message names those two and not the third).
//   Controls, which must model: two different names (also two that differ by a letter, so a builder who compares too loosely fails), the same name on two different things
//   (their indexes are prefixed by the thing), and one rule alone.
//   The message is judged: one line names the thing and both rules; a hollow or misdirected message is refused.
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Cause, Effect, Exit } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { nodeSource } from "#modules/source/service.js";
import { Compiler } from "./service.ts";

const scratch = resolve(import.meta.dirname, "../../../test/tmp/rule-name-case");
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

const THING = (code: string) => `import { Blueprint } from "orthograph";
export const Handle = Blueprint.thing({ description: "A name someone holds.", code: "${code}", fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }), owner: Blueprint.text({ max: 40 }) } });\n`;
/** Rules by name, each over `name` or `owner` in turn. */
const RULES = (names: ReadonlyArray<string>) => `import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";
${names.map((n, i) => `export const ${n} = Blueprint.invariant.unique(Handle.fields.${i % 2 === 0 ? "name" : "owner"});`).join("\n")}\n`;

let n = 0;
/** Things by name, each with its rules. */
const project = (things: Readonly<Record<string, ReadonlyArray<string>>>): string => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, `p${n++}-`));
  Object.entries(things).forEach(([thing, names], i) => {
    for (const [file, text] of Object.entries({ "thing.ts": THING(["HD", "LK"][i] ?? "XX"), "invariants.ts": RULES(names) })) {
      mkdirSync(join(root, "blueprint/things", thing), { recursive: true });
      writeFileSync(join(root, "blueprint/things", thing, file), text);
    }
  });
  return root;
};

const word = (line: string, w: string) => new RegExp(`(?<![A-Za-z0-9_])${w}(?![A-Za-z0-9_])`).test(line);
/** One line names the thing and both rules (case as written); no line names the innocent one. */
const meaning = (text: string, thing: string, a: string, b: string, innocent?: string) => ({
  both: text.split("\n").some((l) => word(l, thing) && word(l, a) && word(l, b)),
  blames: innocent === undefined ? false : text.split("\n").some((l) => word(l, innocent)),
});

describe("S-34 controls: the reader tells a good refusal from a hollow one", () => {
  it("passes one line with the thing and both rules, and refuses each hollow or misdirected message", () => {
    const good = "blueprint/things/handle/invariants.ts: handle.byURL and handle.byUrl differ only in case, and an index name is not case-sensitive";
    expect(meaning(good, "handle", "byURL", "byUrl", "other")).toEqual({ both: true, blames: false });
    expect(meaning("compile failed", "handle", "byURL", "byUrl")).toEqual({ both: false, blames: false });
    expect(meaning("handle.byURL is a duplicate", "handle", "byURL", "byUrl"), "one rule only").toEqual({ both: false, blames: false });
    expect(meaning("rules byURL and byUrl collide", "handle", "byURL", "byUrl"), "no thing").toEqual({ both: false, blames: false });
    expect(meaning("handle.byurl and handle.byUrl differ only in case", "handle", "byURL", "byUrl"), "a rule spelled otherwise").toEqual({ both: false, blames: false });
    expect(meaning("handle.byURL and handle.byUrl and handle.other collide", "handle", "byURL", "byUrl", "other"), "the innocent rule blamed").toEqual({ both: true, blames: true });
  });
});

const planted: Readonly<Record<string, { readonly names: ReadonlyArray<string>; readonly a: string; readonly b: string; readonly innocent?: string }>> = {
  "byURL and byUrl": { names: ["byURL", "byUrl"], a: "byURL", b: "byUrl" },
  "an all-upper-case and an all-lower-case pair": { names: ["BYOWNER", "byowner"], a: "BYOWNER", b: "byowner" },
  "a pair where one letter's case differs": { names: ["claimedByName", "claimedbyName"], a: "claimedByName", b: "claimedbyName" },
  "two that collide among three rules": { names: ["byUrl", "oneHolder", "byURL"], a: "byUrl", b: "byURL", innocent: "oneHolder" },
};

describe.each(Object.entries(planted))("S-34: %s on one thing is refused", (_way, { names, a, b, innocent }) => {
  it("fails the model, on one line naming the thing and both rules, and never blaming a rule that collides with none", async () => {
    const exit = await modelOf(project({ handle: names }));
    expect(Exit.isFailure(exit), "the model was made, and the second index cannot be created").toBe(true);
    expect(meaning(said(exit), "handle", a, b, innocent), said(exit).slice(0, 600)).toEqual({ both: true, blames: false });
  });
});

const controls: Readonly<Record<string, Readonly<Record<string, ReadonlyArray<string>>>>> = {
  "two different names": { handle: ["byUrl", "byName"] },
  "two names that differ by a letter": { handle: ["byUrl", "byUrls"] },
  "the same name on two different things": { handle: ["byName", "byOwner"], link: ["byName", "byOwner"] },
  "the same name differing in case on two different things": { handle: ["byUrl"], link: ["byURL"] },
  "one rule alone": { handle: ["byUrl"] },
};

describe.each(Object.entries(controls))("S-34 control: %s models", (_name, things) => {
  it("compiles", async () => {
    const exit = await modelOf(project(things));
    expect(Exit.isSuccess(exit), said(exit)).toBe(true);
  });
});
