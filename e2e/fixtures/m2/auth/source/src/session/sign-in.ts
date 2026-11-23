// The stand-in's handler: empty. Reaching it is a defect that names what is missing.
import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/session/verbs/sign-in.js";

const handler: Handler<typeof declaration> = () => Handlers.blank("session.sign-in");

export default handler;
