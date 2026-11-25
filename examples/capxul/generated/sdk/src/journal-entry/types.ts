// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/journal-entry/thing.ts";
import type * as Events from "../../../../blueprint/things/journal-entry/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a journal-entry moves between, as its machine declares them. */
export type JournalEntryState = "draft" | "submitted" | "cancelled";

/** A company's own entry in its books: lines debiting and crediting accounts, posted to the ledger when submitted. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type JournalEntry = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "postingDate": Of<Declared["postingDate"]>;
  readonly "userRemark": Of<Declared["userRemark"]>;
  readonly "totalDebit": Of<Declared["totalDebit"]>;
  readonly "totalCredit": Of<Declared["totalCredit"]>;
  readonly "state": JournalEntryState;
};

/** The event JournalEntryCancelled: what it carries when a journal-entry moves. */
export type JournalEntryCancelled = {
  readonly "journalEntry": Of<(typeof Events)["JournalEntryCancelled"]["fields"]["journalEntry"]>;
  readonly "reversed": Of<(typeof Events)["JournalEntryCancelled"]["fields"]["reversed"]>;
};

/** The event JournalEntryDrafted: what it carries when a journal-entry moves. */
export type JournalEntryDrafted = {
  readonly "journalEntry": Of<(typeof Events)["JournalEntryDrafted"]["fields"]["journalEntry"]>;
  readonly "company": Of<(typeof Events)["JournalEntryDrafted"]["fields"]["company"]>;
  readonly "totalDebit": Of<(typeof Events)["JournalEntryDrafted"]["fields"]["totalDebit"]>;
  readonly "totalCredit": Of<(typeof Events)["JournalEntryDrafted"]["fields"]["totalCredit"]>;
};

/** The event JournalEntrySubmitted: what it carries when a journal-entry moves. */
export type JournalEntrySubmitted = {
  readonly "journalEntry": Of<(typeof Events)["JournalEntrySubmitted"]["fields"]["journalEntry"]>;
  readonly "posted": Of<(typeof Events)["JournalEntrySubmitted"]["fields"]["posted"]>;
};
