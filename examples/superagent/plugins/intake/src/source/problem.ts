import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/source/verbs/problem.ts";

/** Say a connection has failed three polls in a row: it shows as a problem until a poll succeeds. Not written yet: slice 7 gives it its body. */
const problem: Handler<typeof declaration> = () => Handlers.blank("source.problem is not written yet");

export default problem;
