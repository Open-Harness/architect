# GOAL17-dead-role-paths: the superagent's role paths walk to real ids

Decided 24 November 2026 by Goal 16's lead (core), who runs Goal 17's lane under CX-takeover. This was found while
merging `main` into `goal/superagent` (#962).

## The problem

#939 (#767) made `ortho check` refuse a role path that walks to nothing. On the merge, it refused 16 of
`examples/superagent`'s operations. Fifteen use `itsMain.of("superagent")`, and tickets `accept` uses
`listed.of("account")`. Their payload fields, and the things those fields come from, held bare `Blueprint.id("sag")` and
`Blueprint.id("acc")` values rather than references to `Superagent.fields.id` and `Account.fields.id`.

The runtime agrees with the check. language-effect's `access/service.ts` `walk` starts only from a field that references
a thing, so on `goal/superagent` these entries admitted nobody. Tickets `attach`, whose `allowed` is
`[itsMain.of("superagent")]` alone, could not be called at all. K40 fix 3 meant `itsMain` to admit the superagent's main
agent acting as itself.

## The call

- **Point the fields at the real ids.** Each `superagent` field in the intake, tickets and prompts plugins is now
  `Superagent.fields.id`, and each `account` field is `Account.fields.id`. The plugins already depended on
  `@orthograph/superagent`, and tickets on `@orthograph/intake`, so no new edge is added.
- **The wire changes.** Every operation that takes `superagent` now checks the superagent exists and can refuse
  `SuperagentNotFound`: 25 operations in `examples/superagent/generated/api/src/`.
- **`itsMain` and `listed` decide as written.** The main agent can call the operations K40 fix 3 opened to it, and
  tickets `attach` becomes callable by the main agent.
- **Rejected:**
  - Dropping the dead role entries would keep today's runtime, but it throws away K40 fix 3 and leaves `attach`
    callable by nobody.
  - Relaxing #939's check would reverse #767, and the runtime would still refuse.

The 18 files changed (17 things and one verb):

- `examples/superagent/plugins/intake/blueprint/things/{account,correlation,decision,eval,policy,source,thread,trigger}/thing.ts`
- `examples/superagent/plugins/prompts/blueprint/things/prompt-set/thing.ts`
- `examples/superagent/plugins/tickets/blueprint/things/{assignment,attention,input,mandate,outgoing-message,report,subscription,ticket}/thing.ts`
- `examples/superagent/plugins/tickets/blueprint/things/ticket/verbs/accept.ts` (its payload declared `account` itself)

## The checks it moves

Three checks named superagents no world had made, or planted their edit on the old bare id. Goal 16 core authorised these
author edits, kept to what this change forces:

- **Check 15** plants its stray `Blueprint.id("zzz")` where assignment's `superagent` now references `Superagent.fields.id`.
- **Check 25's** stale-elsewhere journey starts from `an-observing-superagent`, not the made-up `sag_elsewhere1`.
- **Check 19's** stage-one journeys:
  - `a-stale-policy-save-is-refused` starts from a new world, `two-observing-superagents`, in place of `sag_policya1`
    and `sag_policyb1`.
  - `an-account-is-seen-once` starts from `a-sender-was-seen-beside-another-superagent`, in place of `sag_otheraccounts1`.
  - Their step counts are unchanged.

## Evidence

- `ortho check` on `examples/superagent` at #962's merge commit: `model ✘ 16`, such as `superagent.itsMain is decided on
  "superagent", but the payload's superagent holds no thing's id` (on `ticket.stage`, `ticket.superagent holds no thing's id,
  so the walk stops there`; on `ticket.accept`, the same about `account`). After the change, and `ortho generate`, it prints `check ✔`.
- `packages/language-effect/src/modules/access/service.ts`: `walk` returns `undefined` when `referencedThing` of the
  start field is `undefined`, and `roleOn` then returns `false`.
