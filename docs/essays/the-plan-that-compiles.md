# The plan that compiles

Leave a coding agent working overnight and in the morning it will tell you it is done. Forty files have changed. The
tests pass, because the agent wrote the tests. The summary is fluent and confident. And you still don't know whether
it built what you meant, because the only way to find out is to read all forty files against a plan that lives in a
chat window you closed yesterday. Reading them is the work you were trying to hand off.

This is the problem Orthograph exists to solve. It is not a problem of agent skill. The agents we have now plan well,
write good code fast and fix their own mistakes when something tells them what the mistake is. The problem is
everything around the agent, which is still built for a person typing.

## The plan has nowhere to live

Every serious way of working with agents starts with a plan. You talk the problem through, the agent writes down
what it will build, you correct it, and then it builds. Plan mode in the coding tools works this way. So does
spec-driven development, where tools such as Spec Kit have the agent write a specification, then a technical plan,
then a task list, all as markdown, before any code. Both are a real step forward. They put the thinking before the
typing, where it belongs.

But look at where the plan ends up. It is prose, in a chat log or a markdown file. Three things follow from that.

**The plan is read, never run.** Each time an agent picks the work up, it reads the plan again and decides what the
words mean. A sentence like "a person can hold one name at a time" is a decision made once, and then interpreted
afresh by every session that touches the code. Two sessions can read it two ways, and nothing notices.

**The code drifts from the plan, and nothing raises an alarm.** The day the code changes, the plan is out of date,
and nobody can say which part. The plan doesn't fail. It just becomes less true, one paragraph at a time.

**Every fact gets copied by hand.** The payload of an operation is typed in the server, again in the client, again
in the command line tool, again in the docs, again in the tests. Each copy is a chance to disagree.

That last one is not hypothetical. While this project was being built, a design session for the portal quoted a
refusal as "HN-002, exit 11". The generated code said otherwise: HN-002 is a different refusal, and the one being
discussed had its own code. The figure came from a design page that had been written by hand and had drifted from
the code. Elsewhere, the same page gave that one refusal a second code and a second exit code. Careful agents wrote
every word of it. That is what drift looks like up close: nobody was careless, and the facts still came apart.

## Slop, defined

"Slop" gets used loosely, so here is what it means in this essay. Slop is code that is plausible and is not
what was meant. It comes in four forms:

- an edge case the plan implied and the code skipped;
- a shape written out by hand in five places, with one of them wrong;
- a name that means one thing in the server and another in the docs;
- a path nobody ran, so nobody knows it is broken.

None of these is a bad line of code. Each one reads fine in review. That is why slop is dangerous: it passes the
review people really give it.

And more agent time makes it worse, not better. Each session re-derives the plan from prose, so small
misreadings compound. The agent has no objective signal that it is closer to done, only its own sense that it is.
So you can't leave it running for a week. Without a measure of progress, a week of work is a week of drift you will
have to read.

## Orthograph's move: make the plan executable

Orthograph keeps the plan-first way of working and changes one thing. The plan is no longer prose. It is a typed
blueprint: ordinary TypeScript files that declare the system.

Here is the whole plan for claiming a name in Plugged In, the link-in-bio app Orthograph is built against. A person
claims a name such as `@firstpage`, and it becomes the address of their public page.

```ts
// examples/plugged-in/blueprint/things/handle/verbs/claim.ts
export default Blueprint.operation(Handle, {
  description: "Claim a free name and make it the address of your public page, with its profile.",
  payload: { name: Handle.fields.name },
  answer: { handle: Handle.fields.id },
  move: machine.moves.claim,
  allowed: [Blueprint.signedIn],
  steps: { record: Blueprint.step.database({ writes: [Profile] }) },
  idempotent: "request", // the same request twice claims once
  budget: { p95: "150 millis" },
});
```

Each line is a decision that, in a prose plan, would be a sentence some agent has to remember. Who may call: anyone
signed in. What it takes and what it gives back. Which move it makes in the handle's lifecycle. That it writes the
person's profile in the same step. That sending the same request twice claims once. That it should answer in 150
milliseconds at the 95th percentile.

The rules that make a claim fail live beside the handle, not in this file:

```ts
// examples/plugged-in/blueprint/things/handle/invariants.ts
export const oneHolderPerName = Blueprint.invariant.unique(Handle.fields.name, {
  while: [machine.states.claimed],
  refuse: HandleTaken,
});

export const oneNamePerPerson = Blueprint.invariant.unique(Handle.fields.owner, {
  while: [machine.states.claimed],
  refuse: HandleAlreadyOwned,
  description: "you already hold a name",
});
```

"A person can hold one name at a time" is no longer a sentence to interpret. It is a declaration the compiler
reads, and the runtime refuses a break before anything is committed.

The blueprint covers the things an app keeps, the operations that change them, who may call each one, the
lifecycle each thing moves through, the events each move records, the ways each operation can be refused, the rules
that must hold across records, and the journeys that prove it all works. A compiler turns it into one model: a
single JSON file with every declaration, its hash and what it depends on. From then on, nothing reads the blueprint
directly. Everything is made from the model.

## Everything mechanical is generated

From that model, Orthograph generates the parts of an application that follow from the plan. For `handle.claim`
that is, today:

- the HTTP endpoint, with its payload, answer and refusals typed from the declaration;
- the server code that enforces it, the one place the operation is decided;
- an SDK function, `claim(payload)`, that carries the caller and one request key across retries;
- a command, `plugged-in handle claim --name …`, built on the SDK;
- an MCP tool named `handle.claim`, whose description tells an agent each way it can be refused;
- a docs page listing who may call, the payload, each refusal with its code and exit code, and worked examples
  taken from the journeys;
- spans for the call, its step and its commit, named from the model;
- the operation's place in the portal, beside its thing and its lifecycle, with its live calls.

Generated files carry a first line that says where they came from and that they are not to be edited. That rule is
checked, not hoped for: `ortho check` fails if any generated file differs from what the model renders. So a
generated file can't drift. If it is wrong, the fix goes into the blueprint or the generator, and every output
changes together.

## The agent writes only behaviour

What the model can't say is what the operation does. That is the handler, and it is the only code anyone
writes by hand. Orthograph writes the handler file once, with a header that spells out everything the runtime
already does around it, and then the file belongs to you. Here is the body of the claim handler, with its comments removed:

```ts
// examples/plugged-in/src/handle/claim.ts
const claim: Handler = ({ name }, { principal, steps, move, id }) =>
  Effect.gen(function* () {
    if (principal.kind !== "person") return yield* Effect.die(new Error("reached without a signed-in person"));
    const records = yield* Records;

    const profile = yield* Ids.of(Profile.fields.id);
    yield* steps.record(
      Effect.gen(function* () {
        yield* records.insert(Handle, { id, name, owner: principal.person as never });
        yield* records.insert(Profile, { id: profile, handle: id, links: [] });
      }),
    );

    yield* move();
    return { handle: id };
  });
```

It saves the handle and its page. It never checks who is calling, never parses a request, never names a route and
never refuses a taken name. The declaration already said all of that, and the code around the handler does it.

The handler also sits inside a frame. Its type, `Handler`, is generated from the declaration: what it is given, what
it must answer, and which errors it may fail with. A handler that answers the wrong shape, or fails with a refusal
the operation never declared, doesn't compile. The agent has room to make judgement calls about behaviour, and no
room to change the contract.

## Done is a verdict

A plan that compiles still doesn't say whether the system works. For that, the blueprint carries journeys: stories
through real operations, played by a cast. Here is one step of "claim a handle":

```ts
// examples/plugged-in/journeys/claim-a-handle.ts
s.step(
  "aaron cannot claim a second name while he holds one",
  s.aaron.run(claim, { name: "secondpage" }),
  refuses(HandleAlreadyOwned),
  noEvents(),
  spans({ absent: ["handle.claim.commit"] }),
),
```

Three rules make journeys worth trusting. A different agent from the builder writes them. They must fail on empty
handlers before anyone starts building, so a journey that passes for free is caught before it can mislead. And the
builder may never edit them; on this project's protected branches a builder's pull request that touches a journey
fails a required check.

`ortho prove` then starts a world: the real server on a local Cloudflare runtime, with a real database. It runs every
journey through it, collects every call's telemetry, and judges nine evals for every operation from that evidence,
never from what the server says about itself. Did each answer have the declared shape? Was every refusal one the
operation declares? Did each move end in a declared state, and record its event? Did every declared step run? Was
every operation, move and refusal reached by some journey? The result is a verdict per operation.

That turns building into climbing. The agent runs prove, reads the verdict, fixes a handler, and runs it again.
Plugged In's first stage was built this way. Its seven journeys started at 0 of 56 steps green on empty handlers.
The first journey went 3, 3, 5 and then 8 of 8 in four runs, over about four minutes. All seven now pass, 56 of 56
steps, as a required check on the branch where stage 1 is built.

To see what the climb protects against, delete one line from that working claim handler: `yield* move()`, the line
that moves the handle into its claimed state. The handler still compiles, because forgetting a move breaks behaviour,
not the contract. Prove catches it. It fails 30 checks across all seven journeys, and the first line for
`handle.claim` reads `answered without making its move claim`. Every failing step names the handler file to look at
and the declaration it answers to.

## When the plan is wrong

The stop at 5 of 8 is the most useful part of that story. The climb didn't stall because the agent wrote bad code.
It stalled because the plan was wrong. Two steps needed a person's own claimed name, and the blueprint gave a
handler no way to find one: a record could be looked up by its id or by a field declared unique, and the handle's
owner wasn't declared unique. So "one name per person" couldn't be enforced. The plan had said nothing blocked that
journey. It was written by reading, without trying a handler.

The fix went where it belonged: into the blueprint, as two one-line rules. The climb went on to 8 of 8, and the
design note that had called the path clear was corrected the same minute.

This is what "the plan is the plan" means in practice. It is not frozen. It is the single place a decision lives,
so changing it is cheap and its effects are visible. When you change a declaration, `ortho generate` remakes every
output that depends on it, and `ortho impact` compares the model with the record of the last full prove and names
each operation stale, proven or never proven. Edit one handler and exactly that operation goes stale. Then
`ortho prove --changed` reruns only the journeys the change touched.

## Why push generation this far

Every generated line is a line no agent writes, no agent reads and no agent can let drift. That changes where
attention goes.

In Plugged In's first stage, someone wrote about 370 lines of blueprint and about 510 lines of journeys. The
handlers hold about 120 lines of behaviour, inside files whose generated-once headers explain each operation.
Orthograph produced the rest: about a thousand lines of code across the API, the server, the SDK, the command line
tool, the MCP tools and the deploy plan, six hundred lines of docs, the model, and the portal's view of all of it,
on top of the runtime they all share.

The line counts matter less than the count of places a fact lives. The refusal `HandleTaken`, with its code HN-001
and its exit code 10, is declared once. The server, the docs, the MCP tool's description, the handler's header and
the portal all show it, and none of them was typed by hand. The only way to change it is to change the declaration.

So the surface where slop can appear shrinks to the handlers, and the handlers are judged by journeys someone else
wrote. A second check holds the generators honest: a grid of building blocks against outputs, 331 automated checks
in all, each one testing that, say, the command line tool carries every refusal. All 331 pass in CI.

## What "built for agents" means here

"Agent-native" has become a word that sounds like a pitch. Here is what it means concretely in Orthograph, as three
properties you can check.

**The app's operations are typed tools.** Every operation becomes an MCP tool, named as the operation is and
described from its declaration, so an agent can use the app it helped build. It reaches the same served operation a
person does, so it meets the same roles and the same refusals. Actions for agents in
the browser are being built now, and agents that act inside the app under the roles of the person they work for
are decided for 1.0.

**The codebase is legible to an agent.** One declaration per file, its name taken from its path. Every file says
whether it is generated or yours. Every handler opens with a header that tells the agent what the runtime already
does, so it doesn't do it twice. A gap in the plan is written as `Blueprint.todo("what goes here")`, which compiles,
and `ortho check` names every one until it is filled. And `ortho brief handle.claim` prints, from the model, the
one file to write, the four files to read, what not to touch and the checks that say it is done.

**Progress is judged by machine.** The agent doesn't decide it is done. A verdict does, from evidence the agent
can't edit.

If a word is needed for those three properties, it should be earned by them. Without them, the word is noise.

## What changes for the person

Your job moves up a level. You and your agent write the blueprint together, and you review it, because it is short
and it is the plan. A different agent writes the journeys, and you read them, because they are the definition of
done in sentences a person can follow. Then an agent climbs, and what you review is a verdict and a short change to
the blueprint, not a forty-file diff.

That is what makes long runs possible. This project is itself built in goals: long autonomous runs, each with a
bound and a single check that says when it is finished. An agent can work toward a check like "every journey of
stage 1 green, staging included" for days, because each run gives it a fact about whether it is closer. The same
shape is what Orthograph gives an app.

## Where it stands

Orthograph is not finished, and it is not yet on public npm. What runs today, on this project's stage 1 branch: the
blueprint, the compiler and the model; the generated server, HTTP API, SDK, command line tool, MCP tools, docs and
portal; handlers in frames; `ortho prove` with its nine evals; `ortho impact` and `prove --changed`; and Plugged In's
first stage, proved end to end on one machine. It runs on Cloudflare Workers, with handlers written in Effect.

What comes next is in three releases. A preview on npm, so someone outside can install it, write a blueprint and
prove journeys on their own machine. A beta, where you start an app with one command, sign people in, claim a name
on a real page, and deploy to Cloudflare and tear it down again. Then 1.0, which grows Plugged In through wallets, a
shared vault with budgets and agents, and a private club on Aztec.

There are known limits, and they are written down. Journeys today call the server over plain HTTP, so the SDK, the
command line tool and MCP are checked by the grid but not yet proved by a journey. The screens are being built now.
There is one host, Cloudflare, and one language for handlers, Effect. Making each of those a kind of plugin is
designed; a second host is not scheduled yet.

The idea under all of it is simple to say. Agents are good enough now that the plan, not the typing, is the scarce
thing. So the plan should be a real artifact: typed, compiled, the source of everything mechanical, and the
standard the running system is judged against. Orthograph is that plan, made executable.

---

Sources, at `origin/goal/stage-1` `eb3ff614`: the Plugged In files quoted above; `design/process/log.md` (the climb
from 0 to 8 of 8, the stop at 5 of 8, and the refusal quoted from a stale design page); `design/scope.md` (what is
built, the grid's 331 checks, the 56 of 56 steps); `design/decisions/K28-releases.md` (the three releases);
`packages/prove/src/modules/evals/README.md` (the nine evals); `packages/prove/src/modules/impact/README.md`
(staleness and `prove --changed`).
