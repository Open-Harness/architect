// Generated from blueprint/things/handle/verbs/claim.ts (model handle.claim). Do not edit.
import { createChange, definePrimitive } from "@ui-sdk/core";
import { type Outcome, type Refusal, type SubmitDetails, submit } from "../src/runtime.ts";

export type HandleClaimPayload = { name: string };
export type HandleClaimAnswer = { handle: string };
export type HandleClaimOutcome = Outcome<HandleClaimAnswer>;

/** The declared refusals of handle.claim, with their codes. */
export const handleClaimRefusals = {"HandleTaken":"HN-001","HandleAlreadyOwned":"HN-002","NotAllowed":"AR-001","IdempotencyConflict":"AR-002"} as const;

type Options = {
  name?: string;
  defaultName?: string;
  onNameChange?: (value: string, details: { reason: string; source: string; cancel: () => void }) => void;
  onSend?: (payload: HandleClaimPayload, details: SubmitDetails<HandleClaimAnswer>) => void;
  onDone?: (answer: HandleClaimAnswer) => void;
};

/** Claim a free name and make it the address of your public page, with its profile. */
export const handleClaim = definePrimitive({
  name: "handle-claim",
  options: {
    name: "string",
    defaultName: "string",
    onNameChange: "callback",
    onSend: "callback",
    onDone: "callback",
  },
  controlled: ["name"],
  state: (options: Options) => ({
    name: options.defaultName ?? "",
    pending: false,
    refusal: null as Refusal | null,
    error: null as string | null,
    done: false,
  }),
  sync: (options) => ({
    ...(options.name === undefined ? {} : { name: options.name }),
  }),
  api: (context) => {
    const change = createChange(context);
    return {
      setName: (value: string, event?: Event) => change("name", value, { reason: "input" as never, event }),
      submit: (event?: Event) => submit(context as never, ((state: { name: string }) => ({ name: state.name })) as never, event),
    };
  },
  slots: (slot) => ({
    root: slot({
      attrs: (state) => ({ "data-pending": state.pending ? "" : undefined, "data-done": state.done ? "" : undefined }),
      on: {
        submit: (event, { api }) => {
          event.preventDefault();
          void api.submit(event);
        },
      },
    }),
    name: slot({
      // HandleName: A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page.
      attrs: (state) => ({ name: "name", value: String(state.name), "aria-invalid": state.refusal ? "true" : undefined }),
      on: { input: (event, { el, api }) => api.setName((el as HTMLInputElement).value, event) },
    }),
    refusal: slot<{}, { name: string | null; code: string | null }>({
      present: (state) => state.refusal !== null,
      role: "alert",
      state: (state) => ({ name: state.refusal?.name ?? null, code: state.refusal?.code ?? null }),
    }),
    submit: slot({
      attrs: (state) => ({ type: "submit", disabled: state.pending ? "" : undefined }),
    }),
  }),
  agent: { actions: ["setName", "submit"] },
});
