# How Orthograph fits together

This is the companion to [The plan that compiles](the-plan-that-compiles.md). That essay makes the case. This one
shows the machinery: each part, what it is for, and how the parts meet. Every example is from Plugged In, the
link-in-bio app Orthograph is being built against, and every command output was produced by running it.

Each part carries one of four marks, the same ones the reference docs use:

- **runs today**: in the code, and checked by a test or a run;
- **being built**: a goal is building it now;
- **decided for 1.0**: designed and written down, not built;
- **open**: not settled yet.

The paths are on the branch where stage 1 is built, `goal/stage-1`.

## The shape in one paragraph

You write a **blueprint**. A compiler turns it into one **model**. **Projections** render the model into
`generated/`: the server, the API, the SDK, the command line tool, the MCP tools, the docs and the portal. You write
**handlers**, one per operation, inside **frames** the model generated. **Journeys** say what the system must do,
and `ortho prove` runs them in a **world** and judges the result. **Plugins** add to all of this in five kinds. What
flows down is the description. What flows back up is evidence: drift, verdicts, and what a change made stale.

## The blueprint

The blueprint is a folder of TypeScript files, one declaration per file. A declaration's name comes from its path,
so `blueprint/things/handle/verbs/claim.ts` declares the operation `handle.claim`, and that name is never typed as a
string anywhere else. **Runs today.**

These are the ideas you declare:

| Idea | In one sentence |
|---|---|
| **thing** | A noun with an id and fields, such as a handle or a link. |
| **value** | A named field type that says what it is everywhere, such as a handle's name. |
| **machine** | A thing's states and the moves between them. A move from the wrong state is refused for you. |
| **operation** | A verb on a thing: its payload, answer, move, steps, who may call it, its budget. |
| **read** | An operation that changes nothing. |
| **refusal** | A declared error, with a stable code such as `HN-001` and an exit code for the command line. |
| **event** | What a move records, named for what happened: `HandleClaimed`. |
| **role** | Who may call, as a rule over a thing, or a built-in such as `signedIn` or `anyone`. |
| **rule** | Something true across many records, such as "one holder per name", and the refusal when it breaks. |
| **journey** | A story through real operations, played by a cast. It is the spec. |
| **starting world** | A named setup, made only by running operations. |
| **environment** | Where the app runs, who signs in, and its database. |
| **mount** | One file that says "use this plugin here". |

A handle, its lifecycle and its events are three short files:

```ts
// blueprint/things/handle/thing.ts
export const Handle = Blueprint.thing({
  description: "A public name that belongs to one person until they release it, and is the address of a public page.",
  code: "HN",
  fields: {
    id: Blueprint.described(Blueprint.id("hdl"), "The handle's own id."),
    name: HandleName,
    owner: Blueprint.described(Blueprint.id("per"), "The person who holds the name."),
  },
});

// blueprint/things/handle/machine.ts
export const machine = Blueprint.machine(Handle, {
  states: ["claimed", "released"],
  moves: {
    claim: { from: [], to: "claimed", emits: HandleClaimed },
    release: { from: ["claimed"], to: "released", emits: HandleReleased },
  },
  notFrom: { exit: 11 },
});

// blueprint/things/handle/events.ts
export const HandleClaimed = Blueprint.event({ handle: Handle.fields.id, name: Handle.fields.name });
```

Every description you write there travels. The sentence on `HandleName` becomes the help text for the command
line's `--name` flag, the field's row in the docs, and its description in the model.

**Blanks** let a plan admit what it doesn't know yet. `Blueprint.todo("the states a handle can be in")` compiles,
and `ortho check` names every blank until it is filled. A plan with gaps is honest about them, and an agent can
find each one. **Runs today.**

## The model

`ortho check` compiles the blueprint into the model, one JSON file at `generated/model/model.json`. Every
declaration is in it with a hash and a list of what it depends on. **Runs today.**

The model is the one source every other part reads. No projection reads the blueprint directly. That has two
consequences. Every output agrees, because they all render the same facts. And staleness is cheap to compute: a
change is a hash that moved, and the model already knows what depends on it.

## Projections: what the model becomes

A projection renders the model into one kind of output. Each is a plugin, mounted by a one-line file the project
owns:

```ts
// blueprint/projections/cli.ts
// Scaffolded from @orthograph/projections 0.0.0. Yours from now on.
import { Blueprint } from "orthograph";
import { cli } from "@orthograph/projections";

export default Blueprint.use(cli);
```

Plugged In mounts seven: the model, the API, the server, the SDK, the command line tool, MCP and infra. Docs and
the portal are built into the generators today. Each generated file opens with a line such as
`// Generated from blueprint/projections/sdk.ts. Do not edit.`, and `ortho check` fails if any of them differs from
what the model renders. **Runs today.**

Here is what one declaration becomes in the command line tool (an excerpt of the help; the global flags are cut):

```text
$ plugged-in handle claim --help
DESCRIPTION
  Claim a free name and make it the address of your public page, with its profile. Creates a handle, which starts claimed.

USAGE
  plugged-in handle claim [flags]

FLAGS
  --name handle-name    A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page. Text.
```

And in the generated docs page for the same operation, the refusals table (aligned here for reading):

```text
| refusal             | exit | code   | when                                                                        |
| HandleTaken         | 10   | HN-001 | another claimed handle holds this name; by the rule handle.oneHolderPerName |
| HandleAlreadyOwned  | 12   | HN-002 | you already hold a name; by the rule handle.oneNamePerPerson                |
| NotAllowed          | 3    | AR-001 | the caller isn't anyone signed in; the handler never runs                   |
| IdempotencyConflict | 120  | AR-002 | the request key was first used with another payload; the handler never runs |
```

Below that table, the docs page lists worked examples. They are the journeys' steps, retold in sentences, so the
docs can't describe behaviour the system doesn't prove.

**The grid** keeps "falls out" honest. It is a table of building blocks (refusals, events, budgets, roles and the
rest) against outputs, and each cell switched on is an automated check that the output carries that block, for every
subject in the app: does the SDK carry the events, does the command line carry the refusals. That comes to 331
checks, and all of them pass in CI.
**Runs today.**

## Handlers in frames

A handler is the work inside one operation, and it is the only freehand code in a project. Two files meet in it.

The **frame** is generated, every time:

```ts
// generated/api/src/handle/claim.handler.ts
// Generated from blueprint/projections/api.ts. Do not edit.
// What the handler is given: its payload and steps; what it may return: its answer or a declared error.
export type Handler<R = Records | SqlClient.SqlClient | Auth> = Of<typeof declaration, R>;
```

The **scaffold**, `src/handle/claim.ts`, is written once and is yours from then on. It opens with
`// Scaffolded from blueprint/things/handle/verbs/claim.ts. Yours from now on.` and a header that explains the
operation to whoever fills it in: who may call, the payload and answer, every refusal with its code and where it
comes from, the machine with this move marked, and a list headed "What the runtime does, so this handler
doesn't". **Runs today.**

So one rule tells you which files to touch: a file that says "Generated from" is never edited, and a file that says
"Scaffolded from" is yours.

The frame's type fixes what the handler is given, what it must answer and which errors it may fail with. A handler
that returns the wrong shape, or fails with an error the operation never declared, doesn't compile. What a type
can't catch, such as forgetting to make the move, the journeys catch.

An agent asked to write a handler gets a brief generated from the model. This is real output:

```text
$ ortho brief handle.claim
brief handle.claim

Write   src/handle/claim.ts, and nothing else.

Read
  blueprint/things/handle/verbs/claim.ts  the declaration: payload, answer, move, steps, errors
  generated/api/src/handle/claim.handler.ts  what the handler is given and may return
  generated/docs/handle/claim.md  the same, in words, with every refusal
  generated/docs/handle/index.md  the handle: fields, machine, roles

Do
  run step handle.claim.record (database) through steps.record(...)
  make the move with move(): claim, emitting HandleClaimed
  never refuse HandleTaken or HandleAlreadyOwned or NotAllowed yourself: the runtime does, before the handler runs

Don't touch
  blueprint/**
  journeys/**
  generated/**

Done when
  ortho prove --env local passes, with handle.claim's 9 evals: answer shape, declared errors, machine path, events, who may call, steps, performance, coverage, explainability
  and the journeys that call it: journeys/a-name-is-claimed-once.ts, journeys/a-stranger-cannot-edit-a-page.ts, journeys/claim-a-handle.ts, journeys/release-a-handle.ts, journeys/the-story.ts
  ortho check passes
```

(Shortened: the real brief lists a few more folders under "Don't touch" and one more line under "Do".)

That brief is the plan, narrowed to one task, with its own definition of done. Nobody wrote it.

## One enforcer per operation, many doors

Every operation is decided in exactly one place, the **served operation** on the server. It decodes the payload,
checks who may call, checks the machine, runs the handler, enforces the rules, records the event and commits. Every
way in reaches that place: an HTTP request, the SDK, the command line tool built on the SDK, an MCP tool. None of
them decides anything on its own. So a refusal is the same whether it came from a person at a terminal or an agent
calling a tool. **Runs today**, for HTTP, the SDK, the command line and MCP.

Two more doors are **being built**: an **action** per operation, one typed call a screen or an agent in the browser
can make, holding no authority of its own; and a **piece** per operation, the generated part of a screen, such as the
claim form with its fields, help text and refusals in place.

Where the served operation runs is set by two choices the project doesn't make per operation. The **language** is
what handlers are written in: Effect, today. The **host** is where the code runs and how it is deployed: Cloudflare
Workers, with D1 for the database and Durable Objects for actors, today. Making language and host kinds of plugin, so
the same blueprint could put an operation on a chain in Solidity, is **decided for 1.0**.

## Plugins, in five kinds

A plugin is built once and mounted anywhere, by one file. There are five kinds:

| Kind | What it adds | Where it stands |
|---|---|---|
| **feature** | more of what the system is: things, operations, handlers, journeys | mounting **runs today**; one feature exists, `@orthograph/wallets` |
| **adapter** | what is outside the system: calls out, events in, a stand-in for worlds | the descriptor **runs today**; no real adapter yet; Stripe and Resend are designed, and off 1.0's path |
| **projection** | how people and programs reach the system | **runs today** for seven outputs; docs and the portal are still built in |
| **language** | what behaviour is written in | **decided for 1.0**; Effect is a package today |
| **host** | where it runs, how it is reached and deployed | **decided for 1.0**; Cloudflare is a package today |

The difference between the first two matters. A feature changes what the system is. An adapter only brings
something outside within reach, and adds no things or operations of its own. Stripe is an adapter: the app's refund
operation calls Stripe as a declared step, so the call is a span, its failures are typed values, and a stand-in plays
Stripe in every world.

`ortho add feature @orthograph/auth` writes the mount, pins the version, refuses a version less than three days old
and lists what the feature needs that the app doesn't yet provide. **Runs today.**

There is a rule about when code becomes a plugin: build it inside an app first, use it, climb its journeys green,
and only then extract it. Plugged In's handle is the next candidate, to become `@orthograph/handles`. Sign-in
(`@orthograph/auth`) and organisations (`@orthograph/organizations`) are next after that. All three are **being
built** for the beta; today sign-in runs inside the Cloudflare host and each app gets a copy of its things.

## Journeys and starting worlds

A journey is a story through real operations. Here is part of "claim a handle", as its author wrote it (an excerpt):

```ts
// journeys/claim-a-handle.ts
// Journey-author file. The builder of handle.claim never edits it (AGENTS.md, ...).
export default Blueprint.journey("claim a handle", {
  cast: { aaron: Blueprint.signedIn, visitor: Blueprint.anyone },
  steps: (s) => [
    s.step(
      "a name nobody has claimed does not resolve",
      s.visitor.run(resolve, { name: "firstpage" }),
      refuses(HandleNotFound),
      noEvents(),
      spans({ present: ["handle.resolve", "handle.resolve.load"] }),
    ),
    // two more steps
    s.step(
      "aaron claims the free name",
      s.aaron.run(claim, { name: "firstpage" }),
      expect((a) => a.handle).toMatch(/^hdl_[0-9a-z]+$/),
      emits(HandleClaimed, { handle: s.last.handle, name: "firstpage" }),
      machine.isIn(s.last.handle, "claimed"),
      spans({ present: ["handle.claim", "handle.claim.record", "handle.claim.commit"] }),
    ),
    // four more steps
  ],
});
```

Each step names a caller, an operation and what must be true afterwards: the answer, the refusal, the event, the
state, the spans. It imports the operation itself, not a URL, so a renamed operation breaks the journey at compile
time rather than at run time.

A **starting world** is a setup that journeys share, and it is made only by running operations, never by writing
rows into a database. So a starting world can't contain a state the system couldn't reach on its own:

```ts
// blueprint/starting-worlds/claimed.ts
export default Blueprint.startingWorld("claimed", {
  cast: { aaron: Blueprint.signedIn },
  makes: (s) => [s.aaron.run(claim, { name: "claimedname" }, { request: "first-claim" })],
  gives: (s) => ({ handle: s.last.handle }),
});
```

Three working rules make journeys a fair judge. A different agent from the builder writes them. They must fail on
empty handlers before building starts; `ortho prove --empty` runs them against the scaffolds and labels any step
that passes anyway "proved by the description", so nothing passes by accident unseen. And the builder never edits
them; on this project's protected branches that is a required check. `ortho add journeys handle` writes a stub
journey for every path through the machine, every role and every declared refusal, for an author to fill in. All of
this **runs today**.

## Proving

`ortho prove` starts a **world**: the real server on the local Cloudflare runtime, a real database, and a collector
for telemetry. It makes the starting worlds, runs every journey, waits for every call's spans, and then judges nine
**evals** for every operation, from that evidence and never from what the server says about itself:

1. **answer shape**: every answer decodes against its declaration, and no secret appears in any span or log;
2. **declared errors**: every refusal is one the operation declares, with the code the model gave it;
3. **machine path**: every move ends in a declared state, and the stored state is where it ended;
4. **events**: every move that happened recorded its event;
5. **who may call**: a caller without the role is refused;
6. **steps**: every declared step of an answered call ran in its own span;
7. **performance**: the 50th and 95th percentiles against the budget, a note for review over 1.5 times, never a
   failure;
8. **coverage**: every operation, move, outcome and declared refusal is reached by some journey;
9. **explainability**: every declared refusal logs the fact that decided it.

This is Plugged In today, shortened:

```text
$ ortho prove
journey a name is claimed once ✔ 5/5 steps
journey a stranger cannot edit a page ✔ 8/8 steps
journey add, order and remove a link ✔ 12/12 steps
journey anyone reads a public page ✔ 5/5 steps
journey claim a handle ✔ 8/8 steps
journey release a handle ✔ 13/13 steps
journey a person claims a page and shares it ✔ 5/5 steps
handle.claim 9 evals ✔ p50 18ms p95 61ms budget p95 150ms
link.add 9 evals ✔ p50 22ms p95 250ms budget p95 150ms
...
coverage ✔ moves 4/4 · outcomes 4/4 · refusals 6/6 · runtime refusals 6/7 (not counted: IdempotencyConflict, which no journey can cause: a step cannot send a second payload under a held request key)
prove ✔
```

Notice two honest lines in it. `link.add` answers within its budget at the median but not at the 95th percentile,
and the full report says so as a line for review. And coverage says plainly which refusal no journey can reach yet,
and why. **Runs today**, on one machine. Proving against a deployed staging address is built and checked, and has not yet been run against a real account.

## Staleness, and the climb

After a full prove, Orthograph records what each passing operation's proof rested on: the hashes of its declaration,
its thing, what it refers to, and its handler. `ortho impact` compares today's project with that record. Here it is
right after the prove above, and then again after one line of the claim handler was changed:

```text
$ ortho impact
stale none
proven handle.claim, handle.release, handle.resolve, link.add, link.order, link.remove, profile.get

$ ortho impact
stale handle.claim
proven handle.release, handle.resolve, link.add, link.order, link.remove, profile.get
```

`ortho prove --changed` then reruns only the journeys whose inputs moved. **Runs today**, locally. CI doesn't read
the record yet, so every CI run proves everything.

The line that was changed was `yield* move()`, commented out. The handler still compiled. Prove did not pass it:

```text
$ ortho prove --changed
prove --changed: proving 7 of 7 journeys
journey claim a handle ✘ 4/8 steps
  ✘ "aaron claims the free name": expected HandleClaimed, journal has nothing
  ✘ "aaron claims the free name": hdl_udrs646ervretifg is in no state, expected "claimed"
  ✘ "aaron claims the free name": handler src/handle/claim.ts, declared in blueprint/things/handle/verbs/claim.ts (handle.claim)
...
handle.claim machine path ✘ claim-a-handle "aaron claims the free name": answered without making its move claim
handle.claim events ✘ claim-a-handle "aaron claims the free name": move claim emitted no HandleClaimed
handle.claim 3 of 9 evals ✘ p50 18ms p95 162ms budget p95 150ms
prove ✘ 30 failing
```

Every claim journey depends on that operation, so all seven reran. Every failing step names the handler to open
and the declaration it answers to. This is what an agent reads on each turn of a climb: not a stack trace from a
test it wrote, but a verdict on the plan, with directions.

## The portal

Every project gets a portal, served by its own Worker at `/portal`. It opens on the app's things, operations,
lifecycles, rules, traces and journeys, under the model's names, with each operation's latest verdict: proven,
failed, stale with the declarations that changed, or unproven. Live calls from `ortho dev` and from a prove feed its
traces. **Runs today**, with parts missing: calls and metrics are thin, and the monitor is a placeholder. A new
portal on UI SDK, replacing the current one built on HeroUI, is **being built**.

## Screens

Orthograph's screens are built in layers, and only the top layer is the app author's. **Being built**, for the beta:

1. the blueprint says what things mean;
2. an **action** per operation, generated: who calls, the payload check, the refusals, and asking a person to
   approve once when the operation needs it;
3. a **piece** per operation, generated: a UI SDK component bound to its action, such as the claim form with its
   field, its help text and `HN-001` shown under the field when the name is taken;
4. the app's own pages and components, written by hand: the layout and the words;
5. UI SDK's widgets underneath: inputs, buttons, dialogs, focus, keyboard, screen readers and the bridge an agent in
   the browser uses.

The app's map (its pages, routes, who may open each, and what each shows and offers) is declared in the blueprint
under `blueprint/app/`. A component of the app's own that shows a read and offers operations, such as Plugged In's
list of links that can be reordered and removed, declares its wiring there too, and its behaviour stays in code.
The map is **being built**, and the component declaration is **decided for 1.0**, so docs, an agent's map of the app
and journeys through the pages can all read them.

## One feature, start to finish

Here is the loop, as stage 1 of Plugged In went through it. The commands are the real ones.

1. **Name the idea in a sentence.** "Claim `@name`; a public page of links."
2. **Declare the things.** `ortho add thing handle` writes the thing, its machine, roles, events, errors, rules and
   values, with a blank in each place a decision is needed. Fill in what you know.
3. **Declare the operations.** `ortho add operation handle.claim`, once per verb. Each is a file like the one in the
   first essay.
4. **Write the journeys first.** `ortho add journeys handle` writes stubs. A different agent fills them in. On empty
   handlers they must fail: Plugged In's seven journeys started at 0 of 56 steps.
5. **Check.** `ortho check` reports blanks, types, rules, drift and ratchets. Plugged In today:

   ```text
   $ ortho check
   blanks left 0
   types ✔
   rules ✔
   drift ✔
   ratchets 0
   check ✔
   ```

6. **Climb.** `ortho generate` writes `generated/` and scaffolds a handler for each operation. The builder runs
   `ortho brief handle.claim`, writes the handler, runs `ortho prove`, reads the verdict, and repeats. The first
   journey went from 3 to 8 of 8 steps in four runs.
7. **When the plan is wrong, fix the plan.** That climb stopped at 5 of 8 because the blueprint gave a handler no way
   to find a person's own handle. The fix was two one-line rules in the blueprint, not a workaround in a handler.
8. **Watch what goes stale.** After any change, `ortho impact` names what it unproved, and `ortho prove --changed`
   reruns only that.
9. **Use it.** `plugged-in handle claim --name firstpage` against `ortho dev`, or the same operation as an MCP tool
   from an agent, or, once the beta's screens land, the claim form on a page.

All seven journeys now pass, 56 of 56 steps, as a required check on the stage 1 branch.

## What is not here yet

This page has marked each part as it went. The larger gaps, together:

- Orthograph is not on public npm. The preview puts it there.
- Journeys call the server over plain HTTP. Proving a journey through the SDK, the command line, MCP or a screen is
  being built.
- There is one host and one language.
- The journey language can't yet send a malformed payload, compare one answer with the one before it, or give each
  journey a world of its own.
- Workflows, durable agents inside an app, time-driven moves and the on-chain stages are designed for 1.0, not built.

---

Sources, at `origin/goal/stage-1` `eb3ff614`: `examples/plugged-in/` (every quoted file); `ortho check`, `ortho prove`,
`ortho impact`, `ortho brief handle.claim` and `plugged-in handle claim --help`, run on 22 November 2026 in a clean
checkout of that commit; `design/model/README.md` (the layers, the ideas, the loops, the plugin kinds);
`design/scope.md` (status and the grid); `design/decisions/K27-three-plugin-kinds.md` on the canon branch (language
and host as kinds); `design/decisions/K29-ui-layer.md`, `K31-app-map.md` and `K36-composite-components.md` (screens);
`packages/prove/src/modules/evals/README.md` (the nine evals); `packages/portal/README.md` (the portal).
