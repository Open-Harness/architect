# actions

The `actions` projection: `generated/actions/<thing>/<verb>.ts`, one module per operation, mounted by `blueprint/projections/actions.ts`
(M1.22; `design/decisions/K29-ui-layer.md` section 3.1, `design/decisions/WEB-actions-projection.md`). Each exports `options(host)` in
agent-native's field names and never calls `defineAction`: the host wraps it. Every value comes from the model. Pure: the model in, files out.
Test: `actions.test.ts`; the done check is `e2e/ui-layer/09` to `13`.
