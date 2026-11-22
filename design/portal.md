# The portal's design (M1.25)

Agreed with Aaron on 19 November 2026, over two grill rounds (answers below, with their dates). This is the spec that
M1.13 (the portal's pages and the shell's frame), M1.24 (the shell's chat and screen context, in M3 since K13), M3.21
(faces and notes), M4.16 (the chat), M4.23 (the Factory face) and M3.17 (the board)
build to. The drawing is in [`../spikes/portal-mock/`](../spikes/portal-mock/README.md). What it takes from Codex's
portal (`experimental/portal-pro`) is in [`decisions/F8-portal-from-codex.md`](decisions/F8-portal-from-codex.md).

**The idea in one line.** The portal shows a blueprint's declared behaviour, generated from the model, and lets live
evidence light up that same structure. It starts from things and their lifecycles, then operations, machines, events,
errors and notes attached to their thing. It is telemetry, not analytics: it counts calls, refusals, defects, moves
and time, and never counts or browses the app's stored data.

## Aaron's answers

### Round 1 (18 November 2026, by speech, relayed by the conductor)

- **Q1, the chat: A.** "We are defo using Pi Durable for the portal's chat. We are going to make our own thing on top of
  Pi Durable that can automatically connect into any function and use the application, whatever it is you're building.
  But in the portal we are going to have a customised set of agents for building the application." So the chat is a
  Pi Durable run, with our own layer on top that reaches every action. The building agents (the factory) are K10's.
- **Q8, HeroUI Pro: neither A nor B.** "We're using it privately anyway, so it's no problem for now. If it ever does
  become a problem, we'll just clean-room the components that we need." So the portal is HeroUI Pro only, with no free
  face. **Fallback, recorded:** if Pro's licence ever blocks distribution, we clean-room the components the portal uses
  into our own package; the page contract stays as it is, so only the face changes. "The portal's components behind one package (F7,
  K29, K31)" below settles how. Superseded by K24, 20 November 2026: UI SDK is the base and HeroUI is phased out; and by
  K29 and K31, 21 November 2026: a new client on UI SDK replaces the old one at cutover.

### Round 2 (19 November 2026, in the chat: "Agreed to all questions")

All recommended options, including the Q11 addendum carrying the factory's needs:

| # | Joint | Answer |
|---|---|---|
| 2 | The first page | A · one card per thing: its lifecycle strip and a stat block |
| 3 | The tree as plugins pile up | A · the app's own things first, then one folded group per plugin (`from` in the model) |
| 4 | What lights up on a lifecycle | A · move counts in the window, each refusal on the arrow it guards; no populations |
| 5 | An operation's page | A · the spine, drawn from the model and lit by live calls; the in-and-out band on top |
| 6 | The live rail | A · scoped to the page: stat blocks, a sparkline, the last calls |
| 7 | The chat | A · a drawer over the rail; conversations kept under the thing they touch (as Runs, see below) |
| 9 | Every action | A · the portal is a feature written in Orthograph, so its verbs are actions too |
| 10 | Sign-in and roles | A · the app's own auth, plus `owner` and `builder` roles in the portal feature |
| 11 | Extensions | A · a feature with a portal face: generated pages free, typed slots for custom views |
| 12 | Environments | A · one portal per environment, its own sink only, a switcher, proof from the logbook |

### Round 3 (19 November 2026, relayed by the conductor)

Aaron's words, verbatim, then what was decided.

| # | Joint | Aaron | Status |
|---|---|---|---|
| 1 | Where the pages beyond things live | "need options as designs"; on the drawing, "I want to have icon rail" | B, agreed by Aaron's 19 Nov review; **replaced in round 4 by B + C** |
| 2 | Environments | "same need designs"; on the drawing, "the second one looks better, but on the proof section… you're wasting a lot of space" | A, agreed by Aaron's 19 Nov review; **replaced in round 4 by B** |
| 3 | Plugins and stores | "same designs"; on the drawing, "plugin, portal, journeys looks okay" | A, agreed by Aaron's 19 Nov review; **replaced in round 4 by B** |
| 4 | Journeys and starting worlds | "no we need to have them and show them graphically" | **Decided: pages for both, drawn as pictures** (below) |
| 5 | Access, refusal codes, events, values | "reference pages and we have telemetry on the page with spans and tracing etc" | **Decided: four reference pages, each with live telemetry** (below) |
| 6 | Blank operations | "show me"; no objection on the drawing | **A, agreed by Aaron's 19 Nov review and again in round 4: in the tree, greyed** |

**The agreed wireframe.** Aaron, 19 November 2026: "I don't want to over-perfectionalize this, it's still only
wireframes. Let's do one more round of this and then we're just going to take those feedbacks and start moving
forward." That round is done, and round 4 below corrected its picks. The drawing at
https://claude.ai/artifact/NzDgHFzQSk8yvX8cLNqUKj (`spikes/portal-site`) is the agreed wireframe, read with round 4's
picks, the component inventory and the delta audit below. The portal's build (M1.13, M1.49) works from it. Round 3's
designer picks, kept for the record (round 4 replaced Q1, Q2 and Q3):

- **Q1 B.** He asked for the icon rail. Built the library's way: Pro's Icon Only sidebar pattern beside
  `Sidebar.Pages`, one panel per section (Things, Proof, Reference, Plugins, Monitor), and ⌘K (Pro's `Command`) on
  every page.
- **Q2 A.** He liked B's page but not its proof. A keeps every environment on one page, takes B's summary card for the
  one you pick, lists each field `EnvironmentModel` declares with the others tinted where they differ, and draws proof
  as a matrix whose columns are tallied ("8 pass, 1 fail, 1 stale of 10 operations").
- **Q3 A.** He called the plugin page okay; it stays as drawn.
- **Q6 A.** No objection; blanks stay in the tree, greyed, with their page as the spec.

Two known roughnesses stay in the wireframe and are for the build to settle: refused and defect slices are thin in the
stacked calls bars (about 3% of calls), and a journey step's preview covers the lanes below it.

**Q4, decided.** There is a Journeys page, a page per journey and a page per starting world, and each is drawn, not
listed:

- A journey is a **sequence diagram**. Its cast are the lanes and its steps are the columns. Under the steps sit four
  rows of dots, one per environment, so a failure shows on the step where it happened ("failed here", then "not
  reached").
- Clicking a step opens its operation. A failed step opens its trace.
- Under the diagram the steps are a HeroUI Pro `Timeline`, with each check as a chip.
- The worlds are a **tree**. It starts from the empty world, then the starting worlds and what each gives, then the
  journeys that start from each, coloured by verdict.
- The Journeys page opens on that tree. Each journey's row carries one dot per step.

**Q5, decided.** The reference pages are Access, Refusal codes, Events, Values and Machines. Each is one table with
anchored rows, and each carries live telemetry:

- **Every row has its numbers.** It shows its count in the window, its rate per minute and a trend sparkline:
  - refusals per code, from `ortho.calls` by error tag;
  - NotAllowed per rule, with the role check's time;
  - commits per event, from the commit span's `event.name`;
  - answered moves per arrow.
  - Round 4 removed two the delta audit could not source: the role check's time per rule (the role check runs with no
    span) and door rejections per value (nothing records which value a payload broke).
- **Every row opens its trace.** Each row with spans has a "trace" link.
- **Every page lists its recent spans.** Each one opens its trace. A call refused at the door has no span (M1.20), so
  it is counted and never listed: Access and Values have no recent-rows table (round 4).

**Made consistent with K10 and K11 (merged after round 1).** K10 decision 9 and M4.16 say the chat is rendered with
HeroUI Pro's AI components over a Pi Durable run; round 1's wording said "Pi's surface". They agree once read
together: Pi Durable is the agent and the source of truth for the transcript (K10, H1.9), and what draws it is Pro's
`ChatConversation`, `ChatMessage` and `ChatTool`. (Superseded by K29, 21 November 2026: the chat is drawn by `portal-ui`'s `Chat` parts on UI SDK.) Q7's "threads kept under their thing" becomes "Runs kept under the
thing they touch": a chat conversation is one `@orthograph/agents` Run (K10 section 1), so the portal feature owns no
thread thing of its own (K5:475 and M1.24's "threads as things in the portal's store" are superseded by this).

### Round 4 (19 November 2026, relayed by the conductor)

Aaron's words: "question one, it's going to be B plus C. For question two is going to be B. For question three is going
to be B… six is going to be A." Q4 and Q5 stand. These replace round 3's picks above.

| # | Joint | Answer | How the drawing does it |
|---|---|---|---|
| 1 | Where the pages beyond things live | **B + C** | The icon rail stays (B). ⌘K is the first way to any declaration (C), so each panel stays a short list of pages: Things keeps the things tree; Proof lists the environments, Compare, Journeys and Starting worlds; Reference lists five pages; Plugins and stores and Monitor one or two each. Search is the top bar's widest control ("Go to any thing, operation or code"), and every panel ends with "Any thing, operation, code or page: ⌘K". |
| 2 | Environments | **B** | A page per environment (`env-<name>`). It keeps what Aaron liked from round 3's merged version: the summary card, the declared fields, and the proof matrix with a tally per column, every environment's column shown and this page's one in focus. A "Compare environments" link opens the one-page comparison. |
| 3 | Plugins and stores | **B** | One "Plugins and stores" page: a card per plugin (kind, package, version, its things, what it needs), then the stores table. No page per plugin. |
| 6 | Blank operations | **A** | Unchanged: in the tree, greyed, with their page as the spec. |

**The operation page (round 4).** Aaron, on the Metrics and Spans tabs: "when you see metrics here there should be a
table of the recent calls… spans is not really like a separate thing… you've kind of clicked on that particular span
and you can go to all of the calls, or some sort of table where you can filter through the calls based upon various
different things." So the Spans tab is gone. Metrics ends with a calls table (below, "The calls table"), and clicking a
call opens its trace in the drawer, where the waterfall lives. The tabs are Contract, Metrics, Proof, Docs and Notes.

**Made consistent by the delta audit (the designer's call).** Checking every element against `m1` turned up drawn
things nothing can source. The drawing now shows a caller's kind and never a person's name; counts Events from
`event.name` on commit spans, not from the journal; drops Access's role-check timing and recent-denial rows, Values'
per-value rejections, and a failed journey step's answer value. What stays drawn without a source is listed in "What
the drawing needs that the model or telemetry doesn't give yet", below.

## The frame

```text
┌ top bar ───────────────────────────────────────────────────────────────────────────────────────────┐
│ links   [ local ▾ · last 30 min ]                         [⌘K search]   [Needs you 2]   [💬 chat] │
├ tree ──────────┬ reading column ──────────────────────────────────────────┬ live rail ────────────┤
│ links          │ the page: a thing, an operation, a view                  │ ● scoped to the page  │
│   ▸ profile    │                                                          │ stat blocks           │
│   ▸ link       │                                                          │ sparkline             │
│ handles · feat │                                                          │ last calls            │
│   ▾ handle     │                                                          │ (extension cards)     │
│     claim      │                                                          │                       │
│     release    │                                                          │  drawer slides over   │
│     resolve    │                                                          │  the rail: a trace,   │
│ auth · feat    │                                                          │  or the chat          │
│   ▸ person     │                                                          │                       │
│   ▸ session    │                                                          │                       │
│ portal · feat  │                                                          │                       │
└────────────────┴──────────────────────────────────────────────────────────┴───────────────────────┘
```

- **Place tells kind** (UX.md rule 2): the tree is the model, the reading column is one page of it, the rail is now,
  the drawer is detail.
- **The tree (Q3 A).** The app's own things first, then one folded group per mounted plugin, labelled with its kind.
  A thing folds to its operations. Its machine, events and errors are sections of its page, not tree rows (UX.md
  note 2). The portal's own things sit last, under `portal`.
- **The icon rail (round 4, Q1 B + C).** The tree is the Things panel of an icon rail (Pro's icon-only sidebar beside
  `Sidebar.Pages`). The other icons open Proof, Reference, Plugins and stores, and Monitor, each a short list of pages.
  ⌘K (Pro's `Command`) is the first way to any declaration, so no panel lists every refusal, value or journey.
- **The top bar.** The environment and window control (Q12), search over the model (`⌘K`), the "Needs you" count
  (K11's attention, from any mounted feature) and the chat.
- **Built through `@orthograph/portal-ui`** (F7) until cutover; then by the new client on UI SDK and
  `@orthograph/shell`, its map declared in the blueprint (K29 section 7, K31, ST1.27; Aaron's Q8 chose HeroUI Pro's app
  shell, superseded by K29, 21 November 2026).

**Where each piece comes from.** Every table below marks its pieces:

- **G**, generated from the model (`model.json`), so nothing is written by hand;
- **L**, live, from the environment's telemetry or the logbook;
- **H**, hand-written. Each one is a **gap**, with its owner in "Gaps" at the end.

## The first page (Q2 A)

One card per thing, grouped as the tree is. Each card shows the thing's description, its lifecycle strip and a stat
block for the window. A card with a defect turns red; refusals stay amber, because a refusal is the app working.

```text
links
┌ profile ───────────────────────────────┐ ┌ link ──────────────────────────────────┐
│ A person's public page: their handle   │ │ One link on a profile, in order.       │
│ and their links, in order.             │ │ listed ──remove──► removed             │
│ (no lifecycle)                         │ │                                        │
│ calls 388  refused 2  defects 0  p95 4 │ │ calls 960 refused 11 defects 1● p95 9 │
└────────────────────────────────────────┘ └────────────────────────────────────────┘
handles · feature
┌ handle ────────────────────────────────┐
│ A name, claimed once.                  │
│ · ──claim──► claimed ──release──► released                                       │
│ calls 412  refused 37  defects 0  p95 6 ms of 150                               │
└────────────────────────────────────────┘
```

| Piece | Source | From |
|---|---|---|
| Groups and their order | G | `ThingModel.from: { kind, mount }` (gap 1) |
| Description, lifecycle strip | G | `ThingModel.description`, `MachineModel.states` and `moves` |
| calls, refused, defects | L | `ortho.calls` by operation and outcome (M1.20), summed per thing |
| p95 against budget | L, G | `ortho.call.duration` (M1.20); the budget is the operation's declared `budget.p95` (F8) |
| "Needs you" above the cards | L | each mounted feature's `attention` slot (Q11) |
| The operations matrix under the cards | G, L | one row per operation: calls, refused, defects, p95 against budget, sortable (F8) |

**The operations matrix** (from Codex's portal, F8) sits under the cards, never in place of them: one row per
operation, grouped like the cards, each count a link to those calls. A thing's page shows the same grid for its own
operations.

## A thing's page

It opens on the lifecycle (UX.md note 8), then its operations, events, errors, roles, notes and the conversations
that touched it.

```text
handle                                                         handles · feature · @orthograph/handles 0.1.0
A name, claimed once.

Lifecycle                                           (window: local · last 30 min)
          claim  375                  release  3
  ( · ) ─────────────────► (claimed) ─────────────────► (released)
          ▲ HandleTaken ×31             ▲ HandleNotClaimed ×2
Operations
  claim    person   Claim a free name. A name is claimed once.      412 calls · 37 refused · p95 6 ms
  release  person   Give the name back.                               5 calls ·  2 refused · p95 5 ms
  resolve  anyone   Find a handle by its name. (read)               1,904 calls · 0 refused · p95 2 ms
Events     HandleClaimed { handle, name, owner } · HandleReleased { handle }
Errors     HandleTaken HN-001 exit 10 · HandleNotClaimed HN-900 exit 11
Roles      person · anyone
Notes (2)  "claim retries once on a version race; that's by design" (pinned to thing:handle@4e1c…, current)
Conversations (1)  "why do releases get refused?"  · builder agent · 18 Nov
```

| Piece | Source | From |
|---|---|---|
| Header, plugin and version | G | `ThingModel`, `from`, the mount's package version |
| Lifecycle diagram | G | `MachineModel` |
| Move counts on each arrow | L | answered calls whose span carries `move.name` (the operation's span, M1.18); the operations list counts every call |
| Refusals on the arrow they guard | L, G | span outcome and error tag; the arrow from the operation's `move` |
| Operations grid | G, L | `OperationModel` (description, `allowed`, read or write), with its window's stat: the operations matrix, filtered to this thing (F8) |
| Events, errors, roles | G | `ThingModel.events`, `errors`, `roles` |
| Notes | L | the portal's `note` thing, kept in its own store (Q9): Markdown pinned to `kind:name@hash`, the declaration's own hash; "stale" once that hash moves (F8) |
| Conversations | L | `@orthograph/agents` Runs whose `touches` is this thing (gap 3) |
| Extension sections | per slot | `sections.thing` (Q11) |

**No populations** (Q4 A): the page never says how many handles are in each state. That count is stored data, and a
plugin with a million rows would pay for it on every refresh.

## An operation's page (Q5 A)

On top, the in-and-out band: what goes in, the operation, what comes out, and the ways it can say no. Under it, the
spine: the fixed order every Effect operation runs in (`packages/language-effect/src/modules/handler/service.ts:41-84`),
drawn from the model, with each declared step in its place. Live calls run down it.

```text
handle.claim                               handles · feature · allowed: person · idempotent by request
Claim a free name. A name is claimed once.

 IN   name: HandleName ───────► handle.claim ───────► OUT  handle: HandleId
      refusals: HandleTaken HN-001 ×31 · NotAllowed ×6 · bad payload ×0          emits HandleClaimed

 the spine (from the model)            call 7f3a… by a signed-in person, 12:04:31, attempt 2, answered in 9 ms
 ├ role check     person               ▏ 0.1 ms  ok
 ├ replay         request key          ▏ miss
 ├ machine check  · → claimed          ▏ ok
 ├ step lookup    database             ▇▇ 2.0 ms
 ├ step insert    database             ▇ 1.1 ms
 ├ answer check                        ▏ ok
 ├ move claim     → claimed            ▏ HandleClaimed
 └ commit         1 store              ▇▇▇ attempt 1 conflict ─► attempt 2 committed  3.2 ms
     └ on: HandleClaimed → profile.create   (links)  ▇▇ 2.4 ms  committed
 [Try it]  (calls as you, through the SDK; locally as a cast member)           [open its trace ▸]
```

| Piece | Source | From |
|---|---|---|
| In and out band | G | `OperationModel.payload`, `answer`, `errors`, `allowed`, `idempotent`, `emits` |
| Refusal counts | L | `ortho.calls` by error tag (M1.20), so refusals that open no span (`NotAllowed`, a bad payload) still count |
| The spine's rows | G | the spine's fixed order plus the operation's declared steps and their kinds (M1.03 puts steps in the model) |
| A finished call down the spine | L | the call's spans: one operation span per attempt, keyed by `attempt`; one per step, its kind from `step.kind`; `<op>.commit` with `commit.outcome` and `commit.writes` (M1.18); `move.name` and `move.to` on the move |
| A running call down the spine | L | step signals as each step starts and ends (M1.21) |
| What the commit set off | L | committed events read from the journal (M1.21) and the spans of their `on:` handlers |
| Try it | G | the operation's generated action (M1.22), called as the signed-in builder; arrives with M1.22 in M3 (K13), so M1.13's portal shows no button |
| Docs prose | G | the operation's `description`; the canon page it belongs to is linked, never copied |
| The proof tab | L | M1.04's verdicts from the logbook, keyed by the model's hash and the handler body's hash: each eval's verdict, the journeys that cover the operation, and what is unproven; latency is the live p95 beside it, not an eval's printed note (F8) |

The rows come from span attributes, never from names: a database step is `step.kind: "database"`, not a span whose
name looks like SQL, and a retry is a second `attempt`, not a second child of an HTTP span. There is no HTTP span to
group under (the wire turns it off, F8), so a call refused at the door shows in the counts and never as a trace.

**Reads** draw a shorter spine: role check, then the read. **A call that stopped** is marked on the row where it
stopped: the role check for `NotAllowed`, the machine check for a move from the wrong state, the handler for a
declared refusal, any row for a defect.

### The calls table (round 4)

The Metrics tab ends with every call to the operation in the window, one row per call, in Pro's `DataGrid`. Each row
opens its trace in the drawer. It replaces the Spans tab.

```text
 Environment [All ▾]  Caller [Any kind ▾]  Outcome [All ▾]  Request key [req_…  ]  ◯ Over budget only  [5|15|30 min]
 Time      Environment  Caller     Outcome                  Duration (budget 150 ms)  Request key  Attempts
 12:04:31  local        signed-in  answered                 9 ms                      req_7f3a…    2
 12:04:29  local        signed-in  HandleTaken HN-001       4 ms                      req_91c2…    1
 12:03:02  local        anyone     defect                   212 ms · over             —            1
 36 of 412 calls · click a call to open its trace · 6 refused NotAllowed at the role check: counted above, no span, so no row
```

| Filter or column | What it reads | Today (delta audit) |
|---|---|---|
| Time, and the window (5, 15, 30 min) | the span's start; `TraceSource.window(since, now)` | carried |
| Outcome: answered, refused (each code), defect | `refusal` on the operation span, mapped to its code through `Model.refusals`; status 2 and `defect` | carried for calls that opened a span; `refusal.code` itself is M1.36 |
| Duration, and over budget only | the extent of the call's attempt spans, against `budget.p95Ms` | carried |
| Attempts | `attempt` on each operation span | carried |
| Caller kind: anyone, signed-in | derived from `principal.kind` or the presence of `principal.person`, never the id | carried (derived) |
| Caller kind: a role, an agent | the role the caller held; an agent principal | **not carried**: role is a hole; agents arrive with M2.03 and ST1.05 |
| Environment | the span's `environment` attribute | **red**: check 17 (`e2e/m1/17-telemetry-model.test.ts:267-281`), M1.36. Each environment's portal reads only its own sink, so in the product this filter is the environment switcher |
| Request key | the call's idempotency key | `request.key` on the operation's span (M1.12a, check 38): the key as the caller sent it, on every attempt, on a replay and on `<op>.refused`; none on a call made without one. A key is chosen by the caller and is shown in the portal and in traces, so it must never carry a secret. Read into `TelemetryCall.requestKey` (`null` when none): the key any of the call's attempt spans carries, so a source that kept only the first or only the retry's span still gives it (check 38 B). Shown as `none` for a keyless call in a window that has keys, `not yet` where no call in the window has one |

A call refused at the door (`NotAllowed`, a bad payload) opens no span, so it is never a row: it is counted in the
tiles and named in the table's footer. The full delta for this table is in "Calls table vs spans", below.

### The trace drawer

Clicking a call in the calls table, or "open its trace" on the spine, slides a drawer over the page with the waterfall and every attribute that may be shown. The
waterfall's groups fold (from Codex's portal, F8): each attempt, then its steps, then each `on:` handler, with the path
to the selected span open. Private fields and untraced free text are never shown, in any environment (M1.19 traces a
field only when it is public, and free text only when marked). The portal also keeps out what M1.19 does not cover:
raw statements, which person called (`principal.person`) and log bodies; it shows a span's structure, timing, outcome,
declared refusal, how many logs it has, and the caller's kind (a person, an agent for a person, anyone), derived by the portal, since a person's span carries
`principal.person` and not `principal.kind`. Locally the
caller could be named by the journey's cast (`ada`, `bob`), which are fixtures, not people; nothing carries a cast name
onto a span yet, so until something does, every environment shows the kind only. A "no leak" check (M1.13)
plants each hidden item in a staging trace and fails if any renders. The example trace is always one worth
seeing: the claim above, with its commit conflict on attempt 1, the retry, the commit on attempt 2, and the profile
created through `on:`.

## The live rail (Q6 A)

Scoped to the page, the same shape everywhere. On home it covers everything; on `handle`, its operations; on
`handle.claim`, that operation alone.

```text
 ● local · last 30 min                       scope: handle.claim
 ┌ calls ┐┌ answered ┐┌ refused ┐┌ defects ┐┌ p95 of 150 ┐
 │  412  ││   375    ││   37    ││    0    ││   6 ms     │
 ▁▂▃▅▃▂▄▆▅▃▂▃▅  per minute
 12:04:31  claim  signed-in  answered   9 ms  attempt 2
 12:04:29  claim  signed-in  HandleTaken
 12:04:20  claim  signed-in  answered   5 ms
 Runs touching handle
 ◌ builder · "add a reserved-names list" · running 3 min
```

| Piece | Source | From |
|---|---|---|
| Stat blocks and sparkline | L | `ortho.calls` and `ortho.call.duration` (M1.20) in the window |
| Last calls | L | `TraceSource.window(since, now)` over the environment's sink: the Collector's files locally, about 50 ms a poll; tests and screenshots pass a fixed `now` (F8) |
| Runs touching the thing | L | `rail.on(thing, …)` from `@orthograph/agents` (Q11, gap 3) |

Numbers are shown as data, in stat blocks, never as sentences (UX.md note 5). There is no status sentence.

## The chat (Q1 A, Q7 A)

A drawer over the rail, opened from the top bar or from any page. It knows the page, the environment and window, and
the open trace, if any (screen context, M1.24). Each conversation is one `@orthograph/agents` Run (M4.16), resumed
from its durable record. The composer picks the agent spoken to: the app's own assistant, or any agent a mounted
feature lists (`chat.addressees`, filled by the factory's roster). A conversation is kept under the thing it touches.

```text
┌ chat · on handle.claim · local · 30 min · trace 7f3a… ────────────────┐
│ to: [ assistant ▾ ]   (assistant · builder · reviewer · designer …)   │
│ you  why did this claim need two attempts?                            │
│ assistant  Another claim committed between its read and its write.    │
│   ┌ tool · handle.resolve { name: "ada" } ─ output-available ────────┐│
│   └──────────────────────────────────────────────────────────────────┘│
│   ┌ tool · note.write { on: handle, body: "…" } ─ requires-action ───┐│
│   │                                       [ Approve ]  [ Reject ]    ││
│   └──────────────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────────────┘
```

| Piece | Source | From |
|---|---|---|
| The transcript | L | the Run's committed record (Pi Durable is its source of truth) |
| Tool cards and their states | G, L | the generated actions; `ChatTool`'s `state` maps one to one onto an action's (K10 section 6) |
| Approvals | G | `needsApproval` in the `defineAction` wrapper (M1.23), so a host that asks first never asks twice |
| Refusals in a card | G | the `ActionRefusal`'s code and message (M1.23), never a raw defect |
| The agent picker | G | `chat.addressees`, from the model's `Blueprint.agent` declarations (K10, M4.10) |
| Screen context | L | the page, the window, the open trace; extensions add to it with `context` (Q11) |

An agent drives the portal the way a person does (from Codex's portal, F8). `list` gives every action with its input
schema (M1.23). `view-screen` returns the screen context of one tab, and `navigate { tab, to }` moves that tab; each tab
keeps its own (M1.24). The portal's `AGENTS.md` is generated from the model and says to read the screen first.

## Every action (Q9 A)

The portal is a feature written in Orthograph, `@orthograph/portal`'s own blueprint, kept in the portal's own store
(K5 decision 5). Every verb it has is a declared operation, so it is a generated action, a button, an agent tool, an
MCP tool and a CLI command, all from one declaration. A person and an agent use the same door, and the portal's own
calls light up its own spine.

| Thing | Operations | Allowed |
|---|---|---|
| `note` (`kept → removed`) | `note.write { on, body }`, `note.edit { note, body, revision }`, `note.remove`, `note.list { on }` (read) | builder |
| `grant` (`given → revoked`) | `grant.give { person, role }`, `grant.revoke`, `grant.list` (read) | owner |

```ts
// packages/portal/blueprint/things/note/verbs/write.ts
export default Blueprint.operation(Note, {
  description: "Write a note on a thing or an operation, pinned to its declaration's hash.",
  payload: { on: Note.fields.on, body: NoteBody },
  answer: { note: Note.fields.id },
  move: machine.moves.write,
  allowed: [builder],
});
```

`Note.fields.on` names a declaration, a thing or an operation (its kind and name, from the model), not an instance; the
note keeps that declaration's hash it was written against and a Markdown body. `note.edit` has no move (the note stays
`kept`), and the `note` thing declares `NoteChanged`. `note.edit` takes the revision the page opened and refuses `NoteChanged` if another edit landed first
(from Codex's portal, F8), so two builders never overwrite each other silently. "Try it" is not a portal verb: it calls the app's own action as the
signed-in builder, so the app's roles decide what it may do.

## Sign-in and roles (Q10 A)

There is no second login. A person signs in through the app's own auth (K5 seam 9). Inside the portal:

| Role | Rule | May |
|---|---|---|
| `owner` | holds an owner grant | everything a builder may, plus `grant.give` and `grant.revoke` |
| `builder` | holds an active builder grant | see every page, write notes, use Try it and the chat |
| anyone else signed in | | refused with `NotAllowed` |

The first owner comes from the environment, by person id, held as a declared secret, never an email in the repo:

```ts
// blueprint/environments/production.ts
settings: [portal.settings.firstOwner.is(Secret.stored("PORTAL_FIRST_OWNER"))],
```

Locally (`identity: "test-principals"`) there is no sign-in: you are the owner, and inside Try it you act as a cast
member. The chat's agent acts as `agent for <you>` (M2.01), within your role. M2.06 builds the sign-in; until then
M1.24 signs in through acme's copied auth.

## Extensions (Q11 A)

An extension is a feature whose package also exports a portal face. It is mounted with one file, like any feature, and
deleting that file removes its pages, its store tables and its actions. Its things get every generated page for free;
a slot is only for what a thing's generated page cannot show. There is no fourth plugin kind and no free-form route.

**Settled here for M4.23 and M3.17.** The export is `Portal.face`, from `@orthograph/portal/face`, exported at the
feature package's `./portal` subpath, so the feature itself never depends on the portal and runs without it. A lint
rule, `orthograph/face-actions-only`, fails a face that imports a store, calls `fetch`, or writes through anything but
its own feature's generated actions; reads go through its declared reads only. It lands with M1.13, the first slice
that renders a face. At run time the same line holds (from Codex's portal, F8): every face renders in a sandboxed frame
(`sandbox="allow-scripts"`, CSP `default-src 'none'; connect-src 'none'`): all its traffic crosses one bridge,
and it writes only through the actions its slots declare. The face's typed slots are its manifest; there is no `extension.json`.

**What runs in a frame, and how it reaches the portal.** The slots that draw something (`views.list`, `views.one`,
`sections.thing`, `sections.operation`, and each `rail.on` card) render in the face's frame. The slots that are data
(`sidebar`, `attention`, `chat.addressees`) are declarations the shell reads and draws itself; `context` runs in the
frame of a face on the page and posts what it adds. The frame is a portal route (`/face/<feature>/<slot>`), never a
`srcdoc`, served with the CSP above and `script-src` limited to the portal's own built assets, so `portal-ui` and Pro
load from the deployed portal's build, not from a bundle inside each face (F7: Pro is never bundled into a published
package, a face included). With the network closed, everything crosses one bridge: the face's declared reads, its
declared actions, the live feed of committed events (with `hold()` and `release()`), a Run's stream for a face that
shows one, and the screen context. Drag and drop stay inside the frame; only the drop's action crosses.

```ts
// @orthograph/work: package.json "exports": { "./portal": "./portal/face.js" }
// portal/face.ts
export const face = Portal.face({
  sidebar:   { group: "Work", items: [Item, Goal] },
  views:     { list: { [Item.name]: Portal.view.board({ by: Item.machine }) } },
  sections:  { thing: [Portal.section("Work on this", ItemsOn)] },
  rail:      { on: [] },
  attention: Attention.list,                 // "Needs you", shown across the portal
  context:   (page) => ({}),
});
// the app: blueprint/features/work.ts. One file in, one file out.
export default Blueprint.use(work, (w) => []);
```

| Slot | Takes | Gets, typed |
|---|---|---|
| `sidebar` | a group name and the things in it | the tree group (Q3) |
| `views.list[thing]` | a view over a thing's instances | the thing's model, its machine, its actions with their refusals, a live feed of its committed events |
| `views.one[thing]` | a view of one instance | the same, for one id |
| `sections.thing`, `sections.operation` | a section on any thing's or operation's page | the page's model and the window |
| `rail.on(thing, …)` | a rail card beside a thing | the thing and the window |
| `attention` | a declared read of what needs a person | shown in the top bar and on home |
| `chat.addressees` | agents the composer can address | `Blueprint.agent` declarations |
| `context` | `(page) => ({ … })`, added to the chat's screen context | the page |

### The factory (K10 section 6)

| Need | Carried by |
|---|---|
| A Factory group: Agents, Runs, Workspaces, Experiments | `sidebar`; each a thing with its generated pages |
| The roster, the runs list, one live run, a workspace | `views.list[Agent]`, `views.list[Run]`, `views.one[Run]`, `views.one[Workspace]` |
| Every button is an action | the lint rule above |
| An agent picker; a conversation is a Run | `chat.addressees`; Runs are `@orthograph/agents`' |
| A running Run beside the thing it touches | `rail.on(thing, RunsTouching)` (gap 3) |
| A run's context includes its workspace | `context: (page) => ({ workspace: { branch, revision } })` |
| Experiment start, keep, throw away | moves on its lifecycle, so buttons on its generated page |

### The work board (K11, "The board in the portal")

| Need | Carried by |
|---|---|
| 1. A page for the feature, its own actions as its only writes | `views.list[Item]` as `Portal.view.board({ by: Item.machine })`, held by the lint rule |
| 2. The item's machine on the client, refusing illegal drops before any call | every view gets the thing's `MachineModel`; the board's `getDropOperation` returns `cancel` for a move the machine forbids |
| 3. Each action's typed refusals, shown on the card | every view gets the actions with their declared errors; `Portal.refusal` renders an `ActionRefusal` |
| 4. Live updates per board | the view's live feed of committed events (M1.21), per thing |
| 5. "Needs you" everywhere | the `attention` slot, in the top bar and on home |
| 6. The manager's conversation bound to a goal | a Run that touches the goal (gap 3), opened from the goal's page |
| 7. Pro's virtualised `DataGrid` for long columns | a face is composed from Pro's components; the generic list view uses `DataGrid` too |
| 8. Live updates held still while a card is held | the live feed's `hold()` and `release()`, then the changed cards highlighted |

## Environments (Q12 A)

Each environment has its own portal, a route on its own Worker (`design/frame/projections.md:171`). It reads only its
own sink, with one read token, a declared secret (M2.04). The top bar switches between them, built from
`model.environments` and each one's deploy domain. Proof comes from the logbook for every environment, which needs no
telemetry token.

| | local | staging | production |
|---|---|---|---|
| Spans and step signals | Collector files, about 50 ms, no lag | its sink (Axiom), seconds of lag | its sink |
| Calls and durations | the Collector's metrics pipeline (M1.20) | the sink's metrics | the sink's metrics |
| Which version | the working tree's model hash | the logbook's revision, and what's stale against the declarations | the logbook's releases: which version is live |
| Proof | the latest `ortho prove` | logbook verdicts | logbook verdicts |
| Who calls | the cast; you act as one | people signed in | people signed in |
| What matters most | does it run; spans as they arrive | does this revision keep its declarations | defects, refusal rates, p95 against budget, the live version |

Each environment has a page of its own (round 4, Q2 B), reached from the top bar's environment menu and the rail's
Proof panel: the summary card, every field `EnvironmentModel` declares, and the proof matrix (every operation and every
journey against every environment: pass, fail, stale or unproven), tallied per column, with this environment's column
in focus. "Compare environments" puts every environment's fields side by side. Both are generated from the model and
the logbook.

## The worked app: `links`, and how it grows

**Stage 1** (K9): the things `profile` and `link` (the app's), `handle` (`@orthograph/handles`), `person` and `session`
(auth), and the portal's own `note` and `grant`. Home has four groups; `handle` is the richest page, with a lifecycle,
a data-dependent refusal (`HandleTaken`) and idempotency by request. A claim lights up `handle.claim` and, through
`on:`, the profile it creates. Every page above is drawn on stage 1.

| Stage | What it adds to the portal | What it needs |
|---|---|---|
| 2 · wallets | `wallets` and `chain-evm` groups, an `adapters` group (`erc20`). `payment`'s lifecycle (simulated, submitted, included, confirmed, dropped, reverted, corrected) lights up from the follower's events. Adapter calls show as `step.call` rows on the spine, with their declared errors. Staging becomes real | client operations' spans from the device (gap 4); chain submissions as spans |
| 3 · the vault | about 15 things in eight groups. Runs on the rail beside what they touch; calls by an agent for a person shown as such, never which person; approvals in the chat; owner signatures as a workflow, so a workflow's steps on the spine (M3). The factory and the board mount as extensions | workflow spans (M3.03); `rail.on` |
| 4 · the club | private members and ballots. The public tally and footprint show; nothing that names a member shows (ST4.07). Proof generation as a step on the device | private fields never traced (M1.19); on-device spans (gap 4) |

## The model, field by field (round 3, 19 November 2026)

Every field of the compiler's `Model` (`packages/compiler/src/modules/model/types.ts` on `origin/m1`, with
`MountModel` from `modules/mounts/types.ts` and `ValueMeta` from `orthograph`), and the page that shows it. The portal
falls out of this table: a page shows a field only if a row here names it, and a field with no page is listed as such,
never hidden. **Wire** says whether the portal's wire decodes it today (`packages/portal/src/modules/wire/types.ts` on
`m1`): ✓ yes, ~ partly, ✗ no. Every ✗ and ~ is M1.13's or M1.42's (F8 gap 7, K12 section 6, K14's portal column).
**R3** marks a page that does not exist yet and is asked in round 3 (`briefs/portal-round-3.md`).

Real values below are from Plugged In's model as Codex generated it on `links/stage-1`
(`examples/links/generated/model/model.json`, before M1.03, so no `from`, journeys, worlds, stores or mounts yet).

### `Model`

| Field | Page | Wire |
|---|---|---|
| `things` | home cards, the tree, a thing's page | ✓ |
| `operations` | the tree under each thing, an operation's page, the operations matrix | ✓ |
| `refusals` (every code: `HandleTaken: HN-001`, `HandleNotClaimed: HN-900`, `NotAllowed: AR-001`) | the band and the lifecycle arrows by name; the code table **R3 Q5** | ✗ |
| `values` (`HandleName`, `LinkTitle`, `LinkUrl`) | a field's type links to it; the values index **R3 Q5** | ✗ |
| `stores` | the thing's header chip; the stores page **R3 Q3** | ✗ |
| `journeys` | the operation's proof tab; the journeys pages **R3 Q4** | ✗ (`wire/service.ts:7`, "unavailable") |
| `startingWorlds` | the world page **R3 Q4** | ✗ |
| `blankOperations`, `blanks` | the tree and the spec section **R3 Q6** | ~ `blanks` only |
| `environments` | the switcher; the environments page **R3 Q2** | ~ name, runs, promotion, lifetime |
| `mounts` | the tree's plugin groups (Q3); the plugin page **R3 Q3** | ✗ |

### `ThingModel`

| Field | Page | Wire |
|---|---|---|
| `name`, `description` | home card, page header, tree | ✓ |
| `identifier` (`Handle`) | page header, as the code name, in mono | ✗ |
| `code` (`HN`) | page header beside the name; the code table groups by it | ✗ |
| `fields` | the thing's **Fields** section (added in round 3, see below): name, type, `named` value, `ref`, visibility | ~ no visibility, no description |
| `lives` (`database`, `actor`) | page header chip | ✓ |
| `store` | page header chip, linking to its store | ✗ |
| `machine.states`, `moves` | the lifecycle strip on home and the page; moves on the arrows | ✓ |
| `machine.notFrom` (`HandleNotClaimed HN-900 exit 11`) | the errors section, marked generated; on the arrow it guards | ~ no code |
| `events` with fields | the events section; the events page **R3 Q5** | ✗ names only, via `emits` |
| `errors` with fields, `exit`, `code` | the errors section; the code table **R3 Q5** | ✗ |
| `roles`, `roleRules` (`handleOwner`) | the roles section with each rule; the access page **R3 Q5** | ~ names only |
| `from` | the tree group and the page header (`handles · feature · @orthograph/handles 0.1.0`) | ✗ |
| `hash` | notes pin to it; the header's short hash; proof staleness | ✓ |

### `FieldModel` and `ValueMeta`

| Field | Page | Wire |
|---|---|---|
| `value` (`id` with `prefix`, `uint` with `bits`, `text` with `max`, `schema`) | the type column of every field table and the band | ✓ |
| `named` | the type shows the value's name, linking to the values index | ✓ |
| `ref` (`handle.id`) | a link to the field it was taken from | ✓ |
| `optional` | marked in the band | ✓ |
| `visibility` (`secret`, `{ private: [roles] }`) | a lock chip in field tables and the band; the trace drawer hides the value | ✗ |
| description | not in the model yet (K14's finding; M1.42 adds it) | ✗ |

### `OperationModel` and `StepModel`

| Field | Page | Wire |
|---|---|---|
| `kind`, `name`, `thing`, `verb`, `description` | the tree, the operation page header, the matrix | ✓ |
| `identifier`, `file` | the header, as the code name and the source path | ✗ |
| `payload`, `answer` | the in-and-out band | ✓ |
| `move` | the band ("· → claimed") and the spine's machine-check and move rows | ✓ |
| `errors`, `refusals` | the band's refusal list, each with its code and live count | ✓ names, ✗ codes |
| `allowed` (`signed-in`, `role handle.handleOwner`, `anyone`) | the header chip; the access page **R3 Q5** | ✓ |
| `steps` (`name`, `type`) | the spine's rows | ✓ |
| `steps.writes`, `.optional`, `.call` | the spine: what a row writes, a dashed optional row, an adapter call naming its mount | ✗ |
| `idempotent` | the header chip ("idempotent by request") and the spine's replay row | ✓ |
| `runs` (`server`, `client`) | the header chip "on your device"; the spine drawn from the device's spans | ✗ |
| `test` (`unit`, `network`) | the proof tab | ✗ |
| `budget.p95Ms` | the matrix and the rail ("p95 6 ms of 150") | ✓ |
| `list` (`where`, `order`, `page`) | a read's band | ✗ |
| `from` | the tree and the header | ✗ |
| `blanks` | the spec section **R3 Q6** | ✗ |
| `via` | the band: the ways in the mount left it ("not in MCP") | ✗ |
| `hash` | notes, proof staleness | ✓ |

### `EnvironmentModel`

| Field | Page | Wire |
|---|---|---|
| `name`, `deploy.*.domain` | the switcher (Q12) | ~ name only |
| `file`, `runs`, `identity`, `lifetimeMs`, `cloud`, `database`, `stores`, `secrets` (names and how, never values), `promotesFrom`, `telemetry`, `deploy`, `publish`, `hash` | the environments page **R3 Q2** | ~ runs, promotion, lifetime |

### `JourneyModel`, `StartingWorldModel`

| Field | Page | Wire |
|---|---|---|
| `name`, `file`, `sourceHash`, `cast`, `starts`, `steps` (title, call with actor, operation and request, checks by kind, skipped) | the journey page; each step links to its operation **R3 Q4** | ✗ |
| `name`, `file`, `from`, `cast`, `makes`, `gives` | the world page **R3 Q4** | ✗ |

### `StoreModel`, `MountModel`

| Field | Page | Wire |
|---|---|---|
| store `name`, `file`, `kind`, `from`, `hash` | the stores page, with the things in each and each environment's binding **R3 Q3** | ✗ |
| mount `kind`, `file`, `package`, `version`, `integrity`, `hash` | the plugin page header **R3 Q3** | ✗ |
| mount `chosen`, `omitted`, `narrowed` | the plugin page: the choices made, what was left out | ✗ |
| mount `needs`, `calls`, `layer`, `standIn` | the plugin page: what it needs, an adapter's calls, what stands in for it in a world | ✗ |

### Made consistent with the model in round 3 (the designer's call, under AGENTS.md)

1. **A thing's page gains a Fields section**, after the lifecycle and before the operations. The agreed page had none,
   but K14's thing card needs every field with its type, visibility and description.
2. **Who may call is the model's words**: `signed-in`, `anyone`, or a role such as `handleOwner`. The sketches above
   wrote `person`, which is not a model term.
3. **Codes are the model's**: the machine's refusal is generated as `<Thing>Not<FirstState>` with code `<PREFIX>-900`
   (`HandleNotClaimed HN-900 exit 11`); `HN-002` is `HandleAlreadyOwned`. The sketches above are kept as drawn on 19
   November; the drawing follows the model.
4. **The example app is Plugged In** (K15). Where the sketches above say `links`, read Plugged In.

## Screens not drawn yet

What the model had and no agreed page showed before round 3, and the menus that tie them together. All are now drawn
and agreed (round 3, above).

All of them are drawn in [`spikes/portal-site`](../spikes/portal-site/README.md), published at
https://claude.ai/artifact/NzDgHFzQSk8yvX8cLNqUKj:

- Q4 and Q5 are drawn as decided.
- Q1, Q2, Q3 and Q6 are drawn as Aaron picked them in round 4; the Options page that drew each three ways is gone.
- The same drawing adds Issues and Alerts, decided in
  [`decisions/K18-monitoring-falls-out.md`](decisions/K18-monitoring-falls-out.md).

| Screen | Model it falls out of | Round 3 |
|---|---|---|
| The navigation: where every page below lives, beside the things tree | all of it | Q1 |
| Environments, with the switcher's menu and the proof matrix (Q12 agreed both, neither drawn) | `environments`, the logbook | Q2 |
| Plugins (one per mount) and stores | `mounts`, `stores`, `from` | Q3 |
| Journeys and starting worlds | `journeys`, `startingWorlds`, the logbook | Q4 |
| Access (roles), refusal codes, events, values: the reference pages | `refusals`, `roleRules`, `allowed`, `events`, `values` | Q5 |
| What's missing: blanks and blank operations | `blankOperations`, `blanks` | Q6 |

## Gaps

Each hand-written or missing piece, with the slice that owns it.

| # | Gap | Owner |
|---|---|---|
| 1 | `from: { kind, mount }` on each thing and operation in the model | M1.03 (on the `m1` branch since #64: `FromModel` on things and operations, `types.ts:53` and `:100` there; not yet on `main`) |
| 2 | ~~A declared latency budget per operation~~ | closed: operations may declare `budget: { p95 }` (on `main`), and on `m1` it reaches the portal wire as `budget.p95Ms` (F8); an operation without one shows p95 alone |
| 3 | A field that can point to any thing (a declaration name plus an id), for Run's `touches` | M1.03, beside gap 1 (K10 section 1) |
| 4 | Spans from operations that run on the person's device (stage 2's wallet, stage 4's proofs) | LAH-02, no slice yet |
| 5 | The `orthograph/face-actions-only` lint rule | M1.13 |
| 6 | `Portal.face`, its slots and `Portal.view.board` | M1.13 (the contract), M3.17 and M4.23 (the first faces) |
| 7 | The portal wire decodes only things, operations, environments and blanks; the pages also need `from`, each thing's events and errors with their codes and exits, journeys, starting worlds, stores and mounts | M1.13 (F8) |
| 8 | Every drawn element whose source is missing, by page | "What the drawing needs that the model or telemetry doesn't give yet", next |

Nothing else on these pages is hand-written: every label, list and diagram is generated, and every number is live.

## What the drawing needs that the model or telemetry doesn't give yet

The delta audit (round 4, 19 November 2026). Aaron asked whether the drawing is consistent with the model, and how we
build it. This section takes every element on every page of the drawing and names its source: a model field, a
telemetry attribute (built, or planned in M1.36), the logbook (M1.04), or nothing. Where the source is missing it names
the slice that delivers it, or says **HOLE** when no slice does. Every reference was read on `origin/m1` at f31097b8.
M1.13's checks author writes against this, with the picks above. Each table is
headed by the drawing's file under `spikes/portal-site/src/`.

**In short.** The model already carries almost everything a page draws; the portal's wire decodes little of it (M1.13
and M1.42 close that). Telemetry carries the calls, outcomes, attempts, steps and moves; it does not carry a request
key, the role a caller held, which value a payload broke, or anything about a call refused at the door. There is no
metrics reader, so every count that a door refusal is part of has no reader yet. The holes are listed last.

**Short names for paths on `m1`.**

| Short | Path on `origin/m1` (f31097b8) |
|---|---|
| `T` | `packages/compiler/src/modules/model/types.ts` (the model) |
| `MT` | `packages/compiler/src/modules/mounts/types.ts` (`MountModel`) |
| `W` | `packages/portal/src/modules/wire/types.ts` (what the portal decodes) |
| `WS` | `packages/portal/src/modules/wire/service.ts` |
| `SNAP` | `packages/portal/src/modules/snapshot/types.ts` |
| `RD` | `packages/portal/src/modules/reader/types.ts` (the logbook's read side) |
| `LV` | `packages/portal/src/modules/live/types.ts` |
| `HS` | `packages/language-effect/src/modules/handler/service.ts` |
| `CM` | `packages/language-effect/src/modules/handler/internal/call-metrics.ts` |
| `MV` | `packages/language-effect/src/modules/handler/internal/move.ts` |
| `AT` | `packages/language-effect/src/modules/handler/internal/attributes.ts` |
| `TS` | `packages/prove/src/modules/telemetry/types.ts` (`Span`, `TraceSource`) |
| `MS`, `PM` | `design/milestones.md` and this file, both as they are on `m1` |
| `K18` | `design/decisions/K18-monitoring-falls-out.md` |

### Three facts the rest rests on

**Fact 1: the model carries nearly everything; the portal wire decodes almost none of it.**
`ModelSchema` (`W:70-75`) declares only `things`, `operations`, `environments`, `blanks`. Inside those, `Field` (`W:12-17`) has no `visibility`;
`Thing` (`W:53-65`) has no `code`, `identifier`, `store`, `events`, `errors`, `roleRules`, `from`; `Operation` (`W:35-51`) has no `identifier`, `file`,
`runs`, `test`, `list`, `from`, `blanks`, `via`, and `steps` keep only `name` and `type`; `Environment` (`W:67`) keeps only `name`, `runs`,
`promotesFrom`, `lifetimeMs`. `refusals`, `values`, `stores`, `journeys`, `startingWorlds`, `mounts` are absent from the schema, and `WS:6-10`
stamps `journeys`, `evals`, `traces` as `unavailable` extensions. The generated file `examples/plugged-in/generated/portal/blueprint.json` on m1 does hold the
whole model (keys: refusals, values, things, operations, journeys, startingWorlds, environments, mounts), so the data is in the file and the digest covers it;
the decoder's type drops it (that Effect Schema strips unknown keys on decode is my reading of the default; **unverified** by a test). PM's own table
(`PM:500-590`) marks every one of these wire cells x or ~. Their owner is **M1.13** (its row lists "every part of the wire M1.42 adds ... and the rest K12
section 6 names") and **M1.42** (`MS:205`, `MS:228`; K12 section 6 `design/decisions/K12-coverage-gaps.md:99-105`).

**Fact 2: telemetry on m1 today (what is actually set), with the lines.**

| Attribute / metric | Set at (m1) | Where | State |
|---|---|---|---|
| operation span: `operation`, `attempt`, `principal.person` (person) or `principal.kind` (anonymous), `payload.*` (public only) | `HS:102`, `HS:64`, `AT:14-18` | operation span, one per attempt | built |
| `request.replayed` | `HS:68` | operation span | built (the key itself is never on a span) |
| `move.name`, `move.to` | `MV:29` | operation span | built |
| `event.name` | `MV:54` (annotates the current span, which is the operation span, not the commit span) | operation span | built, wrong span for M1.36 |
| `commit.outcome`, `commit.writes`, `commit.entries`, `step.kind: commit` | `HS:87-88` | `<op>.commit` span | built (M1.18 done) |
| `step.kind` on every step | `HS:29`, `HS:48` | `<op>.<step>` span | built |
| `refusal` (tag), `refusal.log` | `HS:100` | operation span | built |
| `defect` (first line of the cause) | `HS:96` | operation span | built (no error tag, no step name) |
| `ortho.calls` counter: labels `operation`, `principal.kind` (`anonymous`/`person`/`unknown`), `outcome`, `refusal` | `CM:4`, `CM:17-22` | metric | built (M1.20 done) |
| `ortho.call.duration` histogram: label `operation` only | `CM:5-8`, `CM:21` | metric | built (measures all attempts and the decode, `CM:32`) |
| `move.from`, `refusal.code`, `ortho.budget.breaches`, `environment`, `store`, `event.name` on the commit span | nowhere (grep of `packages/` on m1 finds none outside tests) | | **planned: M1.36 (`MS:223`), not built** |
| `deployment.environment` (resource, not span attribute) | `packages/host-cloudflare/src/modules/telemetry/service.ts:9`; `packages/projections/src/modules/server/internal/server.ts:117`; world: `packages/prove/src/modules/world/README.md:21` | resource of every exported span | built; the Axiom source filters on it (`packages/prove/src/modules/telemetry/internal/axiom-source.ts:93`) |

M1.36 and M1.13 are not ticked in `MS` (no check mark on rows `MS:223`, `MS:205`).

**Fact 3: the portal can read traces by window, and nothing else.** `TraceSource` has `traces`, `find`, `window(since, now?)` (`TS:51-69`). The Axiom window
stops 15 s short of now and reads at most 50,000 spans (`packages/prove/src/modules/telemetry/README.md:36-38`, `axiom-source.ts:22`). There is **no metrics reader**:
`metrics.jsonl` is read only by tests (`e2e/m1/17-telemetry-model.test.ts:116-130`); grep of non-test code finds no consumer of `ortho.calls`. PM says the rail's stat blocks and
sparkline come from `ortho.calls` and `ortho.call.duration` (`PM:298`); no slice in `MS` builds that read. See Holes.

Other route-level facts used below: each environment has its own portal and reads only its own sink (`PM:463-464`); logbook rows are
per (operation, environment) with an optional `journeys` array of `{journey, modelHash, handlerHash, verdict}`
(`packages/logbook/src/modules/book/types.ts:5-21`, `internal/sql.ts:19,30,37`), but the portal's `Verdict` (`RD:5-17`) does not carry `journeys` and `SNAP:34`/`WS:8` mark `evals` unavailable ("the logbook stores aggregate verdicts only").

Legend for **Gap?**: `no` = on m1 and wire-decodable or telemetry-built; `wire` = in the model on m1, portal wire does not decode it yet (M1.13/M1.42 own it); `tel` = telemetry planned (M1.36) or missing; `slice: X` = delivered by a named slice not yet built; `HOLE` = no slice.

### Frame

#### `shell.tsx`, `rail-nav.tsx`, `routes.tsx` (tree, top bar, palette)

| Element | Source | Evidence | Gap? |
|---|---|---|---|
| Project name "Plugged In" | model | `BlueprintWire.project` `W:85` | no |
| Project tag `7c07c87` (revision) | wire/env | `SNAP:46` `bundleRevision`; `ORTHO_REVISION` in `packages/portal/src/modules/site/types.ts:11` | no |
| Project tag "stage 1" and the one-line description "A link-in-bio app..." (home, `home.tsx:43`) | nothing | `Model` (`T:188-209`) has no project label or description | **HOLE** (minor: no model field, no slice) |
| Tree: groups "Plugged In / handles / auth" with PLUGIN tag | model | `ThingModel.from` `T:53`, `FromModel` `T:10-12`, `Model.mounts` `T:208`; wire `W:53-65` drops `from`; on m1 Plugged In has only `handle`, `link`, `profile`, all `from: {kind:"app"}` (generated model.json) | wire; the plugin things themselves: slice: ST1.03 (handles), M2.05 (auth), ST1.07 (`MS:99`, `MS:258`, `MS:102`) |
| Things and their operations in the tree, READ chip | model | `T:194-195`, `OperationModel.kind` `T:76` | no |
| "3 DEFECTS" chip on `link` | telemetry | `ortho.calls` `outcome: defect` `CM:10,29` | no (counts need the metrics reader, see Fact 3) |
| BLANK item `link.pin` | model | `Model.blankOperations` `T:199`, `BlankOperationModel` `T:166-167`; wire keeps `blanks` only `W:74` | wire (M1.13) |
| Sidebar chips: journeys N, refusals N, values N, plugins N, stores N | model | `T:196,190,191,208,193` | wire for all but journeys-adjacent counts; `W` has none of them |
| Environment pill and switcher "local, 30 min" | model + env | `EnvironmentModel` `T:116-135`; wire keeps `name`,`runs`,`promotesFrom`,`lifetimeMs` `W:67`; "live" dot = this portal's `ORTHO_ENVIRONMENT` `site/types.ts:12` | wire (cloud, database, identity) |
| Window segment 30 min / 6 h / 24 h (`opt.tsx`) | trace source | `TraceSource.window(since, now)` `TS:68` (15 s lag, 50k-span cap) | no for 30 min; 6 h and 24 h may exceed the 50k cap (**unverified** for the app's volume) |
| Per-environment switcher with proof tally | logbook | `SNAP:52` `proofs[]` (operation x environment) | no for operations |
| "Needs you 3" | portal inbox / alerts | M1.24 owns the bell (`MS:315`); K18 says staging alerts go there (`design/decisions/K18-monitoring-falls-out.md:47`); inbox is M3.19 (`MS:309`) | slice: M1.24, M1.49, M3.19 |
| Search palette (`command-items.ts`: things, operations, journeys, refusals, environments) | model | `T:194,195,196,190`; palette is M1.13 | wire (journeys, refusals) |
| Components item, "Round 4" strip | drawing only | n/a | n/a (not product) |

#### `rail.tsx` (the live rail, on every page)

| Element | Source | Evidence | Gap? |
|---|---|---|---|
| Calls meter: answered / refused / defects in window | metric or spans | `ortho.calls` `CM:20`; or operation spans: refused = `refusal` attr `HS:100`, defect = status 2 (check 21 assumption 5, `e2e/m1/21-portal-viewer.test.ts:36-38`) | no from spans; **door refusals (`NotAllowed`, `InvalidPayload`) have no span** (`HS:60` runs the role check with the tracer off; `design/decisions/O2-trace-gaps.md:58-62`), so counts need the metrics reader (Fact 3) |
| p95 and "within / over N ms" | histogram + model | `ortho.call.duration` `CM:5-8`; budget `T:96` (`W:49` decodes it) | metrics reader missing for the histogram; from spans, `Span.ms` `TS:15` is exact. Note the metric spans all attempts, a span is one attempt |
| Calls per minute stacked bars | metric/spans | same as above | same |
| "last calls" list: time, op, caller kind, outcome, ms | spans | `Span.start`, `Span.ms` `TS:15-21`; outcome from attrs; caller kind derived (see "Calls table vs spans") | no (round 4 replaced the names with the kind) |
| scope "everything / thing / op" | page | check 21 `data-scope` `e2e/m1/21-portal-viewer.test.ts:26` | no |

---

### Home (`home.tsx`)

| Element | Source | Evidence | Gap? |
|---|---|---|---|
| Thing card: name, description | model | `ThingModel.name/description` `T:37,41` | no (`W:53-65` decodes both) |
| Mini lifecycle with move counts | model + telemetry | `MachineModel` `T:29-34`; counts = answered calls whose span has `move.name` `MV:29` | no |
| Red card + "N defects" | telemetry | `CM:29` | no (metrics reader) |
| Calls meter and worst p95 per thing | telemetry | `CM` | metrics reader |
| Operations grid: name, who may call, calls by outcome, refused, defects, p95 vs budget, per-minute trend | model + telemetry | `T:89`, `T:96`, `CM` | `allowed`, `budget` decoded (`W:46,49`); numbers need metrics reader |
| Plugin group header with `@pkg@version` chip | model | `MT:11-12` | wire (`mounts` not in `W`) |
| "Still blank: link.pin (move, allowed)" | model | `T:166-167,204` | wire |

### Thing page (`thing.tsx`)

| Element | Source | Evidence | Gap? |
|---|---|---|---|
| Title row: `id Handle`, `codes HN-...` | model | `ThingModel.identifier` `T:38`, `code` `T:40` | wire (`W:53-65` omits both) |
| Plugin chip `@pkg version` / "the app's own" | model | `ThingModel.from` `T:53`, `MountModel` `MT:8-27` | wire |
| "lives in database rows", `store: default` chip | model | `lives` `T:44` (decoded `W:57`), `store` `T:46`, `Model.stores` `T:193` | wire for `store`/`stores` |
| `thing:handle@hash` | model | `hash` `T:54` | no |
| Lifecycle with move counts and refusal on arrow | model + telemetry | `T:29-34`; `refusal` attr + `move.name` | no |
| "wrong state ... HN-900 (generated, exit 11)" | model | `MachineModel.notFrom` `T:33` (wire keeps `error`,`exit`, drops `code` `W:61`) | wire |
| Fields table: name, type, taken from, optional | model | `FieldModel` `T:18-26` (decoded `W:12-17`) | no |
| Fields: visibility (secret chip) | model | `FieldModel.visibility` `T:25`; drawing uses hand-set `secretFields` (`overlay.ts:32`) | wire (not in `W:12-17`); also the sample set names `person.sign-up.password` etc: slice: M2.05 (auth) + M1.35 visibility (`MS:222`) |
| Fields: descriptions ("arrive with M1.42") | model (planned) | no `description` on `FieldModel` `T:18-26`; slice: M1.42 (`MS:228`) | slice: M1.42 |
| Operations table: who may call, description, calls, refused, defects, p95, trend | model + tel | `T:89`, `T:82`; `CM` | metrics reader |
| Events: name + fields | model | `ThingModel.events` `T:48`; `W` has none (only `emits` string `W:43`) | wire (M1.42) |
| Errors: `code`, name, exit | model | `ThingModel.errors` `T:50`, `MachineModel.notFrom` `T:33` | wire (M1.42) |
| Roles + rule text (`handle.owner === caller.person`) | model | `roles` `T:51` (decoded), `roleRules` `T:52` (not in `W`); drawing's text is hand-written in `overlay.ts:27`. m1 Plugged In has empty `roleRules` (generated model.json), so the rule strings' format is **unverified** | wire; content: slice: ST1.03/ST1.04 add roles |
| Journeys that call this thing + verdict tiles | model + logbook | `Model.journeys` `T:196` (empty in m1 Plugged In until ST1.02, `MS:98`); verdict: `RD:5-17` (no `journeys` field) | wire; per-journey verdict not read by the portal; see Proof |
| Footer notes `from`, `stores`, `roleRules` overlays | n/a | | n/a |

### Operation page: header and Contract tab (`op.tsx`)

| Element | Source | Evidence | Gap? |
|---|---|---|---|
| Name, description, READ chip | model | `T:76-82` | no |
| "who may call" chip | model | `AllowedModel` `T:57-61` | no |
| "idempotent by request" | model | `T:91` | no |
| "runs on the server/client" | model | `T:93` | wire (`W:35-51` omits) |
| "budget p95 150 ms" | model | `T:96` | no |
| "ways in: api, sdk, cli (not MCP)" | model | `OperationModel.via` `T:103` (M1.07) | wire; the drawn mount `handles` is slice: ST1.03 |
| file path, `@hash` | model | `T:81,104` | wire for `file` |
| In and out band: payload and answer fields | model | `T:83-84` | no |
| Refusals list with code, "declared / machine / at the door" | model | `OperationModel.errors/refusals` `T:87-88`, `Model.refusals` `T:190` | wire for codes (`W:44-45` names only) |
| Move chip, emits event link | model | `T:85` | no |
| Spine rows (role check, replay, machine check, steps, answer check, move, commit "1 store") | model + fixed order | order from `HS:52-56`; steps `T:90`; step `writes`/`optional`/`call` `T:64-72` | wire for step details (M1.42, `MS:228`) |
| Foot "Generated from operations.X" | n/a | | n/a |

### Operation: Metrics tab (`op-tabs.tsx` `Metrics`)

| Element | Source | Evidence | Gap? |
|---|---|---|---|
| Tiles: calls, refused, defects, p95 of budget | metrics | `CM` + `T:96` | metrics reader |
| Calls per minute stacked by outcome | metrics/spans | `CM`; `TS` | metrics reader |
| p95 per minute vs budget line | histogram | `CM:5-8` (15 buckets; a per-minute p95 from buckets is an estimate, from spans it is exact) | metrics reader |
| Refusals by code bars | metric | `refusal` label `CM:10,20` (name; map to code via `T:190`) | no (name -> code) |
| Latency objective "93.8% within 150 ms, target 95%, 14.4x burn, 88% error budget left, 28 days" | metric + K18 | `ortho.budget.breaches` (planned `MS:223`); objective/burn rules: M1.49 (`K18:69`), sink side M7.14 (`K18:63`); a 28-day window is far beyond `TraceSource.window` | slice: M1.36, M1.49 (30-min evaluation only); 28 days: **HOLE** until M7.14, no metrics source before |
| "K18 · M1.49" chip | n/a | | n/a |

### Operation: the trace drawer, opened from a call (`kit/trace-waterfall.tsx`, `trace.ts`; was the Spans tab until round 4)

| Element | Source | Evidence | Gap? |
|---|---|---|---|
| Waterfall: attempt rows with `attempt: n` | spans | `HS:102` | no |
| Step rows with `step.kind` | spans | `HS:48` | no |
| Commit row `commit.outcome: conflict / committed` | spans | `HS:87-88` | no |
| `move.name`/`move.from` attribute text | spans | `move.name` `MV:29`; `move.from` not set | tel: M1.36 |
| Defect row "defect . DatabaseError" | spans | `HS:96` carries only the first line of the cause; no error tag or step attr | partial: K18 keys issues by (operation, step, error tag) (`K18:40`); step is derivable from the errored child span, error tag is not an attribute: **unverified** whether M1.49 adds one |
| Call id, time, outcome chip | spans | trace id, `Span.start` | no |
| Header: caller kind, never `principal.person` | spans | `principal.person` `AT:17-18` must not render | no (round 4 fixed the drawn name) |
| "caller: a person (signed-in)" | spans, derived | `PM:273`; check 21 assumption 4 `e2e/m1/21-portal-viewer.test.ts:34-35`; for a person only `principal.person` is on the span, so kind is derived | no (derived by the portal) |
| attempts, logs count | spans/logs | `TS:35-38`; check 21 `data-logs` | no |
| "Never shown" list | policy | M1.13's no-leak check `MS:205` | no |
| The calls table on Metrics (round 4) | spans | see "Calls table vs spans" below | request key, role, agent, per-call environment |

### Operation: Proof tab (`Proof`, `VerdictMatrix`)

| Element | Source | Evidence | Gap? |
|---|---|---|---|
| Nine evals x four environments | logbook | m1 stores one verdict per operation per environment (`RD:5-17`); `SNAP:34` and `WS:8`: "the logbook stores aggregate verdicts only" | **HOLE**: no slice records per-eval results (M1.13 row says only "a proof tab on M1.04's verdicts (no eval timing)", `MS:205`) |
| Per-environment state pass / fail / stale / unproven | logbook + model hash | `ProofState` `SNAP:12` (also `unavailable`, which the drawing never shows) | no |
| Cell "review" (p95 near budget, shown as stale) | invented | not a `ProofState` (`SNAP:12`); `MS:205`: "latency is the live p95, not an eval's note" | drawing-only: M1.13 draws the five `ProofState`s and no "review" |
| "journeys that cover it" + verdict per env | model + logbook | `JourneyModel.steps[].call.operation` `T:150-153`; verdict per (operation, journey) `book/types.ts:5-10`, but `RD` drops `journeys` | wire + reader field: slice: M1.13 (unverified that it reads `journeys`) |
| "What is unproven: refusals no journey reaches" (`reached` regex over check text) | model | checks carry `refuses {error}`, `emits {event}` in JSON (acme snapshot `packages/compiler/src/modules/model/__snapshots__/acme.model.json:1667-1700`; `orthograph/src/modules/journeys/types.ts:34-36`) though `T:151` types them `{kind}` only | wire (journeys); derivable once decoded |
| "no journey reaches LinkAlreadyRemoved" note on a failing eval 8 | logbook | not stored (aggregate verdict only) | **HOLE** (same as nine evals) |

### Operation: Docs, Notes, Blank

| Element | Source | Evidence | Gap? |
|---|---|---|---|
| Docs reference text | generated docs | `BlueprintWire.docs` `W:94` (Markdown by path; m1 has `examples/plugged-in/generated/docs/<thing>/<verb>.md`) | no |
| SDK and CLI snippets | generated | built by the drawing from payload keys (`routes.tsx:66-68`); product: the docs | no |
| Notes (body, by, when, stale) | portal's own `note` thing | M3.21 (`MS:311`); `PM:211`; stored, but in the portal's own store, not the app's | slice: M3.21 (author names are people: see Stored data) |
| Conversations "builder agent ..." | Runs | M4.10/M4.16 (`MS:349`, `MS:315`) | slice: M4.16 |
| Blank page: declared vs blank parts, hints | model | `BlankOperationModel` `T:166-167`, `Model.blanks` `T:204`; the free-text hints ("Probably linkOwner...") are hand-written | wire; hints **HOLE** (no model field for a note on a blank; maybe notes M3.21) |
| "Work on it" work items | board | M3.17 (`MS:307`) | slice: M3.17 |

---

### Environments (`places.tsx` `EnvPage`, one per environment since round 4; `Environments` and `env-compare.tsx`, the compare page)

Plugged In on m1 declares only `local` and `test` (`examples/plugged-in/blueprint/environments/{local,test}.ts`; generated model has `environments: [local, test]`). The
four-environment drawing comes from `links/stage-1`. Where staging/production files come from for Plugged In: **unverified** (cloud pass, M7).

| Element | Source | Evidence | Gap? |
|---|---|---|---|
| Summary card: name pill, `runs` text, `file` | model | `EnvironmentModel.name/runs/file` `T:117-119`; wire keeps name, runs only `W:67` | wire (`file`) |
| "operations proven" tally | logbook | `SNAP:52` proofs per (op, env) | no |
| "journeys proven" tally | logbook + model | per-journey verdicts exist on logbook rows (`book/types.ts:5-10`) but not read by the portal (`RD:5-17`) | slice: M1.13 (unverified) |
| "live, last 30 min" for the env you are in; "Read in staging's own portal" for others | sink | `PM:463-464`: each environment's portal reads only its own sink | no (by design) |
| Field table: `runs` | model | `T:119` | no |
| `identity` (test principals / better-auth) | model | `T:120` | wire |
| `cloud`, `database` -> "runs on" | model | `T:123-124` | wire |
| `lifetimeMs` | model | `T:122` | no (`W:67`) |
| `promotesFrom` | model | `T:129` | no |
| `deploy` (worker/site, domain) | model | `T:132`; domains undeclared in Plugged In (drawing footer) | wire |
| `publish` | model | `T:133` | wire |
| `secrets` (names and how) | model | `T:128` | wire |
| `telemetry` sinks | model | `T:131` | wire |
| `stores` bindings per environment | model | `T:126` (Stores page reads `e.database ?? e.cloud.database` instead) | wire |
| `hash` | model | `T:134` | wire |
| Proof matrix, rows = operations, tally per column | logbook | `RD:5-17`, `SNAP:12,52` | no |
| Proof matrix, rows = journeys | logbook | see above | slice: M1.13 (unverified) |
| Cell note "fails at step 5", "SessionCredentialsWrong changed since" | logbook + model | "changed since": `SNAP:14-20` `changedDependencies` (no); "fails at step 5": not stored (verdict per operation per journey, repeated calls share one: `design/decisions/M1-verdicts.md:3-6`) | step-level detail **HOLE** |

Round 4 made the page per environment (Q2 B) the product; the compare page reads the same fields from the same sources.

### Plugins and stores (`places.tsx` `PluginsAndStores`, one page since round 4)

| Element | Source | Evidence | Gap? |
|---|---|---|---|
| Plugins list: plugin, kind, package, version, things, needs | model | `Model.mounts` `T:208`; `MountModel.kind/package/version/needs` `MT:9-19` (kind also `projection`); things via `ThingModel.from.mount` `T:12` | wire (`mounts` absent from `W:70-75`); m1 Plugged In mounts only three projections (api, model, server; generated model.json) |
| "calls, last 30 min" per plugin | telemetry | `ortho.calls` summed over the plugin's operations (`OperationModel.from` `T:100`) | metrics reader |
| Plugin card: Plugin page: file, `integrity sha256-...` | model | `MT:10,14` | wire |
| Plugin card: Choices ("reserved names: off") | model | `MountModel.chosen` `MT:16` | wire; the handles plugin: slice: ST1.03 |
| Plugin card: Left out, narrowed ("only through api, sdk, cli"), needs | model | `omitted`, `narrowed`, `needs` `MT:17-19` | wire |
| Plugin card: Adapter calls and stand-in (footnote) | model | `calls`, `layer`, `standIn` `MT:21-25` | wire |
| Plugin card: "Its things" with calls meter | model + tel | `from` + `CM` | wire; metrics reader |
| Stores table: store, kind, from, things, per-environment binding | model | `StoreModel` `T:178-186`, `StoreFromModel` `T:170-175`, `EnvironmentModel.stores` `T:126`; things by `ThingModel.store` `T:46` | wire; m1 Plugged In declares no store (generated model has `stores` absent) so "default" row is the drawing's convention |
| "Never a count of rows" | policy | `PM:216` | no |

### Journeys, journey page, world page (`proving.tsx`, `flow.tsx`, `kit/step-card.tsx`)

On m1, `examples/plugged-in` has `journeys: {}` and `startingWorlds: {}` (generated model.json); the three journeys are from `links/stage-1`. Slice that writes them: ST1.02 (`MS:98`).

| Element | Source | Evidence | Gap? |
|---|---|---|---|
| Journey list: name, file, starts-from, step count, operations | model | `JourneyModel.name/file/starts/steps` `T:144-154` | wire (`WS:7`: "the compiler's model has no journey projection", already stale: `T:196` has it) |
| World tree (empty world -> worlds -> journeys), "gives aaronHandle" | model | `StartingWorldModel.from/makes/gives` `T:156-164` (`gives: unknown`) | wire; the shape of `gives` for display: **unverified** |
| Per-environment verdict per journey (tile grid) | logbook | `JourneyVerdict` on logbook rows `book/types.ts:5-10`; reader drops it `RD:5-17` | reader: slice M1.13 (unverified) |
| Sequence diagram: lanes = cast, columns = steps, step label verb/thing | model | `JourneyModel.cast` `T:148`, steps' `call.actor/operation` `T:137-142,150` | wire |
| Per-step verdict dots per environment ("failed here", "not reached") | logbook | verdict is per operation per journey; repeated calls to one operation share one verdict (`M1-verdicts.md:6`) | **HOLE**: step-level pass/fail is not stored; the drawing's `stepVerdict` (`flow.tsx:10-15`) invents it from the first failing step |
| Step title, payload text, `request first-claim` | model | `JourneyStep.title`, `JourneyCallModel.payload/request` `T:137-142,150` | wire |
| Checks ("refuses HandleTaken HN-001", "no events", "spans absent: ...") | model | checks hold `{kind, event/error/fields/match}` in JSON (acme snapshot `...acme.model.json:1667-1700`); typed `{kind}` only at `T:151` | wire; display text composed by the portal |
| "Failed in staging: links[0].title was 'GitHub'" | logbook | verdict only pass/fail (`book/types.ts:3`); no failure detail stored | **HOLE**; round 4 removed the value and keeps "Failed in staging" with its trace |
| Hover step card: step, cast kind, checks, verdict per env, op calls meter | model + logbook + tel | above | same holes |
| World page: makes (calls), gives, cast, from | model | `T:156-164` | wire |
| Starting-world cast kinds ("signed-in") | model | `AllowedModel` `T:148,161` | wire |

### Reference pages (`reference.tsx`, `ref-live.tsx`)

| Element | Source | Evidence | Gap? |
|---|---|---|---|
| Machines: lifecycle per thing, move table (from, to, emits, operation) | model | `T:29-34`, `T:85` | no |
| Machines: answered per move, trend | telemetry | `move.name` `MV:29` | no (metrics/spans) |
| Machines: "Recent moves" (time, op, who, event, "move.from listed -> removed") | spans | `move.name`/`move.to` yes; `move.from` and `event.name` on commit span: M1.36 (`MS:223`; red in check 17, `e2e/m1/README.md:33`) | tel: M1.36; who: leak |
| Machines: "No state distribution" callout | policy | `PM:216` | no (this is the right call) |
| Refusal codes: code, name, from, exit, raised by | model | `Model.refusals` `T:190`; `errors` `T:50` (exit, code); `notFrom` `T:33`; ops' `refusals` `T:88`; "runtime, at the door" for `NotAllowed` | wire (M1.42; `PM:522-530`) |
| Refusal codes: count, per min, trend | metric | `ortho.calls` `refusal` label | metrics reader |
| Refusal codes: "Recent refusals" rows with `refusal.code HN-001`, ms, who | spans | `refusal` name on span `HS:100`, code not an attribute (M1.36 `refusal.code`, check 17 lines 250-265); the portal can map name -> code from `T:190` meanwhile; door refusals have **no span** (so rows with "no span" and `ms 0` are counts only) | tel: M1.36; door rows: **HOLE** as rows (counts only, `O2-trace-gaps.md:58-62`) |
| Access: roles and rules | model | `roleRules` `T:52`, `roles` `T:51` | wire |
| Access: operations by who may call | model | `T:89` | no |
| Access: "role check ms" per rule | spans | the role check runs with the tracer off (`HS:60` `Effect.withTracerEnabled(false)`), so there is no span to time | **HOLE** (no slice); removed from the drawing in round 4 |
| Access: NotAllowed count + trend | metric | `ortho.calls` refusal `NotAllowed` (`HS:40`) | metrics reader |
| Access: recent denials "allowed signed-in . caller anyone", "role linkOwner . link.owner != caller" | none | `NotAllowed` leaves no span; the second form reveals record data | **HOLE** (and a leak risk); removed from the drawing in round 4 |
| Events: name, carries (field: type), emitted by | model | `ThingModel.events` `T:48`; `OperationModel.move.emits` `T:85` | wire (M1.42) |
| Events: "listened to by (on:)" | model | no `on` handler field in `ThingModel` (`T:36-55`) | slice: unverified (on: handlers appear in M5.14 `MS:391`); shown as "none declared" |
| Events: committed in the window / per min / trend | spans or journal | desc says "from the journal"; the journal is app-store data read per trace (`LV:27-31`, `LiveEvent.subject` `LV:53-57`). Counting from `event.name` instead is telemetry M1.36 (`MS:223`) | tel: M1.36; round 4 changed the drawing to count from `event.name` |
| Events: "Recent commits" | spans | `commit.outcome` `HS:87`, `event.name` M1.36 | tel: M1.36 |
| Values: name, type, limits | model | `Model.values` `T:191` | wire |
| Values: "used by" fields | model | `FieldModel.named` `T:20` | no (derivable) |
| Values: "rejected at the door" per value, trend, "Recent payloads refused" (field, value, "longer than 30") | metric | `InvalidPayload` counted per operation (`HS:41`, `CM:20`), no span, no field or value label; `issues` text is in `InvalidPayload` but only logs/none | **HOLE**: no slice carries which field or value was rejected; removed from the drawing in round 4 |

### Monitor (`monitor.tsx`)

| Element | Source | Evidence | Gap? |
|---|---|---|---|
| Issues list: key (operation, step, error tag), state new/regressed, first/last seen by hash, count, "of calls", owner, trend | spans + model hash | `K18:40-44`; slice M1.49 (`K18:69`; its row joins `milestones.md` in the same change as this section); `defect` attr `HS:96` lacks step and error tag; owner = declaring file/mount `ThingModel.from`, `OperationModel.file` `T:81,100` | slice: M1.49; "first seen" beyond the window needs stored issue state: **HOLE** (K18 evaluates over `TraceSource.window`, `K18:36`) |
| Alerts: rules from budget, defects, refusal codes, journey verdicts | model | `T:96`, `T:190`, `T:196`; M1.49 (`K18:69`) | slice: M1.49 |
| Alert state (firing/warning/ok) | spans/metric over window | M1.49 evaluates over `TraceSource.window` at fixed `now` | slice: M1.49; burn needs 20 calls (`K18:38`) |
| Routes ("builder" / pages) | environment file | M7.14 (`K18:63`) | slice: M7.14 |
| "About this drawing" | n/a | | n/a |

---

### Stored data and leaks: what would break "no populations" (Q4, `PM:216`) or "no leak" (M1.13 `MS:205`, M1.35 `MS:222`)

Drawn and fine: no state distributions, no row counts (`reference.tsx` Machines callout; `thing.tsx:38`; `places.tsx:74`). Everything below is a problem or a risk.

1. **People's names as "who" everywhere** (fixed in round 4: the drawing shows caller kind only; journey cast names and note authors stay, as fixtures and as the portal's own data): `live.ts:44-53` (`aaron`, `bob`, `stranger`), `trace.ts:32,38`, `ref-live.tsx:37-56` (`carol`, `dana`, `erin`), rail "last calls" (`rail.tsx:40`), Spans header chip `{t.who}` (`op-tabs.tsx:51`), Spans "Recent calls" (`op-tabs.tsx:67`), the three "Recent ..." reference tables (`ref-live.tsx:25-35`). In product the only per-call identity on a span is `principal.person` (`AT:17-18`), which is exactly what M1.13's no-leak check plants and requires not to render (`MS:205`), and the Collector already deletes `user.*` and `organization.id` (`packages/prove/src/modules/telemetry/README.md`, L2.O paragraph). Locally the journey's cast name might label a caller (`PM:273`); the mechanism that would carry a cast name onto a span is **unverified**. Show caller kind only.
2. **Events "from the journal"** (fixed in round 4) (`reference.tsx` Events description): the journal is rows in the app's own store (`LV:27-31`); `LiveEvent.subject` is a record id (`LV:53-57`). A windowed count must come from `event.name` on spans (M1.36), not a journal scan.
3. **Issues "first seen / last seen"** (`monitor.tsx`): needs state that outlives the window (`K18:41`); K18 names no store. Either issue records are stored (the app's or the portal's own) or the sink's retention is queried. Not a population of app data, but unspecified state.
4. **Notes `by` and `when`** (`overlay.ts:46-49`): author names stored in the portal's own `note` thing (`PM:211`, M3.21). Not the app's data; people appear by design there.
5. **Access page "link.owner != caller"** (removed in round 4) (`ref-live.tsx:46,48`): reveals whose record failed; no span exists for a role refusal (`HS:60`), so this text cannot be sourced and should not be.
6. (removed in round 4) **Values page "Recent payloads refused ... longer than 30"** with the value in view (`ref-live.tsx:57-59`): a rejected payload is non-public input; no telemetry carries it and `payload.*` attributes exist only for public fields on spans that opened (`AT:14-15`, `HS:64`).
7. **Journey "Failed in staging: links[0].title was 'GitHub'"** (value removed in round 4) (`proving.tsx`): an answer value; not stored in the logbook and would be a visibility problem if it were (M1.35).
8. "Starting worlds" show `gives aaronHandle`, `makes aaron -> handle.claim { name: "aaron" }`: fixtures from journey files, not live data (`T:156-164`). Fine.

### Calls table vs spans (the calls table on the operation's Metrics tab, round 4)

Row = one call. A "call" on m1 is the operation span(s) in one trace: one per attempt (`HS:102`, `attempt` n); a trace may hold several calls (journey runs); how the portal groups attempts into one row is **unverified** (check 21 assumption 5 counts "an operation span in the window", `e2e/m1/21-portal-viewer.test.ts:36`).

| Column / filter | Carried per call today on m1? | Evidence | Verdict |
|---|---|---|---|
| time | yes | `Span.start` `TS:21` | ok |
| trace link | yes | trace id; `GET /portal/traces/<id>` (check 21 assumption 3) | ok |
| outcome: answered / refused (code) / defect | yes, except door refusals | answered = no `refusal`, status != 2; `refusal` `HS:100`; defect status 2 + `defect` attr `HS:96`; code: map name -> `Model.refusals` `T:190` (attribute `refusal.code` is M1.36, check 17 red) | ok for spans that opened. **`NotAllowed` and `InvalidPayload` open no span** (`HS:60`, `HS:41`; `O2-trace-gaps.md:58-62`): they exist only as `ortho.calls` counts, so they cannot be rows |
| duration vs budget | yes per attempt | `Span.ms` `TS:15`; budget `T:96` (`W:49`). The metric `ortho.call.duration` measures the whole call incl. retries and decode (`CM:32`); the span measures one attempt | ok; define a call's duration as the extent of its attempt spans, not the histogram |
| over-budget filter | yes, derived | `ms > budget.p95Ms` per call; `ortho.budget.breaches` is a counter with only `{operation}` and is M1.36, not built (`e2e/m1/17-telemetry-model.test.ts:283-318`) | ok from spans |
| attempt | yes | `attempt` `HS:102` (M1.18 done, `MS:209`) | ok |
| caller kind: anyone / signed-in | per span, derived | a person's span has `principal.person` only, an anonymous one `principal.kind` (`AT:17-18`); kind is derived by the portal (`PM:273`; check 21 assumption 4); the metric label `principal.kind` is `anonymous` / `person` / `unknown` (`CM:17,20`) | ok (derived, never the id) |
| caller kind: agent | no | `Principal` is `anonymous | person` only (`packages/orthograph/src/modules/roles/types.ts:6-8`); M2.03 adds more (`MS:256`), ST1.05 adds `agent for <person>` (`MS:317`). Check 21 plants `principal.kind: "agent"` in a fixture (`e2e/m1/21-portal-viewer.test.ts:124`) | slice: M2.03, ST1.05 |
| caller kind: role | no | what is recorded is the operation's declared `allowed` (`T:89`), not the role the caller held; M1.35's `Audience` holds roles for visibility only (`MS:222`) | **HOLE** (derivable: signed-in + `allowed` of kind role + answered implies the role held) |
| who (principal) | span has `principal.person` | `AT:17-18` | must not render (no-leak, `MS:205`); show kind only; **no per-person view without breaking M1.13's check** |
| environment | resource attribute yes; per-call span attribute no | `deployment.environment` on the resource (`host-cloudflare/src/modules/telemetry/service.ts:9`); sources filter on it (`axiom-source.ts:93`); span attribute `environment` is M1.36 and red | see check 17 below; also each environment's portal reads only its own sink (`PM:463-464`), so the column is constant and a filter is a switcher |
| request key | **yes since M1.12a**: `request.key` on the operation span | (was: only `request.replayed: true` (`HS:68`); the key lives in the store as `<op>|<who>|<request>` (`HS:109`) and in the SDK's `idempotency-key` header (M1.12, `MS:203`); no attribute, no label; free text is untraced by default (M1.19, `MS:210`); the key is an id, so traced) | **filled** (M1.12a) |
| request key filter | yes since M1.12a | the calls table filters on `TelemetryCall.requestKey`; it is available when the window's calls carry a key, `not yet` otherwise | **filled** (M1.12a) |
| time filter | yes | `TraceSource.window(since, now)` `TS:68` | ok, within 15 s lag and 50k spans |
| filters generally | only inside the window, client-side | `TraceSource` has no query-by-attribute (`TS:51-69`); the Axiom window is a fixed APL (`axiom-source.ts:89-95`) | any filter beyond the window or the 50k cap: **HOLE** |

**Check 17** (M1.36), quoted. `e2e/m1/17-telemetry-model.test.ts:32-34`:
"Red today on the missing surface only: `move.from`, `event.name` on the commit span, `refusal.code`, `ortho.budget.breaches`, `environment` and `store` are not written. The controls, true today, say the spans, the commit span, `refusal`, `move.name`, `move.to`, `ortho.calls` and `ortho.call.duration` are."
The environment assertion is at `e2e/m1/17-telemetry-model.test.ts:267-281` ("writes `environment` and `store` on the operation span of an answered call and of a refused one", expecting `{ environment: "local", store: m.lives }` at line 276). Assumption 5 (lines 27-29): `environment` is the world's, a plain span attribute, with "the resource's `deployment.environment` stays as it is". The README row (`e2e/m1/README.md:33`): "8 tests: 3 controls pass ..., 5 red until M1.36. `event.name` is on the operation span today, so its check is red on the commit span." So the per-call `environment` span attribute is red (and so are `store`, `move.from`, `refusal.code`, `event.name` placement, `ortho.budget.breaches`). The per-environment fact is nonetheless on every span through the resource attribute, which `Span.attrs` (`TS:12`) does not expose to the portal.

### Holes (no slice)

1. Request key per call (column and filter): filled by M1.12a, no longer a hole. `request.key` is on the operation's span (an id, so M1.19's free-text rule does not apply), the calls table shows it and filters by part of it; check 38 judges it.
2. Metrics reader: `ortho.calls` and `ortho.call.duration` have producers (M1.20) but no portal-side reader; `TraceSource` is spans only. Rail numbers, per-minute bars, door-refusal counts, refusal-by-code counts and every "trend" cell rest on it. The 28-day latency objective and error budget need history far beyond `window` (M7.14 is sink-side, after the cloud pass).
3. Per-eval verdicts (nine evals x environment on the Proof tab): the logbook stores one aggregate verdict (`WS:8`); no slice records per-eval results. The drawing's "review" state is not a `ProofState`.
4. Step-level journey verdicts and failure details ("fails at step 5", "links[0].title was GitHub"): the logbook stores a pass/fail per (operation, journey), repeated calls sharing one (`M1-verdicts.md:3-6`).
5. Door refusals and role denials as rows (Recent refusals, Recent denials, Recent rejected): no span exists (`HS:60`, `HS:41`); counts only. The role-check timing per rule (`roleCheckMs`) has nothing to measure for the same reason.
6. Which field or value a payload broke ("rejected at the door per value"): no label or span carries it.
7. Issues "first seen / last seen" across more than the window, and the defect's error tag (`HS:96` keeps the first line of the cause): M1.49's design (`K18:40-44`) does not say where this is kept.
8. Caller role held per call, and the person's cast name on a local span: nothing carries them.
9. Project description and "stage 1" label: no field on `Model`.
10. Free-text hints on a blank operation ("Probably linkOwner, like order and remove"): no model field (a note, M3.21, is the nearest).
11. Event listeners ("listened to by (on:)"): no `on` field in `ThingModel` on m1 (**unverified** which slice adds it).

**Owners (19 November 2026, the M1 lead).** Each hole now has a slice: 1 in M1.12 (`request.key` on the operation span); 2 in M1.13 (a local metrics reader), with history past the window in M7.14 (`PRJ-54`); 7 in M1.49 (first and last seen kept past the window, the error's tag on the defect span). The rest are in `ledger.md`: 3 and 4 with M3.20 (`PRJ-46`, `PRJ-47`); 5, 6 and 8 with M2.03 (`PRJ-48` to `PRJ-50`); 9 with M2.09 (`PRJ-51`); 10 with M3.21 (`PRJ-52`); 11 with M3.08 (`PRJ-53`). Until then the portal says "not yet" where they would be.

## Component inventory (round 3 review, 19 November 2026)

Aaron's review of the third drawing: "you've got a component library that we paid like $500 for, you're not using the
components." So every data shape on every page now maps to one named component: HeroUI Pro's where Pro has one, ours
where it doesn't. Ours are built on Pro's tokens, each with Storybook 8 CSF stories, and move into
`@orthograph/portal-ui` with M1.34. Until then they live in `spikes/portal-site/src/kit/`, and the drawing's
Components page renders every story.

| Data shape | Where it shows | Was | Now | By |
|---|---|---|---|---|
| Calls in a window, by outcome | rail, home cards, plugin pages, the operations grid, step previews | "2,321 calls · 128 refused" | `CallsMeter`: the total, a stacked bar of answered, refused and defects, and a labelled count for each | ours |
| Calls per minute | rail, an operation's Metrics tab | a line | `CallsBars`: Pro `BarChart`, stacked by outcome, with a tooltip per minute | ours, on Pro |
| Calls per minute in a table cell | operations grid, machines, reference pages | a line | `SparkBars`: tiny columns | ours |
| p95 against budget | operations grid, home cards, rail | "164 / 150 ms" | `BudgetMeter`: p95, a bar with the budget marked, a within or over chip | ours |
| One headline number | Metrics tab, latency objective | text | Pro `KPI`, `KPIGroup`, `ProgressBar` | Pro |
| An environment | top bar, rail, environments, step previews, stores | "local · D1 local" | `EnvironmentPill`: live dot, name, and what it runs on from `cloud` and `database` | ours |
| Picking an environment | Environments | a link per page | Pro `Segment`; option B uses `Tabs` | Pro |
| Verdicts, rows by environment | Environments, an operation's Proof tab, Journeys | chips, "pass 8" | `VerdictMatrix` with a `VerdictTally` heading each column (a stacked bar and "8 pass, 1 fail, 1 stale"), and `VerdictTile` for one cell | ours |
| An issue's grouping key | Issues | "link.add · record · DatabaseError" | `KeyPath`: chips read left to right | ours |
| A machine move | Machines, an operation's spine | "listed \| removed → removed" | `Move`: from chips, an arrow, to chips | ours |
| A span's attributes | Recent spans on reference pages | "refusal.code AR-001 · at the door" | one Pro `Chip` per attribute, key in mono | Pro |
| Outcome, state, kind, tag | everywhere | coloured text, "· feature" | Pro `Chip`; in the sidebar `Sidebar.MenuChip` with an upper-case tag (PLUGIN, READ, BLANK, 3 DEFECTS), as the docs' "UPDATED" | Pro |
| Navigation | every page | a hand-made icon rail | Pro `Sidebar`: the Icon Only pattern for the rail, `Sidebar.Pages` for the section panel, `GroupLabel`, `MenuChip` | Pro |
| Search the model | every page, ⌘K | static markup | Pro `Command`, filtering things, operations, journeys, refusal codes, environments and monitor pages | Pro |
| A journey step's preview | a journey's sequence | an SVG title | Pro `HoverCard` holding `StepCard`: who acts, the call, its checks, the verdict per environment, the operation's calls | Pro + ours |
| Steps in order | a journey, a world | a list | Pro `Timeline` | Pro |
| Records | home, plugins | tables | Pro `DataGrid`, `ItemCard`, `ListBox` | Pro |
| A section of a page | everywhere | divs | Pro `Widget` | Pro |
| Code | an operation's Docs tab | pre | Pro `CodeBlock` | Pro |

Three Pro components only work in the browser: `BarChart` renders empty on the server, `Command` and `HoverCard` render
nothing until mounted. The drawing renders every page on the server and mounts those three in the browser
(`src/client.tsx`, one script). The portal itself is a client app, so this is only how the drawing gets there.

The Mobbin screens these follow: stacked request bars from [Stripe's Workbench](https://mobbin.com/screens/a14144e6-2127-44f1-b498-50124a1e114c),
[incident.io](https://mobbin.com/screens/0e05081e-0ea4-407a-b75d-432db1c679e5) and
[Braintrust](https://mobbin.com/screens/cb5c8c28-2502-44b4-8027-bacf3977017f) (a legend with a count per series);
a workflow node's preview from [n8n](https://mobbin.com/screens/63c3ba24-0ea8-4158-a02b-c3e9143960ce); environment
scopes per variable from [v0](https://mobbin.com/screens/ae42d62f-1de7-442a-8b4c-e678c1acf67f). The rail and the
command palette keep round 3's references (Railway, StackAI, Plain; fal, Grok).

## The portal's components behind one package (F7, K29, K31)

Aaron, 19 November 2026: "Yes, add the seam". Recorded in [`decisions/F7-portal-ui-seam.md`](decisions/F7-portal-ui-seam.md).
K29 (21 November 2026) moved what is behind the seam from HeroUI Pro to UI SDK; K31, the same day, changed how: a new
client, `packages/portal-next`, is built beside the old one on UI SDK, `@orthograph/theme`, `@orthograph/shell` and a
map declared in its own `blueprint/app/`, and the old client is deleted at cutover (Goal 6, [`goals/06-portal.md`](goals/06-portal.md)).
This file's pages, routes and information architecture stay as agreed; only how they are built changes. In short:

- **Until cutover**, the old client builds on `@orthograph/portal-ui` (`packages/portal-ui`), which wraps HeroUI Pro, a
  peer dependency never bundled, installed in CI from the `HEROUI_AUTH_TOKEN` secret and never on pull requests from
  forks. A lint rule bans `@heroui-pro/*` everywhere else.
- **The new client** keeps F7's names for its components (`Shell`, `Board`, `Grid`, `Chart`, `Stat`, `Card`, `Widget`,
  `Timeline`, `Command`, `Code`, `Markdown`, `Editor`, the `Chat` parts), each built on UI SDK when a page first needs
  it, and every `data-portal` hook the checks read.
- **At cutover** the new client is served at `/portal`, the old client, `portal-ui`'s HeroUI and the licence machinery
  are deleted, check 15 (rewritten first) passes, and the portal builds with `HEROUI_AUTH_TOKEN` unset.


## What this changes elsewhere

- **K13** (19 November) splits this further: M1.13 builds the shell's frame (tree, top bar, live rail, drawer) and the
  pages as a viewer; M1.24 keeps the chat, "Needs you" and screen context, in M3; the face contract, its lint rule,
  notes and sandboxed faces are M3.21. The bullets below are the F8 split, kept for the record.
- **M1.24** keeps the shell, screen context and the approval cards' contract, all through `portal-ui`. The chat's surface is M4.16 on `portal-ui`'s
  `Chat` parts, built on UI SDK (K29), over a Pi Durable run, and conversations are Runs, not things in the portal's store. Its row is reworded
  in `milestones.md` in the same change as this file.
- **M1.50** (19 November 2026, from `spikes/react-flow-graphs`) replaces M1.13's lifecycle strip with one `Graph`
  over React Flow and elk: each machine, the blueprint map and the worlds chain. The journey sequence stays its own view.
- **M1.34** (new, before M1.13) builds `@orthograph/portal-ui`, its lint rule and the CI install (F7).
- **M1.13** builds these pages on `portal-ui`, the face contract (`Portal.face`, its slots, `Portal.view.board`) and the lint rule; its
  row in `milestones.md` says so, in the same change as this file. With F8 it also builds the notes, the operations
  matrix, the folding waterfall, the "no leak" check, the fixed window, sandboxed faces, the proof tab on M1.04's
  verdicts and the wire's missing parts, and needs M1.04.
- **M1.23** lists every action with its input schema (`list`); **M1.24** adds `view-screen`, `navigate`, per-tab
  screen context and the generated `AGENTS.md` (F8).
- **M4.23** takes `Portal.face` at the `./portal` subpath and the lint rule as settled here.
- **M3.17** takes `views.list` with `Portal.view.board`, the live feed's `hold()`, and the `attention` slot.
