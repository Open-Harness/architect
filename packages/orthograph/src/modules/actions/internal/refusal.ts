// The refusal agent-native reads by duck typing (dist/action.js isActionContractError, isNoWriteError; the HTTP route reads
// `statusCode`, `errorCode`, `details`). Built here without importing agent-native.
import { RefusalCodes, type ActionRefusalShape } from "../types.ts";

export class ActionRefusal extends Error implements ActionRefusalShape {
  readonly actionContractError = true as const;
  readonly noWrite = true as const;
  readonly errorCode: string;
  readonly statusCode = 422 as const;
  readonly details: Readonly<Record<string, unknown>> | undefined;
  constructor(message: string, errorCode: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ActionRefusal";
    this.errorCode = errorCode;
    this.details = details;
  }
}

/** What a caller sees of any failure that is not a declared refusal: fixed words, nothing of the original. */
export const FAILED = "The action failed.";
export const CANCELLED = "The action was cancelled.";
export const plain = (message: string = FAILED): Error => new Error(message);

const FRAMEWORK: Readonly<Record<string, { readonly code: string; readonly message: string }>> = {
  NotAllowed: { code: RefusalCodes.notAllowed, message: "You are not allowed to do this." },
  IdempotencyConflict: { code: RefusalCodes.idempotencyConflict, message: "This request was already made with different content." },
};
const OWN = new Set(["_tag", "code", "message", "name", "stack", "cause"]);

/** A failure that is a declared refusal becomes an `ActionRefusal`, its other fields the details; anything else is a plain error. */
export const classify = (failure: unknown): Error => {
  if (failure instanceof ActionRefusal) return failure;
  if (typeof failure !== "object" || failure === null) return plain();
  const tagged = failure as { readonly _tag?: unknown; readonly code?: unknown; readonly message?: unknown };
  if (typeof tagged._tag !== "string") return plain();
  const framework = Object.hasOwn(FRAMEWORK, tagged._tag) ? FRAMEWORK[tagged._tag] : undefined;
  const code = framework?.code ?? (typeof tagged.code === "string" && tagged.code.length > 0 ? tagged.code : undefined);
  if (code === undefined) return plain();
  const message = typeof tagged.message === "string" && tagged.message.length > 0 ? tagged.message : (framework?.message ?? tagged._tag);
  const details = Object.fromEntries(Object.entries(failure).filter(([key]) => !OWN.has(key)));
  return new ActionRefusal(message, code, details);
};
