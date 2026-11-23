// What an operation's handler starts as: the scaffold says where it came from and is the project's from then on.
// K16 (checks ahead of their build, M1.44 and M1.45): the scaffold reads the machine and explains itself, and a thing's
// machine yields one journey stub per path, allowed and refused. The goldens are the author's, in
// e2e/fixtures/m1/scaffold-explains/; a builder never edits them (AGENTS.md, "Journeys and checks come first").
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import type { RenderedFile } from "./types.ts";
import * as Handlers from "./service.ts";
import { callSteps, renderHandlerScaffold } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const model = JSON.parse(execFileSync(process.execPath, [join(repo, "packages/compiler/src/main.ts"), join(repo, "examples/acme")], { encoding: "utf8" })) as Model;
const golden = join(repo, "e2e/fixtures/m1/scaffold-explains");
const read = (path: string) => readFileSync(join(golden, path), "utf8");

/** One path through a thing's machine, as K16 section e names it. */
type MachinePath =
  | { readonly kind: "allowed"; readonly operation: string; readonly move: string; readonly from: string | null; readonly to: string; readonly emits: string }
  | { readonly kind: "refused"; readonly operation: string; readonly move: string; readonly from: string; readonly refusal: string };

/** The surface K16 adds to this module. Read through the namespace so this file type-checks before it exists. */
interface K16 {
  readonly renderHandlerScaffold: (op: Model["operations"][string], path: string, model: Model) => RenderedFile;
  readonly machinePaths: (model: Model, thing: string) => ReadonlyArray<MachinePath>;
  readonly renderJourneyStubs: (model: Model, thing: string) => ReadonlyArray<RenderedFile>;
}
const k16 = Handlers as unknown as Partial<K16>;
const headerOf = (content: string) => /\/\*\*[\s\S]*?\*\//.exec(content)?.[0] ?? "";

describe("handlers", () => {
  it("scaffolds an operation that calls nothing as one blank per step, in the project's src/", () => {
    const op = model.operations["allowance.spend"]!;
    expect(callSteps(op)).toEqual([]);
    const scaffold = renderHandlerScaffold(op);
    expect(scaffold).toMatchObject({ path: "src/allowance/spend.ts", scaffold: true });
    expect(scaffold.content.split("\n")[0]).toBe("// Scaffolded from blueprint/things/allowance/verbs/spend.ts. Yours from now on.");
  });
});

describe("K16: the scaffold explains itself (M1.44)", () => {
  const op = model.operations["allowance.spend"]!;
  // The model is the third argument: the thing's machine, errors, events and roles are not on the operation.
  const scaffold = () => (renderHandlerScaffold as unknown as K16["renderHandlerScaffold"])(op, "src/allowance/spend.ts", model);

  it("writes allowance.spend's scaffold exactly as the golden: header, steps, refusal, one branch per outcome, the answer", () => {
    expect(scaffold()).toMatchObject({ path: "src/allowance/spend.ts", scaffold: true });
    expect(scaffold().content).toBe(read("allowance-spend.ts.golden"));
  });

  it("opens with a doc block that cites, for each part, the blueprint file it came from", () => {
    const header = headerOf(scaffold().content);
    for (const line of [
      "Who may call, from blueprint/things/allowance/roles.ts:",
      "Payload, from blueprint/things/allowance/verbs/spend.ts:",
      "AllowanceExceeded    exit 41   AL-001",
      "AllowanceNotActive   exit 40   AL-900",
      "NotAllowed           exit 3    AR-001",
      "IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/allowance/verbs/spend.ts",
      "The allowance's machine, from blueprint/things/allowance/machine.ts",
      "▶ active     spend   exhausted  AllowanceSpent",
      "remaining from the answer",
    ]) expect(header, line).toContain(line);
  });

  it("says nothing the model doesn't hold: every declared-looking name in the header is one the model declares", () => {
    const header = headerOf(scaffold().content);
    expect(header, "no doc block yet").not.toBe("");
    const thing = model.things["allowance"]!;
    const fields = Object.values(model.operations).flatMap((o) => [...Object.values(o.payload), ...Object.values(o.answer)]);
    const declared = new Set([...Object.keys(thing.errors), ...Object.keys(thing.events), thing.machine!.notFrom.error, "NotAllowed", "IdempotencyConflict",
      ...fields.flatMap((f) => (f.named ? [f.named] : []))]);
    const names = [...header.matchAll(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b|\b(?:Amount|Memo)\b/g)].map((m) => m[0]);
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((w) => !declared.has(w))).toEqual([]);
  });

  it("marks each secret or private payload and answer field in the header, and says who sees it (M1.35's rule)", () => {
    const spend = model.operations["allowance.spend"]!;
    const memo = { ...spend.payload["memo"]!, visibility: { private: ["allowance.grantee"] } };
    const remaining = { ...spend.answer["remaining"]!, visibility: "secret" as const };
    const op = { ...spend, payload: { ...spend.payload, memo }, answer: { remaining } };
    const header = headerOf((renderHandlerScaffold as unknown as K16["renderHandlerScaffold"])(op, "src/allowance/spend.ts", model).content);
    expect(header).toMatch(/\n \*   memo +Memo \(private: only the grantee of the allowance sees it\)\n/);
    expect(header).toMatch(/\n \*   remaining +Amount \(secret: no caller sees it\)\n/);
    expect(header).toMatch(/\n \*   amount +Amount\n/);
  });
});

describe("K16: the scaffold shows what the runtime hands in (M1.46, through M1.44's scaffold)", () => {
  const grant = () => (renderHandlerScaffold as unknown as K16["renderHandlerScaffold"])(model.operations["allowance.grant"]!, "src/allowance/grant.ts", model).content;

  it("lists the generated not-found refusal for a referenced id no role check reads, with its exit and code", () => {
    // grant's member names a person; the role check reads the organisation, never the person.
    expect(model.operations["allowance.grant"]!.refusals).toContain("PersonNotFound");
    expect(headerOf(grant())).toMatch(/PersonNotFound +exit 4 +PE-901 +the runtime's/);
    expect(model.operations["allowance.spend"]!.refusals).not.toContain("AllowanceNotFound");
  });

  it("says the runtime mints a creating move's id and hands in what the payload references, and answers with the minted id", () => {
    const content = grant();
    expect(headerOf(content)).toMatch(/mints the allowance's new id and hands it in as id/);
    expect(headerOf(content)).toMatch(/refs\.member/);
    expect(content).toMatch(/\{ [^}]*\bid\b[^}]* \}\) =>/);
    expect(content).toMatch(/\n +allowance: id,\n/);
  });
});

describe("K16: one journey stub per path through a thing's machine (M1.45)", () => {
  it("enumerates allowance's eight paths: five allowed transitions and three refused moves, in the machine's order", () => {
    expect(typeof k16.machinePaths, "machinePaths is not exported from the handlers module yet").toBe("function");
    const n = "AllowanceNotActive";
    expect(k16.machinePaths!(model, "allowance")).toEqual([
      { kind: "allowed", operation: "allowance.grant", move: "grant", from: null, to: "active", emits: "AllowanceGranted" },
      { kind: "allowed", operation: "allowance.spend", move: "spend", from: "active", to: "active", emits: "AllowanceSpent" },
      { kind: "allowed", operation: "allowance.spend", move: "spend", from: "active", to: "exhausted", emits: "AllowanceSpent" },
      { kind: "refused", operation: "allowance.spend", move: "spend", from: "exhausted", refusal: n },
      { kind: "refused", operation: "allowance.spend", move: "spend", from: "revoked", refusal: n },
      { kind: "allowed", operation: "allowance.revoke", move: "revoke", from: "active", to: "revoked", emits: "AllowanceRevoked" },
      { kind: "allowed", operation: "allowance.revoke", move: "revoke", from: "exhausted", to: "revoked", emits: "AllowanceRevoked" },
      { kind: "refused", operation: "allowance.revoke", move: "revoke", from: "revoked", refusal: n },
    ]);
  });

  it("gives a thing with no machine no paths, and a creating move no refused path (the runtime never checks it)", () => {
    expect(typeof k16.machinePaths, "machinePaths is not exported from the handlers module yet").toBe("function");
    expect(k16.machinePaths!(model, "person")).toEqual([]);
    expect(k16.machinePaths!(model, "allowance").filter((p) => p.move === "grant" && p.kind === "refused")).toEqual([]);
  });

  it("scaffolds one journey per path in blueprint/journeys/, then per role and per declared error, five of them exactly as their goldens", () => {
    expect(typeof k16.renderJourneyStubs, "renderJourneyStubs is not exported from the handlers module yet").toBe("function");
    const stubs = k16.renderJourneyStubs!(model, "allowance");
    expect(stubs.map((s) => s.path)).toEqual([
      "blueprint/journeys/allowance-grant-created-in-active.ts",
      "blueprint/journeys/allowance-spend-active-to-active.ts",
      "blueprint/journeys/allowance-spend-active-to-exhausted.ts",
      "blueprint/journeys/allowance-spend-refused-from-exhausted.ts",
      "blueprint/journeys/allowance-spend-refused-from-revoked.ts",
      "blueprint/journeys/allowance-revoke-active-to-revoked.ts",
      "blueprint/journeys/allowance-revoke-exhausted-to-revoked.ts",
      "blueprint/journeys/allowance-revoke-refused-from-revoked.ts",
      // Then each operation and read by name: an allowed caller per role a machine stub doesn't already cast, one caller
      // holding none of its roles, and one per declared error.
      "blueprint/journeys/allowance-get-allowed-grantee.ts",
      "blueprint/journeys/allowance-get-allowed-owner.ts",
      "blueprint/journeys/allowance-get-refused-not-grantee-or-owner.ts",
      "blueprint/journeys/allowance-grant-refused-not-owner.ts",
      "blueprint/journeys/allowance-grant-refused-allowance-limit-too-high.ts",
      "blueprint/journeys/allowance-revoke-refused-not-owner.ts",
      "blueprint/journeys/allowance-spend-refused-not-grantee.ts",
      "blueprint/journeys/allowance-spend-refused-allowance-exceeded.ts",
    ]);
    expect(stubs.every((s) => s.scaffold)).toBe(true);
    const from = (file: string) => `// Scaffolded from blueprint/things/allowance/${file}.ts. Yours from now on.`;
    expect(stubs.slice(0, 8).map((s) => s.content.split("\n")[0])).toEqual(stubs.slice(0, 8).map(() => from("machine")));
    expect(stubs.find((s) => s.path.endsWith("spend-refused-allowance-exceeded.ts"))?.content.split("\n")[0]).toBe(from("errors"));
    expect(stubs.find((s) => s.path.endsWith("spend-refused-not-grantee.ts"))?.content.split("\n")[0]).toBe(from("roles"));
    for (const file of readdirSync(join(golden, "journeys"))) {
      const path = `blueprint/journeys/${file.replace(/\.golden$/, "")}`;
      expect(stubs.find((s) => s.path === path)?.content, path).toBe(read(join("journeys", file)));
    }
  });
});

describe("M8.09: a move made by time's journey stubs cast the keeper", () => {
  // acme's revoke, declared as the keeper's alone: the keeper is refused by every other operation, and no one else may call it.
  const timed: Model = { ...model, operations: { ...model.operations, "allowance.revoke": { ...model.operations["allowance.revoke"]!, allowed: [{ kind: "keeper" }] } } };

  it("casts the keeper and calls through s.keeper.run with the due instant left a blank, and refuses someone who is not the keeper", () => {
    const stubs = k16.renderJourneyStubs!(timed, "allowance").filter((s) => s.path.includes("-revoke-"));
    const allowed = stubs.find((s) => s.path.endsWith("revoke-active-to-revoked.ts"))!.content;
    expect(allowed).toContain("cast: { keeper: Blueprint.keeper },");
    expect(allowed).toContain(`s.keeper.run(revoke, Blueprint.todo("allowance.revoke's payload: allowance"), { due: Blueprint.todo("the instant allowance.revoke was due") }),`);
    expect(allowed).not.toContain("someone");
    const refused = stubs.find((s) => s.path.endsWith("revoke-refused-not-the-keeper.ts"))!.content;
    expect(refused).toContain("cast: { someone: Blueprint.anyone },");
    expect(refused).toContain("refuses(Blueprint.NotAllowed)");
    expect(stubs.some((s) => s.path.endsWith("revoke-refused-not-.ts"))).toBe(false);
  });

  it("leaves an operation without the keeper byte for byte as it was", () => {
    const only = (m: Model) => k16.renderJourneyStubs!(m, "allowance").filter((s) => s.path.includes("-grant-") || s.path.includes("-spend-"));
    expect(only(timed)).toEqual(only(model));
  });
});
