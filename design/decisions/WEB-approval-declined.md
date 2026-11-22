# WEB-approval-declined: a person's no is `ApprovalDeclined`, `AR-007`, given by the caller and never by the Worker

Decided 22 November 2026 by Goal 5's lead, for slice 1 (M1.23, the actions module), under the ownership `AGENTS.md`
gives the building agent.

## The problem

M1.23 says an action with `needsApproval` "waits for a yes" in the `defineAction` wrapper, never in `run`
(`spikes/agent-native-compat/README.md`, finding 6). It doesn't say what the caller gets back when the person says no.
Slice 1's checks (#494, `e2e/ui-layer/02-actions-approvals.test.ts`) need one answer, and the answer has to be something
agent-native reads as "nothing was written", or its loop treats the call as an unknown outcome and stops the run.

The runtime's own refusal codes are `NotAllowed: "AR-001"` and `IdempotencyConflict: "AR-002"`
(`packages/compiler/src/modules/model/internal/codes.ts:15`). Goal 4 holds `AR-003` to `AR-006` on `goal/on-chain` for
the chain's refusals (`SignatureExpired`, `InvalidNonce`, `BadSignature`, `AlreadyExists`, in its `M6-chain.md` and a
check that pins them). Nothing holds `AR-007` on any branch (`git grep "AR-007"` over every `origin/` branch, 22
November 2026).

## The call

1. A no is an `ActionRefusal` with `errorCode: "AR-007"`, named `ApprovalDeclined`. Like every `ActionRefusal`, it
   carries `noWrite: true`, `actionContractError: true` and `statusCode: 422`. `run` was never called, so nothing was
   written.
2. Only the caller's side gives it: our `defineAction` wrapper, and later `@orthograph/web`'s piece runtime when a person
   presses "Keep it". The Worker never answers with it, because the Worker never sees a call that was declined.
3. `AR-007` is reserved beside the runtime codes, so no later runtime code takes it. That file is Goal 3's, so it is
   asked of Goal 3 on issue #466, together with `needsApproval` itself. Until #466 lands, this file holds the
   reservation.

## Why not the others

- **A plain error:** agent-native's loop reads an untyped failure after an outbound call as "outcome unknown" and ends
  the run (spike finding 3). A no is a known outcome: nothing ran.
- **Reusing `NotAllowed` (`AR-001`):** that code means the role check refused. A no from a person is a different fact,
  and a page shows it differently ("You kept it", not "You can't do this").
- **A code in the operation's own prefix (`HN-…`):** every operation would mint its own code for the same fact, and the
  model's per-thing codes would change for every app. That breaks Goal 5's rule that existing generated files stay as
  they are.

Slice 1's checks (#494) first pinned `AR-003`, before Goal 4's use of it was seen; they and the build move to
`AR-007` in the same landing.

## Supersedes

- `e2e/ui-layer/02-actions-approvals.test.ts`: "refused as AR-003" → "refused as AR-007"
- `packages/orthograph/src/modules/actions/` (slice 1's build, #508): "a no is the refusal `AR-003`" → "a no is the refusal `AR-007`"
