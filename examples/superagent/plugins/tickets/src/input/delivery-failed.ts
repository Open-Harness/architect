import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/input/verbs/delivery-failed.ts";

/** The outbox gave up telling the executor. Not written yet: slice 7 gives it its body. */
const deliveryFailed: Handler<typeof declaration> = () => Handlers.blank("input.delivery-failed is not written yet");

export default deliveryFailed;
