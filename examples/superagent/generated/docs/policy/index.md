<!-- Generated from the blueprint. Do not edit. -->
# policy

A superagent's rules: who may ask, how, and what it may accept. One current version, every save kept.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| superagent | id |
| revision | uint |
| mode | schema |
| allowed | schema |
| bots | schema |
| admission | schema |
| rules | schema |
| saved (optional) | schema |

## Machine

States: current. A move from the wrong state is refused PolicyNotCurrent (exit 87).

| move | from | to | emits |
|---|---|---|---|
| save | (creates) | current | PolicyChanged |
| restore | (creates) | current | PolicyChanged |

## Events

- `PolicyChanged`: carries superagent (policy.superagent), revision (policy.revision); emitted by the move save, restore

## Operations

- [policy.get](get.md): Read the policy: the current version, or the one named.
- [policy.history](history.md): Every saved version, newest first, each row its number, when, by whom, and the one it was made from.
- [policy.restore](restore.md): Save an earlier version again, as a new one.
- [policy.save](save.md): Save a new version of the policy. A save made from an older version is refused, with the current one.
- [policy.sync](sync.md): List the accounts a connection's roster names.
