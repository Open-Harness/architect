// Planted: the stand-in's world entry for wallet.import. Reaching it is a defect that names what is missing.
import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/wallet/verbs/import.js";

const handler: Handler<typeof declaration> = () => Handlers.blank("wallet.import");

export default handler;
