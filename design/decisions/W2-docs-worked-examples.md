# W2: an operation's docs page shows each journey that calls it as a worked example, with its real calls

Decided 20 November 2026 by Aaron, through the conductor. The way it is built is the Goal 3 lead's call, under "Who decides"
in `AGENTS.md`.

## The call

The conductor put the docs page for the seven `journey.docs` grid pairs to Aaron, option B reading:

> B, worked examples: the same, plus a real call taken from a journey. For example, Aaron claims @aaron and gets this
> answer, and a second person tries @aaron and is refused with 'handle taken'. Every example is real because it comes
> from a passing journey.

Aaron's answer, 20 November 2026: "this".

## The problem

The `journey.docs` cell is red for seven journeys of Plugged In. The eval asks only that the page names the journey:

```ts
// e2e/grid/src/modules/journey-evals/internal/surfaces.ts:40
export const docs = over("journey.docs", (journey, e) => calls(journey).flatMap((op) => {
  const model = e.model.operations[op];
  const path = model === undefined ? "" : `generated/docs/${model.thing}/${model.verb}.md`;
  return (e.files[path] ?? "").includes(journey.name) ? [] : [`${path || op}'s page does not list the journey "${journey.name}" as a worked example`];
}));
```

A page with the journey's name and nothing else would pass that. Aaron's call asks for more: the call itself, who made it,
what was sent and what came back.

## What the page shows

Each operation page in `generated/docs/<thing>/<verb>.md` gains a `## Worked examples` section, after `## Refusals`. It has
one entry for each journey that calls the operation, titled with the journey's name, naming the starting world it begins
from. Under it, every step of that journey that calls this operation, in order:

- the step's title;
- who calls, by cast name and kind (`aaron`, signed in); when the kind is a role, the role it names
  (`owner`, as organization.owner);
- the payload, field by field, with the journey's own values, and the request key when the step gives one;
- what comes back: the refusal by name and code when the step checks a refusal (`refused with HandleTaken, HN-001`),
  with the refusal's fields by their values when the step checks any (`refused with LinkNotListed, LN-900,
  state removed`), otherwise the answer the step checks.

Each step reads in that order: its title, who calls, what is sent, then what comes back.

An answer is shown by its content, not its JSON. A structured answer (a list, an object) is shown by its values: every
literal in it appears in the step's text, and every reference in it, at any depth, is named in words from its path. A
check against a pattern (an id shape) is shown as the pattern, in code. No value the model does not hold appears: a
reference is never written as an id.

From `examples/plugged-in/journeys/a-name-is-claimed-once.ts`, the `handle.claim` page reads, in substance:

```md
## Worked examples

### a name is claimed once

Starts from the world `claimed`.

- **the same request again answers the same handle and claims nothing.** `aaron` (signed in) calls with
  name `claimedname` and request key `first-claim`, and gets back the world's handle.
- **a taken name is refused.** `bob` (signed in) calls with name `claimedname` and request key `bobs-claim`, and is
  refused with HandleTaken, HN-001.
- **another person's request key is not aaron's: still refused.** `bob` (signed in) calls with name `claimedname` and
  request key `first-claim`, and is refused with HandleTaken, HN-001.
- **the refusal left bob free to claim a name of his own.** `bob` (signed in) calls with name `bobspage`, and is answered.
```

The journey's fourth step calls `handle.resolve`, so it is on that page, not this one. A step that checks no particular
answer is shown as answered, with no value.

A value the journey takes from its starting world is held in the model as a reference (`{ "ref": ["world", "handle"] }`),
not a value. The page names it in words from the reference's path ("the world's handle"), never as an invented value.

The exact layout is the builder's. The eval holds the content, not the markup.

## Why from the model, not from a run

The examples are rendered by `ortho generate` from the journeys in the model (`model.journeys[].steps`), not copied
from a prove run's output.

- **Real.** Every journey on `goal/stage-1` and `main` passes, because prove runs every journey in CI and a red journey
  fails the merge. A step's payload and expected outcome are what that passing run sent and checked.
- **Deterministic.** A run's answers carry fresh ids and times. Copying them would make the docs change on every
  generate and break check 21, which holds acme's docs byte for byte.
- **One source.** The portal's proof tab (`journey.portal`) shows the same journeys from the same model, with the run's
  live results on top. The docs carry the example and the portal carries the evidence that it ran.

## Order of work

1. The checks author tightens the `journey.docs` eval to this content, with controls: a page that names the journey but
   leaves out a step, gives a wrong refusal, or shows a step that calls a different operation must fail. The seven pairs
   stay on `e2e/grid/expected-red.json` with the new reasons.
2. A builder changes `packages/generators/src/modules/render/internal/docs.ts` until the eval passes, regenerates every
   example's `generated/docs`, and takes the seven pairs off the list.

## Supersedes

- design/grid/grid.json: "Each operation's page lists the journeys that cover it, as worked examples drawn from the model." → "Each operation's page shows each journey that calls it as a worked example: every step that calls the operation, with who calls, the payload and the answer or refusal, drawn from the model's journeys (W2)."

The dated record `design/decisions/K14-the-grid.md:329` keeps its words with a "Superseded by W2" note. The
mission-board spike's copy of the grid (`spikes/mission-board/src/data/grid/grid.json`) is rewritten too, so the old
words are left only in the dated records.
