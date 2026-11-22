# K31: the app's map, in the blueprint

**Decided 21 November 2026 by Aaron**, answering the 📐 designer thread's grill on the app's information architecture
(the six questions in [`../briefs/K31-app-map-grill.md`](../briefs/K31-app-map-grill.md), drawn on the "App map grill"
board). His words: "I agree with all of your defaults." So each question takes its A. It builds on K29 (the pieces)
and changes how the portal leaves HeroUI: a new portal, built on this, replaces the old one (Goal 6,
[`../goals/06-portal.md`](../goals/06-portal.md)).

## The problem, in code

K29 derives the bottom of the interface from the data: one piece per operation and read. Everything above it, it
handed to the app's code as "anything the blueprint can't know". That is most of a real application: the shell, its
sidebar groups, the switchers, the top bar's breadcrumb and actions, the routes (some dynamic, like a page per
handle), the choice of layout, and the command palette. Nothing generated could see any of it, so nothing fell out:
not the palette, the breadcrumbs, the docs, the agent's map, or a journey through the pages.

The portal shows the gap from both sides. Half of its frame is already read from the model, and half is written by
hand (`packages/portal/src/modules/pages/internal/nav.ts` on `goal/stage-1`):

```ts
// nav.ts: read from the model
...Object.keys(b.model.things).map((name) => ({ panel: "things" as const, title: name, href: `/portal/things/${enc(name)}` })),
// nav.ts: written by hand, beside it
export const PANELS = ["things", "proof", "reference", "plugins", "monitor"] as const;
{ panel: "reference", title: "Access", href: "/portal/reference/access" },
```

and every route is matched by hand (`route.ts`: `if (parts[1] === "things") return { page: "thing", name };`).
Plugged In has no map at all. UI SDK has `navigation-menu`, `menu`, `menubar`, `command`, `tree`, `collapsible`,
`scroll-area` and `drawer`, but no sidebar, breadcrumb, app shell or router (its 51 components at beta.7).

## What is decided

1. **The map lives in the blueprint, as its own declarations** (Q1). `blueprint/app/app.ts` is the app (its layout,
   home and navigation) and `blueprint/app/pages/<name>.ts` is one page, named by its path like every declaration. Both
   compile into the model as `model.app`, hashed like things and operations, so every projection and check reads it.
   `model.app` is present only when the blueprint has an `app/` folder, like `stores` and `environments`, so a blueprint
   with no app generates exactly what it did before, byte for byte. Not settings on the web plugin, which would tie the
   map to the browser; not conventions read from code.
2. **A page declares the what, never the look** (Q2): its route with typed parameters, who may open it, which reads
   it shows, which operations it offers, and its parent. The look is the page's own code in `src/web/`.
3. **The shell is a layout with named slots and navigation groups** (Q3). The app names a layout (`sidebar`,
   `topNav` or `none`) and lists its navigation as named groups of pages, in order, each foldable. A layout is a
   component with named slots (`header`, `switcher`, `nav`, `footer`, `actions`); a mounted feature fills a slot
   (the organizations feature its switcher, auth its account menu). Nothing declared: a default.
4. **The palette, the breadcrumbs and the agent's map are derived** (Q4). The palette lists the pages the caller
   may open and the operations it may call where it is; the breadcrumb comes from each page's parent and route; the
   agent gets the whole map as a tool (where it can go, what it can do there). Overrides: hide, rename, a shortcut.
5. **A derived default until you declare, with the staleness ratchet** (Q5). With no `app.ts`, the app projection
   derives a map, for a project that mounts it: a home listing the things, a page per thing with its operations
   offered, and a sidebar of things, which is what the portal's tree does today. The default is worked out there and
   never written into the model. `ortho add page <name>` writes a page declaration and scaffolds its code once. A declared
   map wins. Page code that falls behind its declaration follows "Scaffolds that follow the blueprint"
   ([`../later.md`](../later.md)).
6. **The portal uses the same language** (Q6). A new portal declares its map this way, and a feature's portal pages
   (the faces, M3.21) become pages that feature brings into the map. Pages and routes come first, then the shell; the
   new portal is the first app with a declared shell.

## What you write

```ts
// blueprint/app/app.ts
import { Blueprint } from "orthograph";
import home from "./pages/home.ts";
import profile from "./pages/profile.ts";
import edit from "./pages/edit.ts";
import account from "./pages/account.ts";

export default Blueprint.app({
  description: "Claim a name and keep a public page of links.",
  layout: Blueprint.layout.sidebar,
  home,
  nav: [
    Blueprint.nav.group({ title: "Your page", pages: [profile, edit] }),
    Blueprint.nav.group({ title: "Settings", pages: [account], folded: true }),
  ],
});
```

```ts
// blueprint/app/pages/profile.ts
import { Blueprint } from "orthograph";
import { Handle } from "../../things/handle/thing.ts";
import get from "../../things/profile/verbs/get.ts";
import add from "../../things/link/verbs/add.ts";
import order from "../../things/link/verbs/order.ts";
import release from "../../things/handle/verbs/release.ts";
import home from "./home.ts";

export default Blueprint.page({
  description: "A claimed name's public page and its links.",
  route: { path: "/@:handle", params: { handle: Handle.fields.name } },
  parent: home,
  allowed: [Blueprint.anyone],
  shows: [get],
  offers: [add, order, release],
});
```

`allowed` uses the same roles as an operation. A page's type is `AppPage`, since `orthograph` already exports `Page`
(a read's page of results). A feature's pages and slot parts come with its mount, chosen like its
other parts (`Blueprint.use(organizations, (o) => [..., o.pages.members, o.slots.switcher])`).

## What the compiler checks

Each is a compile error naming the file, so a map that can't work never generates:

- on a page that shows reads, a route parameter that no shown read's payload takes, or a shown read's payload field
  that no parameter, session or `allowed` role supplies. A page that shows no read (one whose data comes from
  elsewhere, like the portal's pages over its own data API) types each parameter with a value (`Blueprint.text()`,
  a field's value) and is checked only for that;
- a page that offers an operation none of the page's `allowed` roles may call;
- a nav group, `home` or `parent` naming a page that isn't declared, and a cycle of parents;
- two pages with the same route.

## What falls out

| Output | From the map |
|---|---|
| The app projection (new, `generated/app/`) | the route table and a typed link per page (`links.profile({ handle })`), the navigation, the palette's index and the agent's map, as data |
| The shell (`@orthograph/shell`, new) | the router, the layouts and their slots, the navigation, the breadcrumb and the palette, framework-free on UI SDK, with React parts |
| The web pieces (K29) | a page's `shows` and `offers` pick its pieces; nothing in a page fetches |
| The agent | a `map` tool and the page it is on; a step on a page it may not open is refused before any call |
| The docs | a page per screen: its route, who may open it, what it shows and offers |
| `ortho prove` | journeys can open a page (`open(pages.profile, { handle: "aaron" })`) `--through web`; a check that every page's offers are callable by its roles |
| The portal | the map's tree on the app's own page, beside the things |

**Why its own package and projection.** The shell and the app projection are new files beside K29's `@orthograph/web`
and web projection, never inside them, so the goal that builds the pieces (Goal 5) and the goal that builds the map
(Goal 6) never edit the same file. The router is ours, a small runtime over the generated route table and the history
API, since every route is known at build time; no router dependency. Reversible: the table is data.

**The theme is its own package,** `@orthograph/theme` (one stylesheet on UI SDK's `--ui-*` tokens), for the same
reason: the shell, the pieces and the new portal all use it. It is Q3 of K29 unchanged, in its own place. Goal 6 owns
it and builds it first, and lands it in `goal/stage-1` on its own, so Goal 5's screens take it up; until then the
pieces use UI SDK's default tokens.

**New modules, not edits.** The language and the compiler gain an `app` module each
(`packages/orthograph/src/modules/app/`, `packages/compiler/src/modules/app/`); the existing modules only register
them. Goal 6's brief names every existing file it may touch, and a check proves the byte-for-byte rule above.

## What changes for K29 and Goal 5

K29 had not merged, so it was written to these words in its own pull request (#272), not superseded:

- K29 section 7 is now "off HeroUI, by a new client": the new portal is built beside the old one and the old client
  is retired at cutover (ST1.27, Goal 6's last slice), once every portal check passes on the new one. Check 15's
  rewrite (ST1.28) gates it. Cutover deletes `@orthograph/portal-ui` too; F7's names come back on UI SDK with the
  first page that needs them.
- K29's page layer is the look; the map is declared here.
- Goal 5 keeps the actions, `@orthograph/web`, the web projection and Plugged In's screens, and its done check never
  waits on the map. Plugged In's three pages are declared in this language as a follow-on, once Goal 6's map landing
  reaches `goal/stage-1`.
- Neither goal edits the other's packages. Cutover lands on GitHub, after Goal 3's lead agrees a freeze on a `goal-3` issue, and with that lead's yes (superseded by K33, 21 November 2026: on an Ask issue in Goal 3's milestone)
  ([`../goals/06-portal.md`](../goals/06-portal.md), the protocol).

## Not chosen, and why

- **A layout language in the blueprint** (Q2's B): regions and columns would make a second UI framework that fights
  UI SDK and churns with every design.
- **The map as web plugin settings** (Q1's B): a mobile app, the CLI, MCP, the docs and prove could not read it.
- **A fixed shell** (Q3's C): every real app is laid out its own way.

## Reversible

Every page is one file and the map is data in the model. Removing `app.ts` brings back the derived default; a page
deleted is a route gone, which the compiler then reports wherever it was named.

## Supersedes

K29 and the live docs it touched (`portal.md`, `packages.md`, `scope.md`, `milestones.md`, Goal 5's brief and the
`ui-sdk` skill's README) took K31's words in #272, before either merged. One phrase #272 wrote is replaced here, since
goals now coordinate through the repository and GitHub (K32):

- design/milestones.md: "the conductor has agreed the freeze with Goal 3's lead" → "Goal 3's lead has agreed the freeze on a `goal-3` issue"
