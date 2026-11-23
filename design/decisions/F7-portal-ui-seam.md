# F7: HeroUI Pro behind one package, `@orthograph/portal-ui`

> **Superseded by K24, 20 November 2026:** UI SDK replaces HeroUI Pro behind this same seam, one export at a time, and HeroUI is then removed. The seam and its names stay; the lint rule against `@heroui-pro/*` goes with HeroUI, and the free HeroUI 3 primitives allowed under decision 2 are not used in new code. See `K24-ui-sdk.md`.

Decided 19 November 2026. Aaron said "Yes, add the seam" (relayed by the conductor). The shape below is the 📐 portal
thread's, under "Who decides" in `AGENTS.md`. It refines M1.25's Q8 answer (`design/portal.md`, "Aaron's answers").

## Why

We keep HeroUI Pro (superseded by K29, 21 November 2026: HeroUI leaves the portal in ST1.27). Its licence (`node_modules/@heroui-pro/react/LICENSE`, version 1.0.0-beta.11) allows what we do
and forbids what a seam keeps us clear of:

- **Within the project only.** Section 1: using Pro grants no right to extract, resell or distribute it "outside the
  licensed project".
- **Allowed.** Section 2: building, publishing and distributing any number of applications, open ones included,
  "provided that the license is active at the time of development and distribution".
- **Forbidden, section 3:** sharing, publishing, redistributing or sub-licensing the package or any part of its
  source; using it to make a tool or library that competes with HeroUI Pro; reverse-engineering or modifying it for
  redistribution; exposing CI/CD tokens, credentials or licence keys.

So a deployed portal built with Pro is fine, and so is a published package that imports Pro without containing it:
importing is not redistributing, as long as Pro's code is never copied into our repository or bundled into our build,
and each person who installs it does so with their own licence (Aaron, 19 November 2026: "we can import it"). This
public repository may never hold Pro's code. Two events would
force a change: the licence lapsing, or Pro's terms (or HeroUI) deciding that a framework importing Pro edges toward
"competing library". The seam makes either one a swap of one package
instead of an edit to every page.

## Decided

1. **One package imports Pro.** `@orthograph/portal-ui`, at `packages/portal-ui`, is the only importer of
   `@heroui-pro/react`. It is published like our other packages, with `@heroui-pro/react` as a **peer dependency**,
   never bundled: its build marks `@heroui-pro/*` external, and a check fails if its `dist` holds any of Pro's code.
   Anyone running the portal installs Pro with their own licence. (Not "face", which is the extension contract
   `Portal.face`; not "kit", which is K1's word.)
2. **It exports our own names**, shaped by what the portal needs, not a one-to-one mirror of Pro:

   | Ours | Built on (Pro, unless noted) |
   |---|---|
   | `Shell` (with `Shell.Tree`, `Shell.TopBar`, `Shell.Rail`, `Shell.Drawer`) | `AppLayout`, `Sidebar`, `Navbar` |
   | `Board` | `Kanban` (with our server-owned hook, `spikes/kanban-components`) |
   | `Grid` | `DataGrid` |
   | `Chart.Area`, `Chart.Bar`, `Chart.Line` | `AreaChart`, `BarChart`, `LineChart` |
   | `Stat`, `StatGroup` | `KPI`, `KPIGroup`, `NumberValue`, `TrendChip` |
   | `Card`, `CardGroup`, `Peek` | `ItemCard`, `ItemCardGroup`, `HoverCard` |
   | `Widget` | `Widget` |
   | `Timeline` | `Timeline` |
   | `Command` | `Command` |
   | `Code` | `CodeBlock` |
   | `Markdown` | `Markdown` |
   | `Editor` | `RichTextEditor` |
   | `Chat.Conversation`, `Chat.Message`, `Chat.MessageActions`, `Chat.Tool`, `Chat.Input`, `Chat.Suggestions` | `ChatConversation`, `ChatMessage`, `ChatMessageActions`, `ChatTool`, `PromptInput`, `PromptSuggestion` |
   | `Chat.List`, `Chat.Thinking`, `Chat.Loader`, `Chat.Shimmer`, `Chat.Source`, `Chat.Attachment` | `ChatListView`, `ChainOfThought`, `ChatLoader`, `TextShimmer`, `ChatSource`, `ChatAttachment` |

   The chat parts stay thin: M1.23 and M1.24 port agent-native's chat contract (approvals, refusals, screen context),
   and `Chat.Tool` takes an action's states under the names K10 section 6 maps them to (`input-streaming`,
   `input-available`, `output-available`, `output-error`, `requires-action`), which are Pro's own. The table covers
   the pages in `design/portal.md` and the Factory face (K10 section 6); a later face that needs another Pro component
   adds its export to `portal-ui` in its own slice, never an import of Pro. Free HeroUI 3 primitives (`Button`,
   `Chip`, `Card`) may be used directly anywhere; they are open source.
3. **A lint rule holds the seam.** `no-restricted-imports` in `.oxlintrc.json` bans `@heroui-pro/*` in every package
   except `packages/portal-ui`, and in all generated code; an Nx tag on `portal-ui` keeps it a leaf that only the
   portal and faces depend on. Spikes (`spikes/**`, already outside lint) are exempt.
4. **Pro installs at build time, never committed.** CI sets `HEROUI_AUTH_TOKEN`, a GitHub Actions secret Aaron
   creates (from the HeroUI Pro dashboard, scoped to the licence). Pro's postinstall reads it and downloads the
   licensed build. The job that needs it never runs on pull requests from forks, so the secret is never exposed to
   code we didn't write. Installs are cached by lockfile hash, because HeroUI caps CI downloads per token per day
   (https://heroui.pro/docs/react/getting-started/ci-caching).
5. (Superseded by K29, 21 November 2026: the exports are rebuilt on UI SDK, not free HeroUI 3.) **The fallback is later work, not a slice** (`design/later.md`): the same exports rebuilt on free HeroUI 3 for the
   primitives; Recharts, TanStack Table, cmdk, Shiki, react-markdown and Tiptap; dnd-kit for the board; the shell by
   hand. Pages don't change.

## Consequence

`@orthograph/portal` depends on `@orthograph/portal-ui`, and both are published. Pro is a peer dependency of
`portal-ui`, so a project that runs the portal needs a HeroUI Pro licence of its own. If that ever stops being
acceptable, the fallback (decision 5) replaces `portal-ui`'s insides and nothing else.

## Where it lands

M1.34 (new, ∥, before M1.13): the package, its exports, the lint rule and the CI install. M1.13's pages, M1.24's
shell and chat parts, M3.17's board and M4.23's Factory face import only from it. A face's sandboxed frame (F8) loads
`portal-ui` and Pro from the deployed portal's own build, so no face bundles Pro either.

## Built (M1.34, 19 November 2026)

The builder's calls, where the decision left the shape open.

1. **A plain install holds no Pro code, and every job but one runs without it.** `portal-ui` lists Pro as a peer
   dependency (`>=1.0.0-beta.11 <2.0.0`) and as an exact dev dependency (`1.0.0-beta.11`), so the lockfile pins it. The
   registry package is an empty shell whose `postinstall` downloads the licensed build with `HEROUI_AUTH_TOKEN` or a
   login; `pnpm-workspace.yaml` sets its `allowBuilds` to `false`, so no install anywhere runs it (nothing reads a
   keyring or a token by surprise). The shell has no `types` and no `exports`.
2. **What needs Pro is gated, not faked.** `nx build portal-ui` works on the shell: the sources are only
   `export { A as B } from "<Pro subpath>"` lines, and the build (`tsc`, `isolatedDeclarations`, `noCheck`) emits their
   declarations from the syntax without reading Pro. `nx typecheck portal-ui` is the one target that needs the real
   build: `tools/pro.mjs ... gate` runs `tsc` where the real build is installed, prints that it skipped where it is not,
   and fails when `ORTHO_REQUIRE_PRO=1` (the CI job). It is uncached, so a skip is never replayed on a licensed machine.
   Types for Pro were not declared locally: a local `declare module` would hide every rename Pro makes. Typechecking
   against the real build (a local login install, 1.0.0-beta.11) found Pro's root export lacks most components
   (`KPI`, the charts, `CodeBlock`, `Markdown`, `RichTextEditor`, `ChatTool`, and more), so every part is imported from its
   own subpath, as the spikes do, and `moduleResolution: "bundler"` is set for this package (Pro's declarations use
   extensionless imports, which `nodenext` refuses).
3. **The CI job is `portal-ui` in `.github/workflows/ci.yml`.** Its `if` is false for a fork's `pull_request` and true for
   a push and a same-repository pull request. The secret is in the `env` of one step only. A cache (`actions/cache`, key
   `heroui-pro-<os>-<hash of pnpm-lock.yaml>`, path `.cache/heroui-pro`) is restored before `pnpm install`; on a miss the
   job runs Pro's own installer through `tools/pro.mjs ... fetch` (which first copies the package out of pnpm's store, so
   the download never reaches it) and saves the licensed build to the cache folder; on a hit it copies it back. It then
   lints, typechecks, tests and builds `portal-ui` against the real Pro, lists what `npm pack` would publish, and runs check
   15. The other M1 jobs install the shell and skip nothing silently: the typecheck prints that it skipped.
4. **The lint rule holds in generated code and is off under spikes by override, not by ignore.** `no-restricted-imports`
   (patterns `@heroui-pro/*` and `@heroui-pro/**`, message naming `@orthograph/portal-ui`) is an error everywhere, and off
   in `packages/portal-ui/**` and `spikes/**`. To make it reach `generated/`, `**/generated/**` left `ignorePatterns` and
   became an override that turns the three ortho and Nx rules and the two rules generated code trips (`no-useless-spread`,
   `no-unused-vars`) off, so a generated file is judged by this rule alone, as it was by none before. `spikes/**` left
   `ignorePatterns` the same way, because oxlint exits 1 on a file it ignores and check 15 expects a planted spike file to
   pass; no Nx project lints a spike, so nothing else changes. Nx's module boundaries give `scope:portal-ui` no workspace
   dependency and only the Pro subpaths as external imports.
5. **Check 15's dist half cannot pass with a valid manifest** (reported to the lead): `proInside` flags the peer
   dependency's own name in the packed `package.json` as "a mention that is not an import". The CI job runs check 15 as a
   report-only step until the author fixes it. *Fixed by the author before the merge (`m1-author-15b`, 2e3ee8f6): a
   name under `peerDependencies` or `devDependencies` is no Pro code. The lead removed the report-only flag in the same
   merge, so check 15 blocks the `portal-ui` job.*
6. **The package's licence is MIT** for its own files (nothing in the repository chose one; reversible), with a line that
   Pro is not covered. *The lead holds this open for Aaron: the repository has no licence, and the npm preview after Gate
   M1 needs his choice for every package that publishes, not only this one.* Superseded by L1, 23 November 2026: every
   published package is Apache-2.0.
