# The hard questions

A framework that says "describe it once and the rest falls out" has heard the same objections for twenty years, and
most of them were right about the frameworks they were aimed at. This page takes each one in its strongest form and
answers it, saying what is built and what is only decided. It assumes you have read
[The plan that compiles](the-plan-that-compiles.md); the parts are explained in
[How Orthograph fits together](how-it-fits-together.md).

## Isn't this just spec-driven development with extra steps?

**The objection.** Plan mode and tools such as Spec Kit already make the agent write a specification and a plan
before code. Why not use those?

**The answer.** Use them. They are right about the order of work, and Orthograph keeps that order. The difference is
what the plan is made of. A specification in markdown is read by the agent and interpreted again in every session,
and nothing checks the code against it. A blueprint is compiled. The compiler refuses a plan that doesn't hold
together, the generators turn it into every output, and prove judges the running system against its journeys. The
markdown plan is advice to the agent. The blueprint is a constraint on the code.

The two fit together well. Talk the problem through in plan mode, then write the result down as declarations
instead of prose.

## Isn't this just Rails?

**The objection.** Rails had generators, conventions and names from paths in 2005. This is scaffolding with a new
coat of paint.

**The answer.** Part of it is the same, and that part is borrowed on purpose. Names come from paths. A handler is
scaffolded once and then belongs to you, as a Rails scaffold does.

The rest works the other way round. A Rails generator runs once, and from then on the code is yours to keep in step
with everything else by hand. Orthograph's generated files are never yours. They are remade from the model on every
generate, and `ortho check` fails if one differs from what the model renders. One declaration feeds the server, the
SDK, the command line tool, the MCP tools, the docs and the portal at once, and when it changes they all change.
Rails has no model of the system to judge against, so it has nothing like `ortho prove` or `ortho impact`. Its
conventions tell you where code goes. Orthograph's blueprint tells you what the code must do, and checks it.

## Isn't this low-code?

**The objection.** Low-code tools promise the same thing and cap you at whatever the vendor drew.

**The answer.** Low-code hides behaviour behind a visual tool. Orthograph does the opposite: it takes away the code
around behaviour and leaves behaviour as ordinary code. A handler is plain Effect code in your repository, in your
editor, reviewed in your pull requests. The blueprint is TypeScript, in git, not a diagram in someone's database.
The generated output is plain files you can open and read. Nothing runs that you can't see.

## Didn't model-driven development already fail?

**The objection.** UML and model-driven architecture promised to generate systems from models. They failed, and
this looks like another try.

**The answer.** They failed for reasons worth naming, and the design answers each one.

- **The model couldn't express behaviour**, so generated code was edited by hand, and the model and the code came
  apart. In Orthograph behaviour was never meant to be in the model. It lives in handlers, which are code, and the
  generated files around them can't be edited at all.
- **Round-tripping**, keeping a diagram and code in step in both directions, never worked. Orthograph doesn't try.
  Description flows one way, from the blueprint to the outputs. What flows back is evidence, never edits.
- **The model was a separate artifact in a separate tool.** A blueprint is typed code in the same repository as
  everything else, checked by the same compiler, reviewed in the same pull request.

The real test is whether the line between declaration and behaviour holds in practice. In Plugged In it does: about
120 lines of handler behaviour, no generated file edited, and every journey green.

## Isn't the blueprint just more code to write?

**The objection.** You've moved the work, not removed it.

**The answer.** Yes, the blueprint is code, and that is the point: it is the plan in a form a compiler can check.
But it is a small amount of code that replaces a large amount of repetition. Plugged In's first stage is about 370
lines of blueprint and 510 lines of journeys. From those, Orthograph generates about a thousand lines of
application code and six hundred lines of docs, and every one of those lines agrees with every other.

The deeper saving is in reading. A reviewer who wants to know whether a name can be claimed twice reads one rule in
`invariants.ts`. In a hand-written system they would read the route, the service, the database schema, the client
and the tests, and hope they agreed. Here they can't disagree: that rule becomes a partial unique index in the
generated database schema, a refusal in the server, a typed error in the SDK and a row in the docs.

```sql
-- generated/server/migrations/0001_things.sql
CREATE UNIQUE INDEX "handle_oneHolderPerName" ON "handle" ("name") WHERE "state" IN ('claimed');
```

## What happens when I hit the generator's ceiling?

**The objection.** Every generator has a ceiling. The day you need something it can't make, you're stuck.

**The answer.** There are ceilings today, and here are the real ones:

- one host, Cloudflare Workers, and one language for handlers, Effect;
- no real adapter for an outside service yet; Stripe and Resend are designed, not built, and off 1.0's path;
- no workflows for work that waits days, no agents running inside an app, no moves made by time;
- a journey can't send a malformed payload or compare one answer with the one before it;
- no generated screens yet; they are being built for the beta.

There are three ways past a ceiling, and none involves editing a generated file.

**Inside a handler**, you have ordinary Effect code with the runtime's services. If it can be written in TypeScript,
it can be written there.

**As a plugin**, you add what is missing. A projection is a plugin, so a new kind of output is a plugin you write.
A new outside service is an adapter. New things and operations, packaged for reuse, are a feature.

**In the framework**, when the plan itself needs a new kind of declaration. This is the expensive route, and it is
honest to say so. Screens are an example: an app's own components don't follow from any one operation, so a way to
declare a component's wiring, while its behaviour stays hand-written, was added to the design.

One question here is still open, and the reference docs say so. An adapter maps an outside service's errors onto
the app's own refusals, and that mapping is hand-written. It isn't a handler. Either it counts as behaviour, or
"behaviour is the only freehand code" needs a second freehand place. The slice that builds adapters has to decide.

## Am I locked in?

**The objection.** Once the whole app is generated from Orthograph's model, you can never leave.

**The answer.** Less than it sounds, and more than zero. The blueprint is TypeScript you own. The generated code is
committed to your repository as plain files. Your data is in ordinary tables: the generated schema for Plugged In is
a few `CREATE TABLE` statements on D1, Cloudflare's SQLite database. If you stopped running `ortho generate`
tomorrow, the files would still build and run, and from then on they would be yours to maintain by hand.

The honest cost is the runtime. Generated code imports Orthograph's own packages, the Effect language runtime and
the Cloudflare host, which do the decoding, the role checks, the commits and the telemetry. Leaving means taking
ownership of those packages too. That is the same trade as leaving any framework, with one difference: every file
that depends on them is marked as generated on its first line, so you know exactly which files you would be taking
on.

## What if the plan is wrong?

**The objection.** Plans are always wrong. A rigid plan just makes being wrong more expensive.

**The answer.** The plan will be wrong, and Orthograph is built around that. The blueprint is the single place a
decision lives, so changing it is one edit, not a hunt through five layers. Rename a field and the compiler finds
every use. Change a declaration and `ortho generate` remakes every output that depends on it, `ortho impact` names
each operation the change made stale, and `ortho prove --changed` reruns only what it touched.

Plugged In's first climb is the real example. The first journey stopped at 5 of 8 steps, not because the handler
was badly written but because the blueprint gave handlers no way to find a person's own handle. The fix went into
the blueprint as two one-line rules, the climb reached 8 of 8, and the design note that had said the path was clear
was corrected the same minute. Being wrong cost a few minutes, and the cost was visible.

What isn't built yet matters here. Changing the plan of a system that already holds real data needs migrations, and
the generated schema says plainly that they arrive in stage three. Until then a local database is rebuilt on each
`ortho dev`.

## What if the journeys are wrong, or the agent games them?

**The objection.** If done means "the journeys pass", an agent will find a way to make them pass without doing the
work. And a journey can be wrong too.

**The answer.** Four things stand in the way of gaming.

1. **A different agent writes the journeys**, before the handlers exist.
2. **They must fail on empty handlers.** A journey that passes before anyone builds is caught, and
   `ortho prove --empty` labels it "proved by the description".
3. **The builder can't edit them.** On this project's protected branches, a builder's pull request that touches a
   journey, an eval or a check fails a required check.
4. **The evals read evidence, not claims.** They judge each call from its telemetry and the world's stored facts,
   never from what the server says about itself. A handler can't report its way to green.

Checks are also tested by trying to fool them: an author passes a check a deliberately wrong output, once for each
way the check reads, and a check that lets one through is rewritten.

A wrong journey is a disagreement about the plan, and it goes to the journey's author, not to a workaround in the
handler. A builder that thinks a check is wrong stops and asks its author.

## Why Effect?

**The objection.** Effect is unfamiliar. Plain TypeScript with `async` and `await` would be easier for people and
for agents.

**The answer.** Effect gives the frame four properties that plain TypeScript doesn't.

- **Errors are typed values.** A handler's type lists the errors it may fail with, taken from the declaration. A
  refusal the operation never declared doesn't compile. With `throw`, any function can fail with anything and the
  type system can't see it.
- **Dependencies are given, not reached for.** A handler asks for `Records`, `Ids` or `Auth` and the runtime
  provides them. The same handler runs unchanged in a world and in a test, and the same bundle is what a
  deployed Worker will run.
- **Every step is a span.** A declared step runs inside Effect's tracing, so `handle.claim.record` appears in the
  trace without the handler writing any telemetry.
- **Nothing hidden.** The project's own rules forbid `async`, `await`, `try`, `throw`, reading the wall clock and
  bare timers outside a few named entry files. Every wait goes through one service, so a world will be able to move
  time for the whole system at once; that part is decided for 1.0.

The cost is real: Effect takes time to learn, and agents write plain TypeScript more fluently than Effect. Two
things soften it. The scaffold writes the Effect shape for you, and most handlers are a short `Effect.gen` block
like the claim handler. And the language is a kind of plugin in the design, so Effect is the first language, not the
only one forever.

## Why only Cloudflare?

**The objection.** Tying a framework to one vendor's runtime is a strange choice.

**The answer.** It is a choice of focus, not a belief. Workers, D1 and Durable Objects let a world be a real
server with a real database on a laptop, with no container. A full prove of Plugged In, world and all, takes about
half a minute. That is what makes
proving every journey on every change cheap enough to do. In the design, a host is a kind of plugin, so Cloudflare
is the first host. A Node host has been named, and it is not scheduled. Today, Orthograph runs on Cloudflare only.

## Is "agent-native" real, or a pitch?

**The objection.** Every tool now says it is built for agents.

**The answer.** The word on its own means nothing, and it is also the name of an existing project that Orthograph
borrows some parts from, which is a second reason not to lean on it. What can be checked are three properties.

- The app's operations are typed tools. Every operation is an MCP tool today, reaching the same served operation a
  person reaches, under the same roles. Actions for agents in the browser are being built. Agents that work inside
  the app under the roles of the person they act for are decided for 1.0.
- The codebase is legible to an agent. One declaration per file, names from paths, every file marked generated or
  yours, and `ortho brief` printing one handler's task, reading list and definition of done from the model.
- Progress is judged by machine. The verdict comes from prove, not from the agent.

Where those three hold, "built for agents" is a fair description. Where they don't yet, this page says so.

## Who is it for?

Today, for a person building a web application with coding agents who wants the agent to run for long stretches and
come back with something provably right. It is not yet for someone who needs to deploy to their own servers, write
handlers in another language, or install it from npm this afternoon. The preview, the beta and 1.0 change that, in
that order.

---

Sources, at `origin/goal/stage-1` `eb3ff614`: `examples/plugged-in/generated/server/migrations/0001_things.sql` (the
partial unique index and the note on migrations); `examples/plugged-in/generated/server/main.ts` (the runtime
packages generated code imports); `packages/language-effect/src/modules/handler/types.ts` (the handler's typed
error channel); `AGENTS.md` (the code's rules, builder paths, journeys first); `docs/canon/orthograph.mdx` on the
canon branch (the open question about an adapter's mapping blank); `design/scope.md` (status and holes);
`design/decisions/K27-three-plugin-kinds.md` (language and host as kinds); `design/model/README.md` (the extraction
rule, `prove --empty`); `design/process/log.md` (the climb).
