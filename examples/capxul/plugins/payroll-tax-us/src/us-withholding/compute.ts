import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/us-withholding/verbs/compute.ts";

/** Work out one pay's US tax lines. Not written yet: slice 0's build gives it its body. */
const compute: Handler<typeof declaration> = () => Handlers.blank("us-withholding.compute is not written yet");

export default compute;
