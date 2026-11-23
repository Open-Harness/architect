# K29: Orthograph's UI layer, on UI SDK

**Decided 21 November 2026.** Proposed by the 📐 designer thread Aaron asked for that day, and answered 1A 2A 3A 4A
under Aaron's standing authority to the conductor (see "Aaron's answers"). It builds on K24 (UI SDK is the base;
actions first; derive, don't declare) and answers the question K24 left open: actions move into stage 1, and stage 1's
screens are built on generated pieces. The milestone rows and the superseded words changed in the same pull request.

Read with it: `design/ui/heroui-inventory.md` (every HeroUI use, and what UI SDK has for each), the vendored skill in
`.agents/skills/ui-sdk/`, and the two spikes, `spikes/ui-sdk-verb-primitive` (#215) and `spikes/ui-sdk-real-world`
(#222, on `main`).

## 1. What UI SDK really does

Read from its source at `@ui-sdk/core@0.1.0-beta.7` (`5152971c`), the pinned version, and checked against what the
spikes ran.

- **`definePrimitive`** (`packages/core/src/foundation/kernel/primitive.ts`) takes a `name`, an `options` schema
  (each option's kind: `string`, `number`, `boolean`, `list`, `value`, `callback`, `action`, `id`, `key`), `state`
  (built from the options), `sync` (which options control state; without it a controlled option is silently ignored),
  `api` (the methods), `slots` (one per part, each with `attrs`, `role`, `press`, `on`, `bind`, `present`, `state`)
  and `agent`. It renders nothing: each framework's `createParts(primitive, tags)` turns it into parts. One
  description, five frameworks.
- **`controlled`** (`primitive.ts:97-103`) lists the state keys a user controls with `<key>`, `default<Key>` and
  `on<Key>Change`. It also decides what an agent sees: the bridge's snapshot shows exactly those keys
  (`page/observe/registry.ts:183-184`, `stateKeys`), defaulting to whichever of `open`, `value` and `checked` the state
  has. So "declare its agent-readable state `controlled`" (K24, layer 4) is the real mechanism.
- **Changes** go through `createChange(context)`: `change(key, value, { reason, event })` calls `on<Key>Change(value,
  details)`, where `details` has `reason`, `event`, `source` and `cancel()`. `source` is one of `mouse`, `touch`,
  `pen`, `keyboard`, `virtual`, `programmatic` or `agent` (`kernel/details.ts:9-10`). Only callbacks see `source`; an
  api method never does, which is why the spikes needed a `dispatch` and `settle` adapter (#222, section 9).
- **The agent bridge** (`page/agent/agent.ts`, 2,140 lines). `createAgent({ allow })` gives `snapshot()`, `act({ steps
  })` and `query()`. It lists only UI SDK components, named by their accessible label; `agent.actions` names the api
  methods an agent may call, and without it only verb-like names (`set…`, `open`, `toggle`, `submit`, …) are offered
  (`agent.ts:104-116`). A step waits while the component's state has `pending: true`, and fails with the state's
  `error` (`agent.ts:1189-1195`, `:1614-1682`): that is how a refused call fails the agent's step.
- **The three marks.** `data-agent-confirm="<sentence>"` makes a step need `allow` to say yes; `data-agent-secret`
  lets an agent fill a value but never read it (`[redacted]`); `data-agent-hidden` takes a region out of the snapshot.
  A mark covers the **whole component** it sits in, from any of its parts (`registry.ts:197`, `entry.secret ||=`), so
  a secret answer inside a form also redacts the form's refusals (#222, proof 5b).
- **51 components** in beta.7, the same 51 in beta.13 and on `main` (`855bc7fd`). Beside the ones K24 listed, two
  matter here: `Timeline`, and `Waterfall` (a trace's spans on a time axis, marked experimental). The behaviours we
  build on are public in `@ui-sdk/core`: `createReorder`, `createTransfer` (experimental), `createGridFocus`,
  `createCellRange`, `createSelection`, `createStickToBottom` (experimental), `createInputHistory`.
- **What changed from beta.7 to beta.13** (the newest published, 19 November): no new component and no change to
  `definePrimitive`. The agent bridge got stricter: removing a confirmed item now asks a person (beta.8), an agent can't
  act inside an inert region such as the page behind a modal (beta.13), Command's `run` names one command (beta.8,
  beta.11), and errors say how two same-named controls differ (beta.11). Forms: a reset returns a controlled Input to
  its default (beta.10); Select's hidden field became a `<textarea>` (beta.8). The skill changed in two lines. Nothing
  we rely on broke. beta.10 (18 November) passes R1's three days today; beta.13 passes on 22 November.

## 2. The layers

K24 named five layers. This is what each one is, in files, from the bottom of the page up:

| Layer | What it is | Who writes it | Where it lives |
|---|---|---|---|
| 1. The blueprint | what things mean | the app's author | `blueprint/` |
| 2. The action | one per operation: who calls, the payload check, a declared refusal that writes nothing, approval asked once | generated (M1.22) on `orthograph/actions` (M1.23) | `generated/actions/<thing>/<verb>.ts` |
| 3. The piece | one per operation: a UI SDK primitive bound to its action, and its parts per framework | generated (the web projection, new) on `@orthograph/web` | `generated/web/<thing>/<verb>.ts` and `.react.tsx` |
| 4. Pages and the app's own components | the look: layout, words, the app's own components. The map (pages, routes, navigation, the shell) is declared in the blueprint (K31) | the app's author | `src/web/`, and `blueprint/app/` for the map |
| 5. UI SDK's widgets | inputs, buttons, dialogs, focus, keyboard, screen readers, the agent bridge | UI SDK | `@ui-sdk/*` |

Two packages of ours hold what is written once, by hand:

- **`orthograph/actions`** (M1.23): `defineAction`, `ActionRefusal`, the registry. Effect only, no browser.
- **`@orthograph/web`** (new): the browser host and the piece runtime. The host gives an action its client (the
  generated SDK's layer), the caller (`person` or `agent`, from UI SDK's `details.source`), one request key per form
  open kept across retries (the rule of ST1.01, which ST1.25 replaces, moved here), and a person to ask. The runtime is what every generated piece
  shares: its state shape (`pending`, `error`, `refusal`, `done`, `value`), reading a form into a payload, mapping a
  refusal into the state the bridge reads, and the `dispatch` and `settle` adapter. It is the only place the two
  spike workarounds live. Framework-free; it imports `@ui-sdk/core`, `orthograph` and Effect.

`@orthograph/react` (ST1.01) is not built. A UI SDK primitive already is what a hook would be (state, pending,
refusal, an api), and it renders in every framework; a React-only hook layer would sit beside it doing the same job.

## 3. What the generators emit, against Plugged In

Plugged In mounts two more projections, scaffolded once like the others:

```ts
// blueprint/projections/actions.ts
// Scaffolded from @orthograph/projections 0.0.0. Yours from now on.
import { Blueprint } from "orthograph";
import { actions } from "@orthograph/projections";

export default Blueprint.use(actions);
```

```ts
// blueprint/projections/web.ts
// Scaffolded from @orthograph/projections 0.0.0. Yours from now on.
import { Blueprint } from "orthograph";
import { web } from "@orthograph/projections";

export default Blueprint.use(web, { frameworks: ["react"] });
```

The web projection reads each operation in the model and sorts it by what the model already says, with nothing new
declared:

| Kind | Told by | Plugged In's |
|---|---|---|
| **Read** | no `move`, and only `load` steps | `handle.resolve`, `profile.get` |
| **Move** | a `move` | `handle.claim`, `handle.release`, `link.add`, `link.remove` |
| **Write** | `record` steps and no `move` | `link.order` |

For every operation it writes three files. Here they are for each kind.

### 3.1 The action (every operation)

```ts
// generated/actions/handle/claim.ts
// Generated from blueprint/things/handle/verbs/claim.ts. Do not edit.
import type { ActionHost, ActionOptions } from "orthograph/actions";
import { Payloads, type HandleClaimAnswer, type HandleClaimPayload } from "../../sdk/src/handle/types.ts";

/** Claim a free name and make it the address of your public page, with its profile. */
export const options = (host: ActionHost): ActionOptions<HandleClaimPayload, HandleClaimAnswer> => ({
  name: "handle.claim",
  description: "Claim a free name and make it the address of your public page, with its profile.",
  schema: Payloads.handleClaim,
  readOnly: false,
  needsApproval: false,
  agentTool: true,
  errors: { HandleTaken: "HN-001", HandleAlreadyOwned: "HN-002", NotAllowed: "AR-001", IdempotencyConflict: "AR-002" },
  run: (args, ctx) => host.call((client) => client.handle.claim({ payload: args }), ctx),
});
```

This is M1.22's shape as written: agent-native's field names, never a `defineAction` call; the host wraps it.

### 3.2 A move: `handle.claim`

The primitive, framework-free. Every piece is this short because `@orthograph/web` holds the rest:

```ts
// generated/web/handle/claim.ts
// Generated from blueprint/things/handle/verbs/claim.ts. Do not edit.
import { definePrimitive } from "@ui-sdk/core";
import { piece, type PieceOptions } from "@orthograph/web";
import { options } from "../../actions/handle/claim.ts";
import type { HandleClaimAnswer } from "../../sdk/src/handle/types.ts";

/** Claim a free name and make it the address of your public page, with its profile. */
export const handleClaim = definePrimitive({
  name: "handle-claim",
  options: { onDone: "callback", onSubmittedChange: "callback" },
  state: (_: PieceOptions<HandleClaimAnswer>) => piece.state<HandleClaimAnswer>(),
  api: (context) => piece.api(context, options, { requestKey: "per-open", fields: { name: "text" } }),
  slots: (slot) => piece.slots(slot),
  agent: { actions: ["submit"] },
});
```

Its React parts, a root and one part per payload field, the way UI SDK's own components are shaped, plus the whole
form for a page that needs no layout of its own:

```tsx
// generated/web/handle/claim.react.tsx
// Generated from blueprint/things/handle/verbs/claim.ts. Do not edit.
"use client";
import { Field, FieldDescription, FieldError, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { createParts } from "@ui-sdk/react/primitive";
import { usePieceHost } from "../react.tsx";
import { handleClaim } from "./claim.ts";

const parts = createParts(handleClaim, { root: "form", refusal: "p", answer: "output", submit: "button" });

const Name = ({ label = "Name" }: { readonly label?: string }) => (
  <Field name="name">
    <FieldLabel>{label}</FieldLabel>
    <Input required />
    <FieldDescription>A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page.</FieldDescription>
    <FieldError />
  </Field>
);

/** Claim a free name and make it the address of your public page, with its profile. */
export const HandleClaim = {
  Root: (props: Parameters<typeof parts.Root>[0]) => <parts.Root aria-label="Claim a name" {...usePieceHost()} {...props} />,
  Name,
  Refusal: parts.Refusal,
  Answer: parts.Answer,
  Submit: parts.Submit,
  Form: ({ onDone }: { readonly onDone?: (answer: { readonly handle: string }) => void }) => (
    <HandleClaim.Root onDone={onDone}>
      <Name />
      <parts.Refusal />
      <parts.Submit>Claim</parts.Submit>
    </HandleClaim.Root>
  ),
};
```

What each line comes from:

- the label "Name" from the field's key, the help text from the value's `described` (`values/page.ts:3-6`);
- `required` because the field isn't optional;
- the refusal part shows the refusal's sentence and code: "Someone else holds this name (HN-001)", from the rule's
  description or the sentence `orthograph/sentences` already writes for the portal (`rules.ts`);
- `requestKey: "per-open"` because the operation is `idempotent: "request"`; a second press after a lost answer
  sends the same key, and claims once;
- `agent: { actions: ["submit"] }`: the agent fills `Name` through UI SDK's own Input and presses submit. It can't
  call anything the blueprint didn't grant (#222, proof 6).

The payload is read from the form (every UI SDK control with a `name` submits with it), then decoded by the SDK's own
payload schema. A bad name is refused inside the page, as `InvalidPayload`, before any request. The pattern
(`^[a-z][a-z0-9]{0,31}$`) can't become a `pattern` attribute yet: the model carries `HandleName` only as
`{ "type": "schema" }` (snag S-28, K24's "named value kinds"). When values carry their kind, the same template adds
`pattern`, `maxLength` and `type="url"`.

### 3.3 A move on a thing you hold, with a yes: `handle.release`

`handle.release`'s payload is `{ handle: handle.id }`, the id of the thing the operation is about. So the field is
not an input: it's the piece's `subject`, given by the page. Its description says what it costs ("Free your name and
take its public page offline"), and once the operation declares `needsApproval` (M1.23, K5's word), the piece asks:

```tsx
// generated/web/handle/release.react.tsx (the part that differs)
export const HandleRelease = {
  Root: (props: { readonly handle: string; readonly onDone?: () => void; readonly children: ReactNode }) => (
    <parts.Root aria-label="Release a name" subject={{ handle: props.handle }} {...usePieceHost()} {...props} />
  ),
  Confirm: ({ handle, onDone }: { readonly handle: string; readonly onDone?: () => void }) => (
    <HandleRelease.Root handle={handle} onDone={onDone}>
      <AlertDialog>
        <AlertDialogTrigger>Release your name</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Release your name?</AlertDialogTitle>
          <AlertDialogDescription>Free your name and take its public page offline. Anyone may claim the name afterwards.</AlertDialogDescription>
          <AlertDialogClose>Keep it</AlertDialogClose>
          <parts.Submit render={<AlertDialogClose value="confirm" />} data-agent-confirm="Free your name and take its public page offline. Anyone may claim the name afterwards.">Release forever</parts.Submit>
        </AlertDialogContent>
      </AlertDialog>
      <parts.Refusal />
    </HandleRelease.Root>
  ),
};
```

A person sees a dialog; an agent's press waits for `allow` to ask a person, as UI SDK's guide says (on the confirming
button, never the trigger). With `needsApproval: false`, the same template writes a plain `Submit` and no dialog.

### 3.4 A read: `profile.get`

A read has no form. Its primitive loads when it appears and whenever its payload changes; its answer is its `value`,
so an agent reads the page through the snapshot:

```ts
// generated/web/profile/get.ts
// Generated from blueprint/things/profile/verbs/get.ts. Do not edit.
export const profileGet = definePrimitive({
  name: "profile-get",
  options: { handle: "string", onValueChange: "callback" },
  state: (o: { readonly handle?: string }) => piece.readState<ProfileGetAnswer>(o),
  sync: (o) => (o.handle === undefined ? {} : { payload: { handle: o.handle } }),
  controlled: ["value"],
  api: (context) => piece.readApi(context, options, { reloadsOn: ["profile", "link", "handle"] }),
  slots: (slot) => piece.readSlots(slot),
  agent: { actions: ["reload"] },
});
```

```tsx
// generated/web/profile/get.react.tsx (in use)
<ProfileGet.Root handle="aaron">
  {(page) => page.value === null ? <ProfileGet.Refusal /> : <PageView page={page.value} />}
</ProfileGet.Root>
```

`reloadsOn` is derived: the read's own thing and every thing its answer refers to (`links` holds `link` fields). When
any action on one of them finishes on this page, the read loads again, so `/edit` shows a new link without the page
asking.

### 3.5 A write that isn't a move: `link.order`

`link.order` takes `{ link: link.id, position: LinkPosition }`. The generator writes a piece with `link` as its
subject and a `NumberInput` for the position. A page rarely wants that form: `/edit` wants to drag links, which is a
component of the app's own (section 5), and it calls the generated **action**, not the piece.

### 3.6 The one file per framework

```tsx
// generated/web/react.tsx
// Generated from blueprint/projections/web.ts. Do not edit.
"use client";
import { createContext, useContext } from "react";
import type { WebHost } from "@orthograph/web";

const HostContext = createContext<WebHost | null>(null);
export const PluggedInHost = HostContext.Provider;
export const usePieceHost = () => ({ host: useContext(HostContext) ?? WebHost.missing });
```

Sizes, from #222's measurements: a primitive was 65 lines, a React form 30 and an action 15. With the shared runtime
in `@orthograph/web`, a primitive is about 15 lines and a React file 30 to 50. Plugged In gets 7 actions, 7
primitives and 7 React files.

## 4. What the app's author writes

```text
examples/plugged-in/src/web/
  main.tsx            the browser's entry: the host, the agent bridge, the router (the shell's, once K31 lands)
  pages/profile.tsx   /@:name   about 30 lines
  pages/claim.tsx     /claim    about 20 lines
  pages/edit.tsx      /edit     about 60 lines
  link-list/          the app's own component (section 5)
  theme.css           the app's tokens over the shared theme
```

A scaffolded file falls out of line when its declaration changes later; how it is marked stale and ratcheted is
[`../later.md`](../later.md), "Scaffolds that follow the blueprint", decided before the first generated page lands.

The entry, the one file that runs effects, as `AGENTS.md` asks:

```tsx
// src/web/main.tsx
// Scaffolded from @orthograph/projections 0.0.0. Yours from now on.
import { createAgent, registerTools } from "@ui-sdk/react/agent";
import { createRoot } from "react-dom/client";
import { WebHost } from "@orthograph/web";
import { PluggedIn } from "../../generated/sdk/src/index.ts";
import { PluggedInHost } from "../../generated/web/react.tsx";
import { App } from "./app.tsx";

const host = WebHost.make({ client: PluggedIn.layer({ baseUrl: location.origin }), session: WebHost.session.cookie });
const agent = createAgent({ allow: (step, { signal }) => (step.confirm ? host.ask(step.confirm, { signal }) : true) });
registerTools(agent, { allow: () => true });

createRoot(document.getElementById("app")!).render(<PluggedInHost value={host}><App /></PluggedInHost>);
```

A page composes pieces with UI SDK and markup:

```tsx
// src/web/pages/claim.tsx
import { HandleClaim } from "../../../generated/web/handle/claim.react.tsx";

export const Claim = ({ go }: { readonly go: (path: string) => void }) => (
  <main className="narrow">
    <h1>Claim your name</h1>
    <HandleClaim.Root onDone={() => go("/edit")}>
      <HandleClaim.Name label="Your name" />
      <HandleClaim.Refusal />
      <HandleClaim.Submit>Claim it</HandleClaim.Submit>
    </HandleClaim.Root>
  </main>
);
```

The rule from K24 holds: no page talks to the server except through a generated piece or action, and no page builds a
form field by hand for a payload the blueprint declares.

## 5. A component of the app's own

`/edit`'s list of links, dragged or moved with the keyboard, is nothing the blueprint can generate (_superseded by K36, 21 November 2026: it is declared as a component, its wiring generated, its behaviour still hand-written_): it is
`profile.get`'s answer laid out, with `link.order` and `link.remove` as its moves. It joins as a UI SDK primitive of
the app's own, with its order as `controlled` state, so an agent reads it, and its saves through the generated actions:

```ts
// src/web/link-list/link-list.ts
import { createChange, createReorder, definePrimitive, type ChangeDetails, type ReorderDraft } from "@ui-sdk/core";

export const linkList = definePrimitive({
  name: "link-list",
  options: { value: "list", onValueChange: "callback" },
  state: (o: { readonly value?: ReadonlyArray<string>; readonly onValueChange?: (ids: ReadonlyArray<string>, details: ChangeDetails) => void }) =>
    ({ value: o.value ?? [], draft: null as ReorderDraft | null }),
  sync: (o) => (o.value === undefined ? {} : { value: o.value }),
  controlled: ["value"],
  api: (context) => {
    const change = createChange(context);
    const reorder = createReorder(context, {
      slot: "item", key: "value", draft: "draft",
      set: (value, details) => change("value", value, details),
    });
    return { moveTo: (link: string, position: number) => reorder.move(link, position), reorder };
  },
  slots: (slot) => ({ /* the list and its items; each item binds with reorder.bind(el, part) and keys with reorder.keydown */ }),
  agent: { actions: ["moveTo"] },
});
```

```tsx
// src/web/pages/edit.tsx (the list)
const order = useAction(linkOrder);   // the generated action, through the host
<LinkList.Root
  aria-label="Your links"
  value={ids}
  onValueChange={(next, details) => order.run(moved(ids, next), { caller: details.source })}
/>
```

What makes it fit: its state is UI SDK state, so the agent bridge lists it with its order and its one action; the
change carries `details.source`, so the action knows whether a person or an agent moved the link; and nothing it saves
bypasses the action, so the role check and the refusal are the same as from the CLI or MCP. The spike's editor
(#222, section 8) is the larger example, and its lesson stands: a document an agent must read needs its own primitive
with a `value`.

## 6. Rules that change

- **Generated code may import UI SDK, in `generated/web/` only.** `AGENTS.md`'s package rule gains: "`generated/web/`
  also imports `@ui-sdk/*`, `react` and `@orthograph/web`." K24 said this lands with the first generated screen.
- **The lint line moves.** `ortho/no-ui-in-worker` (`packages/lint/src/modules/rules/internal/ui.ts:5`) is on for
  every `generated/` folder today, which would refuse every piece. ST1.25 carves `generated/web/` out of it,
  so it stays on for the rest of `generated/`, and check 26's graph walk (nothing a Worker reaches imports React) is what really holds the line.
- **The app's pages are built by `ortho build`,** into static assets the Worker serves (ST1.04 says "served by the
  Worker"). No licence is needed anywhere in an app, so K19's reason for the portal shipping prebuilt goes. The portal
  still ships prebuilt: it keeps `ortho build` fast and a project's Worker free of React, and it's reversible.
- **`frame/projections.md` 3.4** ("React gives a web app hooks over the SDK … it renders hooks, not screens") is
  rewritten to the web projection: pieces per operation, not screens; pages stay the app's own code.

## 7. The portal: off HeroUI, by a new client (K31, Goal 6)

The inventory found that the portal uses three components (`Card`, `Widget`, `Timeline`), HeroUI's two stylesheets and
nine of its tokens. Everything else is plain HTML that our checks read by `data-portal` hooks. The same day, the app
map grill (K31, [`K31-app-map.md`](K31-app-map.md)) found that half of the portal's frame is matched by hand, so moving
the old client in place would carry that over. So the portal leaves HeroUI by being rebuilt, not ported:

1. **A new client beside the old one.** Goal 6 ([`../goals/06-portal.md`](../goals/06-portal.md)) builds
   `packages/portal-next` on UI SDK, the Orthograph theme and `@orthograph/shell`, its map declared in the blueprint
   (K31). It reads the same data API at `/_portal/v1/*` and is served by the same server half
   (`@orthograph/portal/server`, K19). The old client is not edited for this; Goal 3 keeps working on it.
2. **The same checks, on both clients.** Checks 21 and 28 and the grid's portal evals run against both, and a list of
   the checks the new client does not yet pass only shrinks (Goal 6's protocol). The frame's search, environment
   picker, tree, operation tabs and calls filter are UI SDK's `Command`, `Select`, `Tree` and `Tabs`, each keeping its
   hook, so an agent can use the portal too.
3. **Cutover retires the old client** (ST1.27), once that list is empty: one change serves the new client at `/portal`
   and deletes the old client, `@orthograph/portal-ui`, the HeroUI peers, `pro.mjs`, `sheets.mjs`, the gated
   typecheck, the `HEROUI_AUTH_TOKEN` step and cache in CI, and `ortho/no-pro-outside-portal-ui`. F7's names (`Grid`,
   `Chart`, `Chat`, `Board`, `Graph` and the rest) come back on UI SDK in `@orthograph/shell`, the one package the new
   client, faces and later slices import them from, each with the first page that needs it: the grid and charts with
   the monitor (M1.49), the graph with M1.50, the chat with M1.24, the board with M3.17.
4. **Check 15 gates cutover** (ST1.28). It is a check, so a checks author rewrites it (to: "only `@orthograph/web`,
   `@orthograph/shell`, `packages/portal-next`, `generated/web/` and an app's `src/web/` import `@ui-sdk/*`, nothing a
   Worker reaches imports them (check 26); nothing imports HeroUI"), and the builder never touches it. Checks 26 and
   27 stay.

## 8. Plugged In at the end of stage 1

- `/@aaron`: the page's name and its links in order, read by `profile.get` with no sign-in. Plain markup over the read
  piece.
- `/claim`: one field and a button, the generated `handle.claim` piece. A taken name says "Someone else holds this
  name (HN-001)" under the field. On success it goes to `/edit`.
- `/edit`: signed in. The `link.add` piece (title and address), the app's own link list (drag, or arrow keys, to
  reorder; remove on each), and "Release your name", which asks first.
- `/login`: the auth plugin's sign-in piece (M2), its password secret to an agent by UI SDK's own rule.
- An agent in the same browser (through WebMCP, or the app's own model through `agentTools`) sees every control by
  name, claims and adds links in one `act`, can't release the name without a person's yes, and every request it makes
  is marked as the agent's at the server (#222, proof 2).
- `ortho prove --through web` replays the journeys through these pieces in Chromium, as #222's proof 4 did by hand,
  and gets the same verdicts as over HTTP.

## 9. Actions before the screens (answered: actions now)

K13 (Aaron, 19 November) moved actions (M1.22, M1.23) to M3 to lock down what exists first. K24 then made actions the
spine of the UI, and stage 1's screens are the beta (K28). Q1 of the grill asked which way the screens are built; the
answer is A: actions come into stage 1, and the screens are built on the generated pieces, not on hand-written hooks.
K13's reason still holds for the rest of what it moved: MCP from the whole model (M1.37), the host's caller for
actions outside our portal (ST1.05) and the shell's chat (M1.24) stay in M3.

## 10. The slices

All in `design/milestones.md`; the ids were allocated by the conductor on 21 November 2026. The goal that builds them
is [`../goals/05-ui-layer.md`](../goals/05-ui-layer.md).

- **M1.23** (S), then **M1.22** (M): moved from M3 into stage 1, ids and text unchanged.
- **ST1.25** (M), the web projection, in place of ST1.01 (the react projection, never built): `@orthograph/web` (the
  browser host and the piece runtime; the pieces use UI SDK's default tokens until the Orthograph theme, Q3, lands in
  `@orthograph/theme` from Goal 6) and the generator, per
  section 3, React parts only (Q4), with `--through web` in Chromium, and `ortho/no-ui-in-worker` carved out for
  `generated/web/` (section 6). It needs M1.22 and ST1.26.
- **ST1.26** (S, checks), the web projection's checks, written first by an author on Plugged In: a name is claimed
  once, a taken name shows its refusal under the field, a release waits for a person's yes, a read reloads after a
  move, and the pending state is observed.
- **ST1.04**'s three screens are built on the generated pieces, with the app's own link list (section 5).
- **ST1.06** is "pieces behind a signed-in session", after the auth plugin (M2.06).
- **ST2.03** is "pieces for client operations", with the submission lifecycle as piece state.
- **ST1.28** (S, checks): check 15 rewritten by an author, per section 7 item 4; a planted HeroUI import fails lint;
  the portal builds with `HEROUI_AUTH_TOKEN` unset. It fails until ST1.27 lands, and it gates it.
- **ST1.27** (S, build): retire the old client at cutover, per section 7 item 3: Goal 6's last slice, once its parity
  list is empty. It needs ST1.28. The new client's own slices are Goal 6's, in its brief.
- **Named value kinds** stays the language's (S-28, K24's gap): it upgrades every piece's field when it lands.

## Risks

- **A daily beta.** The pin moves only by R1. The two things the runtime leans on that UI SDK doesn't document (the
  bridge reads `pending` and `error`; only callbacks see `source`) live in one file, `@orthograph/web`'s runtime, with
  a test each, so a beta that changes them fails one test, not seven pieces.
- **A mark redacts the whole component.** An issued answer (a session token) must render outside the piece's parts,
  or the agent loses the piece's refusals (#222, 5b). The template does this for issued fields.
- **Effect in the browser** is 573 KiB minified of the spike's 892 KiB page. Stage 1 keeps the generated SDK, so the
  page and the server check a payload the same way; a lighter client is `later.md`.
- **No server rendering in stage 1.** `/@name` renders in the browser, so a shared link's preview shows the page's
  title only. UI SDK renders on a server; the Worker doing it is later work, since K19 keeps React out of the Worker.

## Aaron's answers

Given by the conductor on 21 November 2026, under the standing authority Aaron gave it that day: "anything that's
waiting on me, just go with the recommendations. You have authority." So each question takes its recommendation:

1. **1A, actions now, with screens from generated pieces.** M1.23 and M1.22 move into stage 1; ST1.25 is the web
   projection, with its checks (ST1.26) first; ST1.04's screens are built on its pieces.
2. **2A, HeroUI out of the portal now, beside Goal 3's work,** with ST1.28 (check 15 rewritten) gating ST1.27. Aaron's
   app map grill the same day (K31) made the change a new client and a cutover rather than a move in place (section 7).
3. **3A, one Orthograph theme on UI SDK's `--ui-*` tokens,** shared by the portal and every app. It lives in its own
   package, `@orthograph/theme`, built first by Goal 6 (K31), since the shell, the pieces and the new portal all use it.
4. **4A, React only in the beta.** The primitive is framework-free, so another framework is one template, added when
   someone asks.

## Supersedes

- design/milestones.md: "One `Graph` in `@orthograph/portal-ui` (`spikes/react-flow-graphs`, accepted" → "One `Graph` in `@orthograph/shell`, on UI SDK (`spikes/react-flow-graphs`, accepted"
- design/milestones.md: "HeroUI Pro's Kanban parts through `@orthograph/portal-ui`'s `Board` (F7, M1.34)" → "a `Board` in `@orthograph/shell`, on UI SDK (HeroUI leaves in ST1.27)"
- design/milestones.md: "loads `portal-ui` from the portal's built assets" → "loads `@orthograph/shell` from the portal's built assets"
- design/milestones.md: "the shell and the chat parts come from `@orthograph/portal-ui` (M1.34)" → "the shell and the chat parts come from `@orthograph/shell` (K31)"
- design/milestones.md: "(`portal-ui`'s chat parts, built on UI SDK by K29" → "(`@orthograph/shell`'s chat parts, on UI SDK by K29"
- design/milestones.md: "rendered with `@orthograph/portal-ui`'s `Chat` parts, built on UI SDK (K29)" → "rendered with `@orthograph/shell`'s `Chat` parts, on UI SDK (K29, K31)"
- design/milestones.md: "composed from `@orthograph/portal-ui`'s exports (F7, M1.34)" → "composed from `@orthograph/shell`'s exports (K31)"
- design/frame/projections.md: "React gives a web app hooks over the SDK" → "The web projection gives a web app one generated piece per operation, on UI SDK"
- design/frame/projections.md: "it renders hooks, not screens" → "it renders pieces, not screens"
- design/frame/projections.md: "React's hook must reach the error state with the typed class" → "The web piece must reach its refusal state with the declared code"
- design/milestones.md: "(actions join in M3, with M1.22)" → "(actions join with M1.22, in stage 1, K29)"
- design/milestones.md: "(actions come with M1.22, in M3)" → "(actions come with M1.22, in stage 1, K29)"
- design/walkthrough/journey.md: "There is no React projection on `m1`" → "There is no web projection on `m1`"
- design/packages.md: "the only importer of HeroUI Pro" → "the portal's components under our names"
- design/portal.md: "Built on HeroUI Pro's app shell" → "Built through `@orthograph/portal-ui`"
- design/frame/generators.md: "@orthograph/react/agents/skills/build-a-screen/" → "@orthograph/web/agents/skills/build-a-screen/"
- design/walkthrough/journey.md: "a proof tab, built on HeroUI Pro" → "a proof tab, built through `@orthograph/portal-ui`"
- design/walkthrough/journey.md: "the React hooks and three screens" → "the web pieces and three screens"
- design/later.md: "Waits for the second UI SDK spike to say" → "scheduled in stage 1 as ST1.25 and ST1.26"
- design/later.md: "Waits until the HeroUI Pro licence lapses" → "scheduled in stage 1 as ST1.27 and ST1.28, on UI SDK"
- design/decisions/K9-growing-example.md: "The react projection over the SDK" → "ST1.25, the web projection, one UI SDK piece per operation"
- design/later.md: "The move waits for the second UI SDK spike, not for the licence" → "scheduled as Goal 6's new client and ST1.27's cutover (K29, K31)"
- design/portal.md: "Its insides move to UI SDK one export at a time (K24)" → "a new client is built beside the old one on UI SDK, and the old client is deleted at cutover (K31)"
- design/packages.md: "today the only importer of HeroUI Pro (phased out, K24)" → "the portal's components under our names; deleted at cutover"
- design/milestones.md: "and K24 moves it to UI SDK, HeroUI phased out" → "HeroUI leaves in ST1.27, K29"
- design/scope.md: "no generator, no slice" → "no generator yet"
