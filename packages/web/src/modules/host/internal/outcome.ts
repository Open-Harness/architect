// A call's end as a value. A declared refusal keeps its name and code; a failure that is not one says only that the action failed,
// and the form keeps its request key, because nothing says whether the world wrote.
import { Effect, Schema } from "effect";
import type { Action } from "orthograph/actions";
import type { Outcome, Refusal } from "../types.ts";

const APPROVAL_DECLINED = { name: "ApprovalDeclined", code: "AR-007" } as const;

const nameOf = (errors: Readonly<Record<string, string>>, code: string): string =>
  Object.entries(errors).find(([, declared]) => declared === code)?.[0] ?? (code === APPROVAL_DECLINED.code ? APPROVAL_DECLINED.name : code);

const refusalOf = (action: Action<any, any>, failure: unknown): Refusal => {
  const refused = failure as { readonly actionContractError?: unknown; readonly errorCode?: unknown; readonly message?: unknown };
  if (refused.actionContractError === true && typeof refused.errorCode === "string") {
    return { name: nameOf(action.errors, refused.errorCode), code: refused.errorCode, message: typeof refused.message === "string" ? refused.message : "", known: true };
  }
  return { name: "ActionFailed", code: "", message: typeof refused.message === "string" ? refused.message : "The action failed.", known: false };
};

export const invalid = (): Outcome<never> => ({ ok: false, refusal: { name: "InvalidPayload", code: "", message: "A field is not valid: check the form and try again.", known: true } });
export const NO_HOST = "This piece is outside its app's host: wrap the page in the generated provider.";
export const nobody = (): Outcome<never> => ({ ok: false, refusal: { name: "NoHost", code: "", message: NO_HOST, known: true } });

/** The payload as the form wrote it, decoded by the action's own schema; a payload the schema refuses is `InvalidPayload`, and nothing is sent. */
export const decoded = (action: Action<any, any>, raw: unknown): Promise<{ readonly ok: true; readonly args: unknown } | { readonly ok: false }> =>
  Effect.runPromise(Schema.decodeUnknownEffect(action.schema)(raw).pipe(Effect.map((args) => ({ ok: true as const, args })), Effect.catch(() => Effect.succeed({ ok: false as const }))));

export const settled = <A>(action: Action<any, A>, run: Promise<A>): Promise<Outcome<A>> =>
  run.then((answer): Outcome<A> => ({ ok: true, answer }), (failure: unknown): Outcome<A> => ({ ok: false, refusal: refusalOf(action, failure) }));
