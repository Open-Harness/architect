# GOAL17-slice5-forms: the calls slice 5's builder made where no record said how

Decided 23 November 2026 by Goal 17's slice 5 builder, under "Who decides" in `AGENTS.md`. Each call below is the smallest one
that lets a record's form be built and the slice 5 checks read it; none changes a call of Aaron's or of a slice 2 record. Code is
at `goal-17/s5-blueprint-build`.

## The calls

1. **A folder of verbs with no `thing.ts` adds operations to a thing another plugin, or the app, brings.**
   - **Why:** the brief makes `superagent.fill` and `reap` the app's (`GOAL17-executor-slots`, section 4) and
     `trigger.handback`, `thread.follow` and `thread.unrelated` the tickets plugin's, on things whose `thing.ts` is intake's or
     superagent's. Nothing said where such a verb lives.
   - **How:** `things/<thing>/verbs/<verb>.ts` in the adding plugin (or the app) with no `thing.ts` beside it. The compiler joins
     it to the thing found elsewhere; the operation's `from` is the adder's, so its handler is `src/<thing>/<verb>` of the adder. A
     folder that finds no thing is refused, naming the file.
2. **A plugin may ship as source.** `blueprintFilesOf` reads `.ts` beside `.js`, and a missing handler is looked for as `.ts` when
   the package has no build. A plugin's `package.json` maps `./blueprint/*.js` and `./src/*.js` to the `.ts` files, so generated
   code imports `@orthograph/<plugin>/blueprint/things/x/thing.js` as it does a built one's.
3. **Deliveries are declared with `on:` and the mount's `on` verb, and the model records them.** `Blueprint.on(event, map)` in an
   operation's `on:` makes that operation the event's outbox hop; a feature mount's `on(event, operation, map, { onRefused })` does
   the same for an operation of its own plugin, so the app wires what crosses plugins. The model says `on: [{ event, thing }]` on
   an operation, and the hold's `held` and `unheld` rows name each delivery. The outbox that runs them is Goal 11's; nothing runs
   a hop yet, and a hop's `map` is not checked against the operation's payload until slice 7 writes the handlers.
4. **The hold's refusals read those deliveries.** A delivery of an event that carries the id the hold keys on (any field whose
   value is the hold thing's own id prefix) that is in neither list is refused, as is an event on both lists, a held row of the hold
   thing's own move, and a hold whose thing is in another store than an event it lists. The messages name the app's feature file.
5. **A source's `kinds` is read from the text of its `on` functions**: every string literal in a `kind:` expression, sorted and
   distinct (the README of the checks fixes this). A source is active when its adapter is mounted and the mount includes any event
   it maps; then every event it maps and every call it uses must be included, and a variable must be capitals, must not end in
   `_TOKEN`, `_KEY`, `_SECRET` or `_PASSWORD`, and must start with `<SOURCE>_`.
6. **`StaleRevision { current }` is declared in `@orthograph/superagent`**, the plugin every other depends on, and `policy`,
   `prompt-set`, `superagent.update` and `settings.save` all refuse it.
7. **`policy.history` and `prompt-set.history` answer one list for each of `revision`, `at`, `by` and `from`, in step**, newest
   first. Check 14 reads the four names in the answer, and an answer of one list of rows would not show them.
8. **The eight events GOAL17-pause leaves to slice 5 each have one delivery**, so each is in one list: `TicketCreated` to
   `outgoing-message.reply` and `TicketResumed` to `mandate.revalidate` (held); `TriggerRequeued`, `DecisionRecorded` and
   `ThreadUnsubscribed` to `eval.due` (held); `ThreadSubscribed` to `eval.due`, `TicketEnded` to `outgoing-message.withdraw` and
   `PolicyChanged` to `ticket.policy-changed` (unheld, each with its reason). Slice 7 settles each one's payload.
9. **A role's `actor:` form is a model word, not yet a door check.** `listed` is `actor: { mount: source, id: external }, within:
   superagent, while: [listed]` (GOAL17-account-key). The model says it in `roleRules` and `listed.of("account")` as a `role-of`;
   `admitsAgent` is false for it, since it admits only an outside account. The door that carries the account is slice 11's.
10. **The SDK's client class and its per-thing type aliases yield to a thing's name.** A thing called `source`, or a project called
    `superagent` with a thing `superagent`, made the generated SDK declare one name twice. The client is then `<Name>Client`, and
    an alias of a thing's own file takes a trailing underscore. An app with no clash generates what it did (check 17).
11. **A generated CLI and SDK turn a reserved word into a safe identifier** (GOAL17-names, call 1): `eval` and `arguments` join
    the reserved words, and the CLI's per-thing command uses the same safe name. The operation stays `eval.due`.
12. **A field of `Blueprint.id(prefix)` must name a prefix some thing owns as its own `id`** (GOAL17-executor-slots), except `per`,
    the identity's people, which a blueprint refers to without declaring.

## What the checks cannot reach, found while building

- Check 15's derive control (`15-the-framework-refusals.test.ts:39-44`) writes `probe` and `probe-part` with no `code`, and both
  take `PR-`: the existing refusal-code rule refuses two things that share their first two letters, in any app. Its control cases
  (`:67-72`, `:104-111`) cannot pass until the check gives one of them a `code`, or the rule chooses codes itself.
- Check 10's Account unique rule and check 16's `ticket.waiting` answer keys wait for their author's changes (GOAL17-account-key,
  GOAL17-list-answer).

## Supersedes

Nothing: each call fills a gap and replaces no phrase.
