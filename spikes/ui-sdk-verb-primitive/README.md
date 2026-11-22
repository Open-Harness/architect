# Spike: a verb is a primitive

**Question.** Can one blueprint verb be generated as a UI SDK primitive that renders in more than one framework and
that an agent in the page can find, fill and send, with the verb's declared refusal reaching that agent?

**Answer.** Yes, against a stand-in server and for a verb with one field. One generated file of 73 lines is the form in React and as custom elements, the agent bridge lists it
with exactly the actions the generator named, a call carries whether a person or an agent made it, and a refusal fails
the agent's step with its code. Three things had to be found out by trying, and one of them was a silent failure.

It feeds the direction Aaron set on 20 November 2026 (go all in on UI SDK and phase out HeroUI) and the screens output
that no milestone plans yet. It was chosen as the first of nine ideas because the other eight rest on it.

## What was tried

UI SDK is `vercel-labs/ui`, a week-old beta. A component is declared once with `definePrimitive` (options, state, an
api of named methods, slots) and rendered by an adapter. `createAgent()` gives an agent `snapshot`, `act` and `query`
over every such component on the page.

- `fixtures/model.json` is `handle.claim`, cut from Plugged In's real generated model
  (`origin/goal/stage-1` at `eaf7a10e`, `examples/plugged-in/generated/model/model.json`).
- `src/generate.ts` (145 lines, string templates) reads it and writes three files into `generated/`: the primitive, its
  React parts and its custom elements.
- `src/runtime.ts` (62 lines) is the one helper every generated verb would share, a stand-in for a future
  `@orthograph/ui`.
- `src/world.ts` stands in for the generated SDK and its server. It keeps claimed names in memory and refuses as the
  declared errors do. It is not the real thing: the question is about the page, so the server half is out of scope.
- `test/` drives the result through the bridge in jsdom, with no browser.

Pinned: `@ui-sdk/core`, `@ui-sdk/react` and `@ui-sdk/web` at `0.1.0-beta.7` (17 November, the newest release three days
old on the day), React 19.3.1, Vitest 4.1.12, jsdom 31.0.1.

```bash
npm install
npm run generate   # writes generated/
npm run typecheck
npm test           # writes evidence/run.txt and evidence/web.txt
```

## What was found

Each number is a test in `test/`; the output quoted is in `evidence/`.

1. **The agent sees the verb with the actions the generator listed, and nothing else.** The snapshot entry is
   `{ "component": "handle-claim", "label": "Claim your name", "actions": ["setName", "submit"], "name": "" }`. The
   actions come from the generated `agent: { actions: [...] }`, one setter per payload field plus `submit`.
2. **An agent fills and sends in one call, and the call says an agent made it.** `act` with `setName` then `submit`
   reached the stand-in as `{ "verb": "handle.claim", "payload": { "name": "firstpage" }, "via": "agent" }`.
3. **A person doing the same sends the same call with a different source.** Typing and clicking gave
   `"via": "mouse"`. So the server can be told a person from their agent with no code in the app.
4. **Break: a refusal looked like success, until the state used the bridge's own keys.** First run, with the refusal in
   a state key called `refusal`: `act` returned `"ok": true` and `"result": "pending"`, and the next snapshot showed
   nothing wrong. An agent would have believed the name was claimed. The bridge reads two state keys on any component:
   it waits while `pending` is true, then fails the step if `error` is set (`dist/page/agent/agent.js`, `settle`). With
   the refusal also written to `error`, `act` returns
   `"ok": false, "message": "submit on Claim your name (c1) failed: HandleTaken (HN-001)"` and the snapshot carries
   `"error": "HandleTaken (HN-001)"`.
5. **Break: two forms with one name are refused, not guessed.**
   `"Claim your name" names 2 components: c1 Claim your name, c6 Claim your name. Use a ref.`
6. **Break: an action the generator did not list is refused.**
   `handle-claim c1 takes no destroy now. It takes: setName, submit.`
7. **A person-only mark stops the agent sending.** Inside `data-agent-confirm="Claims the name firstpage for you"`,
   `submit` fails with `Needs a person: "Claims the name firstpage for you". Ask them to make this change themselves.`
   and nothing is sent.
8. **The same primitive works as custom elements.** Eleven generated lines register `<linkup-handle-claim>` and its
   parts. The bridge from `@ui-sdk/web/agent` lists the same component with the same actions, and the same two steps
   send the same call with `"via": "agent"`.
9. **Break: a send that rejects no longer leaves the verb stuck.** Found in review of this spike: a rejected promise
   left `pending` true for ever, so neither a person nor an agent could retry. A rejection now clears `pending` and
   sets `error`; the step fails with `The call failed before it was answered.`, the button is live again, and the
   retry claims the name.

Three things the docs did not say and the spike had to find:

- **The source of a change reaches callbacks only, never the api.** `details.source` is handed to `on<Key>Change` and
  to listeners of `dispatch`. A method on the api cannot ask who called it. So the send goes through
  `dispatch(context, "onSend", payload, { reason, event, settle })`, and the generated wrapper's listener makes the
  call with `details.source` and hands the promise back through `settle`. It works, and it is a workaround.
- **`onSubmit` is the wrong name for the option.** The web adapter turns a callback option into an event of that name,
  and `submit` is the form's own event. The option is `onSend`.
- **A custom element is named by its bound element.** With `target: wrappedChild("form")`, `aria-label` on the custom
  element is ignored and the bridge reports `Its labels: none`. The label goes on the `<form>`.

## Measurements

| What | Value |
|---|---|
| Generated primitive, framework-free | 73 lines |
| Generated React parts | 19 lines |
| Generated custom elements | 11 lines |
| Generator | 145 lines |
| Shared helper | 62 lines |
| Type errors in generated code on the first run | 1 (the helper's own typing, not UI SDK's) |
| Test run, 9 tests in jsdom | about 2.3 s wall, 0.3 to 0.6 s in tests, over three runs |
| UI SDK beta releases between 12 and 19 November | 12 (`beta.1` to `beta.13`; there is no `beta.11`) |
| The same generated code on `0.1.0-beta.13`, five releases later | type-checked and passed the 8 tests written at the time, in a throwaway copy that is not committed |

## The decision it supports

Generate the page from the blueprint onto UI SDK, as its own output, and never hand-write against UI SDK.

- A verb becomes one primitive: a setter per payload field, `submit`, and the state keys `pending`, `error`, `done`.
- The generated primitive names its agent actions, so what an agent may do on the page is decided by the blueprint.
- The call carries the page's source, so a role can later tell a person from their agent.
- The framework adapters are a few generated lines each, so more frameworks cost almost nothing.

## Open risks

- **The stand-in server.** Nothing here ran against a real Orthograph app. The next spike should send through
  Plugged In's generated SDK in a local world and replay a real journey.
- **The `pending` and `error` convention is read from the bridge's code.** Its types document `pending` and `error`
  as a button's. A custom primitive using them is relying on how it is built today.
- **The source workaround.** If UI SDK gave the api its caller, `dispatch` and `settle` would go. Worth asking for.
- **The model cannot describe the input.** `HandleName` reaches the model as `{ "type": "schema" }`, so the generator
  emitted no pattern and no length for the name. A plain input came out. Named value kinds would fix this for every
  output.
- **A beta moving fast.** Twelve releases in a week. The generated code survived five of them unchanged, which is one
  data point, not a promise.
- **The lockfile is younger than the pins.** Every version in `package.json` is exact and at least three days old.
  Four transitive ones that npm resolved are not: `undici` 8.13.0 (20 November), `tldts` and `tldts-core` 7.5.5 and
  `source-map-js` 1.2.4 (19 November). They come through jsdom and Vitest and are test tooling only.
- **Not tried:** Vue, Svelte and Solid; a verb with more than one field or a reference to another thing; a list read;
  server rendering; what a person sees while an agent is acting; the `allow` callback asking a person.
