import { Blueprint } from "orthograph";
import { Thread } from "./thing.ts";

export const ThreadSubscribed = Blueprint.event({ superagent: Thread.fields.superagent, thread: Thread.fields.id });
export const ThreadUnsubscribed = Blueprint.event({ superagent: Thread.fields.superagent, thread: Thread.fields.id });
export const ThreadClosed = Blueprint.event({ thread: Thread.fields.id });
export const ThreadQueued = Blueprint.event({ thread: Thread.fields.id });
export const ThreadEvaluating = Blueprint.event({ thread: Thread.fields.id });
export const ThreadReleased = Blueprint.event({ thread: Thread.fields.id });
