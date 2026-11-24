import { Blueprint } from "orthograph";
import { OutgoingMessage } from "./thing.ts";

/** A message that has failed to send three times in a row is a problem a superagent shows (GOAL17-derived-reads). */
export default Blueprint.problem(OutgoingMessage, { kind: "channel", of: OutgoingMessage.fields.superagent, name: OutgoingMessage.fields.id, failures: OutgoingMessage.fields.failures, after: 3 });
