# ST1.02: Plugged In's stage 1 owns its pages from the start

Decided 19 November 2026 by the ✍️ journey author for Goal 3, under "Who decides" in `AGENTS.md`.

## The call

`M1-plugged-in.md` wrote stage 1 as "no sign-in, so nobody owns anything": every operation `anyone`, a link naming its
page by the handle's name, `HandleAlreadyOwned` and the owner roles waiting for ST1.04. Goal 3's journeys need "a
stranger can't edit someone else's page" and "release", so the declarations take Codex's owner shape now, as that record
said ST1.04 would take it back "word for word":

| Declaration | Change | Why |
|---|---|---|
| `handle` | a field `owner` (a person's id, `per_`), a role `handleOwner`, a state and move `released`, the event `HandleReleased`, the operations `release` (owner only) and `resolve` (anyone) | release and resolve are ST1.02's list; the owner is what a stranger is refused on |
| `handle.claim` | `signedIn`, and refuses `HandleAlreadyOwned` (exit 12) | one person holds one name, so `link.add` can name "your page" |
| `handle` errors | `HandleTaken` 10 (as before), `HandleAlreadyOwned` 12, `HandleNotFound` 13; the machine's `notFrom` stays 11 | K16 g: 5 to 125, unique per thing |
| `link` | a field `owner`, a role `linkOwner`; `add` is `signedIn` and takes `{ title, url }` for the caller's own page (`LinkNeedsHandle` when the caller holds no claimed name); `order` and `remove` are `linkOwner` | a stranger's edit is refused `NotAllowed` before any handler runs |
| `profile.get`, `handle.resolve` | `anyone` | a public page |

`Identity.testPrincipals` is unchanged: until M2, a `signedIn` cast member is one of the world's fixed test people.

## Cost, and what it breaks

`e2e/m1/20-plugged-in-loop.test.ts` pins the M1.40 shape (five operations; anonymous claim calls). It fails on
`goal/stage-1` from this change on. It belongs to the checks author, who moves it to the stage 1 shape. `M1-plugged-in.md`
keeps its words (dated record); this one supersedes its "without sign-in" paragraph for stage 1.

## Evidence the spec is satisfiable

A scratch implementation of the six handlers (not committed) made all 52 steps of the seven journeys green under
`ortho prove --root examples/plugged-in`, with coverage moves 4/4, outcomes 4/4, refusals 6/6. With the blank handlers:
0 of 52 steps green.

The scratch handlers looked a handle up by its name with `Store.list`, which a handler can't reach: `Records` has only
`find`, `insert` and `update` by id. So the spec is satisfiable, but a climber who has only `src/` will stop at the first
lookup by name (snag S-f in `examples/plugged-in/journeys/README.md`) until the framework gives handlers that lookup.

## A released name's links (the lead, 19 November 2026)

They stay the person's and stay editable: `linkOwner` is `link.owner === caller`, and a release gives up the address,
not the links. No page shows them once the name stops resolving. Freezing them, or moving them with the name, would be
a new declaration with its own journey; stage 1 needs neither.

## Rows this amends

`design/milestones.md` M1.40 and M1.43 say "without sign-in" and "no sign-in": on `goal/stage-1` they now read with
this record, which each row cites. ST1.04 keeps its words; its sign-in is the real one that replaces the test people.
