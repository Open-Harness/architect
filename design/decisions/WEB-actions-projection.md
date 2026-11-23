# WEB-actions-projection: what the generated actions say about readOnly, parameters, the client path, the request key and retrySafe

Decided 23 November 2026 by Goal 5's lead, for slice 3 (M1.22, the actions projection's checks, #617) and the builder after it.

## The problem

K29 section 3.1 draws one generated action (`handle.claim`) and M1.22 states its done-when in a line. The checks (`e2e/ui-layer/09` to `13`) had to settle what the line leaves open, and the builder reads these same words: when `readOnly` is true, what "non-empty parameters" means for an operation with no payload, how the action names the SDK's client, what the request key is, and whether `retrySafe` may appear.

## The call with evidence

1. **`readOnly` is true exactly when the operation can write nothing:** it has no `move`, and every step is a `load`. No steps at all counts, so acme's `session.show` and `system.health` are `readOnly`. The rule reads the model (`operations.<name>.move` and the keys of `operations.<name>.steps`), not K29 section 3.0's sort, which is the web projection's. A wrong `true` on a write is the risk (agent-native may skip care for a read-only action), so here is every operation of the two examples, from `generated/model/model.json`:

| Example | Operation | `move` | Steps | `readOnly` |
|---|---|---|---|---|
| plugged-in | `handle.claim` | a move | record | false |
| plugged-in | `handle.release` | a move | record | false |
| plugged-in | `handle.resolve` | none | load | **true** |
| plugged-in | `link.add` | a move | load, record | false |
| plugged-in | `link.order` | none | load, record | false |
| plugged-in | `link.remove` | a move | record | false |
| plugged-in | `profile.get` | none | load | **true** |
| acme | `allowance.get` | none | none | **true** |
| acme | `allowance.grant` | a move | insert | false |
| acme | `allowance.revoke` | a move | update | false |
| acme | `allowance.spend` | a move | load, record | false |
| acme | `api-key.create` | none | issue, insert | false |
| acme | `invitation.accept` | a move | join | false |
| acme | `invitation.revoke` | a move | update | false |
| acme | `invitation.send` | a move | insert | false |
| acme | `membership.get` | none | none | **true** |
| acme | `organization.create` | a move | insert, owner | false |
| acme | `organization.get` | none | none | **true** |
| acme | `person.sign-up` | none | create | false |
| acme | `session.show` | none | none | **true** |
| acme | `session.sign-in` | none | verify | false |
| acme | `system.health` | none | none | **true** |

   Every `true` has no move and no step that writes (`load`, or no step); every operation with a move, or a `record`, `insert`, `update`, `join`, `create`, `issue`, `verify` or `owner` step, is `false`. `link.order` has no move but a `record` step, so it is a write. Checks 10 and 13 read the rule from the model (`isRead`, `e2e/ui-layer/projection.ts`), and 13 changes the model (`profile.get` given a `record` step) to hold it.
2. **Non-empty parameters applies to actions whose payload has fields.** An action with no payload fields (acme's `session.show`, `system.health`) advertises `properties: {}`, because there is nothing to advertise. M1.22's row says "every action whose payload has fields advertises non-empty parameters".
3. **The client path is the declared thing and verb as the Effect client keys them:** `client["api-key"].create`, `client.person["sign-up"]`, `client.handle.claim`, never `client.apiKey`. The generated SDK does exactly this (`examples/acme/generated/sdk/src/api-key/create.ts:9`); `apiKey` is the SDK's module namespace, not the client. Check 09 reads the action's `run` as syntax and holds it to these names.
4. **The request key is `tool:<toolCallId>`**, from the tool call's id, measured in `spikes/agent-native-compat/README.md` finding 5 (calls with ids A, A, B reached the Worker with keys `tool:toolu_A, tool:toolu_A, tool:toolu_B`). It is the host's, not the action's: the action passes `ctx` on and the host makes the key (`requestKey(ctx)`).
5. **A generated action never names `retrySafe`.** Leaving it out is agent-native's default, false: an untyped failure after a write is "outcome unknown" and ends the run, which is right for a Worker 500 that may have committed (spike findings 3 and 5). A per-operation predicate waits until the model can say an operation carries its own key (`design/later.md`). M1.22's row says "never names `retrySafe`".
6. **Limit: acme runs on a sink, not a real world.** Check 12 runs Plugged In's actions against a real Worker; acme's are judged by checks 09 to 11 and 13, with each request recorded by a sink and compared with the SDK's own. The action, the SDK, `runForAction` and `defineAction` are all real; only the request is recorded.

## Supersedes

- design/milestones.md: "every generated action advertises non-empty parameters" → "every action whose payload has fields advertises non-empty parameters"
- design/milestones.md: "no `retrySafe: true`;" → "never names `retrySafe`;"
