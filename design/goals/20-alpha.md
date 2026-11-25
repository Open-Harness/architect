---
goal: 20
title: the Orthograph alpha, TypeScript end to end from npm
milestone: "Goal 20: the Orthograph alpha"
release: preview
branch: main
base: main
status: ready          # ready | running | landing | done | parked
lead:
  harness: null        # claude | codex | opencode | amp, set by the lead when it starts
  model: null          # the model id it runs on
  since: null          # the date it started
done_check: from a registry, `ortho new` makes an app that declares, generates, proves and runs, and its generated CLI, SDK and MCP answer (the acceptance check, slice 8)
owns:
  - design/goals/20-alpha.md
  - packages/preset/
  - tools/release/
  - docs/canon/getting-started.mdx
slices:
  - "1 · The board re-sorted for K44: the superagent's rows to the alpha, to Capxul or to Not yet needed"
  - "2 · Publishing that works: a real version, pnpm publish, the starter in the preset, the release-age exemption, a dry run that refuses each mistake"
  - "3 · A command that creates an app: ortho new and npm create orthograph"
  - "4 · Getting started and help text for every command and flag"
  - "5 · The portal ships without its screens, and says so"
  - "6 · The chain basics in the alpha: their on-chain checks run on main, and the relayer fixed or marked experimental"
  - "7 · The framework fixes any TypeScript app hits: #1018, #1034, #972, #1001, #742, #759, #971, and the starter's #446 and #449"
  - "8 · The acceptance check: install from a registry, create an app, prove it (after 2, 3)"
  - "9 · Publish under next, with Aaron, and run the acceptance check against npm (after 4, 5, 6, 7, 8)"
---
# Goal 20: the Orthograph alpha

Branch `main`, by this goal's own pull requests. Written 25 November 2026 from K44 (`design/decisions/K44-two-builds.md`),
with Aaron, by voice. Milestone `Goal 20: the Orthograph alpha`, label `release:preview`.

**To start it, in any harness** (Claude Code, Codex, OpenCode, Amp): "You lead Goal 20. Read `AGENTS.md`,
`design/decisions/K44-two-builds.md` and `design/goals/20-alpha.md`, and run it." Nothing else is needed.

## The goal, in plain words

- **In one sentence:** Make Orthograph installable and usable by someone outside this repository: one command makes an
  app, and the whole TypeScript loop works from npm.
- **Why:** Inside the repository a new app goes from nothing to proved and running in about thirty minutes. From npm it
  doesn't work at all, and none of the reasons is the framework itself.
- **When it's done, you can:** install Orthograph from npm, run one command to make an app, declare what it holds,
  generate its server, SDK, command line and MCP tools, write its handlers in TypeScript, prove it, run it, and use the
  chain's basics from it.
- **It is:** packaging, a command that creates an app, a getting-started page, and the framework fixes any TypeScript app
  needs.
- **It isn't:** the portal's screens, Capxul, or the chain beyond keys, wallets, reads, sends and the follower.
- **Done when:** a check installs from a registry, makes a fresh app and proves it, and the same works from npm.
- **Waits on:** Aaron, for the publish itself, which needs his npm account.
- **Words used:**
  - a blueprint: the typed description of an app that everything else is generated from;
  - proving: running the app's journeys, its scripted user stories, and judging it from real evidence;
  - npm: where JavaScript packages are published; `next` is the tag for early releases;
  - the chain's basics: keys, signing, wallets, sending and reading, and following what happens on chain.

## Read first

- K44, then K28 (the preview) and K42 section 2 (how a piece of work moves).
- The trial of 25 November: a fresh app made from `main` and proved, and every place it broke for an outsider (K44, The
  problem). `tools/e2e/starter.sh` is the route that works inside the repository; `tools/release/preview.mjs` is the dry
  run.
- `docs/canon/status.md`, the board, and the snag issues each slice names.

## The slices

| # | Slice | After |
|---|---|---|
| 1 | The board re-sorted for K44: each row the superagent pulled goes to the alpha, to Capxul, or to "Not yet needed"; each row's release follows K44 section 4 | — |
| 2 | Publishing that works: a real version (`0.1.0-next.<n>`), published with pnpm so `workspace:` links and the `bin` are rewritten; the starter copied into the preset when it is packed; the preset's new workspace exempting `orthograph` and `@orthograph/*` from pnpm's minimum release age; the dry run refusing a `workspace:` link, a `bin` outside the tarball, or a preset with no starter | — |
| 3 | A command that creates an app: `ortho new <app>`, and `npm create orthograph` beside it, both making the same app the preset makes | — |
| 4 | Getting started: one page from install to a proved, running app and its generated tools (`<APP>_URL`, `<APP>_TOKEN`); a description on every command and flag; the stale READMEs (the CLI's says it has only `model`) | — |
| 5 | The portal ships without its screens: the server and the blueprint feed answer; asking for the screens says they aren't in this release, not a 404 | — |
| 6 | The chain basics in the alpha: the on-chain checks of keys, wallets, the chain adapter, money and the follower run on `main`; the relayer's #784 fixed, or the relayer marked experimental | — |
| 7 | The framework fixes any TypeScript app hits: #1018, #1034, #972, #1001, #742 item 4, #759 and #971, and the starter's sign-in bugs #446 and #449. Each is its own pair of pull requests, checks then build | — |
| 8 | The acceptance check: in CI, publish to a local registry, run `ortho new`, declare one thing, generate, prove | 2, 3 |
| 9 | Publish under `next` with Aaron, then run the acceptance check against npm | 4, 5, 6, 7, 8 |

Slices 1 to 7 can run side by side.

## How it runs

- **Pull requests into `main`.** Drafts first, checks before builds by a different agent (the `author` skill), a 🔍 that
  wrote none of it, then ready; merge when CI is green and every thread is resolved (`AGENTS.md`).
- **Capxul.** Capxul (Goal 16) finds framework gaps as it builds. A gap any TypeScript app would hit joins slice 7; one
  only Capxul needs stays Capxul's (K42, section 3).
- **Limits.** `AGENTS.md`'s standing rules. No publish without Aaron. Stop every process you start, by its id.

## Where it stands

Not started: written 25 November 2026 with K44. Aaron starts it with the line above.
