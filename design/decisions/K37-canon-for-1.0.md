# K37: the canon describes all of 1.0, now, through Plugged In

Decided 22 November 2026 by the building agent (the 📚 canon thread), on Aaron's words the same day. Grounded at
`origin/goal/stage-1` `eb3ff614`, where the canon is being written beside the build.

## Aaron's words

On the canon board, shown a plan that wrote only what runs today and left the UI, money, the chain and time for later:

> "I don't want to wait for any of that. That's the whole point. Like, these docs are for primarily for me. Do you
> understand? And anybody else who wants to look at, build on, or help building the library ... yes, we need to know
> what's here today, but we also need docs for what's going to be canon for 1.0."

## The problem, in code

The outline still teaches from the two examples K9 dropped, and it has no page for two things 1.0 decided:

```md
<!-- docs/canon/outline.md (goal/stage-1 eb3ff614), "Layers: the order pages are written in" -->
**Examples.** Layers 1 and 2 teach with the sign-up sheet, `examples/signup` (Aaron, 18 November 2026): one thing,
open to anyone, and nothing in it that needs explaining from outside. From layer 4 on, the end-to-end example is K5's
community workshop: drafts in D1, a governance contract, a publish workflow, and later Noir.
```

- K9 (18 November) made Plugged In the canon's example, and dropped the workshop and the sign-up sheet. ST1.08 deletes
  `examples/signup` "once the canon quotes Plugged In (the canon thread's change, K9)". The outline never followed.
- Time has a whole milestone (M8, K23) and a goal (Goal 9), but no page. `Timers` and the world's clock are
  explained nowhere in the canon.
- The UI has a decision (K29), slices (M1.22, M1.23, ST1.25 to ST1.28) and two goals (5 and 6), but no page. `doors`
  owns "action", and nothing owns the page, the piece or a component.

## Decided

1. **The canon describes all of 1.0, built or not, and every page is written now.** Its readers are Aaron and anyone
   who builds on Orthograph or helps build it. Nothing waits for code. The statuses that already exist keep it honest:
   a **proved** part quotes the real file; a **specified** part quotes its decision in a `planned=<slice>` fence, and
   the slice's goal says who builds it; a part the design hasn't settled is a `<Note kind="question">`, raised as an
   Ask in the goal that owns it. On the board these are drawn as four marks (runs today, being built, decided for 1.0,
   open); in a page they are those three statuses and the slice.
2. **One example all the way through: Plugged In, by stage.** Each page takes its example from the stage that needs
   it (`outline.md`, "Examples"). A second example appears only where a reader chooses between kinds, as GitHub and
   Stripe do on `plugins`.
3. **Two new pages:** `ui` (31, layer 5, K29) and `time` (32, layer 6, K23). The canon has thirty-two concept pages.
4. **`factory` and `agent-kit` are after 1.0.** They keep their rows, marked so, and are written short.
5. **The canon is written on `goal/stage-1`,** where Plugged In and the pages already quoting it live, in pull
   requests into that branch. It reaches `main` with stage 1. Pages for stages 2 to 4 quote their decisions until
   their code lands on a branch the canon can quote.

## Not chosen, and why

- **A tour of what runs today, the rest later.** It was the board's first plan. Aaron rejected it: the canon is the
  spec of 1.0, and its readers need the whole of it now.
- **Write the canon on `main`.** Plugged In is not on `main` until stage 1 merges, so every quote of it would be an
  unchecked `planned=` fence. On `goal/stage-1` the same quotes are checked against the code, and break when it moves.
- **Capxul as the second example for money and the chain.** Stages 2 to 4 of Plugged In already cover wallets, Safe,
  budgets, time, workflows, agents and privacy (K9), so a second app would split the reader's picture. Capxul comes
  after 1.0.

## What it touches

| Dependent | Why it cares |
|---|---|
| `docs/canon/outline.md`, `README.md`, `_template.mdx` | rewritten here: who it is for, the example, the two new pages |
| every page quoting `examples/signup` | re-quoted onto Plugged In in the canon thread's next pull requests |
| ST1.08 (deletes `examples/signup`) | can run once no page quotes it |
| Goals 5, 6 and 9 | their pages (`ui`, `time`) are written from their decisions now, and flip to proved as they land |

## Supersedes

- docs/canon/outline.md: "Layers 1 and 2 teach with the sign-up sheet" → "One example runs through the whole canon: Plugged In"
- docs/canon/README.md: "Layers 1 and 2 teach with one example, a sign-up sheet" → "One example runs through it: Plugged In"
- docs/canon/README.md: "Show it in the layer's example." → "Show it in Plugged In."
- docs/canon/outline.md: "There are thirty concept pages" → "There are thirty-two concept pages"
- docs/canon/outline.md: "the end-to-end example is K5's community workshop" → "Stage 2 (a wallet, paid by handle) teaches"
- docs/canon/README.md: "community workshop carries the rest" → "in the four stages 1.0 is built as"
- docs/canon/README.md: "the smallest real example from the layer's example project" → "the smallest real example from Plugged In, at the stage that needs it"
- docs/canon/_template.mdx: "examples/signup for layers 1 and 2" → "examples/plugged-in), at the stage that needs it"
- docs/canon/orthograph.mdx: "This is the sign-up sheet's `join`" → "This is the whole of claiming a name"
- design/handoff.md: "Until K9 lands, the sign-up sheet" → "Plugged In is the canon's one example"
