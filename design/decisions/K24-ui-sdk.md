# K24: UI SDK is the interface base, and HeroUI is phased out

Decided 20 November 2026. Aaron's own yes, to the conductor, the same day: "yes this is a go". The direction is his;
the steps, the pin and the order below are the building agent's (`AGENTS.md`, "Who decides"). It supersedes parts of F7 and K19.

## Aaron's words

From the Capxul session, 20 November 2026, after UI SDK was explained to him: "It's a Vercel thing, so it's going to
be supported. And it fits the philosophy of our framework. So if we're going to do it, which I think we should do it,
we should go in all the way. We should phase out Hero UI and rebuild everything like this. I think that would be the
maximum value ... And then we wouldn't need to scope creep anymore ... if we did want to add anything, it would fit
into a logical place."

## What UI SDK is

`github.com/vercel-labs/ui`, published as `@ui-sdk/core` with `@ui-sdk/react`, `@ui-sdk/web`, `@ui-sdk/vue`,
`@ui-sdk/svelte` and `@ui-sdk/solid`. Read from its source tree (contributing/architecture.md, the agents docs,
`packages/core/skills/ui-sdk/references`) by the Capxul session, 20 November 2026:

- **One description, every framework.** `definePrimitive` takes a required `options` schema (kinds: string, number,
  boolean, list, value, callback, action, id, key) plus `state`, `api`, `slots` and `agent: { actions }`. Every
  change goes through `createChange` to `on<Key>Change(value, details)`, where `details` carries `reason`, `source`
  (`keyboard`, `mouse`, `agent`, `programmatic`) and `cancel()`.
- **51 components**, among them Field (label, description, error), Input, Number Input, Select, Combobox, Listbox,
  Pagination, Tree, Timeline, Date Picker, File Input, Dialog, Menu and Toast. Forms submit natively through a hidden
  native input.
- **An optional stylesheet**, `@ui-sdk/core/web.css`, in `@layer ui-sdk`, themed by `--ui-*` tokens (background,
  primary, border, radius, spacing, fonts). A plain working app needs no second library.
- **An agent bridge.** Three marks, `data-agent-confirm="<sentence>"`, `data-agent-secret` and `data-agent-hidden`;
  `createAgent({ allow })` decides or asks a person. `createHistory` and `stageChanges` exist and are marked
  experimental.
- **Missing:** a data grid or table, and a kanban board. Reordering is a behaviour (`createReorder`,
  `createTransfer`) to build on.

Versions on npm, checked 20 November 2026: `0.1.0-beta.1` (12 November) to `0.1.0-beta.13` (19 November), about one
a day.

## Why it fits

The blueprint is declared once and every output is generated from it. UI SDK does the same for components: one
description, rendered in React, Vue, Svelte, Solid and web components. Its agent bridge is the browser half of what
the blueprint already knows: an approval, a secret, a hidden field, and whether a change came from a person or an
agent. HeroUI Pro is React only, licensed per project, and can't be a dependency of generated code (F7 kept it behind
one package for that reason).

## Decided

1. **Spikes first.** The first is done: `spikes/ui-sdk-verb-primitive` (PR #215, open, merges before this) generated Plugged In's
   `handle.claim` as one UI SDK primitive (73 lines) that renders in React and as custom elements; the agent bridge
   lists it with only the actions the generator named, a call carries whether a person or an agent made it, and a
   declared refusal fails the agent's step with its code. It ran against a stand-in server in jsdom. The second
   (`spike/ui-sdk-real-world`) takes the same form through Plugged In's real generated SDK into a local world, in
   Chromium, replays a real journey's claim step, and settles how blueprint meaning maps onto the agent marks:
   `Blueprint.issued` to `data-agent-secret`, private visibility to `data-agent-hidden`, an approval to
   `data-agent-confirm`, and `source === "agent"` to a way in that a role can exclude (the Capxul session's sketch,
   not yet a decision). Nothing in `packages/` depends on UI SDK until the second spike passes.
   The first spike's finding is the rule: the page is generated from the blueprint onto UI SDK as its own output, and
   never hand-written against UI SDK.
2. **Everything new uses UI SDK from the start**, once the second spike passes: generated forms, inputs, buttons, lists
   and screens, and the example apps' screens. HeroUI never touches them. Whether those screens are generated in stage 1
   (amending ST1.04, whose three screens are hand-written on the hooks) is the second spike's to answer.
3. **The portal moves over piece by piece**, behind the same seam. `@orthograph/portal-ui` keeps its own names
   (F7, decision 2); their insides change from HeroUI Pro to UI SDK one export at a time. The data grid and the board
   go last, because UI SDK has neither: we build them on its behaviours, as F7's fallback already planned for the
   board (dnd-kit then, `createReorder` and `createTransfer` now). Superseded by K29 and K31, 21 November 2026: the portal is rebuilt
   as a new client beside the old one, and the old client and `portal-ui` are deleted at cutover.
4. **HeroUI comes out** when nothing imports it: the Pro peer dependency, the `HEROUI_AUTH_TOKEN` install, the lint
   ban's exception and the CI cache all go in the same change.
5. **Pin exactly, three days old.** UI SDK is a beta that changes daily. It is pinned like every dependency
   (R1): the newest version at least three days old when it's added (today that is `0.1.0-beta.7`, 17 November). A
   younger version needs R1's override, with the reason.

## Where UI SDK sits: actions first, derive, don't declare

Two more calls of Aaron's, the same day, after both spikes.

**Actions first.** In the Capxul session, asked "Do you want actions as the spine, with UI SDK underneath as the widget
layer?", he chose the button "Yes, actions first". The layers, from the bottom of the page up:

1. **The blueprint**: what things mean, as today.
2. **The action**, generated, one per operation (K5 decision 3, M1.22 and M1.23): who is calling, a declared refusal
   that writes nothing, approval asked once. The page, MCP and the CLI call the same action.
3. **A typed piece per operation, read and move**, generated on UI SDK: a form, a list, a button. Its agent steps are
   the action's; a refusal reaches the page's agent with its code (`spikes/ui-sdk-real-world`, PR #222).
4. **Pages and the app's own components**, hand-written in `src/web/` from those pieces. A component nothing generated
   fits (an editor) is a UI SDK primitive whose agent-readable state is declared `controlled`; anything it saves goes
   through a generated action.
5. **UI SDK's widgets** underneath: inputs, pickers, dialogs, focus, keyboard, screen readers. We never write those.

**Derive, don't declare.** Asked whether components and screens should be declared in the blueprint, and shown the
case for and against (the conductor's whiteboard "UI on Orthograph"), he agreed with the conductor's verdict: "I think
we're on the same page." No `Blueprint.component` or `Blueprint.screen`. Everything a declaration would give (types
down to the page, the agent's limits, journeys through the page) comes from generating pieces out of what the
blueprint already says; the agent's real limit is the action, which checks the role. What the blueprint gains instead
is only the meaning every output needs: what kind a value is, approval on an operation, secret and hidden fields.
Reopen only if a component carries meaning no operation has.

**What it moves.** Screens on generated pieces need actions, which K13 placed in M3. Whether to bring M1.22 and M1.23
forward for stage 1's screens is open with Aaron.

## What doesn't change

- Work in flight carries on with HeroUI until step 3 reaches it. Goal 3's portal work is not paused.
- The seam stays: only `@orthograph/portal-ui` imports a component library for the portal. Its lint rule, which
  bans `@heroui-pro/*` outside it, is dropped with HeroUI in step 4.
- Generated code still imports only the language's runtime, `orthograph`, the host and project code (`AGENTS.md`,
  package rules). Letting generated screens import `@ui-sdk/*` (open source, Apache-2.0, so no licence seam) is not
  in force yet: it is added to that rule, in `AGENTS.md` and the module boundaries, in the same change that lands the
  first generated screen after the second spike passes.
- The free HeroUI 3 primitives F7 allowed anywhere (`Button`, `Chip`, `Card`) are not used in new code.

## Gaps it raises

These are recorded here and go into `design/ledger.md` and `design/later.md` once the open money-gap change lands.

- **Generated screens aren't planned anywhere.** ST1.01 builds hooks only; ST1.04's three screens are written by
  hand. The second spike says whether a screens output belongs in stage 1 or later.
- **Named value kinds.** Plugged In's `generated/model/model.json` carries `HandleName` and `LinkUrl` only as
  `{ "type": "schema" }`, so no generator can tell a web address from a pattern and choose the right input. Named
  value kinds (a web address, a pattern, a choice, yes or no) would fix it for every output, not only screens. This
  is the language's to design, beside `THI-02` in the ledger.

## Risks

- **A week-old beta.** Interfaces may change between betas; each spike pins one and records what it relied on.
- **Two things the first spike leans on that UI SDK doesn't promise.** A refusal fails the agent's step only because
  the primitive's state uses the bridge's own `pending` and `error` keys, read from the bridge's code, not its
  documentation. And the caller's source (person or agent) reaches the send only through a `dispatch` and `settle`
  workaround, since an api method can't see its caller.
- **The grid and board are ours to build.** They are the portal's largest parts.
- **Experimental pieces.** `createHistory` and `stageChanges` are marked experimental; nothing depends on them until
  they aren't.

## Supersedes

- design/decisions/F7-portal-ui-seam.md: "HeroUI Pro behind one package" → "one package behind the portal's components; today HeroUI Pro, moving to UI SDK, HeroUI phased out (K24)"
- design/decisions/F7-portal-ui-seam.md: "the fallback rebuilds `portal-ui` on open libraries" → "the move to UI SDK, one export at a time, replaces the open-libraries fallback"
- design/decisions/K19-portal-prebuilt.md: "a Pro licence is needed to build the portal" → "once the portal is on UI SDK no licence is needed at all"
- design/later.md: "`@orthograph/portal-ui` on open libraries (F7)" → "`@orthograph/portal-ui` moves from HeroUI Pro to UI SDK (K24)"
- design/later.md: "Waits until the HeroUI Pro licence lapses or its terms stop a framework importing it" → "The move waits for the second UI SDK spike, not for the licence"
- design/packages.md: "`@heroui-pro/*` is imported only by `portal-ui` (lint, F7)" → "Today `portal-ui` is the only package that imports `@heroui-pro/*` (lint, F7); new screens build on UI SDK and HeroUI is phased out"
- design/portal.md: "HeroUI Pro behind one package (F7)" → "One package behind the portal's components (F7, K24)"
- design/portal.md: "`portal-ui` ... is the only importer of `@heroui-pro/react`" → "the only package the portal imports components from; today it wraps HeroUI Pro, and its insides move to UI SDK"
- design/portal.md: "The fallback, if the licence lapses or its terms change, rebuilds `portal-ui`'s exports on open libraries" → "The data grid and the board go last, because UI SDK has neither"
- .agents/skills/portal-design/SKILL.md: "mockups built from real HeroUI Pro components" → "real components (today HeroUI Pro behind `portal-ui`; new screens build on UI SDK, K24)"
- .agents/skills/portal-design/SKILL.md: "Use what HeroUI (`@heroui/react`) and HeroUI Pro (`@heroui-pro/react/<part>`) already have" → "Use what `portal-ui` and UI SDK already have; HeroUI is phased out (K24)"
- .agents/skills/portal-design/SKILL.md: "Every block sits in a Widget (`@heroui-pro/react/widget`)" → "Every block sits in a Widget (`portal-ui`'s, HeroUI Pro's today, UI SDK's after K24)"
- .agents/skills/portal-design/SKILL.md: "`Avatar`, `Switch`, `Label` from HeroUI." → "from HeroUI today (phased out, K24)"
- design/milestones.md (M1.34): "HeroUI Pro behind one package" → "One package behind the portal's components; today HeroUI Pro, K24 moves it to UI SDK"
