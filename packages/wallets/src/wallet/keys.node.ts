// wallet.keys on the Node host (the generated CLI, and the SDK run from Node): the encrypted keystore folder.
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/wallet/verbs/keys.js";
import { NodeHost } from "../modules/node-host/service.ts";
import { Operations } from "../modules/operations/service.ts";

const handler: Handler<typeof declaration> = (payload) => Operations.on(NodeHost.signer).keys(payload);

export default handler;
