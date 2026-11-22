# K29 grill: Orthograph's UI layer

**Answered 21 November 2026: 1A 2A 3A 4A,** given by the conductor under Aaron's standing authority; recorded in
K29, "Aaron's answers".

Four questions for Aaron, 21 November 2026, from the 📐 designer thread. The full proposal is
`design/decisions/K29-ui-layer.md`; the evidence is `design/ui/heroui-inventory.md`.

**Words used in every question:**

- **An action** is one generated file per operation that does the call: who is calling, the payload check, a refusal
  that writes nothing, and asking a person once when the operation needs a yes. The page, MCP and the command line
  all go through the same one.
- **A piece** is one generated UI SDK component per operation: the form for a claim, the button for a release, the
  loader for a page read. It calls its action.
- **The beta** is stage 1, the second of the three releases: a person starts an app, signs people in, and claims
  `@name` on a real page.
- **portal-ui** is the one package that wraps HeroUI Pro for the portal today.

## Q1 — Should stage 1's three screens be built from generated pieces, which means building actions now, or hand-written on React hooks as planned?

**The problem, in code.** The plan says the beta's screens are hand-written on React hooks, and actions wait for
milestone 3. Since then you chose actions as the spine of the UI, and the spike showed a generated form working
through Plugged In's real SDK in a real world.

```text
# design/milestones.md:103 (goal/stage-1), the hooks slice
ST1.01 | The react projection: @orthograph/react, one mutation hook per operation and one query hook per read,
         declared refusals as classes in the hook's error, pending, one requestKey per form open
# design/milestones.md:107, the screens
ST1.04 | … three screens in src/web/ (/@name, /claim, /edit) on the hooks, served by the Worker
# design/decisions/K13-lock-down-first.md:17
The actions, approvals, the agent's chat and the agent's way in move to M3
```

```ts
// spikes/ui-sdk-real-world/generated/handle-claim.action.ts:5-15 — the action the spike generated, 15 lines
export const options = (host: ActionHost): ActionOptions<HandleClaimPayload, HandleClaimAnswer> => ({
  name: "handle.claim",
  readOnly: false,
  needsApproval: false,
  errors: handleClaimRefusals,
  run: (args, ctx) => host.call<HandleClaimAnswer>("handle.claim", args, ctx),
});
```

Why it matters: if nobody decides, the beta's screens get hand-written now and rewritten when pieces arrive in
milestone 3, and the beta ships the one part of an app the blueprint doesn't generate.

**What it touches**

| Dependent | Why it cares |
|---|---|
| Goal 3 (stage 1) | its bound gains the action slices and loses the hooks slice |
| MCP and the command line (milestone 3) | they get the same actions later, so approval and refusals are written once |
| Sign-in pages (milestone 2) | `/login` is a piece over the auth plugin's sign-in, or another hand-written form |
| `--through web` journey replays | replays drive pieces in Chromium, as the spike did by hand |
| Your call in K13 | it moves two slices out of milestone 3 |

**The options**

**Today** — nothing exists: no `@orthograph/react`, no `src/web/`, no actions (Goal 3's status, 21 November).

**A · Actions now, screens from pieces** (recommended)
```tsx
// src/web/pages/claim.tsx — hand-written: layout and words only
<HandleClaim.Root onDone={() => go("/edit")}>
  <HandleClaim.Name label="Your name" />   {/* generated: label, help text, required, error */}
  <HandleClaim.Refusal />                  {/* "Someone else holds this name (HN-001)" */}
  <HandleClaim.Submit>Claim it</HandleClaim.Submit>
</HandleClaim.Root>
```

**B · Hooks, screens by hand** (the plan as written)
```tsx
// src/web/pages/claim.tsx — hand-written: every field, its help, its errors
const claim = useHandleClaim();
<form onSubmit={(e) => { e.preventDefault(); claim.mutate({ name }); }}>
  <Field><FieldLabel>Name</FieldLabel><Input value={name} onValueChange={setName} /></Field>
  {claim.error instanceof HandleTaken ? <p>That name is taken (HN-001)</p> : null}
  <Button type="submit" disabled={claim.pending}>Claim it</Button>
</form>
```

**C · Pieces now, straight on the SDK; actions in milestone 3**
```ts
// generated/web/handle/claim.ts — the piece calls the SDK itself, no action file
api: (context) => piece.api(context, (payload, ctx) => sdk.handle.claim({ payload }, ctx)),
```

**You do X → what happens**

| Scenario | A · Actions now | B · Hooks by hand | C · Pieces on the SDK |
|---|---|---|---|
| You open `/claim` and type a taken name | the generated refusal shows under the field | shows if the author wrote that branch | the generated refusal shows |
| An agent in the page tries to release your name | it waits for your yes, once release declares it needs one | nothing stops it unless each screen adds the mark | waits only if the piece adds the mark |
| You change a field's description in the blueprint | every page shows the new help text | each screen edited by hand | every page shows it |
| Milestone 3 adds MCP approvals | already there; MCP uses the same actions | built then, and the screens rewritten | built then, slotted under each piece |
| Stage 1 work added | two action slices plus the pieces, minus the hooks: about one small slice more | as planned | the pieces only, equal to the plan |

**Rubric**

| Axis | A · Actions now | B · Hooks by hand | C · Pieces on the SDK |
|---|---|---|---|
| Floor-first | ✅ the real spine in the beta | ⚠️ screens now, rewritten later | ⚠️ pieces now, the spine later |
| Reversibility | ✅ pieces and actions are generated, so regenerated | ⚠️ hand-written screens are thrown away | ✅ the action slots in later |
| Blast radius | ⚠️ Goal 3's bound grows by about one small slice | ✅ none | ✅ none |
| Correctness | ✅ one place for approval and refusals, page, MCP and command line | ❌ approval per screen, by hand | ⚠️ approval lives in the piece until milestone 3 |
| Fit | ✅ what you chose: actions first, derive, don't declare | ❌ against "never hand-written against UI SDK" | ⚠️ pieces first, actions second |
| Parallelizability | ✅ actions and the portal move run side by side | ✅ | ✅ |

**Recommendation: A.** It costs about one small slice more than the plan, and the beta then shows the claim the
framework makes: you write the blueprint and the pages, and the forms, refusals and agent limits fall out.

## Q2 — Should HeroUI leave the portal now, in one change, rather than piece by piece over the coming milestones?

**The problem, in code.** You decided HeroUI comes out, piece by piece. Reading the portal on `goal/stage-1` shows
it uses three of portal-ui's eighteen names; the frame, the tables and the search are plain HTML.

```tsx
// packages/portal/src/modules/pages/internal/home.tsx:15-18 — one of the four places the portal uses HeroUI
<Card data-portal="thing-card" data-thing={thing.name} …>
  <Card.Content>
    <Card.Title><a href={`/portal/things/${…}`}>{thing.name}</a></Card.Title>
    <Card.Description>{thing.description}</Card.Description>
```

```css
/* packages/portal/src/portal.css:2-3 */
@import "heroui-styles";
@import "heroui-pro-styles";
```

```yaml
# .github/workflows/ci.yml:166-170 — every CI run on these branches installs Pro with your licence token
- name: Install Pro with the licence token
  env:
    HEROUI_AUTH_TOKEN: ${{ secrets.HEROUI_AUTH_TOKEN }}
```

Why it matters: while HeroUI stays, every build needs your licence token, the portal is drawn in a library we're
leaving, and the drawn design (`spikes/portal-site`, 87 pages) keeps being the target in HeroUI's look.

**What it touches**

| Dependent | Why it cares |
|---|---|
| Goal 3's portal work (monitor, graph) | it builds the next screens on HeroUI or on UI SDK |
| CI and your licence token | the install step, its cache and the daily download cap go |
| The checks that read the portal | they read `data-portal` hooks, which stay, so they pass unchanged |
| The 15 unused names (grid, board, chat, editor, charts) | deleted, and rebuilt on UI SDK with the first page that needs each |
| The drawn design | its look becomes UI SDK's with our theme (Q3) |

**The options**

**Today** — four page files use `Card`, `Widget` and `Timeline`; CI installs Pro with the token.

**A · One change now** (recommended)
```ts
// packages/portal-ui/src/index.ts after: same names, new insides, unused names gone
export { Card, Widget } from "#modules/content/service.js";   // our markup on the theme
export { Timeline } from "#modules/data/service.js";          // UI SDK's Timeline
// and in the same change: no @heroui peers, no pro.mjs, no HEROUI_AUTH_TOKEN step
```

**B · Piece by piece, as the portal grows**
```ts
// each new page swaps one name; HeroUI stays until the last
export { Timeline } from "#modules/data/service.js";             // UI SDK, first
export { Card } from "@heroui-pro/react/item-card";             // still Pro
export { DataGrid as Grid } from "@heroui-pro/react/data-grid"; // used by the monitor next
```

**C · Keep HeroUI for the portal until 1.0; UI SDK only for apps**
```ts
// packages/portal-ui stays as it is; generated/web/ uses UI SDK
```

**You do X → what happens**

| Scenario | A · One change now | B · Piece by piece | C · Keep it until 1.0 |
|---|---|---|---|
| Someone builds Orthograph from a fresh clone | builds with no token | needs the token until the last piece | needs the token |
| The monitor page is built next | on UI SDK, with the grid built then | on HeroUI's grid, ported again later | on HeroUI's grid |
| An agent opens the portal | it can use search, tabs and the tree | only the pieces moved so far | can't: the bridge lists only UI SDK's components |
| You compare the portal and an app side by side | one look | two looks for weeks | two looks until 1.0 |
| Work it costs now | one small slice | spread over many | none |

**Rubric**

| Axis | A · One change now | B · Piece by piece | C · Keep it until 1.0 |
|---|---|---|---|
| Floor-first | ✅ off HeroUI this week | ⚠️ off HeroUI some day | ❌ not before 1.0 |
| Reversibility | ✅ the names stay, so a page never notices | ✅ | ✅ |
| Blast radius | ✅ four page files, a stylesheet, CI | ⚠️ every portal change for weeks | ⚠️ two systems to maintain |
| Correctness | ✅ checks read hooks, unchanged | ✅ | ✅ |
| Fit | ✅ K24's "phase out HeroUI", sooner | ✅ K24 as written | ❌ against K24 |
| Parallelizability | ✅ beside Goal 3, touches only the portal | ⚠️ tangles with every portal slice | ✅ |

**Recommendation: A.** You said phase it out; it turns out to be a small change, so the piece-by-piece plan only
keeps the licence and two looks around for longer.

## Q3 — What look should generated pieces and the portal ship with?

**The problem, in code.** UI SDK draws nothing by itself. Its optional stylesheet gave the spike a working but plain
form, which you called poor.

```text
# spikes/ui-sdk-real-world/README.md:130-131
7. web.css alone gives a usable styled form. Usable, not good: Aaron looked at these screenshots and called them
   poor, which is fair.
```

```css
/* packages/portal/src/portal.css — the portal's look rests on nine HeroUI tokens today */
body { background: var(--background); color: var(--foreground); }
a { color: var(--accent); }
.pass { color: var(--success); } .fail { color: var(--danger); }
```

Why it matters: the beta's first impression is a generated form. If nobody decides, every app looks like the spike's
plain screenshot, or every app author styles every piece themselves.

**What it touches**

| Dependent | Why it cares |
|---|---|
| Every generated piece | it renders with whatever stylesheet the app loads |
| The portal (Q2) | it needs a look once HeroUI's sheets go |
| `portal-design` skill and the drawn design | the style guide is written against HeroUI today |
| App authors | how much CSS they write before a page looks finished |

**The options**

**Today** — the portal on HeroUI's sheets; the spike on plain `web.css`.

**A · One Orthograph theme on UI SDK's tokens, shared by the portal and every app** (recommended)
```css
/* src/web/theme.css in an app: one import, then override what you like */
@layer ui-sdk;
@import "@orthograph/web/theme.css";   /* our tokens, type scale and spacing, designed once */
:root { --ui-primary: oklch(0.62 0.19 260); --ui-radius: 0.5rem; }
```

**B · Plain `web.css`; each app styles itself**
```css
@layer ui-sdk;
@import "@ui-sdk/core/web.css";
/* everything else is the app's own */
```

**C · Tailwind, with a kit of classes on each piece**
```tsx
<HandleClaim.Submit className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">Claim it</HandleClaim.Submit>
```

**You do X → what happens**

| Scenario | A · Our theme | B · Plain web.css | C · Tailwind |
|---|---|---|---|
| You run a new app's `/claim` the first time | looks finished, like the portal | looks like the spike's plain form | looks finished if the template carries the classes |
| You want your own brand colour | change one or two tokens | write your own stylesheet | change the Tailwind theme |
| A generated piece gains a new part | styled by the theme | unstyled until you style it | the template carries new classes |
| An app uses Vue later | same theme, same tokens | same | classes copied per framework |

**Rubric**

| Axis | A · Our theme | B · Plain web.css | C · Tailwind |
|---|---|---|---|
| Floor-first | ✅ a finished look in the beta | ❌ the look you called poor | ⚠️ needs Tailwind in every app |
| Reversibility | ✅ tokens; an app can drop it | ✅ | ⚠️ classes in generated markup |
| Blast radius | ⚠️ one stylesheet to design and keep | ✅ none | ⚠️ a build tool in every app |
| Correctness | ✅ one place to check colour contrast | ⚠️ each app checks its own | ⚠️ per template |
| Fit | ✅ UI SDK's own way to theme (tokens in `@layer ui-sdk`) | ✅ | ⚠️ UI SDK works with it, but it's a second system |

**Recommendation: A.** One stylesheet, designed once from the portal's style guide, gives the beta a finished look
and keeps every app one token away from its own brand.

## Q4 — Which frameworks should get generated pieces in the beta?

**The problem, in code.** A piece is one framework-free primitive plus one small rendering file per framework. UI SDK
renders in React, Vue, Svelte, Solid and web components, and fitting every framework was one of your reasons for it.

```ts
// blueprint/projections/web.ts — the proposal; the list is what this question decides
export default Blueprint.use(web, { frameworks: ["react"] });
```

```text
# spikes/ui-sdk-real-world/README.md, measurements: one operation's piece
primitive 65 lines (framework-free), React form 30 lines; #215 also rendered it as custom elements
```

Why it matters: each framework is one more template per kind of piece and one more check in Chromium; none is
needed for Plugged In, which is React, but "works in any framework" is part of what the beta could say.

**What it touches**

| Dependent | Why it cares |
|---|---|
| The web projection slice | its size: one template per framework, per kind (read, move, write) |
| `--through web` checks | each framework's rendering is proved in Chromium |
| The docs and the canon | what they promise about frameworks |
| Plugged In | it uses React either way |

**The options**

**Today** — no generated pieces at all.

**A · React only in the beta; the rest when someone asks** (recommended)
```ts
export default Blueprint.use(web, { frameworks: ["react"] });
// generated/web/handle/claim.ts and claim.react.tsx
```

**B · React and web components**
```ts
export default Blueprint.use(web, { frameworks: ["react", "web"] });
// adds generated/web/handle/claim.web.ts: <handle-claim> usable in any page, even plain HTML
```

**C · All five**
```ts
export default Blueprint.use(web, { frameworks: ["react", "vue", "svelte", "solid", "web"] });
```

**You do X → what happens**

| Scenario | A · React only | B · React and web components | C · All five |
|---|---|---|---|
| You build Plugged In's screens | React pieces | React pieces | React pieces |
| Someone writes a plain HTML page with a claim form | not yet | drops in `<handle-claim>` | drops it in |
| Someone's app is in Vue | waits for a Vue template | uses the web components | Vue pieces |
| The web projection's slice | one template set | two, and a second check | five, five checks |

**Rubric**

| Axis | A · React only | B · React and web | C · All five |
|---|---|---|---|
| Floor-first | ✅ exactly what the beta uses | ⚠️ one unused output | ❌ four unused outputs |
| Reversibility | ✅ the primitive is framework-free, so a framework is one template later | ✅ | ✅ |
| Blast radius | ✅ smallest | ⚠️ a second template set | ❌ five |
| Correctness | ✅ one rendering proved | ⚠️ two to prove | ❌ five to prove |
| Fit | ⚠️ the promise waits | ✅ "any page" from day one | ✅ the whole promise |

**Recommendation: A.** The primitive is already framework-free, so every other framework is one template away;
building them before anyone uses them is work the beta doesn't need.

## At a glance

| # | Joint | Recommendation |
|---|---|---|
| 1 | Screens from generated pieces (actions now), or hand-written on hooks | A · Actions now, screens from pieces |
| 2 | HeroUI out of the portal now, in one change, or piece by piece | A · One change now |
| 3 | The look generated pieces and the portal ship with | A · One Orthograph theme on UI SDK's tokens |
| 4 | Which frameworks get pieces in the beta | A · React only |

**Answer key:** reply with one letter per question, like "1A 2A 3A 4A", or a letter and a note.
