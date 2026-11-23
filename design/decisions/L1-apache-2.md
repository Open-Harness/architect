# L1: every published package is Apache-2.0

Decided by Aaron, 23 November 2026. His words: "Make it all Apache 2.0".

## The problem

The npm preview (M1.51, K28) publishes the `@orthograph/*` packages, `orthograph` and the preset. The repository had no
licence of its own. Two public packages said MIT (`@orthograph/theme`, `@orthograph/portal-ui`; F7 had chosen MIT for
`portal-ui` because nothing in the repository chose one), and the other fourteen public packages said nothing, so a
reader of the npm page could not tell what they were allowed to do.

## The call

One licence for everything we publish: the Apache License 2.0.

- A root `LICENSE` holds the standard text, taken verbatim from https://www.apache.org/licenses/LICENSE-2.0.txt
  (11,358 bytes).
- Every public package under `packages/*` (the ones with no `"private": true`: sixteen today) has
  `"license": "Apache-2.0"` in its `package.json`, and a `LICENSE` file beside it, because `npm pack` sends a package's
  own `LICENSE` and nothing from the repository root. The two private packages (`@orthograph/services`,
  `@orthograph/language-solidity`) are not published and are not touched.
- `packages/portal-ui/LICENSE` keeps its closing note that HeroUI Pro is a separate product under its own licence,
  which this package imports and never bundles or licenses.
- `packages/chain-evm/LICENSE-prb-effect-evm` stays: it is the MIT notice for the code adapted from `@prb/effect-evm`
  (K7), and the new `LICENSE` is not a replacement for it.
- `tools/release/preview.mjs --dry-run` holds the line: it refuses any public package whose `license` is not exactly
  `Apache-2.0`, naming each, and refuses when the root `LICENSE` is not the Apache License 2.0 (checks 44 and 45).

Dependencies keep their own licences; this decision is about what Orthograph publishes.

## Supersedes

- packages/portal-ui/README.md: "MIT for the files of this package" → "Apache-2.0 for the files of this package"
- .agents/skills/kanban/data/tasks.json: "portal-ui's builder chose MIT, but the repo has none, and the npm preview needs one for every package that publishes." → "The npm preview needs one for every package that publishes."

F7-portal-ui-seam.md item 6 ("The package's licence is MIT") is a dated record and keeps its words; it now carries
"Superseded by L1, 23 November 2026".
