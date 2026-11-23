import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/ticket/verbs/report.ts";

/** The executor says how the work stands: progress, waiting, ready, blocked, failed or dropped. Not written yet: slice 7 gives it its body. */
const report: Handler<typeof declaration> = () => Handlers.blank("ticket.report is not written yet");

export default report;
