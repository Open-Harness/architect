<!-- Generated from the blueprint. Do not edit. -->
# mandate

What a ticket may do, pinned to the policy version it was accepted under.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| superagent | superagent.id |
| ticket | ticket.id |
| account | account.id |
| policy | uint |

## Machine

States: held, withdrawn, revoked. A move from the wrong state is refused MandateNotHeld (exit 91).

| move | from | to | emits |
|---|---|---|---|
| hold | (creates) | held | MandateHeld |
| withdraw | held | withdrawn | MandateWithdrawn |
| revalidate | withdrawn, held | held, revoked | MandateRevalidated |

## Events

- `MandateHeld`: carries mandate (mandate.id), ticket (mandate.ticket); emitted by the move hold
- `MandateRevalidated`: carries mandate (mandate.id), ticket (mandate.ticket); emitted by the move revalidate
- `MandateWithdrawn`: carries mandate (mandate.id), ticket (mandate.ticket); emitted by the move withdraw

## Operations

- [mandate.revalidate](revalidate.md): Check a ticket's mandate against the policy as it is now, before the ticket resumes.
