// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/journal-entry-account/thing.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** One line of a journal entry: an account debited or credited. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type JournalEntryAccount = {
  readonly "id": Of<Declared["id"]>;
  readonly "journalEntry": Of<Declared["journalEntry"]>;
  readonly "line": Of<Declared["line"]>;
  readonly "account": Of<Declared["account"]>;
  readonly "costCenter": Of<Declared["costCenter"]>;
  readonly "debit": Of<Declared["debit"]>;
  readonly "credit": Of<Declared["credit"]>;
};
