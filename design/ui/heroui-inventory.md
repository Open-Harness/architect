# HeroUI in Orthograph today, and what UI SDK covers

Read from `origin/goal/stage-1` at `b3fd9eec` (21 November 2026), the newest portal code, by the 📐 designer thread
for K29. UI SDK read from `github.com/vercel-labs/ui` at the tag `@ui-sdk/core@0.1.0-beta.7` (`5152971c`), the
version K24 pins. Every path below is on `goal/stage-1` unless it says otherwise.

## 1. The short answer

The portal that runs today uses **three** components from `@orthograph/portal-ui`: `Card`, `Widget` and `Timeline`.
Everything else on its pages, the shell included, is plain HTML with `data-portal` hooks, styled by one stylesheet on
HeroUI's colour tokens. `portal-ui` exports 18 component names over 35 HeroUI Pro components; 15 of those names have no caller.

So the move K24 planned is much smaller than it looked. The portal's real dependence on HeroUI is:

1. three components on four pages (section 3);
2. HeroUI's two precompiled stylesheets and nine of its colour tokens (section 4);
3. the build and CI machinery that installs Pro under a licence (section 5).

The big pieces K24 worried about (the data grid, the board, the chat, the shell) are exported but not used. The
portal's tables are `<table>`, its shell is `<header>`, `<nav>` and `<aside>`, and its search is a hand-rolled
dialog. The heavy HeroUI use is in the drawn design (`spikes/portal-site`, 87 pages) and the other spikes, which no
package imports.

## 2. What `@orthograph/portal-ui` exports (F7's seam)

`packages/portal-ui/src/index.ts:3-10` exports these names. Each wraps a HeroUI Pro component, renamed to our word.
Pro is a peer dependency (`packages/portal-ui/package.json`: `@heroui-pro/react >=1.0.0-beta.11`, dev-pinned at
`1.0.0-beta.11`, with `@heroui/react` and `@heroui/styles` `3.2.7`, and 27 more peers: React Aria, Tiptap, Recharts,
Shiki, Motion and others).

| Our name | HeroUI Pro component | Where it's defined | Used by the portal |
|---|---|---|---|
| `Shell.Layout`, `Shell.Rail`, `Shell.Drawer` | `AppLayout`, `AppLayoutAsideTrigger`, `AppLayoutMobileAside` | `modules/shell/internal/parts.ts:3` | no |
| `Shell.TopBar` | `Navbar` | `modules/shell/internal/parts.ts:4` | no |
| `Shell.Tree` | `Sidebar` | `modules/shell/internal/parts.ts:5` | no |
| `Grid` | `DataGrid` | `modules/data/service.ts:3` | no |
| `Board` | `Kanban` | `modules/data/service.ts:4` | no |
| `Stat`, `StatGroup` | `KPI`, `KPIGroup` | `modules/data/service.ts:5-6` | no |
| `StatValue` | `NumberValue` | `modules/data/service.ts:7` | no |
| `Timeline` | `Timeline` | `modules/data/service.ts:8` | **yes**, `spine.tsx:53-61` |
| `StatTrend` | `TrendChip` | `modules/data/service.ts:9` | no |
| `Widget` | `Widget` | `modules/data/service.ts:10` | **yes**, `rules.tsx:59-64` |
| `Chart.Area`, `Chart.Bar`, `Chart.Line` | `AreaChart`, `BarChart`, `LineChart` | `modules/data/internal/chart.ts:2-4` | no |
| `Code` | `CodeBlock` | `modules/content/service.ts:3` | no |
| `Command` | `Command` | `modules/content/service.ts:4` | no |
| `Peek` | `HoverCard` | `modules/content/service.ts:5` | no |
| `Card` | `ItemCard` | `modules/content/service.ts:6` | **yes**, `home.tsx:15-18`, `plugins.tsx:19-20` |
| `CardGroup` | `ItemCardGroup` | `modules/content/service.ts:7` | no |
| `Markdown` | `Markdown` | `modules/content/service.ts:8` | no |
| `Editor` | `RichTextEditor` | `modules/content/service.ts:9` | no |
| `Chat.Thinking` … `Chat.Shimmer` (12 parts) | `ChainOfThought`, `ChatAttachment`, `ChatConversation`, `ChatListView`, `ChatLoader`, `ChatMessage`, `ChatMessageActions`, `ChatSource`, `ChatTool`, `PromptInput`, `PromptSuggestion`, `TextShimmer` | `modules/chat/internal/parts.ts:3-14` | no (M1.24 isn't built) |

Who imports `@orthograph/portal-ui` at all: only `packages/portal` (four page files, below), the lint rules that guard
it (`packages/lint/src/modules/rules/internal/pro.ts`, `ui.ts`), and the M1 checks 15, 21, 26 and 27 in `e2e/m1/`.
No example, no generated file and no other package does.

## 3. How the portal is composed, shell to page

The client is one React tree: `packages/portal/src/main.ts` mounts `App` (`pages/internal/app.tsx:45-56`), which
loads the data from `/_portal/v1/*` and picks a page from the path (`route.ts:21-38`, `app.tsx:28-41`). Every page
sits in `Page` (`parts.tsx:12-18`), which wraps it in `Chrome` (`chrome.tsx:104-112`).

| Piece | File | Built from | HeroUI in it |
|---|---|---|---|
| The frame | `chrome.tsx:104-112` | a `div.shell` grid of the five parts below | none |
| Top bar: project, environment picker, search | `chrome.tsx:36-50` | `<header>`, the environments as `<a>` links (`:41-46`) | none |
| Search, ⌘K | `chrome.tsx:12-34` | a `window` keydown listener, a `<div role="dialog">` with an `<input>` and a `<ul>` of links | none (a hand-rolled dialog; `Command` from portal-ui is unused) |
| Icon rail and its panels | `chrome.tsx:52-67` | `<nav>` of `<button aria-expanded>`, each panel a `<ul hidden>` | none |
| Things tree | `chrome.tsx:69-80` | `<aside>` of `<a>`, operations indented under their thing | none (`Shell.Tree` is unused) |
| Live rail | `chrome.tsx:83-102` | `<aside>`: four tallies, then the last calls as links | none |
| Shared bits | `parts.tsx:22-78` | `Table` (a `<table>`), `Cell`, `Banner`, `FieldRows`, `Docs` | none |
| **Home** `/portal` | `home.tsx` | a `ul.things` grid of thing cards, each with its lifecycle strip | **`Card`** (`:15-18`: `Card`, `Card.Content`, `Card.Title`, `Card.Description`) |
| **Thing** `/portal/things/<name>` | `thing.tsx:12` | headings and lists; the lifecycle strip; the Rules section | via `rules.tsx` |
| Lifecycle strip | `lifecycle.tsx:8` | `<div>` of `<span>` moves | none (M1.50's `Graph` replaces it) |
| **Rules** (on a thing's page) | `rules.tsx:52-67` | one row per rule, its refusals and links | **`Widget`** (`:59-64`: `Widget`, `.Header`, `.Description`, `.Content`) |
| **Operation** `/portal/operations/<name>?tab=` | `operation.tsx:57` | tabs as links in a `<nav>` (`op-tabs` hook), panels below | via `spine.tsx` |
| Its tabs: contract, metrics, proof, docs, notes | `op-tabs.tsx:10-56` | headings, lists, the eval verdicts | none |
| The spine (on the contract tab) | `spine.tsx:45-67` | the fixed order a call runs in | **`Timeline`** (`:53-61`: `Timeline`, `.Item`, `.Rail`, `.Marker`, `.Connector`, `.Content`) |
| **Calls** (on the metrics tab) | `calls.tsx:100` | a `<table>` of calls, a native `<select>` filter, tiles | none |
| **Trace** `/portal/traces/<id>` | `trace.tsx:17` | a `<table>` of spans by attempt (the "waterfall" is a table) | none |
| **Journeys**, **starting worlds** | `journeys.tsx:8`, `:37` | sections and ordered lists | none |
| **Reference**: access, refusals, events, values, machines | `reference.tsx:58` | a `<table>` per kind | none |
| **Plugins** `/portal/plugins` | `plugins.tsx` | mount cards, then a stores `<table>` | **`Card`** (`:19-20`) |
| **Environments**, **compare** | `env.tsx:14`, `:40` | a `<dl>` and `<table>`s | none |
| **Monitor** `/portal/monitor` | `monitor.tsx:6` | "not built yet" (M1.49) | none |

Every check that reads the portal reads the `data-portal` hooks, not HeroUI's markup. Counting the lines that name a
hook in `e2e/m1/`: check 21 has 8, check 28 (rules in the portal) 35, `rules-judge.ts` 18 and `rules-standin.ts` 9. The hooks are the portal's contract
with its checks, and they survive any change of component underneath as long as the page keeps writing them.

## 4. The stylesheet and the tokens

`packages/portal/src/portal.css:1-3` imports HeroUI's own sheet and Pro's, which `vite.config.ts:15` aliases to the
files `packages/portal-ui/tools/sheets.mjs` finds in portal-ui's install. The rest of `portal.css` is ours, on nine
HeroUI tokens: `--background`, `--foreground`, `--accent`, `--muted`, `--separator`, `--success`, `--danger`,
`--warning`, `--surface-secondary`. UI SDK's `web.css` has its own `--ui-*` tokens for most of them
(`--ui-background`, `--ui-foreground`, `--ui-primary`, `--ui-muted-foreground`, `--ui-border`, `--ui-destructive`,
`--ui-muted`) and none for success or warning, which the portal defines itself.

## 5. The machinery around the licence

| Piece | Where | Goes when HeroUI goes |
|---|---|---|
| The Pro peer and dev pin | `packages/portal-ui/package.json` | yes |
| `pro.mjs`: real, stub or absent; gate a command on the licensed build; fetch; save to the CI cache | `packages/portal-ui/tools/pro.mjs` | yes |
| `sheets.mjs`: where HeroUI's two sheets are | `packages/portal-ui/tools/sheets.mjs`, `packages/portal/vite.config.ts:9,15` | yes |
| portal-ui's typecheck gated on the licence | `packages/portal-ui/project.json:17` | yes |
| `HEROUI_AUTH_TOKEN` install and cache | `.github/workflows/ci.yml:143-170` | yes |
| Lint: Pro only in portal-ui | `packages/lint/src/modules/rules/internal/pro.ts`, `.oxlintrc.json` (portal-ui and spikes exempt) | yes |
| Lint: no UI in a Worker or in `generated/` | `packages/lint/src/modules/rules/internal/ui.ts:5`, `.oxlintrc.json` (`**/generated/**` and the portal's server half) | **no, it changes**: it bans `react` and HeroUI in every `generated/` folder, so generated pieces need their own line (K29, decision 6) |
| Check 15 (the seam), check 26 (server and client line), check 27 (no licence) | `e2e/m1/15-…`, `26-…`, `27-…` | 15 is rewritten for UI SDK; 26 and 27 stay, since the line between a Worker and a browser bundle still holds |
| K19: the portal ships prebuilt because of the licence | `design/decisions/K19-portal-prebuilt.md` | its reason goes; whether to keep shipping it prebuilt is K29's call |

## 6. The free HeroUI 3 primitives

F7 allowed `Button`, `Chip` and `Card` from the free `@heroui/react` anywhere. **No package and no example imports
it.** The only mention outside portal-ui is a planted negative in check 26 (`e2e/m1/26-k19-server-client-line.test.ts:57`).

The spikes use it widely, and Pro too. Imports counted per spike (free / Pro): `console-mock` 12 / 48, `portal-fumadocs`
36 / 38, `portal-site` 29 / 25, `mission-board` 11 / 13, `portal-observability` 4 / 8, `portal-mock` 4 / 4,
`kanban-components` 0 / 5, `react-flow-graphs` 1 / 1. Across them, the free names are mostly `Chip` (77), `Button` (28),
`Tabs` (11), `Kbd` (9) and `Card` (9). Spikes are throwaway and never imported, so none of this has to move; but
`spikes/portal-site` is the drawn design the portal is built towards, so its components are the real target list:
`Widget`, `KPI`, `KPIGroup`, `Sidebar`, `DataGrid`, `Navbar`, `ItemCard`, `ItemCardGroup`, `CodeBlock`, `Segment`,
`Timeline`, `HoverCard` and `Command`.

The kanban board page (`.agents/skills/kanban/template/index.html`) uses no HeroUI.

## 7. The gap: what UI SDK has for each piece

UI SDK at beta.7 has 51 components (`packages/core/src/components/`). The same 51 are in beta.13, the newest
published, and on its main branch at `855bc7fd` (20 November). Words in the last column:

- **Has it**: a UI SDK component does the job.
- **Behaviour**: no component, but a public behaviour from `@ui-sdk/core` to build it on.
- **Ours**: we build it; nothing in UI SDK is about this.
- **Markup**: no behaviour at all, only layout and our tokens. A component with no keyboard, focus or state needs no
  library.

### What the portal uses today

| Piece | Today | UI SDK | Which |
|---|---|---|---|
| `Card` (thing and plugin cards) | Pro `ItemCard` | none | **Markup**: an `<article>` with our classes |
| `Widget` (the Rules section) | Pro `Widget` | none | **Markup**: a `<section>` with a header |
| `Timeline` (the spine) | Pro `Timeline` | `Timeline` | **Has it** |
| Search ⌘K | hand-rolled dialog (`chrome.tsx:12-34`) | `Command` in a `Dialog`, `shortcut="mod+k"` | **Has it**, and an agent can then use it |
| Environment picker | links (`chrome.tsx:41-46`) | `Select`, or `Segmented Control` for few | **Has it** |
| Icon rail panels | buttons and hidden lists (`chrome.tsx:52-67`) | `Toolbar` with `Popover`, or `Navigation Menu` | **Has it** |
| Things tree | links (`chrome.tsx:69-80`) | `Tree` | **Has it** |
| Operation tabs | links with `?tab=` (`operation.tsx`) | `Tabs`, each tab rendered as a link | **Has it** |
| Calls filter | native `<select>` (`calls.tsx`) | `Select` | **Has it** |
| Tables (calls, reference, environments, stores, spans) | `<table>` (`parts.tsx:22`) | none; `Pagination` for paging | **Markup** while they're read only; a **Behaviour** grid once they sort, select or page |
| Trace waterfall | a `<table>` of spans (`trace.tsx`) | `Waterfall` (spans with a start, a duration and children) | **Has it**, marked experimental |
| Lifecycle strip | spans (`lifecycle.tsx`) | none | **Ours**: M1.50's `Graph` replaces it |

### What portal-ui exports but nothing uses yet

| Our name | UI SDK | Which |
|---|---|---|
| `Shell` (layout, top bar, tree, rail, drawer) | `Drawer`, `Tree`, `Resizable`, `Scroll Area`, `Toolbar`, `Navigation Menu` | **Ours**, from those parts: the frame is layout |
| `Grid` (data grid) | `createGridFocus`, `createCellRange`, `createSelection`, `createRovingFocus`, `Pagination` | **Behaviour** |
| `Board` (kanban) | `createReorder`, `createTransfer` (experimental) | **Behaviour**, as K24 said |
| `Stat`, `StatGroup`, `StatValue`, `StatTrend` | `Meter` and `Progress` for a bar; nothing for a number with its trend | **Markup**, numbers through `Intl.NumberFormat` |
| `Chart` (area, bar, line) | none | **Ours**, on a chart library: Recharts is MIT, already a peer, and has no HeroUI in it |
| `Code` | none | **Ours**, on Shiki (MIT), with UI SDK's `Button` to copy |
| `Command` | `Command` | **Has it** |
| `Peek` | `Hover Card` | **Has it** |
| `Markdown` | none | **Ours**, on a Markdown renderer |
| `Editor` | `Trigger Menu`, `Tree`, `Menu`, `Checkbox`, `Toggle` | **Ours**, from those parts: `spikes/ui-sdk-real-world` section 8 built one. An agent can't read its text unless the document is its own primitive with a `value` |
| `Chat` (12 parts) | `Textarea`, `Button`, `File Input`, `Trigger Menu`, `Token Input`, `Collapsible`, `Scroll Area`, `Toast`, `createStickToBottom` (experimental), `createInputHistory` | **Ours**, from those parts (M1.24) |
| `Graph` (M1.50, not exported yet) | none | **Ours**, on `@xyflow/react` as accepted; its nodes can hold UI SDK buttons |

### What the app screens need, that nothing has yet

| Screen | Needs | UI SDK | Which |
|---|---|---|---|
| Plugged In `/@name` (ST1.04) | read `profile.get`, show the name and its links in order | `Avatar`, `Separator`; links are `<a>` | a **generated read piece**, then **Markup** |
| Plugged In `/claim` | the `handle.claim` form: name, its help, the refusal, the answer | `Field`, `Input`, `Button` | a **generated operation piece** (`spikes/ui-sdk-real-world`) |
| Plugged In `/edit` | `link.add` form, a list of links with remove, reorder by drag and keys (`link.order`), release the name with a confirm | `Field`, `Input`, `Button`, `Alert Dialog`, `createReorder` | generated pieces for each operation, and **Behaviour** for the reorderable list |
| Sign-in `/login` (M2.01) | email and password, or a magic link | `Field`, `Input`, `Password Input`, `Button` | a **generated operation piece** over the auth plugin's `session.sign-in`; the password is secret already |
| `/consent` (MCP OAuth) | who asks, for what, approve or refuse | `Checkbox` per scope, `Button`, `Alert Dialog` | a **generated piece** if consent is an operation, else **Markup** in the auth plugin |
| `/device` (a device code) | type a one-time code, confirm | `OTP Input`, `Button` | a **generated operation piece** |
| Stage 2 `/wallet` (ST2.04) | the address, balance, linked wallets, link and unlink (SIWE, `notVia(Agent)`) | `Button`, `Alert Dialog`, `Toast`, `Number Input` with `step={0.01}` | generated pieces, plus **Ours** for the submission states (simulated, submitted, included, confirmed, dropped, reverted, corrected: ST2.03) |
| Stage 2 "Pay @name" | choose a handle, an amount, simulate, then send | `Combobox` (async options, `minLength`), `Number Input`, `Button`, `Progress` | a **generated operation piece** with an approval (`data-agent-confirm`), plus the submission states above |

## 8. What this means for K29

- The portal's move off HeroUI is three components, a stylesheet and the licence machinery: one small change, not a
  long piece-by-piece migration.
- The portal-ui exports nobody uses don't need porting. They need deleting, and building again on UI SDK only when a
  page first needs one (the grid with M1.49's monitor, the chat with M1.24, the graph with M1.50).
- `ui.ts`'s ban on `react` in `generated/` is the first rule a generated piece breaks. It's there to keep React out
  of a Worker's bundle, which a page's bundle isn't.
