import { defineAction, type Action, type ActionContext, type ActionOptions } from "orthograph/actions";
import { bus } from "./internal/bus.ts";
import { hostOf } from "./internal/client.ts";
import { NO_HOST, decoded, invalid, nobody, settled } from "./internal/outcome.ts";
import type { ActionFactory, Outcome, SendDetails, WebHost as Host, WebHostApi } from "./types.ts";

/** A piece's press is its person's yes (a person pressed it, or UI SDK's bridge asked one), so the wrapper is never asked again. */
const APPROVED = "web";

const make: WebHostApi["make"] = ({ client, ask }) => {
  const events = bus();
  const actionHost = hostOf(client);
  const made = new WeakMap<ActionFactory, Action<any, any>>();

  const action: Host["action"] = (factory) => {
    const known = made.get(factory);
    if (known !== undefined) return known as never;
    const options: ActionOptions<any, any> = factory(actionHost);
    const thing = options.name.split(".")[0] ?? options.name;
    // A write that finishes tells the reads that show its thing; a failed one wrote nothing, so tells no one.
    const run: ActionOptions<any, any>["run"] = (args, ctx) => options.run(args, ctx).then((answer) => (options.readOnly || events.emit(thing), answer));
    const wrapped = defineAction({ ...options, run }, { ask });
    made.set(factory, wrapped);
    return wrapped as never;
  };

  const send = <Answer>(factory: ActionFactory<any, Answer>, raw: Readonly<Record<string, unknown>>, details: SendDetails<Answer>): Promise<Outcome<Answer>> => {
    const act = action(factory);
    const ctx: ActionContext = { caller: details.source === "agent" ? "agent" : "person", approvedToolCallKey: APPROVED, ...(details.requestKey === undefined ? {} : { toolCallId: details.requestKey }) };
    return decoded(act, raw).then((payload) => (payload.ok ? settled(act, act.run(payload.args, ctx)) : invalid()));
  };

  const self: Host = {
    action,
    wire: (factory) => ({ host: self, onSend: (raw, details) => details.settle(send(factory, raw, details)) }),
    onFinished: events.on,
  };
  return self;
};

/** What a piece outside the app's provider finds: it is never run, every press is refused saying why. */
const missing: Host = {
  action: () => ({ name: "missing", description: "", schema: undefined as never, readOnly: false, needsApproval: false, agentTool: false, errors: {}, run: () => Promise.reject(new Error(NO_HOST)) }),
  wire: () => ({ host: missing, onSend: (_raw, details) => details.settle(Promise.resolve(nobody())) }),
  onFinished: () => () => undefined,
};

/** `WebHost.make({ client, ask })` makes one; `WebHost` is also the type of what it makes. */
export type WebHost = Host;
export const WebHost: WebHostApi = { make, missing };
