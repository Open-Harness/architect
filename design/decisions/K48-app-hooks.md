# K48: an app's screens are generated headless hooks over its actions, drawn by any component library

**Decided 26 November 2026 by Aaron**, in the session that audited Coworker (`design/briefs/coworker-audit/` on branch
`design/coworker-audit`). Recorded by that session's 📐 designer thread under AGENTS.md, "Who decides". Its id was
given by Goal 18's lead ("Next free after that is K48", relayed by the thread that started the audit); K47 is held for
the Coworker record. Nothing here is built.

## The problem, in plain words

K29 (21 November 2026) made UI SDK the base of every generated screen: a UI SDK piece per operation, with
`@orthograph/web` as its runtime, and "pieces, not hooks". K24 said to "go in all the way" on UI SDK. None of it is
built: the piece generator does not exist, `packages/web` does not exist, and `e2e/ui-layer` checks 04 to 08 are red.
What is built is the generated action per operation (`generated/actions/`, checks 01 to 03 and 09 to 13 green).

Coworker's screens are drawn with Astryx, and Aaron wants to keep that look. A UI SDK part can render an Astryx
component through `render`, but Astryx's own stateful components (its table, chat, text input) keep their own state
and fight a UI SDK part over it.

## What Aaron decided

Quoted from the session, in order:

1. "i dont want the whole ui library i only want headless componnets that work with any library like astryx"
2. "we need to do this on what we have. we have pieces on ui sdk. can that compose with astryx? can we get headless
   from ui sdk with the agent driving but wrap them with astryx"
3. To the recommendation "generate our own headless hooks over the actions, let Astryx draw everything, and let agents
   work through the actions as tools. Keep UI SDK for later, only if you want an agent driving the live screen": "lets
   do this" and "agreed".
4. To writing this record: "yes".

So:

- **An app's screens are built on generated headless hooks over its generated actions:** a hook per operation and a
  hook per thing (K46 call 9's reference). They are React, and use no component library.
- **Any component library draws them.** Astryx for Coworker.
- **Agents act through the actions as tools**, not by driving the page.
- **UI SDK waits.** An agent driving the live screen (UI SDK's bridge and its three marks) is deferred until an app
  needs it.

## What is sketched, and not decided

The spellings are the audit's (`design/briefs/coworker-audit/HANDOFF.md`, step 8). Nobody has agreed them.

- **`use<Operation>()`** returns `run(payload)`, `pending`, `refusal` (typed name and code), `error`, `answer` and
  `needsApproval`. It keeps one request key per open, kept across retries, and asks for approval once through a
  host-given approver.
- **`use<Thing>(id)`** returns `state`, the fields this caller may see, `can` (moves open now) and `needs` (what it
  waits for). It reloads after a write on a thing it shows, by polling for now.
- **The hooks are generated into `generated/web/`.** A small runtime in `packages/web` holds the host (client,
  caller, approver) and the shared pending and refusal state. It needs no `dispatch`/`settle` adapter.
- **An agent's tools are the actions**, through a thin adapter per agent runtime. For a Pi agent in an actor, it is
  made with the agent's own key. An action that needs approval raises an ask and returns; it never holds the turn
  (K46 call 2).

## What stays open

- **Whether the portal moves too.** Goal 6 (`portal-next`, `shell`, `theme`) is built on UI SDK. This record does not
  change it; that is for Aaron and Goal 18.
- **Other frameworks.** Hooks are React only. K29 chose UI SDK partly because one description renders in five
  frameworks. Vue, Svelte or Solid hooks would each be another generator.
- **How `--through web` journeys run without UI SDK's bridge** (a Playwright driver over the page, or through the
  actions), and the rewrite of `e2e/ui-layer` checks 04 to 08. That rewrite is a checks author's job.
- **Live reads.** Poll for now; the framework's way is undecided (`design/briefs/coworker-audit/end-to-end.md`,
  section 4).

## What it changes in older records

- **K29.**
  - Layer 3, "the piece": an app gets a generated hook per operation, not a UI SDK piece.
  - "`@orthograph/react` (ST1.01) is not built … a React-only hook layer would sit beside it doing the same job": the
    hook layer is now the layer.
  - Layer 5, UI SDK's widgets: the app's own library.
  - K29 keeps its words and gains notes.
- **K24.** No words replaced: "go in all the way" stands for Orthograph's own portal unless it is decided otherwise. For an app's
  screens, the component library is the app's.
- **K36.** No words replaced: a composite's wiring is still generated (its reads and actions). Its behaviour and look are the app
  library's component, not a `definePrimitive`.

## Who builds it

Coworker's rebuild builds it first, as the handoff's step 8. Goal 5 (the UI layer) is parked; its slice 4 becomes
this. This record adds no lane, row, slice or goal.

**Done in the same change** (Goal 18's paths), after Codex on #1220:

- **Status rows on `docs/canon/status.md`:** reword `ui-sdk-base`, `ui-pieces`, `web-runtime`, `agent-marks`,
  `approvals-once` and `plugged-in-screens`, and add a row for the hooks.
- **`design/goals/05-ui-layer.md`:** its slices 4 and 5.

## Supersedes

- AGENTS.md: "also `@ui-sdk/*`, `react` and `@orthograph/web` (K29); `compiler` and `generators`" → "also `react` and `@orthograph/web`, and the app's own generated SDK and actions (K48); `compiler` and `generators`"
- design/decisions/K29-ui-layer.md: "a React-only hook layer would sit beside it doing the same job" → "an app's screens are generated headless hooks over its actions, drawn by the app's own component library (K48)"
- design/decisions/K29-ui-layer.md: "one per operation: a UI SDK primitive bound to its action, and its parts per framework" → "for an app's screens, one generated headless hook per operation, drawn by the app's own library (K48)"
- design/decisions/K29-ui-layer.md: "inputs, buttons, dialogs, focus, keyboard, screen readers, the agent bridge" → "for an app's screens, the app's own component library; the portal is not changed by K48 (K48)"
- docs/canon/status.md: "The UI is a generated piece per operation (K29, K41 clash 2)" → "An app's screens are generated headless hooks over its actions, drawn by the app's own component library (K48"
- docs/canon/status.md: "A generated piece per operation on UI SDK" → "A generated headless hook per operation over its action, drawn by the app's library (K48)"
- design/goals/05-ui-layer.md: "the browser host and the piece runtime), the pieces' templates" → "the browser host and the hook runtime), the hooks' templates"
- design/goals/05-ui-layer.md: "built on the pieces, with the app's own link list" → "built on the generated hooks and drawn by the app's own components (K48), with the app's own link list"
