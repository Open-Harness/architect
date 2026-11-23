// Planted: the stand-in's node entry for wallet.sign. Reaching it is a defect that names what is missing.
import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/wallet/verbs/sign.js";

const handler: Handler<typeof declaration> = () => Handlers.blank("wallet.sign");

export default handler;
