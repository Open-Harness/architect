// Must compile with no error, no cast, no `any` and no `as`. An operation's handler runs a contract as `yield* steps.<key>(input)`: a required one
// answers its output, an optional one its output or `undefined`, and each fails with its contract's errors, which pass through the handler's own
// error channel (they are the operation's, CX-feature-contracts call 4). A fill's handler is typed from its own fill declaration (call 2).
import { Effect } from "effect";
import type { FillHandler, Handler } from "../../../src/modules/handler/types.ts";
import { CodeTaken, SlipLate, TaxRateDisputed, TaxTableMissing, codesUs, slipQuick, slipSubmit, slipTaxUs } from "./features.ts";

/** Hands back `run` unchanged; compiles only when each refusal given is one `run` says it may fail with (the refusals never widen what it says). */
export const refusesWith = <A, E, R>(run: Effect.Effect<A, E, R>, ..._refusals: ReadonlyArray<NoInfer<E>>): Effect.Effect<A, E, R> => run;

/** The optional contract may answer nothing; the required one always answers. */
export const submit: Handler<typeof slipSubmit> = ({ slip, gross, country }, { steps }) =>
  Effect.gen(function* () {
    if (gross === 0n) return yield* new SlipLate({ slip });
    const taxed = yield* steps.tax({ slip, gross, country });
    const { code } = yield* steps.code({ name: country });
    return { slip, tax: taxed === undefined ? 0n : taxed.tax, code };
  });

/** The contracts' errors are the operation's: the handler may refuse with each itself. */
export const submitRefuses: Handler<typeof slipSubmit> = ({ slip, gross, country }, { steps }) =>
  Effect.gen(function* () {
    if (country === "GB") return yield* new TaxTableMissing({ country });
    if (country === "ZZ") return yield* new CodeTaken({ code: country });
    if (country === "YY") return yield* new TaxRateDisputed({ rate: gross });
    const { code } = yield* steps.code({ name: country });
    return { slip, tax: gross, code };
  });

/** Each runner fails with its own contract's errors. */
export const runners: Handler<typeof slipSubmit> = ({ slip, gross, country }, { steps }) =>
  Effect.gen(function* () {
    const taxed = yield* refusesWith(steps.tax({ slip, gross, country }), new TaxTableMissing({ country }), new TaxRateDisputed({ rate: gross }));
    const { code } = yield* refusesWith(steps.code({ name: country }), new CodeTaken({ code: country }));
    return { slip, tax: taxed?.tax ?? 0n, code };
  });

/** An operation with no error of its own still refuses with its contract's. */
export const quick: Handler<typeof slipQuick> = ({ slip, gross, country }, { steps }) =>
  Effect.gen(function* () {
    const taxed = yield* steps.tax({ slip, gross, country });
    if (taxed === undefined) return yield* new TaxTableMissing({ country });
    return { slip, tax: taxed.tax };
  });

/** A fill's handler: its input, its own steps, its output and its contract's errors, all from its declaration. */
export const usTax: FillHandler<typeof slipTaxUs> = ({ gross, country }, { steps }) =>
  Effect.gen(function* () {
    if (country !== "US") return yield* new TaxTableMissing({ country });
    yield* steps.save(Effect.void);
    return { tax: gross / 10n };
  });

export const usCodes: FillHandler<typeof codesUs> = ({ name }) =>
  Effect.gen(function* () {
    if (name === "XX") return yield* new CodeTaken({ code: name });
    return { code: `${name}-1` };
  });
