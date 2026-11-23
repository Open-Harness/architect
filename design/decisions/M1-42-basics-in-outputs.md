# M1.42: the basics in every output

Decided 20 November 2026 by the framework builder of Goal 3 (`goal-3/clients-build`), under "Who decides" in `AGENTS.md`.

What changed, and the call behind each:

- **CLI.** `--help` carries the operation's description, then the states a move runs between. A flag's type is in its type token
  (`id`, `integer`, `uint`, `text`) and its help is the field's description, then what kind of value it takes. A number that fits in
  53 bits is a number flag (`Flag.Int`, handed on as digits); a wider `uint` stays text, so no digit is lost.
- **SDK.** `generated/sdk/src/<thing>/types.ts` exports the thing (`Link`), the union of its machine's states (`LinkState`) and each event
  it emits, typed from the blueprint's own values; the front door re-exports them. A field not every caller is shown is optional.
- **MCP.** A tool offers an output schema (M1.37's piece, pulled in by G7): built from the same wire rule as the API's answer, so a
  field private to roles is optional and a secret is not named unless the call issued it. `state` is an enum of the thing's states
  (the catalog carries `states`). Input properties carry the field's description.
- **API.** A wrong-state refusal's `state` is a literal union of the machine's states. The `steps` list left the endpoint files (the
  caller's contract) for `generated/server/main.ts`, beside the handler wiring (K14's proposal).
- **Docs.** A thing's page has an Events section: each event, its fields and the move that emits it; a Fields table gains a
  description column when a field has one.
- **Field `description`.** `Blueprint.described(valueOrField, "…")` returns a copy that carries the sentence; a thing's field keeps it,
  and a payload built from that field (`Handle.fields.name`) inherits it. The compiler puts it on `FieldModel.description`. The front
  door still depends only on Effect.

Not done here: Plugged In's and acme's fields declare no descriptions (the journey author's lane), and the portal's Fields table does
not yet draw a description (M1.13). Declaring them in Plugged In turns `thing.portal` red until the portal does.

Acme's recorded baselines (checks 12, 14 and 21: server and api, clients, docs) moved with the output: only the digests of files that changed, no file added to or dropped from a baseline. Check 12 and 21 say "unchanged", which M1.42 cannot keep for the CLI help, the docs' Events section and the API refusal's state; the same was done for M1.35 and K16.
