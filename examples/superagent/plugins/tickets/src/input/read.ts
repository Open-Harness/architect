import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/input/verbs/read.ts";

/** Read one Input's text: the runtime has read the Input the payload names, and refused one that is not there. */
const read: Handler<typeof declaration> = (_payload, { subject }) => Effect.succeed({ text: String(subject?.["text"]) });

export default read;
