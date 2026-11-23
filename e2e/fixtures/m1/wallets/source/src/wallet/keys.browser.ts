// Planted: the stand-in's browser entry for wallet.keys. Reaching it is a defect that names what is missing.
import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/wallet/verbs/keys.js";

const handler: Handler<typeof declaration> = () => Handlers.blank("wallet.keys");

export default handler;
