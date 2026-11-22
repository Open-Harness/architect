// Check 04 (M5.03): what is declared about `on:`, and what falls out of it. `ortho check` refuses an `on:` whose `allowed`
// does not admit the event's deliverer, an `on:` naming an event no mount includes, two `on:` of one operation taking
// the same event, and a mount named `chain`; and an operation only the system or a service admits is left out of the
// SDK, the CLI and the MCP tools, while its docs page says what calls it (M5-reach-out Q3 and Q4, blast radius
// "compiler" and "projections"; notifications.md "Projections and what gets generated").
//
// The clubs are check 01's (`in` with the bank) and check 02's (`out`). Each refusal is planted by editing one
// declaration, and each unedited club must pass `ortho check`, so a compiler that refuses everything fails here too.
//
// Red today on the missing surface only: `Blueprint.on`, `Blueprint.service`, `Blueprint.system` and the bank's door do
// not exist, so neither club's blueprint loads and `ortho generate` fails.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { club, generated, ortho } from "./support.ts";

const copies: Array<{ readonly root: string; readonly remove: () => void }> = [];
afterAll(() => { for (const copy of copies) copy.remove(); });
const made = (fixture: string, bank: boolean) => {
  const copy = club(fixture, { bank });
  copies.push(copy);
  return generated(copy.root);
};

const SETTLE = "blueprint/things/payment/verbs/settle.ts";
const INVITE = "blueprint/things/notification/verbs/invite.ts";
const ON = "on: [Blueprint.on(bank.events.checkoutCompleted, (e) => ({ payment: e.reference, intent: e.intent }))],";

interface Refusal { readonly what: string; readonly club: "in" | "out"; readonly file: string; readonly from: string; readonly to: string; readonly names: ReadonlyArray<RegExp> }
const REFUSED: ReadonlyArray<Refusal> = [
  { what: "an on: whose allowed does not admit the bank", club: "in", file: SETTLE, from: "allowed: [Blueprint.service(bank)]", to: "allowed: [Blueprint.anyone]", names: [/payment\.settle/, /checkoutCompleted/, /bank/] },
  { what: "an on: of the bank's event whose allowed admits only the system, which is not who delivers it", club: "in", file: SETTLE, from: "allowed: [Blueprint.service(bank)]", to: "allowed: [Blueprint.system]", names: [/payment\.settle/, /checkoutCompleted/, /bank/] },
  { what: "an on: of an event the mount does not include", club: "in", file: SETTLE, from: ON, to: ON.replace("checkoutCompleted", "chargeRefunded"), names: [/payment\.settle/, /chargeRefunded/, /include/i] },
  { what: "two on: of one operation taking the same event", club: "in", file: SETTLE, from: ON, to: `${ON.slice(0, -2)}, Blueprint.on(bank.events.checkoutCompleted, (e) => ({ payment: e.reference, intent: "again" }))],`, names: [/payment\.settle/, /checkoutCompleted/] },
  { what: "an on: of our own event whose allowed does not admit the system", club: "out", file: INVITE, from: "allowed: [Blueprint.system]", to: "allowed: [Blueprint.anyone]", names: [/notification\.invite/, /InvitationSent/, /system/i] },
];

describe("04 M5.03: what is declared about on:", () => {
  for (const which of ["in", "out"] as const) {
    it(`ortho check passes the ${which} club as declared`, () => {
      const run = ortho(made(which, which === "in"), "check");
      expect(run.status, run.stdout + run.stderr).toBe(0);
    });
  }

  for (const refusal of REFUSED) {
    it(`ortho check refuses ${refusal.what}, naming the operation and the event`, () => {
      const root = made(refusal.club, refusal.club === "in");
      const file = join(root, refusal.file);
      const declared = readFileSync(file, "utf8");
      expect(declared.includes(refusal.from), `${refusal.file} lost "${refusal.from}"`).toBe(true);
      writeFileSync(file, declared.replace(refusal.from, refusal.to));
      const run = ortho(root, "check");
      const said = run.stdout + run.stderr;
      expect(run.status, said).toBe(1);
      for (const name of refusal.names) expect(said).toMatch(name);
    });
  }

  it("ortho check refuses a mount named chain, which is the chain host's", () => {
    const root = made("in", true);
    writeFileSync(join(root, "blueprint/adapters/chain.ts"), readFileSync(join(root, "blueprint/adapters/bank.ts"), "utf8"));
    const run = ortho(root, "check");
    const said = run.stdout + run.stderr;
    expect(run.status, said).toBe(1);
    expect(said).toMatch(/\bchain\b/);
    expect(said).toMatch(/blueprint\/adapters\/chain\.ts/);
  });

  it("what only the system or a service admits is left out of the SDK, the CLI and the MCP tools, and its docs say what calls it", () => {
    const outside = (root: string, name: RegExp) => ["sdk", "cli", "mcp"].flatMap((d) => filesUnder(join(root, "generated", d)).filter((f) => name.test(readFileSync(f, "utf8"))));
    const out = made("out", false);
    expect(outside(out, /notification[./]invite|notificationInvite/i)).toEqual([]);
    expect(outside(out, /notification[./]list|notificationList/i).length).toBeGreaterThan(0);
    const docs = readFileSync(join(out, "generated/docs/notification/invite.md"), "utf8");
    expect(docs).toMatch(/InvitationSent/);
    expect(docs).toMatch(/Pinged/);
    expect(docs).toMatch(/called by the system/i);
    const into = made("in", true);
    expect(outside(into, /payment[./]settle|paymentSettle/i)).toEqual([]);
    expect(outside(into, /payment[./]start|paymentStart/i).length).toBeGreaterThan(0);
    const settle = readFileSync(join(into, "generated/docs/payment/settle.md"), "utf8");
    expect(settle).toMatch(/checkoutCompleted/);
    expect(settle).toMatch(/called by the service `?bank`?/i);
  });
});

const filesUnder = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? filesUnder(join(dir, e.name)) : [join(dir, e.name)]));
