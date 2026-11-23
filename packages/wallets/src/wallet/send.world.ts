// wallet.send on the world host (prove runs this in place of a device): the world's own signers and funded keys.
import type { Handler } from "@orthograph/language-effect";
import type { DeviceWorld } from "@orthograph/language-effect/device";
import type declaration from "../../blueprint/things/wallet/verbs/send.js";
import { WorldHost } from "../modules/world/service.ts";
import { Operations } from "../modules/operations/service.ts";

const handler: Handler<typeof declaration, DeviceWorld> = (payload) => Operations.on(WorldHost.signer).send(payload);

export default handler;
