# Goal 17's checks: adapters from a spec (slice 3), and stage one's blueprint (slice 5, below)

Written before slice 4 builds anything, by an author who builds none of it (`AGENTS.md`, "Journeys and checks come
first"). Slice 4 builds `ortho new adapter <name> --from-openapi <spec>`, the conformance of what it makes, and the
GitHub, Slack and PostHog adapters with their stand-ins; these checks are its done-when. Every one is red today because
`ortho new` does not exist. This folder is also where the goal check `nx run e2e:superagent` grows: slices 6, 8, 10 and 12
add their halves beside these.

| Check | What it proves | Plugins it uses |
|---|---|---|
| `00-the-oracle` | the oracle the others judge by is sound: the pinned fixtures are the pinned bytes; every call and event the superagent includes is in its spec; each example fits its schema and each planted wrong value does not | none |
| `01-generates` | the three specs generate a plugin of exactly what each publishes (calls, events), with the generated-file header, byte for byte the same each time; hand-written files survive; refusals write nothing | generated into a project copy, from the fixtures |
| `02-includes` | a mount reaches only what it includes; an include of a call or event the spec doesn't have fails `ortho check`, naming the mount's file and the missing name; Slack's hand-written events | generated fixtures, and the held plugins |
| `03-calls` | each included call sends the request its spec describes, returns what came back whole, refuses a wrong answer and a wrong input, and fails with what the server said | the held plugins, against a probe the check writes |
| `04-stand-in-github` | each GitHub call passes against the stand-in over a bare repository: comments, a pushed branch and the pull request opened on it, reviews | the held GitHub plugin and its stand-in |
| `05-stand-ins-slack-posthog` | each Slack and PostHog call passes against its stand-in | the held Slack and PostHog plugins |
| `06-events` | each event the superagent listens to decodes what its service sends, whole, and refuses each wrong payload | the held plugins |
| `07-whole-specs` | the whole published specs (fetched once, hash-checked) generate; each generated file of a held plugin is what the generator makes of the committed fixture today | the held plugins; the full specs |

"The held plugins" are the ones the app holds, `examples/superagent/plugins/{github,slack,posthog}` (the brief's folder
tree): each is the generator's output for the committed fixture in `specs/` (pinned in the repository, so it never moves),
extended by hand where the design says (Slack's events, the stand-ins).

## What the builder must make, and where the checks read it

Anything the design settles is as `design/goals/17-superagent.md` says. These are the points it leaves open, fixed here
so a check can read them. A builder who needs one changed stops and asks its author.

1. **The command.** `ortho new adapter <name> --from-openapi <file or URL> [--root <project>]` writes `plugins/<name>/`
   under the project root. It reads JSON or YAML (PostHog's own URL, `https://us.posthog.com/api/schema/`, serves YAML;
   `?format=json` serves JSON), OpenAPI 3.x or Swagger 2.0. Its last line of output, exactly:
   `generated adapter <name>: <n> calls, <m> events from <title> <version>`, with `n` the spec's operations that have an
   `operationId`, and `m` its events (below). It refuses, exit not 0 and nothing written, with these words in its
   message: a file it can't read (`could not read <file>`), one that isn't JSON or YAML (`could not parse <file>`), a
   document that isn't OpenAPI or Swagger (`not an OpenAPI or Swagger description`), a spec with no operations
   (`no operations`), a missing `--from-openapi` (naming the flag), a name that isn't lower case words joined by dashes
   (`lower case words`).
2. **The one naming rule.** A call is named from its `operationId`: split at `/` and `.` into groups, then each piece
   camel-cased at `-` and `_`. GitHub's `issues/create-comment` is `calls.issues.createComment`; Slack's `chat_postMessage`
   and PostHog's `error_tracking_issues_list` have no separator, so they are flat: `calls.chatPostMessage`,
   `calls.errorTrackingIssuesList`. Dotted, a name is `issues.createComment`. An event is GitHub's own event, from each
   webhook entry's `x-github.subcategory`, camel-cased (`issue_comment` is `events.issueComment`); the spec lists it once per
   action (`issue-comment-created`...) and its payload is any one of them. The oracle is `spec.ts`.
3. **The plugin.** `package.json`: `name` `@orthograph/<name>`, `orthograph.kind` `"adapter"`, `orthograph.blueprint` a
   folder that exists, `exports["."]` the adapter's descriptor as its default export (`Blueprint.adapter`, with `calls`
   in groups of `Blueprint.call` and `events` of `{ kind: "event", schema }`), `exports["./client"]` the client (5), and
   a `scripts.build` if it needs one (the checks run `npm run build` from the repository's tools, offline). A plugin names
   its stand-in in `orthograph.standIn` (7).
4. **A mount.** `Blueprint.use(plugin, (p) => [p.include(p.calls.issues.createComment), p.include(p.events.issueComment)])`
   in `blueprint/adapters/<name>.ts`. `p.calls` and `p.events` are the descriptor's, so `p.calls.issues.createComment`
   typechecks. `ortho model --json` lists a mount's included calls and events, dotted, as `mounts.<name>.calls` and
   `mounts.<name>.events`. An include of something the adapter doesn't have is refused by `ortho check`, as the
   existing call message is: `<mount file>: includes the call issues.createComent, which @orthograph/github doesn't
   have (its calls: ...)`, and `includes the event issueComent, which ... doesn't have (its events: ...)`.
5. **The client.** `import { client } from "@orthograph/<name>/client"`;
   `client({ baseUrl, token? }).calls.<group>.<call>(input)` is a promise of the answer's JSON, as it came. The
   input is one flat object of the spec's path, query and body fields under the spec's names. `baseUrl` is the origin
   (Slack's `basePath` `/api` is added by the client). The token is sent as `Authorization: Bearer <token>` and never as
   a field (Slack's spec lists it as one); none given, no header. It refuses before sending anything: a missing
   required field, a field of the wrong kind, a field the spec doesn't have, no input. It refuses an answer that
   doesn't fit the spec's success schema. It fails with an object that has a string `_tag` and: `status` for an HTTP
   status of 400 or more; for Slack's `ok: false` answers (HTTP 200), `code` set to Slack's `error`. One spec
   correction is fixed here: Slack types `conversations.replies`'s `ts` as a number, and it is the string
   `1503435956.000247` Slack gives and wants, so a field the spec types as a number is also accepted as a numeric string
   and sent as written.
6. **Events.** `descriptor.events.<name>.schema` (this settles the event's shape: `{ kind: "event", schema }`, as `Blueprint.event` builds today; `GOAL17-source-from.md`'s `payload` is to be reconciled with it in slice 4) is an Effect schema of the payload the door receives. Decoding gives back
   the same JSON as went in: nothing the spec documents is dropped, nothing becomes a `Date`. Slack's `appMention` and
   `message` decode the **whole envelope** Slack's Events API posts (`type: "event_callback"`, `team_id`, `event_id`,
   `event_time`, `event`), written by hand from `slack-events.ts`; a bot's message arrives as a `message` with `subtype:
   "bot_message"`, a `bot_id` and no `user`.
7. **The stand-in.** `orthograph.standIn` is a file `node` runs: `node <file> --port 0 --dir <state folder>`. Its first
   line on stdout is exactly `stand-in listening on http://127.0.0.1:<port>`; on SIGTERM it stops, with no process left
   and nothing outside `--dir`. It needs a bearer token (any non-empty one) to write, and answers an unauthenticated
   write as the real service does (GitHub 401 with a `message`; Slack 200 `ok: false, error: not_authed`; PostHog 401).
   Each starts in the same world:
   - **GitHub:** repository `acme/widgets`, a real bare repository served by git's smart HTTP at
     `<base>/acme/widgets.git` (a clone and a push with `Authorization: Bearer ...` work), branch `main` with one commit,
     issue 1 open. Issues and pull requests share one numbering, so the first pull request is 2. A pull request needs
     an existing head and base branch (422 otherwise, and for a second open one on the same head); a line comment
     needs a path in the diff (422 otherwise); comments, reviews and line comments come back in the order made, and by
     `per_page` and `page`.
   - **Slack:** channel `C024BE91L`, the bot `U0BOT0001`. A `ts` is `<seconds>.<six digits>` and only goes up. A thread is its
     parent and its replies, in order, and holds only its own. `channel_not_found`, `no_text`, `thread_not_found`,
     `not_authed` as Slack gives them.
   - **PostHog:** project `1` (any other is 404) with three error tracking issues, two `active` and one `resolved`;
     `limit` and `offset` page the list; a status outside `active`, `resolved`, `suppressed` is 400; an update changes
     one issue only.
8. **Generated files.** Every `.ts` file the generator writes opens with `// Generated from <title> <version>. Do not
   edit.` (the title and version are the spec's `info`; no path, no time, so the same spec, as JSON or as YAML, from any
   path, generates the same bytes). A hand-written file opens with `// Scaffolded from <path>. Yours from now on.`.
   Running the command again puts every generated file back and touches no other file. `07` compares the held plugins'
   generated files with a fresh generation of the pinned spec, so an edited one fails.

Not fixed here, left to slice 4: how a plugin is built or packed (only that the checks can run its `build`), how the
generator derives errors and types, the secrets, the door's signature check, `catchUp` and `lend` (slices 10 and 11), and
the conformance harness's own interface: **"each included call passes against its stand-in" is `03`, `04` and `05`**.

## The specs

`specs/README.md` says which spec, how it is pinned, and why only a cut-down copy is in the repository.

## Running them

```bash
pnpm nx run e2e:superagent-ratchet     # every check, compared with expected-failing/ (red until slice 4 lands)
pnpm nx run e2e:superagent             # the checks alone: Goal 17's done check, once the list is empty
pnpm vitest run --root e2e --config vitest.superagent.config.ts superagent/01   # one file
```

`07` fetches GitHub's (14 MB), PostHog's (21 MB) and Slack's (1.2 MB) specs once into `tmp/specs/`; the first run needs the
network, and no key.

# Goal 17's checks: stage one's blueprint (slice 5)

Written before slice 5 builds `examples/superagent`, by an author who builds none of it. Slice 5's done-when is "`ortho check`
passes; the generated docs, CLI and MCP list every operation; a blueprint without these plugins generates byte for byte as
before". Every check below is red today because `examples/superagent` does not exist, except `17`, which passes today and must
keep passing. They judge the app only through what a user runs: `ortho generate`, `ortho model --json`, `ortho check`, the
generated docs, the generated CLI and the generated MCP catalog, on a copy of the example outside the repository.

| Check | What it proves | Reads |
|---|---|---|
| `08-ortho-check-passes` | `ortho check` exits 0 on a copy of examples/superagent with its checked-in `generated/` (types, rules, drift, check); the four plugins are in `plugins/` | `ortho check` |
| `09-the-superagent-plugin` | `@orthograph/superagent`: the Superagent (states, moves, fields, sizes of the pause fields, operations incl. `health` and `boot`) and the Proposal; its events and `SlotsOutOfRange`; pause and resume are a signed-in person's through a session; a proposal is applied by a person only; every one in the docs, CLI and MCP | model, docs, CLI, MCP |
| `10-the-intake-plugin` | `@orthograph/intake`: Source, Account, Trigger, Thread, Correlation, Eval, Decision, Policy with their states, operations, events, `StaleRevision`; Policy keyed by superagent; the Account's unique key; Eval's clock fields | model, docs, CLI, MCP |
| `11-the-tickets-plugin` | `@orthograph/tickets`: Mandate, Ticket, Subscription, Assignment (the six moves, from and to), Input (four moves), Report, Attention, Outgoing message; their events with their fields; `NoSeat`, `SeatTaken`, `ExecutorAlreadyQueued`; the two unique rules of a seat; `seq` is uint(64); `ticket.accept` is `listed.of("account")` and nothing wider | model, docs, CLI, MCP |
| `12-the-prompts-plugin` | `@orthograph/prompts`: the PromptSet, its operations, versions, `compose` for the system alone | model, docs, CLI, MCP |
| `13-the-app` | the app: mounts (five features, three adapters), environments, Settings with versions and `settings.save`, `superagent.fill` and `reap` declared by the app for the system, `@orthograph/agents`' Agent (its states, `tell`, `close`, `AgentIdled`, `AgentClosed`, `StaleAssignment`), the declared `coder`, nothing else declared; the generated CLI starts; every operation of the model is in the docs, CLI and MCP | model, docs, CLI, MCP |
| `14-the-framework-forms` | each form is accepted and in the model as its record says: `versions:` (K40 fix 2: Policy's four generated operations, `StaleRevision { current }`, a Mandate's pin), `actor:` and `agent:` (K40 fixes 1, 3), `Agent`, `Source.from` and `Source.timer` (the `sources` entries, their variables), `Blueprint.hold` (the held and unheld lists of GOAL17-pause), `Blueprint.problem` | model |
| `15-the-framework-refusals` | the refusals below, each a record states, with a named problem: `derive:`'s five (GOAL17-derived-reads), the hold's four (GOAL17-pause :133), a variable named against the record's rules (GOAL17-source-from :325), a mount that leaves out what its source uses, a mapping of an event the adapter lacks, `listed.of` with no `superagent`, a prefix no thing owns; each against a copy that passes without the fault. Three of source-from's are deferred to slice 11 (item 4b) | `ortho generate`, `ortho check` |
| `16-the-derived-reads` | `ticket.stage`, `ticket.waiting`, `superagent.health`, `proposal.waiting` and `superagent.boot` exist as GOAL17-derived-reads declares them: looks, adds, `only`, pages, budgets, who may call | model |
| `17-nothing-else-moves` | acme, plugged-in, signup, starter and work, regenerated, are the checked-in `generated/` byte for byte; the comparison is shown to see a changed, a missing and a new file | `ortho generate` |

`blueprint-names.ts` holds every list the design names, each entry with the section it comes from, and `CONFLICTS`: names two
documents spell differently, empty since GOAL17-names settled the first six. No check judges a name in `CONFLICTS`; when the design settles one, the name moves into the lists in
the same change (an author's change, since a builder never edits these).

## What the builder must make, and where the checks read it (slice 5)

The design settles most of it. These are the points it leaves open, fixed here so a check can read them. A builder who needs one
changed stops and asks its author.

1. **Where things are.** `examples/superagent/` is an app like acme (`ortho.config.ts` named `superagent`, `blueprint/`, `src/`,
   `journeys/`, a checked-in `generated/`). Its plugins are folders `plugins/{superagent,intake,tickets,prompts}/`, each a package
   `@orthograph/<name>` with `orthograph.kind` `"feature"` and `orthograph.blueprint` its `blueprint` folder as written (no build
   step: checks 15 edits a copy of a plugin's `blueprint/` files), linked in the app's `node_modules/@orthograph/<name>`.
   `@orthograph/agents` is mounted as a feature too. Mounts are `blueprint/features/<name>.ts` and `blueprint/adapters/<name>.ts`;
   a mount's name is the file's, as acme's projections are.
2. **Names.** A thing is its folder's name, kebab case (`outgoing-message`, `prompt-set`); an operation is `<thing>.<verb>` with
   the verb its file's name in kebab case (`go-live`, `request-status`, `turn-ended`, `delivery-failed`), as acme's `person.sign-up`.
   An operation a plugin declares on another plugin's thing (`trigger.handback`, `thread.follow`) is the plugin's, by the full name.
   An event is its class, `AssignmentStarted`; a move is camel case (`goLive`, `turnEnded`), as acme's moves are.
3. **The model's keys for the new forms** (`ortho model --json`; every other key is as it is today):
   - `things.<t>.versions`: `{ "key": "<a field of t>" }`; absent when the thing has none.
   - `things.<t>.roles` lists a role made with `actor:` or `agent:` like any other (`listed`, `itsMain`, `itsAgent`); an operation's
     `allowed` shows it as `{ kind: "role", role: "<thing>.<role>" }` or, through `.of`, `{ kind: "role-of", role, path }`.
   - `things.<t>.fields.<f>.optional`: `true` for a `Blueprint.optional` field (`pausedAt`), absent otherwise, as an operation's payload shows it today.
   - `things.thread.events` has `ThreadSubscribed` and `ThreadUnsubscribed` (the brief names the events, not their thing; fixed here).
   - `agents.<name>`: one entry per `Blueprint.agent`, `<name>` its file's name (`main`, `executor`): `{ file, slots? }`, `file` relative to the plugin's folder
     from the app (`blueprint/agents/executor.ts`), and `slots`, only where the declaration has one, `{ size: "<thing>.<field>", reserve: <n>, held: "<thing>" }`
     (`{ size: "superagent.slots", reserve: 1, held: "assignment" }`, GOAL17-executor-slots :88 and :520).
   - `things.<t>.invariants.<name>`: `{ kind: "unique", fields, while, refuse }`, as today.
   - an operation's `derive`: `{ looks, adds, hash }` (GOAL17-derived-reads, "How it reaches"); `looks.<name>` is
     `{ thing, by, state?, where?, take, max }` with `thing` and `by` the look's thing and the field's names, and a problems look is
     `{ kind: "problems" }`; `hash` a string. A read's `only` is the object it pins, beside today's `list: { where, order, page }`
     and `budget: { p95Ms }`; a read with no derive has no `derive` key.
   - `sources.<mount>`: `{ mount, events, calls, variables, kinds }` (GOAL17-source-from, "How a door and a poll both feed it"), `events`
     and `calls` the dotted names it uses, `variables` an object keyed by the variable's name, `kinds` every string literal in the `kind:` expression of the results of the
     source's `on` mappings, sorted and distinct (Slack's conditional `kind: e.channel_type === "im" ? "direct" : "message"`, with `"mention"`, gives `direct`, `message`, `mention`) (the record doesn't say how `kinds` is read; this is the least that can be). Only an active source is there: in slice 5, GitHub and Slack.
     PostHog has no events until slice 11 (GOAL17-names call 6), so it is not, and the checks say so. `sources.timer` is `{ mount: null, config: { every, says } }`,
     `config` an object keyed by the two fields `Source.timer` takes.
   - `holds.<name>`: `{ thing, key, while, held, unheld }`, `<name>` the identifier the declaration is exported as (`processing`);
     `held` rows `{ event, to }` and `unheld` rows `{ event, to, reason }`, `event` the event's class name and `to` the operation's
     full name (`outgoing-message.send`).
   - `problems`: a list of `{ kind, thing, of, name, failures, after }`, each a field name but `after`, which is the field name
     `failAfter` for a source and the number `3` for a channel.
   - `declared.superagents`: a list of `{ name, file, purpose, connections: [{ source }], policy: { mode, allowed }, playbook: { endsWhen } }`,
     one per `Superagent.declare`, `file` relative to the app.
4. **A refusal's wording.** `ortho check` (or `ortho generate`) exits non-zero and its output names the file written in the first
   column below and the words after it. Where a record writes the sentence, it is the sentence's parts (the mount's refusal,
   GOAL17-source-from: "does not include", the event or call as `events.issueComment` / `calls.issues.createComment`, the
   source's name, and the line to add, written with whatever the mount calls its parameter). A planted fault that TypeScript
   would also catch is written past it (`as never`), and the output must then carry no `TS` error: the model's own check refuses.

   | Fault | Names |
   |---|---|
   | a look's `by` is not the root's id | the read's file, the look, the field |
   | a look at a thing that lives as actors | the read's file, the look, the thing |
   | an `adds` name that is a stored field | the read's file, the name |
   | a list read's `where` names neither | the read's file, the name |
   | a look's `max` outside 1 to 100 | the read's file, `max`, the value |
   | a delivery of an event carrying `superagent` in neither list | the app's feature file, the event, where it goes |
   | one event with deliveries on both lists | the feature file, the event |
   | a held row of the hold thing's own move | the feature file, the event, and "own move", "deadlock" or "resume" |
   | a mapping of an event the adapter lacks | the event, "doesn't have" or "does not have" |
   | `listed.of("account")` with no `superagent` to compare | the operation, `superagent` |
   | a hold on a thing in another store | `processing`, "store" |
   | a variable ending in `_TOKEN`, or without its source's prefix | the variable |
   | an id prefix no thing owns | the prefix |

4b. **Refusals deferred, not judged in slice 5** (so check 15 proves the refusals listed in its header, not every one a record states): GOAL17-source-from :322, a `gone`
   error that is not in the reply call's errors; :324, `config` with no `me` of the `{ id, login }` shape; :326, a connection naming an event no `Mapped.kind` produces;
   the second half of :325 (`environment.of` returning a key not in `variables`) because only a run reads `of`. Each is a fault TypeScript catches in the source's own file,
   or a value only a running mapping gives, so the model's check can't be shown to refuse it alone. Slice 11's checks take them. GOAL17-derived-reads' fifth refusal and
   GOAL17-pause's three more are in 15.

5. **Two notes from the throwaway.** A thing named `eval` makes the generated CLI unloadable (`const eval = ...` is a syntax error in
   strict mode): the generator must make a reserved word a safe identifier and keep the operation's name `eval.due` (GOAL17-names call 1); check 13 starts the CLI. And two pairs of
   things collide on refusal codes (`proposal` and `prompt-set` on `PR-`, `superagent` and `subscription` on `SU-`): Proposal and
   Subscription take an explicit `code` (GOAL17-names).
6. **`SUPERAGENT_APP=<folder>`** points the checks at another app. It is for an author's fairness proof, never CI.
7. **The held, sources and actor refusals edit the design's own text.** Check 15 edits a copy of `blueprint/features/superagent.ts`
   (the `held:` and `unheld:` lists, rows written `{ event: tickets.events.X, to: input.operations.route }`),
   `blueprint/adapters/github.ts` (one `x.include(x.events.issueComment)` per line), and the plugins' `blueprint/sources/github.ts`,
   `blueprint/things/ticket/verbs/accept.ts` (a `payload: { ... superagent: ... }`) and `blueprint/things/assignment/thing.ts`
   (`Blueprint.id("sag")`), as the brief and records print them. A builder who writes them another way tells the author, who changes
   the edit, not the builder the file.

## Outside this folder, for whoever lands this

- `.github/workflows/ci.yml` needs an `e2e-superagent` job like `e2e-m8`'s, running `e2e:superagent-ratchet`.
- `tools/ci/builder-paths.sh` lets a `-build` branch shrink only M1's and M2's lists: add `e2e/superagent/expected-failing/`,
  or slice 4's builder cannot take its lines off the list.
- `e2e/project.json` and `e2e/vitest.superagent*.config.ts` register the checks, as M8's are.

# Goal 17's checks: stage one's behaviour (slice 6)

Written before slice 7 builds stage one's handlers, by an author who builds none of them. Slice 6's done-when is "they fail on
empty handlers"; slice 7's is "slice 6 passes". These checks say what today's journey harness can say: a signed-in person, an
anonymous caller and the system as callers, one call at a time, the call's own answer, events and refusals, and a thing's state.
What it cannot say waits on `GOAL17-check-harness` and is listed below, so nothing here is invented to fill the gap.

| Check | What it proves | Reads |
|---|---|---|
| `18-reading-prove` | the way `19` reads prove's report is sound: each hollow reading (a journey that did not run, ran twice, stopped, ran other or fewer steps, or had a red step) is refused and named; each journey file has the steps `19` expects | the fixtures; planted reports |
| `19-stage-one-journeys` | six journeys on a copy of the app, run by `ortho prove`, every step green: a stale policy save refused (12 steps); an account seen once (10); a trigger twice stored once (4); the gate lets the right ones through (19); an eval batches a thread (6); the stage read is served (4) | prove's `--report` |
| `20-the-stage-table` | the stage table, row by row and pair by pair (33 cases, each expected value from the record), and `closing` named as stopping; the judge is shown to refuse 22 planted wrong tables | `stageOf` |
| `21-accept-and-stop-write-what-the-design-says` | `ticket.accept` writes its five records in one database step, and `ticket.stop` declares the one step that writes the ticket, the mandate it withdraws and the assignment it closes | `ortho model --json` |

## What the builder must make, and where the checks read it (slice 6)

The design settles most of it. These are the points it leaves open, fixed here so a check can read them. A builder who needs one
changed stops and asks its author.

1. **Where the journeys are.** `e2e/fixtures/superagent/stage-one/journeys/*.ts` and `.../starting-worlds/*.ts`. `stage-one.ts` copies
   them into a copy of the app (`journeys/` and `blueprint/starting-worlds/`), generates, and runs `ortho prove --env local --report`.
   A builder never edits them. The app's own `journeys/` is the builder's.
2. **Who calls.** `trigger.receive`, `account.seen` and `eval.due` are called as the system (their declared `allowed`), standing in
   for the source's caller and the clock; `account.list`, `account.unlist`, `policy.*` and the reads as a signed-in person.
3. **A superagent needs an Agent first.** `superagent.create` takes `main`, a reference to an Agent that exists (the framework
   refuses an unknown id with `AgentNotFound` before any handler runs, shown by prove), so the starting world calls `agent.open`
   (`kind: "main"`, `about: "superagent/stage-one"`) as the system and passes its answer. Four of the six journeys start there, so
   they pass only once `agent.open` has a handler (slice 9's runtime, or a thin one in slice 7).
4. **A connection is `{ source, config }`.** The world's one connection is `{ source: "slack", config: { me: { id: "UBOT", login:
   "agent" }, channels: ["C1"], directMessages: false } }`, as `slackSource`'s `Config` says. A trigger on it is `source: "slack"`,
   `thread: "C1:<ts>"`, `channel: { channel: "C1", ts }`, `author` the sender's outside id (`external`), absent for no sender.
5. **"Addressed" is the trigger's `kind`.** `mention` and `direct` address the agent; any other kind does not. Slack's mapping gives
   `kind` and `addressed` the same two words, and `trigger.receive`'s payload has no `addressed` (a gap, below).
6. **The first policy is a save from base 0.** `superagent.create` makes no Policy (its payload has no `policy`, a gap, below); the first
   `policy.save` is `base: 0n` and answers revision 1. `allowed`, `bots` and `admission` are stored and read back as written; a `bots`
   entry is `"<source>:<external>"`, as an `allowed` one is in the brief's `Superagent.declare`.
7. **What `trigger.receive` answers.** `outcome` is `stored`, `duplicate` or `filtered`. Only `stored` records anything: the call's
   journal then holds `TriggerReceived`. `duplicate` and `filtered` record nothing (`noEvents`), and an event the gate filtered,
   delivered again, is `filtered` again (it was never kept). A duplicate answers the first trigger's id.
8. **`account.seen` of a known account** answers its id, records nothing and leaves its state (a person's listing is never undone by a source).
9. **`policy.history` rows** are `{ revision, at, by, from }` as numbers and a person id (GOAL17-slice5-forms call 7), newest first; a
   save's `from` is its `base`. What a restore's `from` is, the records do not say, so no check reads it.
10. **`eval.due`'s `started`** counts the evals one pass made: one per thread with a waiting trigger and no eval running on it.
11. **The stage table's labels** are the record's: "Ended", "Input undelivered", "Awaiting answer", "Awaiting review", "Queued",
    "Waiting for a Trigger", "Working"; the blocked and failed row's label must say which (the record's one "Blocked · Failed" is read as
    two). A closing Assignment on an open ticket is labelled "Stopping" by `stageOf`; no record words its `stage` or `why`, so the check
    pins only the label and that nobody is waited for (`working` or `idle`, with `none` or `queued`), and that a ready report or a
    question above it still wins.
12. **`ticket.stop`'s one database step** is any step the builder names, of type `database`, whose `writes` include `ticket`,
    `mandate` and `assignment`; `ticket.accept` has exactly one database step, which writes `ticket`, `mandate`, `subscription`,
    `assignment` and `input`.

## What waits on `GOAL17-check-harness`

Each is a journey or a step a check in this slice should hold and the harness cannot say yet. They are written when the record lands.

- **A caller that is an agent or an outside account.** A cast member can be a signed-in person, anyone, the system or a service; not the
  main agent (`itsMain`), an executor (`itsAgent`) or a listed outside account (`listed.of("account")`). So no journey calls
  `decision.route`, `eval.decide`, `ticket.report` (the executor's), or `ticket.accept` (a listed account's).
- **Running an outbox hop.** `TriggerReceived` to `input.store`, `InputStored` to `input.route`, `PolicyChanged` to `ticket.policy-changed` and
  every hop of the app's `pausable` list are declared and never run in prove's world.
- **Restart, the stand-in model's script and call count, `Timers` stepping, reading `_outbox` rows.**

What they leave out of slice 6's list, by name:

| Slice 6 check | What is in this slice | What waits |
|---|---|---|
| every gate cell of `002` | the cells a journey can reach by outcome (`19`, the gate) | the explicit-versus-inferred line itself; a follow-up on a thread with a ticket; a table cell set by hand; the gate as a pure module (`gate/types.ts` has no `TriggerView`, `ThreadView`, `TicketView` or `PolicyView` in any record) |
| an accept making all six records in one commit | the five records of one database step (`21`) | the journey that runs it (a listed account calls it, and asserts each record's event); the sixth, the executor, is an Agent in its own store (a gap, below) |
| `observe` recording "would accept" and starting nothing | nothing | `decision.route` called by the main agent, then reading the Decision and the absence of a Ticket |
| a follow-up reaching its ticket with no eval | nothing | a ticket, the `TriggerReceived` hop, and a read of the Input |
| a policy change restarting a live eval | nothing | the `PolicyChanged` hop and a read of the Eval |
| stop withdrawing the mandate; `ticket.stop` picks `cancelled` or `interrupted`; a stop after a handoff closes the Assignment on the Agent | the declared step (`21`) | a ticket, then the stop, then the Mandate's, the Assignment's and the Agent's state |
| the stage read's every row | the table (`20`), and the read served for an empty page, a missing ticket and who may call (`19`) | a ticket in each row, through the served read |

## Gaps in the records, found while writing these

None is invented here; each is what a check could not pin.

1. `trigger.receive`'s payload has no `addressed`, no sender `login` and no `bot` flag, though GOAL17-source-from says the mapping's `addressed` and the
   actor's `bot` reach the gate. The journeys use `kind` and `account.seen`'s `bot` instead (points 4 and 5).
2. `superagent.create`'s payload has `main` (an Agent that must exist) and no `policy`; the brief's runtime example passes `policy:` and a main agent
   made by create. Points 3 and 6 are how these journeys live with that.
3. `ticket.accept`'s payload has `agent` (an executor that must exist), and an Agent lives in its own store, so "the executor in one commit"
   cannot hold as the brief words it. `21` pins the five records the step declares.
4. `policy.restore` declares a move from `current` and has no row to move; `versions:` has no run-time here yet (K40 says the four
   operations are generated). What slice 7 must do is serve `versions:`, not write four handlers.
5. `Thread`'s moves `queue`, `evaluate` and `release`, and `Eval`'s `evaluate`, have no operation, and `eval.due` has no move: a journey
   cannot see a thread wait or an eval start except by `started`. Where a trigger's thread waits is not stated.
6. The label, stage and reason of a closing Assignment's row (point 11), and the `off` mode's effect on a listed bot (`002` says nothing
   inferred is admitted; no record under `design/` does).

## Running them

```bash
pnpm vitest run --root e2e --config vitest.superagent.config.ts superagent/18   # the controls: no prove, a second
pnpm vitest run --root e2e --config vitest.superagent.config.ts superagent/19   # one prove run for the six journeys: about 40 seconds
pnpm vitest run --root e2e --config vitest.superagent.config.ts superagent/20 superagent/21
SUPERAGENT_APP=<folder> ...                                                      # an author's throwaway app that should pass
```
