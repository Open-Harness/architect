// wallet.import on the browser host: the wallet the page was given (EIP-1193).
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/wallet/verbs/import.js";
import { BrowserHost } from "../modules/browser-host/service.ts";
import { Operations } from "../modules/operations/service.ts";

const handler: Handler<typeof declaration> = (payload) => Operations.on(BrowserHost.signer).import(payload);

export default handler;
