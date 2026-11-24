// Generated from the blueprint. Do not edit.
// What the handler is given: its payload and steps; what it may return: its answer or a declared error.
import type { SqlClient } from "effect/sql";
import type { Auth, Handler as Of, Records, Timers } from "@orthograph/language-effect";
import type declaration from "@orthograph/tickets/blueprint/things/input/verbs/requeue.ts";

export type Handler<R = Records | SqlClient.SqlClient | Auth | Timers> = Of<typeof declaration, R>;
