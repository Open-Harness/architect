import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/ticket/verbs/resume.ts";

/** Wake an ended ticket (the machine refuses any other state): the same executor, with its memory. Its mandate is revalidated by `mandate.revalidate` first. */
const resume: Handler<typeof declaration> = (_payload, { move }) => Effect.as(move(), {});

export default resume;
