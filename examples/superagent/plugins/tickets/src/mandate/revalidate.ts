import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/mandate/verbs/revalidate.ts";

/** Check a ticket's mandate against the policy as it is now, before the ticket resumes. Not written yet: slice 7 gives it its body. */
const revalidate: Handler<typeof declaration> = () => Handlers.blank("mandate.revalidate is not written yet");

export default revalidate;
