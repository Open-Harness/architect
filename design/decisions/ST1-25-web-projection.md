# ST1-25-web-projection: what the web projection, `@orthograph/web` and `--through web` settled that K29 left open

Decided 23 November 2026 by Goal 5's builder for slice 4 (ST1.25, #313), under the ownership `AGENTS.md` gives the building agent. Each call below
was made against the checks (`e2e/ui-layer/04` to `08`) and the real code, and is read from the files named.

## The problem

K29 section 3 draws the generated pieces and section 2 the runtime in sketches. Building them against `@ui-sdk/core` and `@ui-sdk/react` 0.1.0-beta.10, the
generated actions of slice 3 and the checks' one seam (`e2e/ui-layer/page/boot.tsx`) left seven things the sketches don't say.

## The calls, with evidence

1. **The host takes the client's layer and finds its one service.** `WebHost.make({ client, ask })` (WEB-host-seam) is given `PluggedIn.layer({ url, credential })`, a
   layer of the client and nothing else, but a built layer's context also holds Effect's own `effect/Layer/CurrentMemoMap` (measured: the keys were
   `plugged-in/Client, effect/Layer/CurrentMemoMap`). The host takes the service whose key doesn't start with `effect/`, and fails a layer with more or fewer
   than one by saying so. The host needs no tag, so `boot.tsx` is exactly `WebHost.make({ client, ask })`. Source: `packages/web/src/modules/host/internal/client.ts`.
2. **The request key and the source travel on the call's own fetch.** A generated action calls the raw `client.handle.claim({ payload })`, which makes no key (the SDK's
   `call` wrapper that adds one is not what an action calls) and has nowhere to carry who pressed. The host builds each call's layer and provides
   `FetchHttpClient.Fetch` for that call alone, adding `idempotency-key: web:<key>` and `x-ortho-source: person | agent` (the header #222 proved the server may
   record; no role reads it, so it is a record and not a guard). The key is the form's, `ctx.toolCallId` of the action's context, which the host's `requestKey`
   turns into the header the way MCP's `tool:<id>` is made.
3. **A refusal's name comes from the action's `errors` map.** An `ActionRefusal` carries the code and the other fields of the refusal but not its tag, and a body's `message`
   may be empty. The host maps the code back through the action's own `errors` (`HN-001` is `HandleTaken`), and `AR-007` is `ApprovalDeclined`
   (WEB-approval-declined). The page shows `HandleTaken (HN-001)` and the world's sentence when it gave one; the bridge reads the same text from `error`.
4. **A piece's press is the yes, and a page's own call is asked.** A person's press on the confirming control, or UI SDK's bridge after `allow` said yes (the control
   carries `data-agent-confirm`), is what `needsApproval` asks for, so a piece runs its action with `approvedToolCallKey` set and nobody is asked again (check 06 reads
   `hostAsked` as 0). `host.action(options)`, which a page's own component uses (`useAction`), is the `defineAction` wrapper with `ask`.
5. **The request key is kept while the outcome is unknown.** One key per open of a form; a declared refusal or an answer is a known outcome and the next press makes a new
   key; a failure that is not a declared refusal (a 500, a cut connection) keeps it, so a second press claims once. Check 05 types a second name after `HandleTaken` and
   needs it to be sent, which a key kept after a refusal would risk (a key reused with another payload is `IdempotencyConflict`, `AR-002`).
6. **What a read reloads on is derived from the model's graph of things.** K29 says "every thing its answer refers to (`links` holds `link` fields)", but `profile.get`'s
   answer says `links: { value: { type: "schema" } }` with no `ref`, so the model can't say it. The projection derives the same set from what it does say: the read's own thing,
   every thing with a field that refers to it (`link.profile` is `profile.id`) and every thing it refers to (`profile.handle` is `handle.id`, the payload's `handle.name`).
   For `profile.get` that is `["profile", "link", "handle"]`, K29's list. When the language lets an answer carry its refs, the rule moves there.
7. **`--through web` serves its page from the browser, not from a process.** `ortho prove --through web` launches headless Chromium for the run, bundles for each operation a
   scene that mounts that operation's generated piece on the app's host (resolved from the project, so a changed or broken piece is what runs), and has the page's own
   requests answered by the world: `page.route` fulfils `/__prove/*` from memory on the world's origin and continues the operation's request with the journey's `traceparent` (in place of the
   client's own, and without its `b3`) and the step's request key. Nothing else is started, so nothing but the browser is left to stop. A starting world stays over HTTP (it is
   setup). A piece that never mounts, throws or sends nothing is a call that was never made, status 0, and the step fails with the same checks; a replay `--empty` or in another environment is refused.
   Source: `packages/prove/src/modules/web/`.

## What was settled by building

- Names come from the model: a piece's label is `<Verb> <thing>` (`Claim handle`), a field's label its key with a capital (`Name`; `Url`), the export `<Thing><Verb>`, the provider
  `<Project>Host`. Ids are the thing the piece is about (`handle="hdl_…"`), every other payload field a `Field` and `Input`; a secret field is `type="password"` with
  `data-agent-secret`, a field private to roles `data-agent-hidden`.
- The send is a button that presses (`press`, not a native submit), so the confirming control works wherever UI SDK puts a dialog's content. Enter in a field submits the form.
- The pins are `@ui-sdk/core` and `@ui-sdk/react` 0.1.0-beta.10 (18 November, past R1's three days; the checks already use it), React and React DOM 19.3.1 and Playwright 1.65.1
  (prove's new dependency), all already in the lockfile through `e2e`. No `minimumReleaseAgeExclude` is needed.
- The lint line: `ortho/no-ui-in-worker` is off for `**/generated/web/**` and still on for the rest of `generated/` and the portal's Worker half; `scope:web` may import
  Effect and `@ui-sdk/core`, and `orthograph`. Check 26's graph walk still holds the Worker line.

## Supersedes

- K29-ui-layer.md: "export default Blueprint.use(web, { frameworks: [\"react\"] });" → "export default Blueprint.use(web);"
- K29-ui-layer.md: "options: { onDone: \"callback\", onSubmittedChange: \"callback\" }," → "options: { ...piece.options },"
- K29-ui-layer.md: "api: (context) => piece.api(context, options, { requestKey: \"per-open\", fields: { name: \"text\" } })," → "api: (context) => piece.api(context, { fields: [\"name\"] }),"
- K29-ui-layer.md: "export const PluggedInHost = HostContext.Provider;" → "export const PluggedInHost = HostContext;"
- K29-ui-layer.md: "export const usePieceHost = () => ({ host: useContext(HostContext) ?? WebHost.missing });" → "export const usePieceHost = (options) => hostOf().wire(options);"
