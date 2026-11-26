# CX-features: Capxul's parts are features, not pieces

**Decided 26 November 2026 by Aaron.** Recorded by a 📐 designer thread started by Goal 16's lead
(session_01S8RF7ASqmdxbN37WdpZMcB), under `AGENTS.md`'s "One way to supersede".

## Aaron's words

On 26 November 2026, reading CX-composable-pieces, Aaron said: "this is solid but we should stop calling them pieces".

## The call

A part of Capxul that a business picks when its Capxul is built is a **feature**. The word "piece", in that sense, is
retired. A feature is what CX-composable-pieces called a piece: a package in `examples/capxul/plugins/<feature>/`,
mounted by one file, `examples/capxul/blueprint/features/<feature>.ts`. Core features are in every Capxul; optional
features are left out by a business that doesn't want them. Nothing else in CX-composable-pieces changes: the 28
features, their contracts, the actors, the dependency picture, the framework gaps and the move all stand as written.

## Why "feature"

It is the code's own word, so one fact has one name:

- a Capxul feature is a plugin whose `package.json` says `"orthograph": { "kind": "feature" }` (`M1-plugins.md`,
  `docs/canon/plugins.mdx`);
- its mount file lives in `blueprint/features/`, as the superagent's do (`examples/superagent/blueprint/features/`);
- the docs call it a feature plugin.

CX-composable-pieces itself said "piece" was "plain English for 'a Capxul feature plugin'". With two words for one
thing, a reader has to learn that they mean the same thing. With one, nobody does.

## What changes

- "piece" → "feature", "pieces" → "features", in the composability sense only;
- "optional piece" → "optional feature", "core pieces" → "core features", "a piece's" → "a feature's";
- "the pieces move" → "the features move", and slice 14 "Capxul as pieces" → "Capxul as features";
- the move's branches: `goal-16/features-<feature>-check` and `goal-16/features-<feature>-build`, in place of
  `goal-16/pieces-<piece>-check` and `-build` (none has been cut yet).

Live docs are rewritten: Goal 16's brief (`design/goals/16-capxul.md`, which also gains "a feature" under "Words
used"), the US payroll tax lane's brief (`design/goals/16-lane-payroll-tax.md`), the `crm` row of
`docs/canon/status.md`, and `examples/capxul/doctypes.md`. No code comment under `examples/capxul` used the word.

Dated records keep their words and gain "(Superseded by CX-features, 26 November 2026: …)" beside them:
CX-composable-pieces (its title, its definition of "piece", "Presets, not pieces", the slice name and the move's
branch names), CX-money-global-payroll, CX-tax-us-rows, CX-crypto-accounting and CX-onchain-safe. Where a record uses
the word many times, its first use carries the note and says that every later use in this sense reads "feature".
Earlier Superseded notes in CX-payroll-tax and K43-capxul-core quote CX-composable-pieces' words, "piece" among them;
they are dated words too, and they stand.

## What stays

- Other senses of "piece": UI SDK's generated pieces (K29), "a piece of work", the board's framework pieces (K42),
  "pieces of" software in a licence, and the like.
- The name of the record `CX-composable-pieces.md`, cited across the briefs and records, and the branch
  `goal-16/composable-pieces-design` it was written on. A dated record's id is not renamed.
- `docs/canon/status.md`'s heading "Capxul's own pieces", which describes the earlier plan K43 replaced, in K30's
  words.

## Not changed yet

`design/decisions/CX-bridge-rails.md` is in an open pull request (#1149) and not on `goal/capxul`. Once it lands, it
gains its own "Superseded by CX-features" notes beside each "piece" in this sense.

## Supersedes

Each line is a phrase `tools/ci/supersedes.sh` checks. The bare words "piece" and "pieces" can't be listed, because
their other senses stay.

- `design/goals/16-capxul.md`: "an optional piece" → "an optional feature"
- `design/goals/16-capxul.md`: "Capxul as pieces" → "Capxul as features"
- `design/goals/16-capxul.md`: "into their pieces" → "into their features"
- `design/goals/16-capxul.md`: "tax from a piece per jurisdiction" → "tax from a feature per jurisdiction"
- `design/goals/16-capxul.md`: "contractors are their own piece" → "contractors are their own feature"
- `design/goals/16-capxul.md`: "builds one piece of Capxul" → "builds one feature of Capxul"
- `design/goals/16-capxul.md`: "`payroll-tax-us` piece" → "`payroll-tax-us` feature"
- `design/goals/16-lane-payroll-tax.md`: "as its own piece" → "as its own feature"
- `design/goals/16-lane-payroll-tax.md`: "one Capxul piece" → "one Capxul feature"
- `design/goals/16-lane-payroll-tax.md`: "a piece: one part of Capxul" → "a feature: one part of Capxul"
- `design/goals/16-lane-payroll-tax.md`: "an optional piece" → "an optional feature"
- `design/goals/16-lane-payroll-tax.md`: "tax piece" → "tax feature"
- `design/goals/16-lane-payroll-tax.md`: "this piece's rows" → "this feature's rows"
- `design/goals/16-lane-payroll-tax.md`: "the piece. A feature plugin" → "the feature. A feature plugin"
- `design/goals/16-lane-payroll-tax.md`: "the pieces move lands" → "the features move lands"
- `design/goals/16-lane-payroll-tax.md`: "if the pieces move" → "if the features move"
- `design/goals/16-lane-payroll-tax.md`: "The pieces move" → "The features move"
- `design/goals/16-lane-payroll-tax.md`: "the piece stands on its own" → "the feature stands on its own"
- `design/goals/16-lane-payroll-tax.md`: "The piece offers one operation" → "The feature offers one operation"
- `design/goals/16-lane-payroll-tax.md`: "The piece is mounted from slice 0" → "The feature is mounted from slice 0"
- `design/goals/16-lane-payroll-tax.md`: "the piece imports nothing" → "the feature imports nothing"
- `design/goals/16-lane-payroll-tax.md`: "shipped in the piece" → "shipped in the feature"
- `design/goals/16-lane-payroll-tax.md`: "the piece's check" → "the feature's check"
- `design/goals/16-lane-payroll-tax.md`: "a contract one piece declares" → "a contract one feature declares"
- `design/goals/16-lane-payroll-tax.md`: "a piece moved, gap 3 landed" → "a feature moved, gap 3 landed"
- `design/goals/16-lane-payroll-tax.md`: "`payroll-tax-us` piece" → "`payroll-tax-us` feature"
- `design/goals/16-lane-payroll-tax.md`: "The piece's row in" → "The feature's row in"
- `docs/canon/status.md`: "an optional piece" → "an optional feature"
- `examples/capxul/doctypes.md`: "an optional piece" → "an optional feature"
- `examples/capxul/doctypes.md`: "a stock piece can be added later" → "a stock feature can be added later"
- `design/decisions/CX-composable-pieces.md`: "Capxul as pieces a business picks when its app is built" → "Capxul as features a business picks when its app is built"
- `design/decisions/CX-composable-pieces.md`: "in this record is plain English for" → "is the code's own word for"
- `design/decisions/CX-composable-pieces.md`: "Presets, not pieces." → "Presets, not features."
- `design/decisions/CX-composable-pieces.md`: "`goal-16/pieces-<piece>-check`" → "`goal-16/features-<feature>-check`"
- `design/decisions/CX-composable-pieces.md`: "`goal-16/pieces-<piece>-build`" → "`goal-16/features-<feature>-build`"
- `design/decisions/CX-money-global-payroll.md`: "the US tax piece" → "the US tax feature"
- `design/decisions/CX-money-global-payroll.md`: "**The pieces**, agreed with" → "**The features**, agreed with"
- `design/decisions/CX-tax-us-rows.md`: "point 3 to the `payroll-tax-us` piece" → "point 3 to the `payroll-tax-us` feature"
- `design/decisions/CX-crypto-accounting.md`: "It's all core, no optional piece." → "It's all core, no optional feature."
- `design/decisions/CX-onchain-safe.md`: "The planned `onchain-pay` piece" → "The planned `onchain-pay` feature"
