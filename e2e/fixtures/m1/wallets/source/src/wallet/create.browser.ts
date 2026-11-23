// Planted: the stand-in's browser entry for wallet.create. Reaching it is a defect that names what is missing.
import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/wallet/verbs/create.js";

const handler: Handler<typeof declaration> = () => Handlers.blank("wallet.create");

export default handler;
