import { Blueprint } from "orthograph";
import { Subscription } from "./thing.ts";

export class AlreadyFollowing extends Blueprint.error({ ticket: Subscription.fields.ticket, thread: Subscription.fields.thread }, { exit: 93 }) {}
