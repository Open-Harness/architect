# web

The `web` projection: `generated/web/`, mounted by `blueprint/projections/web.ts` (ST1.25; `design/decisions/K29-ui-layer.md` section 3).
For each operation it writes `<thing>/<verb>.ts` (a UI SDK primitive built from `@orthograph/web`'s `piece`) and `<thing>/<verb>.react.tsx`
(its React parts), and `react.tsx`, the provider and the hooks a page reaches the host by. Everything is read from the model:

- a **read** has no `move` and only `load` steps: a root that loads, with the payload's fields as options, and reloads when a write finishes on
  its thing, a thing that refers to it or one it refers to;
- a **move** or a **write** is a form: a `Field` and `Input` for each payload field that is not an id, and the ids as props the page gives;
- an operation that **needs approval** gets a `Confirm`, an alert dialog whose confirming button carries the operation's description as `data-agent-confirm`.

Pure: the model in, files out. Test: `web.test.ts`; the done check is `e2e/ui-layer/04` to `08`.
