# portal

`PortalRender.files`: `generated/portal/blueprint.json` (the portal's wire, from the model and the generated docs; deterministic) and
`generated/portal/main.ts` (the host entry the generated Worker calls for `/portal` and `/_portal/*`; it imports `@orthograph/portal/server` and nothing else of the portal, K19). The wire's shape, decoder and
dependency adapter are `@orthograph/portal`'s `Wire`. Tests: the committed acme output, and that the portal's JSON-only dependency
adapter equals `Compare.dependsOn` on current and historical models. The portal's server half is imported by `generated/portal/main.ts` only;
blueprints, handlers and journeys never import it (also tested).
