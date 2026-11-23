# Goal 6 screens: the app's map and the agent's view (a grill for Aaron)

Drawn by the 📐 designer on 22 November 2026, on UI SDK, `@orthograph/theme` and `@orthograph/shell`, with Plugged In as the subject. The
screens are in `out/` (`map-derived`, `map-declared`, `agent-view`, each `-dark.png` and `-light.png`, 1440 wide; the pages are
`out/*.html`). `design/portal.md` stands as agreed: nothing here moves its pages. These are the two things it does not draw.

**Aaron listens rather than reads, so each question starts in plain words.**

## Words used in every question

| Word | Means |
|---|---|
| The map | the app's pages: for each, its address, who may open it, what it shows and what it offers (K31) |
| Declared | the app's author wrote the map in `blueprint/app/` |
| Derived | the app wrote none, so the app projection works one out from the things; it is never written into the model (K31 section 5) |
| Snapshot | the list of named controls an agent gets from UI SDK's bridge, `agent.snapshot()` |
| Today | what the code on `goal-6/app-projection-build` and `goal-6/shell-build` really prints for Plugged In, read out of the files in `derived/` |

Two facts that shaped the drawing, both read from the code and not from a design page:

- Plugged In declares **no** map. Its map today is the derived one: a home and a page per thing (`derived/map.json`, written by the
  projection's own `view.ts`, `tools/derive.mjs`). K31's declared sketch is drawn beside it, marked "sketch", with only the operations'
  names, descriptions and rules read from `examples/plugged-in/generated/model/model.json`.
- The agent's `map` **tool** is not in this goal (`design/goals/06-portal.md:71-72`). In this goal an agent gets the map as data
  and a snapshot of the page. The drawing uses only those two.

---

## Q1 — Where does the map sit on the app's own page?

**The problem, in plain words.** K31 says the portal shows the map "on the app's own page, beside the things". The app's page is one card per
thing, and the right-hand rail is already taken by live numbers. If nobody decides, the builder has to guess between a tab, a panel and a section.

**The problem, in code.** K31, `design/decisions/K31-app-map.md:126` (on `origin/main`), and the page it lands on, `design/portal.md:39`:

```md
| The portal | the map's tree on the app's own page, beside the things |          <!-- K31:126 -->
| 6 | The live rail | A · scoped to the page: stat blocks, a sparkline, the last calls |   <!-- portal.md:39 -->
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| Slice 6, the frame (`design/goals/06-portal.md`, slice 6) | declares the app's page and its tabs in `blueprint/app/` |
| The live rail (`portal.md` round 2 Q6) | the rail is scoped to the page and cannot also hold a map |
| The things tree (`portal.md` round 4 Q1) | stays as it is; the map is not a second tree in the left panel |
| An agent's snapshot | names the tab, so the tab's name is a contract (slice 11) |

**The options**

**Today** — there is no map anywhere in the old portal. `packages/portal/src/modules/pages/internal/nav.ts` writes the panels by hand
(K31, "The problem, in code").

**A · A "Map" tab beside "Things"** (recommended)
```tsx
<Tabs defaultValue="map">
  <TabsList aria-label="plugged-in">
    <TabsTab value="things">Things</TabsTab>   {/* one card per thing, as portal.md round 2 Q2 */}
    <TabsTab value="map">Map</TabsTab>
  </TabsList>
</Tabs>
```
See `out/map-derived-dark.png`.

**B · The map in the right rail, beside the cards**
```tsx
<main><ThingCards /></main>
<aside className="rail"><PagesTree /></aside>   {/* replaces the live rail on this page */}
```

**C · A section under the cards, one long page**
```tsx
<ThingCards />
<Widget title="Map"><PagesTree /><PageDetail /></Widget>   {/* below the fold */}
```

**You do X, what happens**

| Scenario | A · tab | B · rail | C · section |
|---|---|---|---|
| You open the app's page | cards first, Map one click away | cards and a thin map | cards, map below the fold |
| You read a page's offers and components | full width, list beside detail | 340px wide, cramped | full width, but scrolled to |
| The live rail on the app's page | keeps its numbers | lost on this page | keeps its numbers |
| An agent finds the map by name | tab named "Map" | no tab, a tree | a heading |

**Rubric**

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ real page now | ✅ | ✅ |
| Reversibility | ✅ a tab is one line | ⚠️ moves the rail | ✅ |
| Blast radius | ✅ only the app's page | ❌ breaks round 2 Q6 | ✅ |
| Correctness | ✅ room for list beside detail | ❌ too narrow | ⚠️ |
| Fit with what exists | ✅ "page tabs sit above the title" (style guide) | ❌ | ⚠️ |

**Recommendation: A.** It is the style guide's page shape, leaves the rail alone, and gives the detail the room it needs.

---

## Q2 — How is the list of pages drawn?

**The problem, in plain words.** A page has two places it can sit: under the page it opens from (which is its breadcrumb), and in a
navigation group (which is where the sidebar puts it). For Plugged In's declared sketch they differ. One drawing has to lead.

**The problem, in code.** Both are in the generated map, `derived/map.json` (the projection's `internal/render.ts`); Plugged In's derived map today:

```jsonc
// derived/map.json (projection output for examples/plugged-in)
{ "layout": "sidebar", "home": "home",
  "pages": [ { "name": "handle", "path": "/things/handle", "parent": "home", "offers": ["handle.claim", "handle.release", "handle.resolve"] }, … ],
  "groups": [ { "title": "Things", "folded": false, "pages": [ { "page": "handle" }, { "page": "link" }, { "page": "profile" } ] } ] }
```

In K31's sketch every page opens from `home`, but the groups are "Your page" (profile, edit) and "Settings" (account, folded).

**What it touches**

| Dependent | Why it cares |
|---|---|
| The shell's breadcrumb and navigation | read `parent` and `groups` separately (`packages/shell/src/modules/navigation`) |
| The palette | lists pages flat, by name |
| Slice 6, the frame | declares the portal's own pages and groups, so both structures are in its `blueprint/app/` |

**The options**

**Today** — the shell draws only the groups (`derived/navigation.json`); nothing draws `parent`.

**A · A tree by parent, and the groups in a second block, detail beside** (recommended)
```tsx
<Widget title="Pages"><Tree>…by parent…</Tree></Widget>
<Widget title="Navigation"><Collapsible per group /></Widget>
<Widget title={page.name}>…route, who may open, shows, offers, components…</Widget>
```
See `out/map-declared-dark.png`.

**B · One table of every page**
```tsx
<DataGrid columns={["page","route","who","shows","offers","components"]} rows={pages} />
```

**C · A diagram of boxes and arrows**
```tsx
<PageGraph nodes={pages} edges={parentLinks} groups={groups} />
```

**You do X, what happens**

| Scenario | A · tree and detail | B · table | C · diagram |
|---|---|---|---|
| You want one page's offers and its components | click it, read it all | a wide row, truncated | click a box |
| You want to see every page's route | in the tree rows | one glance | not shown |
| An app with 40 pages | the tree folds | scrolls | a hairball |
| You compare parent and group | two blocks side by side | not shown | arrows only |

**Rubric**

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ | ✅ | ❌ needs a layout engine |
| Reversibility | ✅ | ✅ | ⚠️ |
| Blast radius | ✅ parts UI SDK has (Tree, Collapsible) | ⚠️ UI SDK has no data grid | ❌ hand-built |
| Correctness | ✅ both structures shown | ⚠️ hides parent | ⚠️ |
| Fit | ✅ "lists sit beside their detail" | ⚠️ | ⚠️ |

**Recommendation: A.** Uses only UI SDK parts, shows both structures, and gives components a place.

---

## Q3 — What does an app with no declared map show?

**The problem, in plain words.** Plugged In has no map. The derived one is just the things again, and its pages show no data at all. If the tab
shows it as if it were the app's map, it looks like a duplicate; if it hides it, it hides what an agent really gets.

**The problem, in code.** `packages/projections/src/modules/app/internal/view.ts:32-48` on `goal-6/app-projection-build`:

```ts
const derived = (model: Model, project: string): MapView => {
  const anyone = [{ kind: "anyone" as const }];
  …
  { name: thing, path: `/things/${thing}`, parent: "home", allowed: anyone, shows: [],        // shows nothing, for every page
    offers: Object.keys(model.operations).filter((o) => model.operations[o]?.thing === thing).sort(), components: [] }
```

Every derived page is open to `anyone`, though `handle.claim` needs `signed-in` and `handle.release` needs the role `handle.handleOwner`
(`examples/plugged-in/generated/model/model.json`, `allowed`).

**What it touches**

| Dependent | Why it cares |
|---|---|
| The agent | gets this exact map as data, so what the person sees should be what the agent gets |
| Plugged In's follow-on (K31: its pages declared after the map lands) | the screen's first real subject becomes the declared one |
| The palette | already lists derived pages and their operations |

**The options**

**Today** — nothing shows it.

**A · Show it, marked "derived, not declared", with how to declare one** (recommended)
```tsx
<Chip tone="outline">derived, not declared</Chip>
<Widget description="Derived: plugged-in declares no map… To declare one, write blueprint/app/ or run ortho add page." />
```
See `out/map-derived-dark.png`.

**B · An empty state with a short derived list folded under it**
```tsx
<EmptyState title="No map declared">  <Collapsible title="What an agent gets instead">…</Collapsible> </EmptyState>
```

**C · Hide the Map tab until a map is declared**
```tsx
{app.declared ? <TabsTab value="map">Map</TabsTab> : null}
```

**You do X, what happens**

| Scenario | A · show, marked | B · empty state | C · hide |
|---|---|---|---|
| You open Plugged In today | a map, the things again, labelled | "No map", one click to the list | no tab |
| You wonder what an agent can reach | it is the map shown | behind a fold | not answered |
| Plugged In later declares a map | the chip changes to "declared" | the empty state goes | the tab appears |
| Someone thinks the derived one is declared | the chip says no | the title says no | no way to tell |

**Rubric**

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ ships the real thing | ⚠️ | ❌ a promise |
| Reversibility | ✅ | ✅ | ✅ |
| Blast radius | ✅ | ✅ | ⚠️ the tab flickers by app |
| Correctness | ✅ shows what the agent gets | ⚠️ | ❌ hides it |
| Fit | ✅ the portal never hides a declaration | ⚠️ | ❌ |

**Recommendation: A.** The point of the map is that the person and the agent see the same thing.

---

## Q4 — Is "the agent's view" a screen, or only a tool?

**The problem, in plain words.** Slice 11 makes every control in the portal findable by an agent, by name. Nothing yet lets a person see that
list. If it is not a screen, a badly named control is found only when an agent fails. If it is a screen, where does it live?

**The problem, in code.** The slice's check, `design/goals/06-portal.md:302`, and what the real shell's snapshot prints today
(`derived/snapshot-closed.json`, `tools/snapshot.mjs`, run in Chromium on `goal-6/shell-build`):

```jsonc
// design/goals/06-portal.md:302
// "an agent's snapshot() lists the search, the tree, the tabs and the environment picker by name"
[ { "ref": "c1", "component": "collapsible", "label": "Things", "actions": ["setOpen", "press"] },
  { "ref": "c2", "component": "navigation-menu", "label": "Main", "items": [ "handle", "link", "profile" ] },
  { "ref": "c3", "component": "scroll-area", "label": "Navigation" },
  { "ref": "c4", "component": "dialog", "label": "Command palette⌘K", "actions": ["setOpen", "press"] } ]
```

Only the shell's four parts are named today; the search, the tree, the tabs and the environment picker are slice 11's. The snapshot is
per page, live. The map is per app, declared. They are two different lists.

**What it touches**

| Dependent | Why it cares |
|---|---|
| Slice 11 and its check (`06-portal.md:302`) | the screen would show what the check asserts |
| UI SDK's bridge (`createAgent`, `agent-ready.md`) | the only source of the snapshot; nothing of ours reads it yet |
| The chat drawer (`portal.md` round 2 Q7) | a drawer from the top bar already exists as a pattern |
| K31's `map` tool (`later.md`, "The rest of the app's map") | not in this goal; the screen must use data that exists |

**The options**

**Today** — no screen; an agent's snapshot exists only inside the page.

**A · No screen: a tool only**
```ts
agent.snapshot()     // the agent reads it; a person sees nothing
```

**B · An "Agent" tab on the app's page, the app-wide map as the agent gets it**
```tsx
<TabsTab value="agent">Agent</TabsTab>   // shows map.json as a tool listing; nothing live
```

**C · An "As an agent" drawer from the top bar, on every page** (recommended)
```tsx
<Button aria-label="As an agent">As an agent</Button>
<Drawer>  where it can go (palette's pages) · what it can touch here (snapshot rows) · what needs a person  </Drawer>
```
See `out/agent-view-dark.png`: the rows marked "today" are the real shell output; those marked "slice 11" are the names the slice promises.

**You do X, what happens**

| Scenario | A · tool only | B · Agent tab | C · drawer |
|---|---|---|---|
| A control has no name | found when an agent fails | not shown (the tab is the map) | the row is missing, visible at once |
| You are on an operation's page | nothing | the same app map | that page's snapshot |
| You want to see what needs a yes | nothing | not shown | "Needs a person" lists it |
| Cost to build | none | one page | one drawer, the snapshot as data |

**Rubric**

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ already there | ⚠️ static | ✅ real snapshot rows |
| Reversibility | ✅ | ✅ | ✅ one button |
| Blast radius | ✅ | ✅ | ⚠️ needs the bridge in the portal (slice 11 does) |
| Correctness | ❌ no way to check names by eye | ⚠️ not the live page | ✅ same list the agent gets |
| Fit | ✅ | ⚠️ | ✅ matches the chat drawer |

**Recommendation: C.** It shows the snapshot, which is per page, on the page it belongs to. B repeats the Map tab.

---

## At a glance

| # | Joint | Recommendation |
|---|---|---|
| Q1 | Where the map sits | A · a "Map" tab beside "Things" |
| Q2 | How pages are listed | A · tree by parent, groups beside it, detail on the right |
| Q3 | An app with no declared map | A · show the derived one, marked, with how to declare |
| Q4 | The agent's view | C · an "As an agent" drawer on every page |

**Answer key:** reply with four letters, for example `A A A C` for all recommended. A single letter changes only that joint; the screens
change only where the joint says (Q1 moves the tab, Q2 the lists, Q3 the chip and its words, Q4 the drawer).

## What could not be drawn, or is not sourced

- UI SDK has no `Widget`, `KPI` or chip; the drawing makes them on the theme's tokens (`src/mock.css`).
- K31 sketches Plugged In's `home`, `profile`, `edit` and `account` names and the two groups only. The `edit` and `account` pages' own
  words, routes (`/edit` is K36's) and who may open them are not stated anywhere, so the screen says "not stated in the sketch".
- The drawer's rows marked "slice 11" are the names the brief promises, not a snapshot of anything built.
