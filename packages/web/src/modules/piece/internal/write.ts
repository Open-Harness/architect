// The api of a move or a write: read the form into a payload, send it through the host, land the outcome in the state.
import { dispatch } from "@ui-sdk/core";
import type { Outcome } from "#modules/host/types.js";
import type { PieceContext, WriteApi, WriteSpec } from "../types.ts";
import { landed, sending } from "./state.ts";

/** The payload as the form holds it (every control with a `name` submits with it), plus the thing the piece is about. Optional fields left empty are left out. */
const payloadOf = (form: unknown, options: Readonly<Record<string, unknown>>, spec: WriteSpec): Record<string, unknown> => {
  const data = form === undefined ? undefined : new (FormData as unknown as new (form: unknown) => FormData)(form);
  const typed = Object.fromEntries(
    spec.fields.flatMap((name) => {
      const value = data?.get(name);
      return typeof value !== "string" || (value === "" && spec.optional?.includes(name) === true) ? [] : [[name, value] as const];
    }),
  );
  return { ...typed, ...Object.fromEntries((spec.subject ?? []).map((name) => [name, options[name]] as const)) };
};

export const writeApi = <Answer>(context: PieceContext<Answer>, spec: WriteSpec): WriteApi => {
  // One key per open of the form, kept while the outcome of a send is not known (so a press after a lost answer claims once), and made anew once it is.
  let key = crypto.randomUUID();
  return {
    submit: (event) => {
      if (context.store.get().pending) return Promise.resolve();
      let sent: Promise<Outcome<Answer>> | undefined;
      const canceled = dispatch(context, "onSend", payloadOf(context.element("root"), context.options(), spec), {
        reason: "submit-press",
        ...(event === undefined ? {} : { event }),
        requestKey: key,
        settle: (promise: Promise<Outcome<Answer>>) => { sent = promise; },
      });
      if (canceled || sent === undefined) return Promise.resolve();
      context.store.set(sending());
      return sent.then((outcome) => {
        context.store.set(landed(outcome));
        if (outcome.ok || outcome.refusal.known) key = crypto.randomUUID();
        if (outcome.ok) context.options().onDone?.(outcome.answer);
      });
    },
  };
};
