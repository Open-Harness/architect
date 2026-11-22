---
name: portal-design
description: How to design Orthograph's portal and operator console as mockups built from real components (today HeroUI Pro behind `portal-ui`; new screens build on UI SDK, K24), and the style Aaron accepts. Use it before drawing or changing any portal or console screen, when an agent sends requirements to turn into a user experience, when picking components for a page, or when taking over the console-mock canvas from another session.
---

# Portal design

The portal is where people ideate, design, build and monitor a blueprint, all in one place (Aaron, 19 November 2026).
Two audiences use it: the operator who runs the agent that builds the blueprint, and the stakeholders who shape what
gets built. Requirements usually arrive from another agent; the job is to turn them into a well-made experience for
both.

The working mock lives in `spikes/console-mock/` (its README says how to run and publish it). The accepted model page
is `spikes/console-mock/src/mission.tsx`. Read it before drawing anything.

## The process

Every screen goes through these steps, in order. Skipping the look in step 5 is how a whole set of pages got called
slop on 19 November 2026.

1. **Read the spec.** `design/portal.md` (the frame, the pages, the rules agreed in rounds 1 and 2),
   `design/decisions/K11-work-board.md` (the work board and its Item machine), `K10-factory.md` (the Factory face),
   `K13-lock-down-first.md` (what M1 must ship: M1.13, the portal as a viewer on `examples/plugged-in` stage 1, the Plugged In app (K15); on the
   `conductor/k13-lock-down` branch until it merges), `design/milestones.md`, and the wire the pages are drawn from,
   `packages/portal/src/modules/wire/types.ts`. A page shows what the wire carries; a field the wire lacks is a gap to
   name, not something to invent.
2. **Look at real products.** Use the Mobbin tools (`search_screens`, `search_flows`) for the pattern you need. Linear
   is the reference for work: project page, issue page, inbox, board, settings. Note what each screen puts where, and
   why.
3. **Audit the components.** Today the portal uses HeroUI Pro behind `portal-ui`; new screens build on UI SDK and HeroUI
   is phased out (K24). Use what `portal-ui` (HeroUI Pro under it for now) and UI SDK already
   have before drawing anything by hand. Open the part's types under `internal/portal-pro/node_modules` to see its
   real slots and props. The list under "Components" below is what has been checked so far.
4. **Grill Aaron before drawing.** Information architecture and UX choices are his. Ask in the grill format in
   `~/.claude/CLAUDE.md`: the problem with real code and `file:line`, what it touches, each option as code, a "you do
   X" table, the rubric, a recommendation, and an at-a-glance table with an answer key. Batch the questions. He
   listens rather than reads, so say each problem plainly first. Every generated fact in a grill or a mock is quoted
   from the generated file (below, "Generated facts").
5. **Render and look.** Run `spikes/console-mock/tools/shoot.sh <Name>` and open the PNG. Check it at 1440 wide
   against every rule in the style guide below. Fix and look again until nothing breaks a rule.
6. **Publish to the canvas.** Copy the artboard into `spikes/console-mock/canvas/`, publish to the Design artifact (the
   README says how), and lay the board out by journey with a note per group saying what the group is for.
7. **Commit.** The mock source and the canvas are committed together, so the next agent starts from what Aaron saw.

## The style guide

### Layout

- **A page is a Linear project page.** A main column with the title, a properties row of chips, then the content
  blocks; a right rail of about 340px with properties, milestones, progress and activity. Page tabs sit above the
  title (Overview, Updates, Work items, Activity), compact and fit to their content.
- **Lists sit beside their detail.** An inbox is a list on the left and the selected item on the right. A board groups
  cards by status. A settings area gets its own sidebar with "Back to app" and centred sections of rows.
- **Configuration gets its own page.** Never squeeze a settings form into a side panel next to a table.

### Framing

- **Every block sits in a Widget** (`portal-ui`'s `Widget`, HeroUI Pro's today, UI SDK's after K24): `Widget.Header` with a title and a one-line
  description, then `Widget.Content`. Never a hand-made card.
- **KPIs go inside a Widget.** `KPIGroup` is itself a surface card, so it goes straight into the Widget with the
  `widget-kpis` class, not inside `Widget.Content`.
- **A DataGrid never goes inside a Widget.** `DataGrid variant="primary"` already has its own frame; two frames stack.
- **One progress indicator per thing.** A progress circle, or a bar, or a stepper. Never two of them for the same
  number.

### Content

- **Generated facts.** In a mock, a brief or a grill, a refusal's code, its HTTP status and its CLI exit, and any other
  fact the generators write, are quoted only from the example's own generated files
  (`examples/<name>/generated/api/src/errors.ts`, `examples/<name>/generated/cli/src/` or the generated docs), naming
  the file. Never copy one from `design/portal.md`, another design page or an earlier mock: those copies go stale. A
  grill on 19 November showed the wrong code for one refusal (HandleNotClaimed) that way. Regenerate first if the
  example changed.
- **Numbers are data, not sentences.** A number goes in a stat block (`KPI`, `KPIGroup`) or a chart, with its unit and
  what it is out of. Prose may tell the story but never carries a number the page doesn't also show
  (`design/portal.md`, numbers as data).
- **Define every word that judges.** "Health", "on pace", "waiting": the page says what it means where it is used,
  usually in the Widget description ("On pace: items finish near their usual time").
- **Status is a plain word with a reason.** A chip says `slow`, and the line next to it says why ("Item 3 at 23 min,
  usually 7").
- **A list of things to act on is a real list.** Approvals are `ChatTool` with `state="requires-action"`, composed
  from its parts with `defaultExpanded`, so the call, its arguments and the reason it stopped are all visible. Lists
  of entities are `ItemCard`s in an `ItemCardGroup variant="transparent"`. Never mini-cards in an Alert.
- **Show no populations and no secrets.** Counts of people or accounts are not shown; a secret is never printed, only
  named.

### Charts and code

- Charts are hand-drawn SVG in `charts.tsx`, because Recharts renders empty when rendered on the server. Each chart
  has an `aria-label` that says what it shows in words.
- Code is a `CodeBlock` highlighted with shiki (`code.tsx`).

### Look

- Dark theme, `Plus Jakarta Sans` for text, `JetBrains Mono` for names, ids and times.
- Muted text for descriptions; colour only for status (success, warning, danger) and the one primary action.

## Components

Checked and in use: `Widget`, `KPI`, `KPIGroup`, `DataGrid`, `ItemCard`, `ItemCardGroup`, `ChatTool`, `ProgressCircle`,
`Timeline`, `Segment`, `PromptInput`, `AppLayout`, `Sidebar`, `Navbar` from Pro; `Tabs`, `Chip`, `Button`, `Alert`,
`Avatar`, `Switch`, `Label` from HeroUI today (phased out, K24).

Checked, not yet used, and likely to earn a place: `Kanban` (the work board), `ChatListView`, `Resizable` (list beside
detail), `EmptyState`, `ActionBar`, `Markdown`, `TextShimmer`, `ChainOfThought`, `CellSelect`, `CellSwitch`,
`InlineSelect`.

`packages/portal-ui` is the only package that imports Pro, and only through its exports (shell: Layout, Tree, TopBar,
Rail, Drawer; data: Board, Chart, Grid, Stat, StatGroup, StatTrend, StatValue, Timeline, Widget; content: Card,
CardGroup, Code, Command, Editor, Markdown, Peek; the chat parts). A page that needs a part outside that list names it
to the M1 lead with its Pro subpath and the page that needs it.

## Where the design stands (19 November 2026)

**Accepted.** The Goal page shape (`mission.tsx`): waiting-on-you approvals, the latest update as a playable
narration, milestones, a progress block with a burn-up, workers with a pace chip and its reason, activity.

**Aaron's direction.**
- Redo every page in that style, cohesive, organised by the important journeys: ideate, design, build, monitor.
- The work items are Orthograph blueprint operations: the agent builds a blueprint (option A, 19 November).
- Board cards are like Linear's, and each card links to the operation the agent is working on. The operation's page
  shows its status: every eval and check, and what is specified or still underspecified.
- Notion-style content: the notes already on operations grow into the docs, which become a collection of these
  notes; skills can be folders of the same notes and content blocks. The blocks come from one of Agent Native's kits.

**Open with Aaron**, from the grill sent 19 November (all recommended A):
1. Fold the console into the portal as its Work and Factory groups.
2. Declaration pages are generated and read-only; a change goes through an agent.
3. A board card carries its operation's journeys, checks, p95 and what is missing.
4. Each operation gets a generated Spec section, every gap linked to its work item.
5. The narration is the run's story told in words, with every number in a stat block beside it.
6. Channels are sources into the Work inbox (`item.receive`, K11), and replies go back to where they came from.

Also open: which pages come first, the M1.13 viewer pages (the critical path) or everything together.

**From the M1 lead.** Spec completeness belongs to M1.13 and is derived from the wire: blanks, journeys, proof and
evals, the p95 budget, descriptions and refusal codes. Use `examples/plugged-in` stage 1 (things `profile`, `link`,
`handle`; operations to claim a handle, add, order and remove a link, plus a public read; the `HandleTaken` refusal),
with the names the Canon session gives. The board itself is M3.17 and the Factory face M4.23.

**Next.** Once Aaron answers and the Plugged In names are in: redraw every page around the four journeys on Plugged In stage 1,
render and look at each, publish, then send the lead the list of Pro parts each page needs.
