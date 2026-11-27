# ADD-journey-places: journeys live in `blueprint/journeys/`; a root `journeys/` is read everywhere too

26 November 2026. A 🔨 builder thread's call, made while fixing what a fact-check of the "journeys first" chapter
found on `examples/plugged-in`. Aaron's words on the findings: "they should work proper".

## Evidence

- **The decided place is `blueprint/journeys/`.** `design/decisions.md` says "Journeys are part of the blueprint";
  the canon's table of places gives a journey `blueprint/journeys/` (`docs/canon/blueprint.mdx`); `ortho add journey`
  and `ortho add journeys` both write there (`packages/cli/src/modules/add/internal/templates.ts`,
  `packages/projections/src/modules/handlers/internal/stubs.ts`).
- **A `journeys` folder at the project's root is read as well** (ledger `BLU-02`, D2 #24): by the compiler
  (`packages/compiler/src/modules/source/service.ts`, as `../journeys/<file>`), by prove
  (`packages/prove/src/modules/journeys/internal/load.ts`) and by `ortho brief` (`packages/cli/src/main.ts`).
- **Every example keeps its journeys at the root:** acme, budgets, capxul, plugged-in, signup and starter each have
  `journeys/` and no `blueprint/journeys/`. The canon's note said they "move there when M1.03 puts journeys in the
  model". M1.03 landed and they did not move.
- **`ortho check` was the one command that read only one place.** It listed blanks under `blueprint/` alone
  (`packages/cli/src/modules/check/service.ts`), so a blank in `journeys/at-the-root.ts` printed "blanks left 0" while
  `ortho model` called the same journey unfinished and prove skipped it.

## Decision

1. **`blueprint/journeys/` stays the one place the canon teaches and the add commands write to.**
2. **A root `journeys/` stays read, by every command that reads journeys.** `ortho check` now lists the blanks in its
   files too (the files directly in it, as the compiler reads them). A command that reads journeys from one place and
   not the other is a bug.
3. **The examples are not moved here.** Their journeys are the journey authors' files, which a builder never edits
   (`AGENTS.md`, "Journeys and checks come first"; `tools/ci/builder-paths.sh` protects `examples/*/journeys/**`), and
   moving a file changes every import in it. Moving them is an author's slice; until then the canon's note says the
   examples are at the root, and `BLU-02` stays open in the ledger.

## Supersedes

- `docs/canon/blueprint.mdx`: "the examples move there when M1.03 puts journeys in the model" → "the examples stay at the root until a journey author moves them (`ADD-journey-places`)"
