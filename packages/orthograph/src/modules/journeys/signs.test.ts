// J1 (#1190, CX-journey-signs): a cast member signs a message. `s.<name>.signs` is a step's call, a tagged template of
// literal text and refs, and `s.<name>.signer` is a ref to their key's address. Only the description is judged here; `prove`
// runs it (`packages/prove/src/modules/journeys/signs.test.ts`). Written by J1's checks author; a builder never edits it.
//
// The surface is reached through `Signing`, written out below, so this file compiles before the builder adds it to `Actor`.
import { describe, expect as want, it } from "vitest";
import { Roles } from "#modules/roles/service.js";
import { Journeys, Scripting } from "./service.ts";

/** What CX-journey-signs adds to a cast member, as a script sees them. */
interface Signing {
  readonly signs: {
    (strings: TemplateStringsArray, ...values: ReadonlyArray<unknown>): unknown;
    (message: string | ReadonlyArray<unknown>): unknown;
  };
  readonly signer: unknown;
}
const as = (actor: unknown) => actor as Signing;
/** The call a sign step makes, read as data. */
const call = (x: unknown) => x as { readonly kind?: unknown; readonly actor?: unknown; readonly message?: unknown };
/** What prove signs: the message's parts resolved against `env` and joined. */
const text = (message: unknown, env: { readonly [root: string]: unknown }) => {
  const resolved = Scripting.resolve(message, env);
  return { text: Array.isArray(resolved.value) ? resolved.value.map(String).join("") : resolved.value, missing: resolved.missing };
};

const env = { cast: { ada: { person: "per_ada1" }, bo: { person: "per_bo2" } }, world: { safe: "saf_9x" }, last: { n: 7n } };

describe("s.<name>.signs: a step's call that signs a message (CX-journey-signs, call 1)", () => {
  const s = Scripting.script({ ada: Roles.signedIn, bo: Roles.signedIn }) as any;

  it("a tagged template is a sign-call by that cast member, its parts the literal text and the refs in order", () => {
    const signed = call(as(s.ada).signs`Claim ${s.world.safe} for ${s.ada.person}`);
    want(signed.kind, "the call's kind").toBe("sign-call");
    want(signed.actor, "the cast member who signs").toBe("ada");
    want(Array.isArray(signed.message), `message is the template's parts, got a ${typeof signed.message}`).toBe(true);
    // In order, with any empty literal left out (a template's text before its first ref or after its last may be "").
    const parts = (signed.message as ReadonlyArray<unknown>).filter((p) => p !== "");
    want(parts.map((p) => (Scripting.isRef(p) ? { ref: Scripting.pathOf(p) } : p))).toEqual([
      "Claim ", { ref: ["world", "safe"] }, " for ", { ref: ["cast", "ada", "person"] },
    ]);
    want(text(signed.message, env)).toEqual({ text: "Claim saf_9x for per_ada1", missing: [] });
  });

  it("keeps a template's literal text exactly: leading, trailing and between refs, newlines too, and a ref with no text around it", () => {
    want(text(call(as(s.bo).signs`${s.world.safe}`).message, env).text).toBe("saf_9x");
    want(text(call(as(s.bo).signs`I, ${s.bo.person},\nclaim ${s.world.safe}.`).message, env).text).toBe("I, per_bo2,\nclaim saf_9x.");
    want(call(as(s.bo).signs`I, ${s.bo.person}`).actor).toBe("bo");
  });

  it("a value in the template that is not a ref is kept, and reads as its text", () => {
    want(text(call(as(s.ada).signs`nonce ${3} at ${s.last.n}`).message, env).text).toBe("nonce 3 at 7");
  });

  it("one plain string is a message with no refs", () => {
    const signed = call(as(s.ada).signs("hello, Capxul"));
    want(signed.kind).toBe("sign-call");
    want(signed.actor).toBe("ada");
    want(text(signed.message, env)).toEqual({ text: "hello, Capxul", missing: [] });
  });

  it("a parts array is the same message as the template: literal text and refs in order", () => {
    const parts = call(as(s.ada).signs(["Capxul: claim Safe ", s.world.safe, " for ", s.ada.person]));
    want(parts.kind).toBe("sign-call");
    want(parts.actor).toBe("ada");
    want(text(parts.message, env)).toEqual({ text: "Capxul: claim Safe saf_9x for per_ada1", missing: [] });
    want(text(call(as(s.ada).signs`Capxul: claim Safe ${s.world.safe} for ${s.ada.person}`).message, env).text).toBe("Capxul: claim Safe saf_9x for per_ada1");
    want(text(call(as(s.bo).signs([s.bo.person])).message, env).text).toBe("per_bo2");
  });

  it("a ref the world never gave is named when resolved, never signed as empty", () => {
    want(text(call(as(s.ada).signs`Claim ${s.last.nope}`).message, env).missing).toEqual(["last.nope"]);
  });

  it("is a plain description: making it calls nothing, and the call is frozen", () => {
    const signed = as(s.ada).signs`Claim ${s.world.safe}`;
    want(Object.isFrozen(signed)).toBe(true);
  });

  it("is a step's call, and a step holds it with its checks", () => {
    const journey = Journeys.journey("ada signs", {
      cast: { ada: Roles.signedIn },
      steps: (x) => [x.step("ada signs", as(x.ada).signs`Claim ${x.world.safe}` as never)],
    });
    const steps = journey.steps(Scripting.script(journey.cast) as never);
    want(steps.map((step) => call(step.call).kind)).toEqual(["sign-call"]);
  });
});

describe("s.<name>.signer: the address of the cast member's key, a ref from the journey's start (call 3)", () => {
  it("is a ref at cast.<name>.signer, one per cast member", () => {
    const s = Scripting.script({ ada: Roles.signedIn, bo: Roles.signedIn }) as any;
    want(Scripting.isRef(as(s.ada).signer)).toBe(true);
    want(Scripting.pathOf(as(s.ada).signer as never)).toEqual(["cast", "ada", "signer"]);
    want(Scripting.pathOf(as(s.bo).signer as never)).toEqual(["cast", "bo", "signer"]);
  });
});
