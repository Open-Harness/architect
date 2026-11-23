// M2.04, the unit seam: `Blueprint.layer(plugin, factory)` hands the plugin's own code its secrets as `Redacted`, never as a
// string (design/frame/secrets.md, "Using one"; M2-auth, smaller calls, row 9: `({ secrets, settings, db }) => …`, settings
// typed empty). The generated server is the one place that reads the environment; it hands each layer a `made` record.
//
// Assumptions beyond those documents (the PR for this check lists them for the lead):
//  1. `Blueprint.layer(plugin, factory)` is a function of the `made` record, `({ secrets, settings?, db? })`, and answers what
//     the factory's Effect answers (M2-auth's `export default (made: { db; secrets; settings }) => …`).
//  2. `made.secrets` is a record by the export's name (`signingKey`, not the environment's SIGNING_KEY) of `Redacted<string>`,
//     already wrapped by the server; the factory reads one with `yield* secrets.<export>` (frame/secrets.md), which answers the
//     `Redacted`, and fails for one that was not handed.
//  3. `settings` is an empty record in M2.04, so M2.06's settings need no change of signature.
//
// `Blueprint` is read loosely so this file type-checks before and after the surface exists.
import { Cause, Effect, Exit, Redacted } from "effect";
import { inspect } from "node:util";
import { describe, expect, it } from "vitest";
import { Blueprint } from "../../index.ts";

interface Made { readonly secrets: Readonly<Record<string, unknown>>; readonly settings?: Readonly<Record<string, unknown>> }
type Factory<A> = (made: { readonly secrets: Readonly<Record<string, Effect.Effect<Redacted.Redacted<string>, unknown>>>; readonly settings: Readonly<Record<string, unknown>> }) => Effect.Effect<A, unknown>;
const layerOf = <A>(factory: Factory<A>): (made: Made) => Effect.Effect<A, unknown> => {
  const surface = Blueprint as unknown as { readonly layer?: (plugin: unknown, factory: Factory<A>) => (made: Made) => Effect.Effect<A, unknown> };
  if (typeof surface.layer !== "function") throw new Error("Blueprint.layer is not there: M2.04 adds it");
  return surface.layer(Blueprint.feature({ description: "A plugin that needs a key.", needs: [] }), factory);
};

const KEY = "sk_live_NOT-A-REAL-KEY-6c1d8e";
const OTHER = "whsec_NOT-A-REAL-SECRET-2b9f04";

describe("M2.04 Blueprint.layer hands a plugin its secrets as Redacted", () => {
  it("the factory reads a secret with `yield* secrets.<export>` and gets a Redacted, not a string", async () => {
    const seen = await Effect.runPromise(layerOf(({ secrets }) => Effect.gen(function* () {
      const key = yield* secrets["signingKey"]!;
      return { key, redacted: Redacted.isRedacted(key), type: typeof key };
    }))({ secrets: { signingKey: Redacted.make(KEY) } }));
    expect(seen.redacted).toBe(true);
    expect(seen.type).not.toBe("string");
    expect(Redacted.value(seen.key)).toBe(KEY);
  });

  it("what it is handed prints, serialises and inspects as <redacted>, and shows no part of the value", async () => {
    const key = await Effect.runPromise(layerOf(({ secrets }) => secrets["signingKey"]!)({ secrets: { signingKey: Redacted.make(KEY) } }));
    const shown = [String(key), JSON.stringify(key), inspect(key, { depth: 5 }), `${JSON.stringify({ key })}`, `${inspect({ nested: { key } }, { depth: 8 })}`];
    for (const text of shown) for (let at = 0; at + 6 <= KEY.length; at++) expect(text, `no six characters of it at ${at}`).not.toContain(KEY.slice(at, at + 6));
    expect(String(key)).toBe("<redacted>");
  });

  it("each secret is the one handed under its own export name: three, none swapped", async () => {
    const third = "ledger_NOT-A-REAL-KEY-91ac3e";
    const three = await Effect.runPromise(layerOf(({ secrets }) => Effect.gen(function* () {
      return { a: Redacted.value(yield* secrets["signingKey"]!), b: Redacted.value(yield* secrets["webhookSigning"]!), c: Redacted.value(yield* secrets["ledgerKey"]!) };
    }))({ secrets: { signingKey: Redacted.make(KEY), webhookSigning: Redacted.make(OTHER), ledgerKey: Redacted.make(third) } }));
    expect(three).toEqual({ a: KEY, b: OTHER, c: third });
  });

  it("a secret that was not handed fails the Effect, with no value of any other secret in the failure", async () => {
    const exit = await Effect.runPromiseExit(layerOf(({ secrets }) => secrets["signingKey"]!)({ secrets: { webhookSigning: Redacted.make(OTHER) } }));
    expect(Exit.isFailure(exit) && Cause.hasFails(exit.cause) && !Cause.hasDies(exit.cause), "a typed failure the plugin can handle, not a defect").toBe(true);
    expect(JSON.stringify(exit, (_k, v: unknown) => (v instanceof Error ? { message: v.message, name: v.name } : v))).not.toContain(OTHER);
    expect(inspect(exit, { depth: 10 })).not.toContain(OTHER);
  });

  it("an error the plugin's own code raises with a secret in hand shows nothing of it when the cause is printed", async () => {
    const exit = await Effect.runPromiseExit(layerOf(({ secrets }) => Effect.gen(function* () {
      const key = yield* secrets["signingKey"]!;
      return yield* Effect.fail({ _tag: "Rejected", key });
    }))({ secrets: { signingKey: Redacted.make(KEY) } }));
    expect(Exit.isFailure(exit)).toBe(true);
    expect(inspect(exit, { depth: 10 })).not.toContain(KEY);
    expect(JSON.stringify(exit)).not.toContain(KEY);
  });

  it("`settings` is an empty record in M2.04: the signature M2.06 fills needs no change", async () => {
    const settings = await Effect.runPromise(layerOf(({ settings }) => Effect.succeed(settings))({ secrets: {} }));
    expect(settings).toEqual({});
  });
});
