# @orthograph/web

The browser host and the piece runtime (ST1.25, `design/decisions/K29-ui-layer.md` section 2). It is what every generated piece in
`generated/web/` shares, written once, by hand. Framework-free: it imports `@ui-sdk/core`, `orthograph/actions` and Effect, and the one
framework file (React) is generated.

| Module | What it owns |
|---|---|
| `host` | `WebHost.make({ client, ask })`: the generated SDK's layer, the caller, one request key for each open of a form, the person to ask, and what a finished write tells a read |
| `piece` | the state, options, api and parts every piece is made from, and the two things UI SDK does not document (the bridge reads `pending` and `error`; only a callback sees who pressed) |

A page makes one host and wraps the app in the generated provider (`design/decisions/WEB-host-seam.md`):

```tsx
const host = WebHost.make({ client: PluggedIn.layer({ url: location.origin }), ask });
<PluggedInHost value={host}><App /></PluggedInHost>
```

Entry: `src/index.ts`. Decisions: `design/decisions/ST1-25-web-projection.md`. The done check is `e2e/ui-layer/04` to `08`.
