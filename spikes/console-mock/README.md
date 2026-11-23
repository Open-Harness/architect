# Console mock

The source of the design canvas for the operator console: real HeroUI Pro components, rendered to static HTML and
laid out as artboards in a claude.ai Design artifact. How to work on it, and the style it follows, is the
`portal-design` skill (`.agents/skills/portal-design/SKILL.md`). Read that first.

## Question

What should the console for a durable agent look like when it is built from HeroUI Pro, and which page shapes does
Aaron accept?

## Answer so far

The Goal page (`src/mission.tsx`, artboard `Main`) is the accepted shape: a Linear project page with a main column and
a right rail. Aaron rejected the earlier version of every page as slop on 19 November 2026 and approved this one the
same day ("that looks a lot better"). Every other page is still the old shape and is to be redone in this style,
organised by the journeys ideate, design, build and monitor.

## What is here

| Path | What it is |
|---|---|
| `src/pages.tsx` | The page registry: artboard name, component, title, height |
| `src/mission.tsx` | Goal overview. The model page. Exports `Player`, also used by `worker.tsx` |
| `src/shell.tsx` | AppLayout, Sidebar and Navbar shared by every page |
| `src/charts.tsx` | Hand-drawn SVG charts (Recharts renders empty under SSR): `Spark`, `ToolBars`, `ItemBars`, `Burnup` |
| `src/code.tsx` | Code blocks highlighted with shiki |
| `src/plan.tsx` `fleet.tsx` `worker.tsx` `channels.tsx` `dx.tsx` | The other pages, still in the old shape |
| `src/overview.tsx` | Retired; no longer in the registry |
| `src/data.ts` | Mock data |
| `src/console.css` `tokens.css` | Page CSS, inlined into every artboard |
| `src/render.tsx` | Renders each page and wraps it as a `.dc.html` artboard |
| `canvas/` | The canvas as last published: `canvas.json` plus every artboard. The artboards not in `pages.tsx` (Agents, Tools, Skills, Thread and others) are hand-written HTML from before the redesign |
| `tools/shoot.sh` | Renders, then screenshots each page headless at 1440 wide, so you can look before you show |

## Run it

The components come from the HeroUI Pro install in `internal/portal-pro` of the main checkout (it is licensed, so its
CSS is never committed here). Install it once with `npm ci` there.

```bash
PORTAL_PRO=/path/to/main/checkout/internal/portal-pro spikes/console-mock/tools/shoot.sh Main
```

That writes `out/Main.dc.html` (the artboard), `out/Main.preview.html` (the same page with local CSS) and
`out/Main.png`. Open the PNG and look at it before anyone else does.

## Publish it

The canvas of 19 November (https://claude.ai/artifact/D6MgxwE454KhLDatHuHnV7) can no longer be opened since the account switch, so ST1.22's screens live on a new Design artifact, https://claude.ai/artifact/C7oAsVGi7fUYoRfL6ACM2Q (private), whose index is `canvas/canvas.st1-22.json`. To update
it, copy the rendered `out/<Name>.dc.html` over `canvas/<Name>.dc.html`, then publish with the Artifact tool:
`url` set to that link, `root` set to `canvas/`, `file_path` set to `canvas/canvas.json`, and `files` naming each
changed artboard. Its page `Main.dc.html` is `RulesHandle`; the other three keep their names. The two `/_blob/…` links in `render.tsx` are HeroUI and HeroUI Pro uploaded to that new artifact; keep them as they are.

## The decision it supports

The portal's page shapes (`design/portal.md`) and which `portal-ui` parts each page needs. Nothing here is imported by
a package; when a page is right, it is rebuilt in `packages/portal` from the blueprint's wire.

## Open risks

- The mock is about a Pi Durable agent (`support-desk`), but Aaron chose on 19 November 2026 that the work items are
  Orthograph blueprint operations. The redesign moves the content to `examples/links` stage 1.
- Several Pro parts used here (`ChatTool`, `ItemCard`, `KPIGroup`, `ProgressCircle`) are not yet in `portal-ui`'s
  exports. Each needs to be named to the M1 lead with its Pro subpath and the page that needs it.

## ST1.22: rules in the portal (21 November 2026)

Four full pages at 1440 wide, drawn for G5's answers (1A 2A 3A 4A, `design/decisions/G5-invariants-ui-grill.md`) and shot with
`shoot.sh RulesHandle RulesProfile RulesClaim RulesRelease`: `src/rules-things.tsx` (handle, profile), `src/rules-operations.tsx` (handle.claim, handle.release),
`src/rules-parts.tsx` (the shared parts, where check 28's hooks sit) and `src/rules-facts.ts` (every fact, with the generated file it came from).
The pages follow check 28's hooks one to one: `rules` on the Rules widget (after `lifecycle`, before the first `operation-row`), `rule` rows with
`id="rule-<name>"`, `refusal` wherever a rule's refusal shows (a rule row, a thing's Errors, an operation's Refusals), and `spine-stop` move, rules, commit.

**What the wire lacks, named and not invented:**

- Live counts per refusal, and so the arrow's "most common refusal": telemetry, not the wire. Not drawn.
- A refusal's HTTP status: `things.<t>.errors` carries code and exit only. The mock quotes status from `generated/api/src/errors.ts`; the portal needs it on the wire.
- A rule's generated sentence: the wire has fields, states and `description`. The portal writes the sentence (in the words of docs.ts: "another claimed handle holds this name").
- A call marked on the rules stop (`refusal.invariant`, G5 section 5): live, so the spine here is the model's order with no call down it.
- The commit's store: the model gives step kinds (`database`), so the commit row says only that.
- In a rule row the refusal links to its own row, because check 28 wants a `rule-link` in every `refusal`.
