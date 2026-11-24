export type Stage = "person" | "working" | "idle" | "ended";
export type Why = "delivery" | "answer" | "review" | "blocked" | "failed" | "queued" | "none";

export interface StageRow {
  readonly stage: Stage;
  readonly why: Why;
  /** The panel's words for the row. */
  readonly label: string;
}

/** What the looks found about one ticket. A record is absent when the ticket has none of that kind. */
export interface Facts {
  readonly report: { readonly state: string; readonly seq: bigint } | undefined;
  readonly assignment: { readonly state: string } | undefined;
  readonly attention: object | undefined;
  readonly undelivered: object | undefined;
  readonly person: { readonly seq: bigint } | undefined;
}
