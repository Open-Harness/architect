import { Schema } from "orthograph";
import type { Cells } from "orthograph";

/** One outside account as a person writes it in a form: the service's stable id, and the name people type. */
export const AccountRef = Schema.Struct({ id: Schema.String, login: Schema.String });
export type AccountRef = typeof AccountRef.Type;

/** A listed person's plain message is inferred, never explicit; a stranger's, and one with no sender, admit nothing (GOAL17-stage-one, call 8). */
export const observedRow: Cells = { listed: "inferred", unlisted: "none", unnamed: "none" };
/** A service with no sender (PostHog): only an admission row makes it inferred. */
export const inferredOnly: Cells = { listed: "none", unlisted: "none", unnamed: "inferred" };
