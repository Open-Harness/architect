// Planted: the handler a scaffold leaves behind, for the control that runs the journeys with no host entry.
import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/wallet/verbs/import.js";

const handler: Handler<typeof declaration> = () => Handlers.blank("wallet.import");

export default handler;
