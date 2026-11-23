// The outbox's probes, as descriptors (GOAL17-check-harness, call 3): a route name and two types, importing nothing but the descriptor builder.
// Their handlers are the world's own, registered in its entry only (`harness-01` guards that no journey reaches one).
import { Probe } from "./service.ts";

/** One row of the world's outbox, as `outbox.rows` answers it. */
export interface OutboxRow {
  /** The event's id (`evt_…`, or `github:<id>` from a door). */
  readonly event: string;
  /** The event's name: `InputRouted`. */
  readonly name: string;
  /** The hop it goes to: `op:agent.tell`. */
  readonly to: string;
  readonly subject: string;
  readonly seq: number;
  readonly state: "pending" | "claimed" | "delivered" | "refused" | "failed";
  readonly attempts: number;
  /** An instant on the world's clock. */
  readonly due: string;
  /** The superagent's pause that holds it, or null. */
  readonly hold: string | null;
  /** The refusal's tag, the defect's first line, or the declared error's tag of a row that took its hop's `onRefused` path. */
  readonly outcome: string | null;
}

export const outbox = {
  /** The default store's journal high-water now, and how many commits lost the version guard and ran again. `since: "journey"` counts from the journey's first step. */
  mark: Probe.read<{ since?: "journey" }, { seq: number; conflicts: number }>("outbox/mark"),
  rows: Probe.read<{ to?: string; name?: string; subject?: string; state?: OutboxRow["state"]; afterSeq?: number | "journey" }, { rows: ReadonlyArray<OutboxRow> }>("outbox"),
  redeliver: Probe.send<{ event: string; to?: string }, { redelivered: number }>("outbox/redeliver"),
  /** Park one row (by `event`), or every future row of an event `name`, under a `test:<n>` hold. */
  hold: Probe.send<{ name?: string; event?: string; to: string }, { hold: string; held: number }>("outbox/hold"),
  release: Probe.send<{ hold: string | "all" }, { released: number }>("outbox/release"),
} as const;
