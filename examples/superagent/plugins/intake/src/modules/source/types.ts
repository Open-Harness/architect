import { Schema } from "orthograph";
import type { Cells } from "orthograph";

/** One outside account as a person writes it in a form: the service's stable id, and the name people type. */
export const AccountRef = Schema.Struct({ id: Schema.String, login: Schema.String });
export type AccountRef = typeof AccountRef.Type;

/**
 * A person's own words, or nothing: the cells of a service whose messages have a sender. GOAL17-stage-one call 8 corrects `listed` to
 * "inferred", but check 62 (slice 10) pins "explicit" and a builder may not change a check, so this waits on its author (GOAL17-slice7-build, call 9).
 * The gate reads the policy's own cells with the defaults of call 8, never this row, so no journey depends on which it is.
 */
export const observedRow: Cells = { listed: "explicit", unlisted: "none", unnamed: "none" };
/** A service with no sender (PostHog): only an admission row makes it inferred. */
export const inferredOnly: Cells = { listed: "none", unlisted: "none", unnamed: "inferred" };
