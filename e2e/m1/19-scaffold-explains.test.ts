// Check 19 (M1.44 to M1.48; design/decisions/K16-the-scaffold-explains-itself.md): the scaffold reads the machine and
// explains itself, every path, role and declared error gets a journey stub, `ortho check` says when the blueprint grew
// past a handler that is already yours, and what the runtime can do for a handler (find, refuse, mint, carry an exit
// to every surface, fill an event) it does, from the declaration. Written by the ✍️ author before the build; a builder never edits it, nor
// e2e/fixtures/m1/scaffold-explains/.
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { acme, copyOf, fixtures, removeAt, run, succeeds, textAt } from "./support.ts";

const copies: Array<ReturnType<typeof copyOf>> = [];
const fresh = () => {
  const copy = copyOf(acme);
  copies.push(copy);
  return copy.root;
};
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

const golden = join(fixtures, "scaffold-explains");
const spend = "src/allowance/spend.ts";
const typed = (root: string) => spawnSync(join(root, "node_modules/.bin/tsc"), ["--noEmit", "--pretty", "false"], { cwd: root, encoding: "utf8" });
const edit = (root: string, path: string, from: string, to: string) => {
  const before = textAt(root, path);
  const after = before.replace(from, to);
  expect(after, `${path} no longer holds ${from}`).not.toBe(before);
  writeFileSync(join(root, path), after);
};
const warnings = (out: string) => out.split("\n").filter((l) => /^\s*warning:/.test(l));

const STUBS = [
  "allowance-grant-created-in-active", "allowance-spend-active-to-active", "allowance-spend-active-to-exhausted",
  "allowance-spend-refused-from-exhausted", "allowance-spend-refused-from-revoked", "allowance-revoke-active-to-revoked",
  "allowance-revoke-exhausted-to-revoked", "allowance-revoke-refused-from-revoked",
  // Then per operation and read, in name order: who may call (allowed, then refused), then each declared error.
  "allowance-get-allowed-grantee", "allowance-get-allowed-owner", "allowance-get-refused-not-grantee-or-owner",
  "allowance-grant-refused-not-owner", "allowance-grant-refused-allowance-limit-too-high",
  "allowance-revoke-refused-not-owner",
  "allowance-spend-refused-not-grantee", "allowance-spend-refused-allowance-exceeded",
].map((name) => `blueprint/journeys/${name}.ts`);

describe("M1.44: the scaffold explains itself", () => {
  it("ortho generate writes allowance.spend's scaffold exactly as the golden, and it compiles", () => {
    const root = fresh();
    removeAt(root, spend);
    succeeds(root, "generate");
    expect(textAt(root, spend)).toBe(readFileSync(join(golden, "allowance-spend.ts.golden"), "utf8"));
    const tsc = typed(root);
    expect(tsc.status, tsc.stdout + tsc.stderr).toBe(0);
  });

  it("a handler written from the scaffold stops compiling, at its Match, when the machine gains an outcome", () => {
    const root = fresh();
    writeFileSync(join(root, spend), readFileSync(join(golden, "allowance-spend.ts.golden"), "utf8"));
    succeeds(root, "generate");
    const before = typed(root);
    expect(before.status, `the golden compiles against acme as shipped: ${before.stdout}${before.stderr}`).toBe(0);
    const machine = "blueprint/things/allowance/machine.ts";
    edit(root, machine, `states: ["active", "exhausted", "revoked"]`, `states: ["active", "exhausted", "revoked", "frozen"]`);
    edit(root, machine, `to: ["active", "exhausted"]`, `to: ["active", "exhausted", "frozen"]`);
    succeeds(root, "generate");
    const after = typed(root);
    expect(after.status, after.stdout).not.toBe(0);
    const errors = after.stdout.split("\n").filter((l) => /error TS\d+/.test(l));
    expect(errors.length, after.stdout).toBeGreaterThan(0);
    expect(errors.filter((l) => !l.startsWith(`${spend}(`)), after.stdout).toEqual([]);
  });
});

describe("M1.45: one journey stub per path through the allowance's machine, per role and per declared error", () => {
  it("ortho add journeys allowance writes the sixteen stubs, five exactly as their goldens, and they compile", () => {
    const root = fresh();
    const added = succeeds(root, "add", "journeys", "allowance").out;
    for (const path of STUBS) expect(added, path).toContain(path);
    expect(added.split("\n").filter((l) => l.includes("blueprint/journeys/")), added).toHaveLength(STUBS.length);
    for (const file of readdirSync(join(golden, "journeys"))) {
      expect(textAt(root, `blueprint/journeys/${file.replace(/\.golden$/, "")}`), file).toBe(readFileSync(join(golden, "journeys", file), "utf8"));
    }
    const tsc = typed(root);
    expect(tsc.status, tsc.stdout + tsc.stderr).toBe(0);
  });

  it("never overwrites a stub that is yours: a second run writes nothing and names what is already there", () => {
    const root = fresh();
    succeeds(root, "add", "journeys", "allowance");
    const mine = "blueprint/journeys/allowance-spend-active-to-exhausted.ts";
    writeFileSync(join(root, mine), `${textAt(root, mine)}// mine now\n`);
    const again = run(root, "add", "journeys", "allowance");
    expect(again.status, again.out).not.toBe(0);
    expect(again.out).toMatch(/already there/);
    expect(textAt(root, mine)).toMatch(/\/\/ mine now\n$/);
  });

  it("the model and ortho check count every unfilled stub as blanks, and the model still compiles", () => {
    const root = fresh();
    succeeds(root, "add", "journeys", "allowance");
    const blanks = (JSON.parse(succeeds(root, "model", "--json").stdout) as { blanks?: Record<string, ReadonlyArray<string>> }).blanks ?? {};
    for (const path of STUBS) expect(Object.keys(blanks).some((k) => path.includes(k) || k.includes(path)), `${path} in the model's blanks`).toBe(true);
    const checked = run(root, "check");
    expect(checked.status, checked.out).toBe(1);
    expect(checked.out).not.toMatch(/^model ✘/m);
    for (const path of STUBS) expect(checked.out, path).toMatch(new RegExp(`${path.replaceAll(".", "\\.")}:\\d+`));
  });
});

describe("M1.44: ortho check says when the blueprint grew past a handler that is yours", () => {
  it("control: a new required step on spend is named, as M1.26's warning already does", () => {
    const root = fresh();
    edit(root, "blueprint/things/allowance/verbs/spend.ts", "record: Blueprint.step.database() }", "record: Blueprint.step.database(), notify: Blueprint.step.database() }");
    succeeds(root, "generate");
    const out = succeeds(root, "check").out;
    expect(warnings(out).filter((l) => l.includes(spend) && l.includes("steps.notify")), out).toHaveLength(1);
  });

  it("a new outcome of spend's move that the handler never chooses is named, with the file", () => {
    const root = fresh();
    const machine = "blueprint/things/allowance/machine.ts";
    edit(root, machine, `states: ["active", "exhausted", "revoked"]`, `states: ["active", "exhausted", "revoked", "frozen"]`);
    edit(root, machine, `to: ["active", "exhausted"]`, `to: ["active", "exhausted", "frozen"]`);
    succeeds(root, "generate");
    const out = succeeds(root, "check").out;
    expect(warnings(out).filter((l) => l.includes(spend) && /\bfrozen\b/.test(l)), out).toHaveLength(1);
    expect(warnings(out).filter((l) => /\b(?:active|exhausted)\b/.test(l)), out).toEqual([]);
  });

  it("a new declared error on spend that the handler never refuses with is named, with the file", () => {
    const root = fresh();
    edit(root, "blueprint/things/allowance/errors.ts", "export class AllowanceNotFound", "export class AllowanceFrozen extends Blueprint.error({}, { exit: 45 }) {}\nexport class AllowanceNotFound");
    const verb = "blueprint/things/allowance/verbs/spend.ts";
    edit(root, verb, `import { AllowanceExceeded } from "../errors.ts";`, `import { AllowanceExceeded, AllowanceFrozen } from "../errors.ts";`);
    edit(root, verb, "errors: [AllowanceExceeded]", "errors: [AllowanceExceeded, AllowanceFrozen]");
    succeeds(root, "generate");
    const out = succeeds(root, "check").out;
    expect(warnings(out).filter((l) => l.includes(spend) && l.includes("AllowanceFrozen")), out).toHaveLength(1);
    expect(warnings(out).filter((l) => l.includes("AllowanceExceeded")), out).toEqual([]);
  });
});

const model = (root: string) => JSON.parse(succeeds(root, "model", "--json").stdout) as {
  refusals: Record<string, string>;
  operations: Record<string, { refusals: ReadonlyArray<string> }>;
};

describe("M1.46: the runtime finds what the payload names, and refuses what is missing with a generated <Thing>NotFound", () => {
  it("the model gives person a PersonNotFound at PE-901, adopts allowance's declared AllowanceNotFound at AL-002, and lists them where they apply", () => {
    const m = model(fresh());
    expect(m.refusals).toMatchObject({ PersonNotFound: "PE-901", AllowanceNotFound: "AL-002", AllowanceExceeded: "AL-001", AllowanceLimitTooHigh: "AL-003" });
    // grant names a member no role check reads: a missing one is PersonNotFound. spend's allowance is read by the grantee's
    // role check, so a missing one stays NotAllowed and a stranger learns nothing.
    expect(m.operations["allowance.grant"]!.refusals).toContain("PersonNotFound");
    expect(m.operations["allowance.spend"]!.refusals).not.toContain("AllowanceNotFound");
    expect(m.operations["allowance.spend"]!.refusals).toContain("NotAllowed");
  });
});

describe("M1.47: one refusals table carries code, exit and HTTP status to the CLI, HTTP and MCP", () => {
  it("generated errors.ts exports the table, one row per refusal, and the old exits and codes are read from it", () => {
    const root = fresh();
    succeeds(root, "generate");
    const errors = textAt(root, "generated/api/src/errors.ts");
    expect(errors).toMatch(/^export const refusals = \{$/m);
    for (const row of [
      'AllowanceExceeded: { code: "AL-001", exit: 41, status: 422 },',
      'AllowanceNotActive: { code: "AL-900", exit: 40, status: 409 },',
      'AllowanceNotFound: { code: "AL-002", exit: 43, status: 404 },',
      'PersonNotFound: { code: "PE-901", exit: 4, status: 404 },',
      'NotAllowed: { code: "AR-001", exit: 3, status: 403 },',
    ]) expect(errors, row).toContain(`  ${row}\n`);
    expect(errors).not.toMatch(/^export const exits = \{$/m);
    expect(errors).not.toMatch(/^export const codes = \{$/m);
  });
});

describe("M1.47: an exit means one thing, so the compiler refuses a clash", () => {
  const errors = "blueprint/things/allowance/errors.ts";
  const exceeded = "{ remaining: Amount }, { exit: 41 }";
  const tooHigh = "{ cap: Amount }, { exit: 44 }";
  // Reserved by the runtime: 0 success, 1 a failure that isn't a refusal, 2 a payload that doesn't decode, 3 NotAllowed,
  // 4 the generated <Thing>NotFound (M1.46). Past 125 is the shell's. Within a thing, its errors and its machine's notFrom.
  it.each([
    ["2, a payload that doesn't decode", exceeded, "{ remaining: Amount }, { exit: 2 }", /AllowanceExceeded's exit 2 is (?:SchemaError|InvalidPayload)'s; pick another/],
    ["3, NotAllowed's", exceeded, "{ remaining: Amount }, { exit: 3 }", /AllowanceExceeded's exit 3 is NotAllowed's; pick another/],
    ["4, the generated not-found's", exceeded, "{ remaining: Amount }, { exit: 4 }", /AllowanceExceeded's exit 4 is \w*NotFound's; pick another/],
    ["130, the shell's", exceeded, "{ remaining: Amount }, { exit: 130 }", /AllowanceExceeded's exit 130 is outside 5 to 119/],
    ["41, another error of the same thing", tooHigh, "{ cap: Amount }, { exit: 41 }", /AllowanceLimitTooHigh's exit 41 is AllowanceExceeded's; pick another/],
    ["40, the thing's machine's", exceeded, "{ remaining: Amount }, { exit: 40 }", /AllowanceExceeded's exit 40 is AllowanceNotActive's; pick another/],
  ])("ortho model refuses a declared exit of %s, naming the error and its file", (_, from, to, message) => {
    const root = fresh();
    edit(root, errors, from, to);
    const out = run(root, "model");
    expect(out.status, out.out).not.toBe(0);
    expect(out.out).toMatch(message);
    expect(out.out).toContain(errors);
  });

  it("control: exits are unique per thing, not per app, so acme's two machines both at 40 compile", () => {
    const m = model(fresh());
    expect(m.refusals).toMatchObject({ AllowanceNotActive: "AL-900", InvitationNotPending: "IN-900" });
  });
});

describe("M1.48: an event the runtime can't fill is refused by the compiler, not found at run time", () => {
  it("a field of AllowanceSpent that is in neither the allowance, spend's payload nor its answer is named, with the event and the operation", () => {
    const root = fresh();
    edit(root, "blueprint/things/allowance/events.ts", "memo: Memo, remaining: Amount }", "memo: Memo, remaining: Amount, note: Memo }");
    const out = run(root, "model");
    expect(out.status, out.out).not.toBe(0);
    expect(out.out).toMatch(/AllowanceSpent/);
    expect(out.out).toMatch(/\bnote\b/);
    expect(out.out).toMatch(/allowance\.spend/);
  });

  it("control: a handler whose answer leaves out remaining, which AllowanceSpent needs, does not compile", () => {
    const root = fresh();
    succeeds(root, "generate");
    edit(root, spend, "return { remaining: remaining - amount };", "return {};");
    const tsc = typed(root);
    expect(tsc.status, tsc.stdout).not.toBe(0);
    expect(tsc.stdout).toMatch(/remaining/);
  });
});
