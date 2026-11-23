// The api of a read: it loads when it appears, when its payload changes and when a write finishes on one of its things.
import { dispatch } from "@ui-sdk/core";
import type { Outcome } from "#modules/host/types.js";
import type { PieceContext, ReadApi, ReadSpec } from "../types.ts";
import { landed, sending } from "./state.ts";

const payloadOf = (options: Readonly<Record<string, unknown>>, fields: ReadonlyArray<string>): Record<string, unknown> =>
  Object.fromEntries(fields.flatMap((name) => (options[name] === undefined ? [] : [[name, options[name]] as const])));

export const readApi = <Answer>(context: PieceContext<Answer>, spec: ReadSpec): ReadApi => {
  let loaded: string | undefined;
  let latest = 0;
  const load = (reason: string): Promise<void> => {
    const raw = payloadOf(context.options(), spec.fields);
    let sent: Promise<Outcome<Answer>> | undefined;
    const canceled = dispatch(context, "onSend", raw, { reason, settle: (promise: Promise<Outcome<Answer>>) => { sent = promise; } });
    if (canceled || sent === undefined) return Promise.resolve();
    loaded = JSON.stringify(raw);
    const mine = ++latest;
    context.store.set(sending(context.store.get().value));
    // A load that a newer one has overtaken lands nowhere: the page shows the newest payload's answer.
    return sent.then((outcome) => void (mine === latest && context.store.set(landed(outcome))));
  };
  // A payload that changes (the page gave the piece another name) is a new read.
  context.onOptions((next) => {
    if (loaded !== undefined && JSON.stringify(payloadOf(next, spec.fields)) !== loaded) void load("payload-change");
  });
  return {
    reload: () => load("reload"),
    start: () => {
      void load("appear");
      return context.options().host?.onFinished(spec.reloadsOn, () => void load("write-finished")) ?? (() => undefined);
    },
  };
};
