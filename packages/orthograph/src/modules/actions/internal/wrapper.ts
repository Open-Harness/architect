// defineAction: approval waits here, never in `run`.
import { Effect } from "effect";
import { RefusalCodes, type Action, type ActionContext, type ActionOptions, type Approver } from "../types.ts";
import { fromPromise, settle } from "./edge.ts";
import { ActionRefusal, plain } from "./refusal.ts";

const alreadyApproved = (ctx: ActionContext | undefined): boolean => ctx?.approvedToolCallKey !== undefined && ctx.approvedToolCallKey !== "";

const ask = <Args, Answer>(options: ActionOptions<Args, Answer>, approver: Approver | undefined, args: Args): Effect.Effect<void, unknown> =>
  approver === undefined
    ? Effect.fail(plain("This action needs approval and nobody is there to give it."))
    : fromPromise(() => approver.ask({ action: options.name, description: options.description, args })).pipe(
        Effect.flatMap((yes) => (yes === true ? Effect.void : Effect.fail(new ActionRefusal("Approval was declined.", RefusalCodes.approvalDeclined, {})))),
      );

export const defineAction = <Args, Answer>(options: ActionOptions<Args, Answer>, approver: Approver): Action<Args, Answer> => ({
  ...options,
  run: (args, ctx) => {
    const call = fromPromise(() => options.run(args, ctx));
    const program = options.needsApproval && !alreadyApproved(ctx) ? Effect.andThen(ask(options, approver, args), call) : call;
    // Only a refusal the action itself made passes through: whatever else `run` rejected with is redacted.
    return settle(program.pipe(Effect.mapError((failure) => (failure instanceof ActionRefusal ? failure : plain()))), ctx);
  },
});
