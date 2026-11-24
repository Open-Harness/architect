# GOAL17-merge-main: Goal 17 merges `main`, and `goal/stage-1` is retired

Date: 23 November 2026. Decided by Goal 17's merge thread. Evidence: the merge commit on `goal-17/merge-main`, and the
checks listed in its pull request.

`goal/stage-1` landed in `main` by #707 and is retired (K42; the lander's #771). `goal/superagent` was 281 commits
behind `main`. This merges `origin/main` in by a merge commit, and the brief's `base` becomes `main`.

## Calls where both sides changed the same thing

| Where | Call |
|---|---|
| `Blueprint.role` (`roles/service.ts`, `roles/types.ts`) | One role has all four forms: `rule`, `who` (K20, main), and `actor:` and `agent:` (K40 fixes 1 and 3, here). `who` sets the rule through `whoRule`; `actor` and `agent` keep a rule that admits no person. A role made with `service` has none of them. |
| Refusal codes (`model/internal/codes.ts`) | `AR-003` to `AR-006` are main's chain refusals, `AR-007` is the held `ApprovalDeclined`, and `AR-008` is this branch's `ReadNotServed`. The three ranges do not overlap. `RUNTIME_CODES` keeps main's six; `READ_NOT_SERVED_CODE` stays outside it, so it is in a model only when some read can make it, and not in `refusals.lock` (the lock holds only what the runtime raises on every project). |
| `describe` (`model/internal/describe.ts`) | Main split `describe` into `fields.ts`, `things.ts`, `operations.ts`, `money.ts` and `assets.ts`. This branch's changes were moved into them: `optional` on a field model into `fields.ts`; versioned things, the "id prefix names no thing's own id" check and `roleRuleOf` (actor and agent role text) into `things.ts`; reads into `reads.ts`, which now also takes main's chain read checks and the chain `runs`/`solidity` fields. `describe` still takes `mounts` for `formsOf`. |
| `model/service.ts` | Main's `locked` (refusals lock and app pages) now also folds this branch's app-folder verbs, agents and sources. |
| `mounts/service.ts` | Both fold results are kept: `agents`, `sources` and `secrets`. A plugin's `secrets.ts` is read beside its things, and a feature's `events` and `door` are kept. |
| `model/internal/layout.ts` | `Layout` has the fields of both: `agents`, `declared`, `sources`, `holdLists` and `secrets`, `mountSecrets`, `valueFiles`, `assets`. |
| `values` | `ValueMeta`'s `schema` format has `choice`, `list`, `bool` beside `ref-any`; `account` and `money` stay; `email` keeps main's `format: "email"`. |
| `orthograph/src/index.ts` | `Source`, `Agents`, `Declares`, `Derives`, `Holds` and `Apps`, `Chain`, `Secret` are all exported. The door's `signing` is typed by main's `SecretDeclaration`. |
| `host-cloudflare/src/index.ts` | Exports the inbound door, and main's `WorldEntry`, `WorldClock` and the timers' types. |
| `projections/.../server.ts` | Imports come from main's `helpers.ts` (`not-from.ts` was the same function, so it is deleted), and the generated server imports `Inbound` when a door is mounted and `WorldEntry` and `DurableTimers` when a timer is used. |
| `cli/src/main.ts` | `secrets` (main) and `new` (here) are both subcommands. |
| `e2e/tsconfig.json` | The union of both `include` and `exclude` lists. |
| `docs/canon/*.mdx` | Prose of both sides; every quote refreshed by `check.mjs --fix`, and the "what a kind can do" quote now points at `reads.ts`. |

`examples/superagent` has no `refusals.lock` on this branch; main's compiler writes one, so it is added (generated, not
edited).

## Supersedes

Nothing decided is replaced. The brief's own words about its base and the conductor are updated in place to K42's, and
no decision record cites them; other goals' briefs, which say the same of their own bases, are left to their leads.
