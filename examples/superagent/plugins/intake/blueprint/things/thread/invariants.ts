import { Blueprint } from "orthograph";
import { Thread } from "./thing.ts";

/** A thread is one of a superagent's source, by its key (`C1:1.1`): the first trigger on it makes it, and a second made at once is a conflict the call runs again. */
export const oneThreadPerKey = Blueprint.invariant.unique([Thread.fields.superagent, Thread.fields.source, Thread.fields.key]);
