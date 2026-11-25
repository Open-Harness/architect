// #999, the SDK's half: a payload its schema refuses fails `InvalidPayload` naming every refused field, not only the first,
// as the API's 400 does (#988, check 46). Judged on acme's checked-in SDK (`generated/sdk`), as `sdk.test.ts` judges its
// `InvalidPayload`, so the renderer's change only counts once acme is regenerated. Nothing is sent: the server address is
// one nothing listens on. The message never holds a value the caller gave. Red on main, where the SDK encodes with Effect's
// default and stops at the first refused field. One refused field, and a field left out, are the controls.
// Written by #999's checks author. The red cases are listed in packages/projections/expected-failing/invalid-payload-fields.txt (G11).
import { resolve } from "node:path";
import { Cause, Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";

const repo = resolve(import.meta.dirname, "../../../../..");
type Call = (payload: never) => Effect.Effect<unknown, unknown, never>;
type Sdk = { readonly layer: (url: string) => never; readonly organization: { readonly create: Call }; readonly person: { readonly signUp: Call } };

/** The refusal a call fails with, before anything is sent. */
const refused = async (call: (sdk: Sdk) => Call, payload: object) => {
  const sdk = (await import(resolve(repo, "examples/acme/generated/sdk/src/index.ts"))) as Sdk;
  const exit = await Effect.runPromiseExit(call(sdk)(payload as never).pipe(Effect.provide(sdk.layer("http://127.0.0.1:1"))));
  expect(Exit.isFailure(exit), "the call fails").toBe(true);
  const error = Exit.isFailure(exit) ? (Cause.squash(exit.cause) as { readonly _tag?: string; readonly message?: unknown }) : {};
  expect(error._tag).toBe("InvalidPayload");
  return String(error.message);
};
const named = (message: string, field: string) => new RegExp(`(^|[^A-Za-z0-9_])${field}([^A-Za-z0-9_]|$)`).test(message);
const SECRET = "z8Qv3Lm1".repeat(17).slice(0, 129);

const CASES = [
  { why: "two fields wrong at once", call: (s: Sdk) => s.organization.create, payload: { name: "", cap: "15.729" }, names: ["name", "cap"], hides: ["15.729"] },
  { why: "every field of a sign-up wrong", call: (s: Sdk) => s.person.signUp, payload: { email: "s999-not-an-email", password: SECRET, name: "" }, names: ["email", "password", "name"], hides: ["s999-not-an-email", SECRET.slice(0, 8), SECRET.slice(-8)] },
  { why: "one field left out and one wrong", call: (s: Sdk) => s.organization.create, payload: { cap: "15.729" }, names: ["name", "cap"], hides: ["15.729"] },
];

describe("The SDK's InvalidPayload names every refused field", () => {
  for (const c of CASES) {
    it(`${c.why}: names ${c.names.join(", ")}, and no value given`, async () => {
      const message = await refused(c.call, c.payload);
      for (const field of c.names) expect(named(message, field), `names ${field}: ${message}`).toBe(true);
      for (const value of c.hides) expect(message.toLowerCase().includes(value.toLowerCase()), `holds no value given: ${message}`).toBe(false);
    });
  }

  it("one field wrong names that field only (the control)", async () => {
    const message = await refused((s) => s.organization.create, { name: "", cap: 15n });
    expect([named(message, "name"), named(message, "cap")]).toEqual([true, false]);
  });

  it("a field left out is said to be missing (the control)", async () => {
    const message = await refused((s) => s.organization.create, { cap: 15n });
    expect(message).toMatch(/\bname\b[^;]*\bmissing\b/);
  });
});
