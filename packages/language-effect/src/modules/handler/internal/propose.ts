// What an operation that `proposes` runs in place of its handler when an agent acting as itself calls it (GOAL17-slice9-build, call 9): the call is recorded as
// a proposal, in the same commit, and changes nothing. A person's call, or any other caller's, runs the handler as always.
import { Effect, Schema } from "effect";
import type { Operation, Principal } from "orthograph";
import { NotAllowed } from "#modules/access/types.js";
import { Store } from "#modules/records/types.js";
import type { makeAlso } from "./also.ts";

type Codec = Schema.Codec<object, unknown>;

/** An agent acting as itself: it names no person. */
export const actsAsItself = (principal: Principal): principal is Extract<Principal, { readonly agent: string }> => principal.kind === "agent" && "agent" in principal;

export const proposeHandler = (name: string, op: Operation) => {
  const proposes = op.proposes!;
  const key = Object.keys(proposes.of.thing.fields).find((k) => proposes.of.thing.fields[k] === proposes.of.field);
  const encode = Schema.encodeEffect(op.payloadSchema as unknown as Codec);
  return (payload: object, context: { readonly principal: Principal; readonly also: ReturnType<typeof makeAlso> }) =>
    Effect.gen(function* () {
      const agent = context.principal.kind === "agent" && "agent" in context.principal ? context.principal.agent : undefined;
      const store = yield* Store;
      const found = key === undefined || agent === undefined ? undefined
        : (yield* store.list({ thing: proposes.of.thing, where: { [key]: agent }, state: undefined, order: "oldest", limit: 1, after: undefined })).items[0];
      // Only the agent a superagent holds as its own may propose for it: any other agent acting as itself is refused as it would be anywhere.
      if (found === undefined) return yield* new NotAllowed();
      const changes = yield* encode(payload).pipe(Effect.orDie);
      const said = (payload as { readonly why?: unknown }).why;
      yield* context.also(proposes.move, { fields: { [proposes.into]: found["id"], operation: name, changes, why: typeof said === "string" && said !== "" ? said : "no reason given" } });
      return proposes.answer as object;
    });
};
