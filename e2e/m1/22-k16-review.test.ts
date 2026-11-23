// Check 22 (K16 review, PR #76 at 7430e023): four defects the private reviewer found in M1.44 to M1.48, each planted on a
// copy of acme and judged through the real `ortho`. Written by the ✍️ author before the fix; a builder never edits it.
// The other three live beside the code they judge: packages/language-effect/src/modules/handler/k16-review.test.ts
// (CreatedId, Device refs) and packages/language-effect/src/modules/mcp/k16-review.test.ts (an undefined field).
//
// Each red sits beside a control that passes today, so a red fails for its own reason and never for a broken plant:
//  1. P1. The identity thing is bound explicitly, never found by its `per` id prefix: an app thing whose ids are `per_`
//     reads its own table, and acme's person stays the one the identity keeps (`auth_user`).
//  4. P2. An exit means one thing within what one operation may refuse, across things: an operation listing two things'
//     errors at one exit is refused, naming both.
//  5. P2. A declared exit is a whole number from 5 to 119: 5.5 and NaN are refused like 130.
//  6. P2. Journey stubs are named so two allowed entries of one role (`owner.of("source")`, `owner.of("destination")`)
//     get a file each, and a second `add journeys` refuses as check 19 says ("already there") and overwrites neither.
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { acme, copyOf, run, succeeds, textAt } from "./support.ts";

const copies: Array<ReturnType<typeof copyOf>> = [];
const fresh = () => {
  const copy = copyOf(acme);
  copies.push(copy);
  return copy.root;
};
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

const edit = (root: string, path: string, from: string, to: string) => {
  const before = textAt(root, path);
  const after = before.replace(from, to);
  expect(after, `${path} no longer holds ${from}`).not.toBe(before);
  writeFileSync(join(root, path), after);
};
const write = (root: string, path: string, text: string) => writeFileSync(join(root, path), text);

describe("22.1 (P1): the identity's thing is bound explicitly, not by its id prefix", () => {
  const permit = (root: string) => {
    succeeds(root, "add", "thing", "permit");
    write(root, "blueprint/things/permit/thing.ts", [
      'import { Blueprint } from "orthograph";',
      "",
      "export const Permit = Blueprint.thing({",
      '  description: "A permit, whose ids happen to start per_ as a person\'s do.",',
      '  code: "PM",',
      '  fields: { id: Blueprint.id("per"), title: Blueprint.text() },',
      "});",
      "",
    ].join("\n"));
  };

  it("control: acme's server binds person to the identity's users", () => {
    expect(textAt(acme, "generated/server/main.ts")).toMatch(/people: \{ thing: thingIn\(personThing\), table: "auth_user" \}/);
  });

  it("an app thing whose ids are per_ reads its own table, and person stays the identity's", () => {
    const root = fresh();
    permit(root);
    succeeds(root, "generate");
    const main = textAt(root, "generated/server/main.ts");
    expect(main, "the planted thing is served").toMatch(/permitThing/);
    expect(main, "permit is not read from the identity's users").not.toMatch(/thingIn\(permitThing\), table: "auth_user"/);
    expect(main, "person still is").toMatch(/people: \{ thing: thingIn\(personThing\), table: "auth_user" \}/);
  });
});

describe("22.4 (P2): an exit means one thing within what one operation may refuse, across things", () => {
  const closed = (exit: number) => `import { Blueprint } from "orthograph";\n\nexport class OrganizationClosed extends Blueprint.error({}, { exit: ${exit} }) {}\n`;
  const borrow = (root: string, exit: number) => {
    write(root, "blueprint/things/organization/errors.ts", closed(exit));
    const grant = "blueprint/things/allowance/verbs/grant.ts";
    edit(root, grant, 'import { AllowanceLimitTooHigh } from "../errors.ts";', 'import { AllowanceLimitTooHigh } from "../errors.ts";\nimport { OrganizationClosed } from "../../organization/errors.ts";');
    edit(root, grant, "errors: [AllowanceLimitTooHigh],", "errors: [AllowanceLimitTooHigh, OrganizationClosed],");
  };

  it("control: grant may refuse another thing's error at an exit of its own (46)", () => {
    const root = fresh();
    borrow(root, 46);
    const model = JSON.parse(succeeds(root, "model", "--json").stdout) as { operations: Record<string, { errors: ReadonlyArray<string> }> };
    expect(model.operations["allowance.grant"]?.errors).toEqual(expect.arrayContaining(["AllowanceLimitTooHigh", "OrganizationClosed"]));
  });

  it("ortho model refuses grant refusing AllowanceLimitTooHigh and OrganizationClosed both at exit 44, naming both", () => {
    const root = fresh();
    borrow(root, 44);
    const result = run(root, "model");
    expect(result.status, "ortho model accepted two refusals of allowance.grant at exit 44").not.toBe(0);
    expect(result.out).toMatch(/(OrganizationClosed's exit 44 is AllowanceLimitTooHigh's|AllowanceLimitTooHigh's exit 44 is OrganizationClosed's); pick another/);
  });
});

describe("22.5 (P2): a declared exit is a whole number from 5 to 119", () => {
  const exceeded = "{ remaining: Amount }, { exit: 41 }";
  it("control: 130 is already refused, as outside 5 to 119", () => {
    const root = fresh();
    edit(root, "blueprint/things/allowance/errors.ts", exceeded, "{ remaining: Amount }, { exit: 130 }");
    const result = run(root, "model");
    expect(result.status, result.out).not.toBe(0);
    expect(result.out).toMatch(/AllowanceExceeded's exit 130 is outside 5 to 119/);
  });

  it.each([["5.5", "5.5"], ["NaN", "Number.NaN"]])("ortho model refuses a declared exit of %s, naming the error", (shown, written) => {
    const root = fresh();
    edit(root, "blueprint/things/allowance/errors.ts", exceeded, `{ remaining: Amount }, { exit: ${written} }`);
    const result = run(root, "model");
    expect(result.status, `ortho model accepted AllowanceExceeded at exit ${shown}`).not.toBe(0);
    expect(result.out).toMatch(new RegExp(`AllowanceExceeded's exit ${shown.replace(".", "\\.")} .*pick another`));
  });
});

describe("22.6 (P2): two allowed entries of one role get a journey stub each, and add never overwrites", () => {
  const journeys = (root: string) => readdirSync(join(root, "blueprint/journeys")).filter((f) => f.startsWith("allowance-transfer-allowed-"));
  const transfer = (root: string) => write(root, "blueprint/things/allowance/verbs/transfer.ts", [
    'import { Blueprint } from "orthograph";',
    'import { Allowance } from "../thing.ts";',
    'import { owner } from "../../organization/roles.ts";',
    'import { Organization } from "../../organization/thing.ts";',
    "",
    "export default Blueprint.operation(Allowance, {",
    '  description: "Move an allowance from one organisation to another; an owner of either may.",',
    "  payload: { allowance: Allowance.fields.id, source: Organization.fields.id, destination: Organization.fields.id },",
    "  answer: { allowance: Allowance.fields.id },",
    '  allowed: [owner.of("source"), owner.of("destination")],',
    "});",
    "",
  ].join("\n"));

  it("control: one allowed entry of a role gets one stub (get's grantee and owner)", () => {
    const root = fresh();
    succeeds(root, "add", "journeys", "allowance");
    const got = readdirSync(join(root, "blueprint/journeys")).filter((f) => f.startsWith("allowance-get-allowed-"));
    expect(got.sort()).toEqual(["allowance-get-allowed-grantee.ts", "allowance-get-allowed-owner.ts"]);
  });

  it("owner.of(\"source\") and owner.of(\"destination\") get two distinct stubs, and a second add keeps both as they were", () => {
    const root = fresh();
    transfer(root);
    succeeds(root, "generate");
    succeeds(root, "add", "journeys", "allowance");
    const first = journeys(root);
    expect(first, "one stub per allowed entry").toHaveLength(2);
    const texts = first.map((f) => textAt(root, `blueprint/journeys/${f}`));
    expect(texts.some((t) => t.includes('"source"') || t.includes("source")) && texts.some((t) => t.includes("destination")), "each names its own field").toBe(true);
    for (const f of first) write(root, `blueprint/journeys/${f}`, `${textAt(root, `blueprint/journeys/${f}`)}// mine\n`);
    // A second run refuses and writes nothing, as check 19 decides (K16): the stubs are yours now.
    const again = run(root, "add", "journeys", "allowance");
    expect(again.status, again.out).not.toBe(0);
    expect(again.out).toMatch(/already there/);
    expect(journeys(root).sort()).toEqual([...first].sort());
    for (const f of first) expect(textAt(root, `blueprint/journeys/${f}`), `${f} was overwritten`).toMatch(/\/\/ mine\n$/);
  });
});
