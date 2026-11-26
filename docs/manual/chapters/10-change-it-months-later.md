# Change it, months later

Film: `docs/explainer/films/change/`

Plugged In has been live for months, and you have an answer to the question the trace left you with. No: a person
should be able to hold more than one name. It is one rule, and you could delete it yourself. What you cannot see by
looking is everything that was leaning on it.

## Start from a proof, and take the rule out

We want the change measured against something, so the first thing your agent does is run the whole proof on the app as
it stands. Every full proof keeps a record of what each passing operation rested on. Then the designer makes the
change where the rule lives, in the blueprint, and nowhere else.

```diff part capture=change-diff.txt
-// A person holds one claimed name at a time.
-export const oneNamePerPerson = Blueprint.invariant.unique(Handle.fields.owner, {
-  while: [machine.states.claimed],
-  refuse: HandleAlreadyOwned,
-  description: "you already hold a name", // the generated sentence reads poorly here
-});
```

Six lines are gone, and nothing else has been touched yet. This diff is the part of the change you read.

## Ask what went stale

Before anything is rebuilt, we ask what the change did to the proof we had. One command compares the blueprint with
that record.

```sh capture=change-impact.txt
$ ortho impact
changed thing handle: invariants
changed operation handle.claim: breaks, invariants, refusals
stale handle.claim, handle.release, handle.resolve, link.add, link.order, link.remove, profile.get
proven none
```

The top two lines are the change as the framework sees it. The next is the cost. An operation is
[stale](../../canon/orthograph.mdx) when something its proof rested on has changed, and here that is all seven. In an
app this small, one rule on the handle unproved the lot.

## The check finds what leaned on the rule

Next we want to know what no longer fits. The check answers in three parts.

```sh capture=change-check.txt
$ ortho check
types ✘ 1
  src/link/add.ts:7  TS2305: Module '"../../blueprint/things/handle/invariants.ts"' has no exported member 'oneNamePerPerson'.
drift ✘ 9
changes 1
  handle.claim.refusals (HandleAlreadyOwned removed): major
check ✘
```

The drift is the framework's own work: nine generated files still describe the old rule, and `ortho generate`
rewrites them. The change line is for anyone who calls your app: a refusal they could be given is gone, and that is
counted as a major change.

The types line is the surprise. Adding a link has nothing to do with claiming a name, and yet its handler found your
page through this rule: one name for each person meant one page for each person. With the rule gone that handler has a
question it cannot answer, and it is not a builder's to answer. When a person holds two names, which page does a new
link go on? That goes back to you and the designer.

## Prove what changed, and find it is everything

After `ortho generate` the drift is gone, and we ask for the proof again, narrowed to what the change touched.

```sh capture=change-prove-changed.txt
$ ortho prove --changed
prove --changed: proving all 7 journeys: cannot place generated/actions/handle/claim.ts, …
prove couldn't run: couldn't start the world: wrangler could not build the worker:
✘ [ERROR] No matching export in "../../blueprint/things/handle/invariants.ts" for import "oneNamePerPerson"
```

The narrowed proof did not narrow: it could not tell which journeys the regenerated files touch, so it chose all
seven and said why. Then it could not run at all, because the app does not build until that handler is rewritten.

## The journey that said the old rule

To see what the journeys say once the app builds again, we stood in for that builder: we made the handler put the
link on the oldest name a person holds. Nobody decided that. Then we ran everything.

```sh capture=change-prove.txt
$ ortho prove
journey claim a handle ✘ 6/8 steps
  ✘ "aaron cannot claim a second name while he holds one": expected refused with HandleAlreadyOwned, answered
  ✘ "the refused second name is still free": expected refused with HandleNotFound, answered
prove ✘ 2 failing
```

This failure is the proof working. Months ago an author wrote down the rule you have just removed, as a step.

```ts file=examples/plugged-in/journeys/claim-a-handle.ts lines=57-63
    s.step(
      "aaron cannot claim a second name while he holds one",
      s.aaron.run(claim, { name: "secondpage" }),
      refuses(HandleAlreadyOwned),
      noEvents(),
      spans({ absent: ["handle.claim.commit"] }),
    ),
```

The sentence is no longer what you mean, so it is the author's to change, and nobody else's. The author rewrites
these two steps, and writes the story the change needs: a person with two names adds a link. That story fails first.
Only then does a builder take `ortho brief link.add` and climb.

Look at the six journeys that passed, too. They passed on a handler that picks a page nobody chose, because no journey
has ever had a person with two names.

## When it goes wrong

A builder will sometimes make the red journey green by changing the journey. It may not, and here you can see why:
the two failing steps are the only place the old rule was still written down in your words.

The record forgets after a failed proof. We asked for the impact again once the full run had failed.

```sh capture=change-impact-after.txt
$ ortho impact
stale none
proven none
unproven handle.claim, handle.release, handle.resolve, link.add, link.order, link.remove, profile.get
```

The lines that named the change are gone, and every operation is called unproven, though each one's own evals passed
in that run. So ask what went stale before you prove again.

The line that counts the change as major shows only between the edit and `ortho generate`. The check we ran afterwards
ended `check ✔` and did not print it. And the refusal's own declaration is still in the blueprint, used by no rule;
nothing we ran pointed at it.

We could not get the next version on a laptop. `ortho version --next` works from the last production release, and
asked for a logbook we did not have.

```sh capture=change-version.txt
$ ortho version --next
no logbook: start one with `ortho env up logbook`, or set ORTHO_LOGBOOK_URL
exit 2
```

## How this stands

Everything printed above was recorded on Plugged In on 26 November 2026, and the example was put back afterwards: the
rule is still in the repository. Two parts were staged. We made the designer's edit ourselves, and the handler that
let the last proof run is a stand-in written into the recording (`docs/manual/record/10-change.sh`), not a builder's
work and not a decision. No author changed a journey and no builder rebuilt the handler, so the chapter stops at red.

Asking what went stale, the check, generating and proving all run today. Narrowing the proof runs, and for a change to
the blueprint it chose every journey. Working out the next version needs a logbook and a production release, and we
recorded neither. That the designer changes the blueprint, the author the journeys and the builder one handler is how
we work in this repository. Nothing in Orthograph enforces it for you yet.
