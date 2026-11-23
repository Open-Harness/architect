// A rule the call's rows break (G5): the runtime's own refusal, or a defect when no refusal can be made. The refusal is the rule's own error, filled from the
// caller's row (never the holder's, which would say who holds the name), counted as a refusal, with the rule on the span and the log that decided it.
import { Effect } from "effect";
import type { Violation } from "#modules/records/types.js";

/** What the runtime logs when it refuses for a rule: the rule's name and that another holds its key. The key's value is never in it. */
const decidingLog = (rule: string) => `${rule}: another instance already holds this key`;

/**
 * Settle a violation for `operation`. `invariants` is the operation's own list, from the model: each refusal's tag to the rule it refuses for. A rule the
 * operation does not list (a breaker the compiler could not see, G5 section 3), a rule with no refusal, and a clash among the call's own rows are all the
 * handler's bug: they die, naming the rule and the operation, and never reach the wire as a refusal nobody declared.
 */
export const settleViolation = <L extends { readonly around: <A, E, R>(work: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R> }>(
  operation: string,
  invariants: Readonly<Record<string, string>>,
  logs: L,
) => (violation: Violation) =>
  Effect.gen(function* () {
    const { rule, refuse, row, own } = violation;
    if (own) return yield* Effect.die(new Error(`${operation} wrote two rows that hold one key of the unique rule ${rule}: that is the handler's bug, not a race`));
    if (refuse === undefined) return yield* Effect.die(new Error(`${operation} broke ${rule}, which names no refusal: that is the app's own bug`));
    if (!Object.values(invariants).includes(rule)) {
      return yield* Effect.die(new Error(`${operation} broke ${rule}, which the compiler did not list it as able to break: declare \`writes\` on the step that writes it`));
    }
    const fields = Object.fromEntries(Object.keys(refuse.fields).map((key) => [key, row[key]]));
    yield* Effect.annotateCurrentSpan({ "refusal.invariant": rule });
    yield* logs.around(Effect.logInfo(decidingLog(rule)));
    return yield* Effect.fail(new refuse(fields));
  });
