# GOAL17-account-key: an Account has its own row id; the outside account's id is `external`

Decided 23 November 2026 by Goal 17's lead, during slice 5's build, on the builder's finding.

## The problem

K40 fix 1 wrote the Account as `fields: { source, id: Blueprint.text(), login, bot }`, with `id` the outside account's
id (a GitHub user id, a Slack user id). GOAL17-source-from keyed it by `(superagent, source, id)`, since one mount serves
several superagents. But `id` is also every thing's row key (`examples/acme/generated/model/model.json`: each thing's
`fields.id` is `{ type: "id", prefix }`). If the outside id is the row key, two superagents that both see octocat on
the same GitHub mount need two rows with one key, and the second `account.seen` can't be stored. The unique rule
becomes a no-op.

## The call

- **The row key stays Orthograph's.** `Account.id` is `Blueprint.id`, made at `account.seen`, like every other thing.
- **The outside account's id is the field `external`** (`Blueprint.text()`). The unique rule is
  `(superagent, source, external)`.
- **The role matches on it.** `actor: { mount: Account.fields.source, id: Account.fields.external }`, with `within:
  Account.fields.superagent`, as GOAL17-source-from adds. The caller's `actor.id` is still the outside id. Only the
  field it's compared to is renamed.
- **The policy and the gate** name an account by `external` wherever they named the outside `id`.

## Evidence

- `examples/acme/generated/model/model.json`: `things.allowance.fields.id` is `{ "type": "id", "prefix": "alw" }`, and so
  is every thing's.
- Slice 5's builder, building check 10's unique rule: "two superagents listing the same outside account would collide
  as rows".

## Supersedes

- `design/goals/17-superagent.md`: "keyed by `(superagent, source, id)`, where `source` is its mount's name" → "keyed by `(superagent, source, external)`, where `source` is its mount's name and `external` the outside account's id (GOAL17-account-key)"
- `design/decisions/K40-superagent-gaps.md`: "id: Blueprint.text(), login: Blueprint.text()" → "external: Blueprint.text(), login: Blueprint.text()"
- `design/decisions/K40-superagent-gaps.md`: "actor: { mount: Account.fields.source, id: Account.fields.id }" → "actor: { mount: Account.fields.source, id: Account.fields.external }"
- `design/decisions/GOAL17-source-from.md`: "`(superagent, source, id)`" → "`(superagent, source, external)`"
- `design/decisions/GOAL17-executor-slots.md`: "a unique rule on `(superagent, source, id)`" → "a unique rule on `(superagent, source, external)`"
