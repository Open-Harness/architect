# Plugged In's stage 1 journeys (ST1.02)

Written by the journey author, not the builder or the climber. The climber never edits these files, the starting worlds,
the evals or the runner's generic checks. They are the spec: a correct handler makes every step green, and a blank one
turns every step red.

## Files

- `blueprint/starting-worlds/*.ts`: five worlds, below.
- `journeys/*.ts`: seven journeys, 56 steps. A journey's name is its file name with spaces, except where noted.
- Declarations the journeys need are in `blueprint/things/` (see `design/decisions/ST1-02-plugged-in-ownership.md`).

## Starting worlds

One run shares one database, and a handle's name is unique in it, so a starting world that claims a name can serve one
journey only (a second journey would find the name taken while making its world). Each world therefore has a name of
its own. aaron is signed in (one of the world's fixed test people until M2).

| World | Makes | Gives | Used by |
|---|---|---|---|
| `claimed` | aaron claims `claimedname`, request key `first-claim` | `handle` | a name is claimed once |
| `claimed-to-release` | aaron claims `releasepage` | `handle` | release a handle |
| `page-with-links` | aaron claims `linkpage`; adds GitHub, Blog, Talks | `lastLink` (Talks) | anyone reads a public page |
| `page-to-edit` | aaron claims `editpage`; adds GitHub, Blog, Talks | `lastLink` (Talks) | add, order and remove a link |
| `page-to-guard` | aaron claims `guardpage`; adds GitHub | `lastLink` (GitHub) | a stranger cannot edit a page |

## Journeys

| Journey (file) | World | Cast | Steps | Proves |
|---|---|---|---|---|
| `claim a handle` (`claim-a-handle`) | none | aaron signedIn, visitor anyone | 8 | an unclaimed name does not resolve and has no page; add before claiming refused `LinkNeedsHandle`; claim answers `hdl_` id, emits `HandleClaimed`, `claimed`, spans `handle.claim{,.record,.commit}`; the name then resolves and its page is `{ handle, links: [] }`; a second name refused `HandleAlreadyOwned`, nothing committed, still free |
| `a name is claimed once` (`a-name-is-claimed-once`) | `claimed` | aaron, bob signedIn, visitor | 5 | the same request key answers the world's handle, no events, no `record` span; bob refused `HandleTaken` with his own key and with aaron's key, no events, no `commit`; resolve still answers aaron's handle; bob then claims his own name |
| `release a handle` (`release-a-handle`) | `claimed-to-release` | aaron, bob signedIn, visitor | 13 | aaron adds a link; bob's release refused `NotAllowed` (no `handle.release` span, still `claimed`); aaron's release emits `HandleReleased`, `released`; again refused `machine.notFrom { state: "released" }`; the name no longer resolves (`HandleNotFound`) and has no page (`ProfileNotFound`); aaron's add refused `LinkNeedsHandle`; bob claims the name (a new handle; the old one stays `released`, and bob cannot release it) and its page has none of aaron's links; aaron claims again (`released` does not count as held), adds a link, and his new page has only it |
| `add, order and remove a link` (`add-order-and-remove-a-link`) | `page-to-edit` | aaron signedIn, visitor | 12 | add appends (`LinkAdded`, `listed`, four spans); order to 0, order past the end puts last, each read back in order; remove emits `LinkRemoved`, `removed`, and the page keeps the rest in order; remove twice refused `machine.notFrom { state: "removed" }`; order of a removed link refused `LinkAlreadyRemoved`, no `record` span |
| `a stranger cannot edit a page` (`a-stranger-cannot-edit-a-page`) | `page-to-guard` | aaron, bob signedIn, visitor | 8 | bob has no page to add to (`LinkNeedsHandle`); bob's order, remove and release refused `NotAllowed` with no handler span and no events, link still `listed`, name still `claimed`; a visitor's remove and claim refused `NotAllowed`; the page is unchanged |
| `anyone reads a public page` (`anyone-reads-a-public-page`) | `page-with-links` | visitor anyone, bob signedIn | 5 | resolve answers a handle; the page is the name and every link (`id`, `title`, `url` only) in order; a signed-in non-owner reads the same; an unclaimed name gives `ProfileNotFound` and `HandleNotFound` |
| `a person claims a page and shares it` (`the-story`) | none | aaron signedIn, visitor anyone | 5 | the story's SDK half: claim `aaron`, add three links, anyone sees them in order at `aaron` |

Every journey asserts the events (`emits` or `noEvents()`), and a refusal also asserts the absent write span, or, for a claim (the runtime refuses after the handler, G5 section 5), the absent `commit`.

## What waits on M2 (sign-in)

Plugged In has no sign-in yet: `Identity.testPrincipals` gives each journey's `signedIn` cast member a fixed test person
with a person id, and `anyone` is anonymous. That is enough for every journey here to run and to be green with correct
handlers (checked: a scratch implementation of the six handlers made all 56 steps green; it is not committed). What
changes at M2 is only who the people are, so the journeys are written to survive it unchanged.

| Journey | Can go green before M2 | Waits on M2 for |
|---|---|---|
| all seven | yes, against the world's fixed test people | nothing in the steps; `Identity.betterAuth` replaces the fixed people |
| `a stranger cannot edit a page` | yes | its meaning is real only with real people: the strangers become people who signed up |
| `a person claims a page and shares it` | its SDK half | the sign-up step, below |

## The story, and what the journey API cannot say yet

The goal's story is: from a fresh folder with the real `ortho`, a person signs up, claims `@aaron`, adds three links and
sees their public page, through the CLI, the SDK, MCP and HTTP. `the-story.ts` is the part a journey can express:
claim `aaron`, add three links, anyone reads the page. The rest, for the lead:

1. **Sign-up.** There is no `person` thing or `person.sign-up` in Plugged In until M2 mounts auth (ST1.04, ST1.07). When
   it does, the story's first step becomes `s.aaron.run(signUp, ...)` and `aaron` should be cast `Blueprint.anyone` (a
   cast member that is `anyone` is not signed up by the runner, so the script can do it, as `sign-up-and-sign-in` does).
2. **A fresh folder with the real `ortho`.** A journey runs against the project in place. `ortho new plugged-in`, the local
   registry and a clean checkout are the e2e check's (`nx run e2e:stage1`), not a journey's.
3. **Four surfaces.** A journey's step calls the operation once, through the surface `prove` uses (HTTP on the world,
   as the SDK does). Calling the same step through the CLI and through MCP is the grid runner's and the story check's.
   There is no way to say "this step through all four" in a journey today.

## Snag candidates (found while writing, not worked around)

- **S-a. One world per name.** A starting world is re-run for every journey that starts from it, in one shared database,
  so a world that claims a name collides on the second journey. The payload cannot take a per-journey unique value
  (`s.aaron.person` is a ref to an id, not a string that fits `HandleName`). Worlds are therefore one per journey (five
  near-copies). A way to say "a name of my own for this journey" would remove the copies.
- **S-b. A starting world gives only `s.last`.** After `claim` and three `add` calls, a world can give the last link id and
  nothing earlier, not the handle. The journeys read the page and act on `s.last.links[i].id` instead. A `gives` that can
  name any call's answer would let a world hand over everything it made.
- **S-c. `s.last` in a check is the step's own answer.** A step cannot check one answer against the one before it
  (resolve equals what claim answered). The journeys route around it with a world that gives the handle.
- **S-d. A refused step leaves `s.last` as it was.** `a stranger cannot edit a page` depends on it in one place
  (`isIn(s.last.handle, ...)` after a refusal). If prove changes that, the step moves to the world.
- **S-e. No way to provoke a malformed payload from a journey.** The coverage line reads `runtime refusals 6/7` with a
  correct implementation: the seventh is the framework's own bad-payload refusal, and typed `run` cannot send one.
- **S-f. A handler cannot look up by field.** `Records` has `find`, `insert` and `update` by id only, and no `list`; a
  handler checking `HandleTaken` has to reach for `Store.list` (the host's side, not in the handler's type) or SQL. The
  scratch implementation used `Store.list`. The climber will meet this at the first step.
- **S-g. The scaffold goes stale.**  Changing `claim` after its handler was scaffolded (a new refusal) leaves the old
  handler without the new stub. Only deleting the file and re-running `ortho generate` brings it back; the author did that
  here for the four handlers whose declarations changed.
  Rechecked after K16 (#106): the new scaffold lists every declared refusal and cites its blueprint files, but `ortho generate` still never rewrites a scaffolded handler (it prints "nothing to change"), so a refusal added later is missing until the file is deleted and regenerated. S-g stands; only new handlers benefit.
- **S-h. Pinned by an existing check.** `e2e/m1/20-plugged-in-loop.test.ts` pins Plugged In's operations to the five of
  M1.40 (line 79) and calls `handle.claim` with no signed-in person. It will fail on this branch: the declarations now
  have `handle.release`, `handle.resolve`, and claim and add are `signedIn`. Its owner (the checks author) should move it
  to the stage 1 shape; it is not edited here.

## Open spec question

- **Old links after a release.** `linkOwner` is `link.owner === caller`, so after aaron releases his name he can still
  `order` or `remove` the links he had on it (they stay `listed`, and no declaration says otherwise). Whether a released
  name's links should freeze, go with the name, or stay editable is not in the declarations, so no step pins it.
  **Decided by the lead (19 November 2026):** they stay aaron's and stay editable, as the declarations already say. A
  link belongs to the person who added it; a release gives up the address, not the person's links, and no page shows
  them once the name stops resolving. Nothing new is declared, so no step is added for stage 1. Recorded in
  `design/decisions/ST1-02-plugged-in-ownership.md`.
