import { Blueprint } from "orthograph";
import { Subscription } from "./thing.ts";
import { machine } from "./machine.ts";
import { AlreadyFollowing } from "./errors.ts";

/** A ticket follows a thread once while it follows it. */
export const oneFollowPerThread = Blueprint.invariant.unique(
  [Subscription.fields.ticket, Subscription.fields.thread],
  { while: [machine.states.live], refuse: AlreadyFollowing },
);
