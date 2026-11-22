# ST1-needs-approval-declaration: `needsApproval?: true`, and AR-007 is reserved outside the refusals map

Decided 22 November 2026 by the Goal 3 checks author, for Goal 5's ask (#466). Written with the checks that judge it.

## The call

Goal 5's issue proposes `needsApproval?: true` on `OperationSpec` and on the model's operation, present only when declared, and AR-007 for `ApprovalDeclined` beside the runtime codes. Two parts of that are settled here, because the issue leaves them open or its two options collide:

1. **`true` is the only value, and every other value is refused by the compiler** (and by the type). `needsApproval: false` is refused too: absence already says "no yes needed", and a second way to say it would put `false` in a model that, by the issue's own rule, holds the key only when declared. The refusal names the file and says `needsApproval` must be `true` or left out. The front door passes a declared value through unchanged so the compiler can name the file; it adds the key only when the spec has it.
2. **AR-007 is reserved in `codes.ts` as `RESERVED_CODES = { ApprovalDeclined: "AR-007" }`, not in `RUNTIME_CODES`.** The issue offers `RUNTIME_CODES` or a comment. `RUNTIME_CODES` feeds every model's `refusals` map, which every project's generated `errors.ts`, docs and `model.json` list (`examples/*/generated/api/src/errors.ts` holds `AR-002` today), so adding to it would move every generated file for a refusal the Worker never returns (the issue says so). A comment can't be checked. A separate exported constant is checked, leaves every generated file alone, and `refusalsOf` refuses a thing that declares an error named `ApprovalDeclined`, naming AR-007. `AR-003` to `AR-006` stay Goal 4's (`goal/on-chain`); `WEB-approval-declined` (#524) is Goal 5's record.

`RESERVED_CODES` keeps its name and file (the goal-3 lead's call). Goal 4 adds AR-003 to AR-006 to `RUNTIME_CODES` on `goal/on-chain`, so the checks pin only AR-001 and AR-002 there and that AR-007 is taken once across both maps.

Absence of the key is judged on the model, not on the front door: `service.ts` already carries `idempotent` and `budget` as possibly-undefined keys.

An operation that declares `needsApproval` gains no refusal in its `refusals` list: asking a person is the caller's door (`orthograph/actions`), not the Worker's.

## Left out of this round

The runtime asking a person (Goal 5's slice 1, #494), the generated confirm piece (K29 section 3.3), the MCP door's use of it (an agent tool that needs approval), and what `needsApproval` means on a client operation or a read. Reads cannot declare it (a read has no spec field for it).

## Supersedes

Nothing. K29's "`needsApproval: false`" (sections 3.3 and the grill brief) is the generated action's own field, not the declaration, and stays as written.
