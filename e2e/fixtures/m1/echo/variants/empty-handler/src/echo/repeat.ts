// Planted: the handler a scaffold leaves behind. Reaching it is a defect that names what is missing.
import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/echo/verbs/repeat.js";

const repeat: Handler<typeof declaration> = () => Handlers.blank("echo.repeat");

export default repeat;
