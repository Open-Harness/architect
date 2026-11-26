<!-- A DRAFT, not a decision record. Kept here so it is not lost. Its id, K47, is held for it by Goal 18's lead
(#1212) until Aaron confirms. Before it lands: rewrite call 2 for Aaron's later words ("i only want headless
componnets that work with any library like astryx"), settle its scope against the fast experiment in HANDOFF.md, and
move it to design/decisions/K47-coworker.md with its AGENTS.md change and Goal 18's six phrases. -->

# K47: Coworker is rebuilt on Orthograph, as a third build

**Decided 26 November 2026 by Aaron.** Recorded by the 📐 designer thread that audited Coworker (draft pull request
#1179), under AGENTS.md, "Who decides". It took the next free K: K46 is on #1100, which this branch carries, and no open
pull request held K47 when it was written. The evidence is the audit in `design/briefs/coworker-audit/`, above all
`README.md`, `end-to-end.md` and the board, `board.html`.

## The problem, in plain words

Aaron has an app, Coworker (`Open-Harness/Coworker`), that he designed and had built quickly: a workspace where people
hand work to manager agents, which start worker agents, ask people when they must, and hear from GitHub and email. He
asked to rebuild it on Orthograph. The audit ran it against fakes (616 of 616 fast tests and 65 of 65 browser tests
pass) and read it from eight sides. Most of it works; the agents do not; its own findings say a green score proved
little. K44 had said only two things are built now, the alpha and Capxul, and parked the superagent, whose unfinished
agent runtime Coworker needs.

## What Aaron decided

Each call is quoted from the session that made the audit or, where marked, from the thread that started it, which put
the audit's questions to him and relayed his answer word for word.

1. **Rebuild it, and replace everything that works.** "I want to rebuild it with Orthograph" (his first ask, through
   the thread that started the audit). "it needs more than that. it needs a front end, it needs to replace everything
   that works currently in the vibe coded version" (relayed). The screens are the authority; the code is evidence.
2. **Every screen is rebuilt on Orthograph's own layer.** "we will take all the ui but rebuild it all on our things.
   including hooks and headless components" (in the session). That is a generated reference per thing (K46 call 9) and
   a generated piece per operation (K29), not the app's own component code.
3. **The agents are Pi Durable, and each is an actor.** "one thing that defo doesn't work is the agents they should be
   pi durable" and "and they should be actors" (relayed); "they need to be actors and they should follow the same
   pattern from pi durable and its examples in the repo" (in the session).
4. **The audit's recommendations, all of them.** "agreed on all" (relayed, 26 November 2026), to the audit's
   decisions as the thread put them, each with its recommendation. Where his later words above differ, they win. So:
   - **Which screens are the authority:** the built screens for everything that works; the screens his page of 25
     November agrees (`docs/screens.md` in Coworker) for the board, the task, the manager tree and the agents.
   - **The look:** kept exactly, reproduced as a theme on Orthograph's components, every rebuilt screen checked beside
     its old screenshot.
   - **A third build:** Coworker is built now, beside the alpha and Capxul. It takes the agent work of the parked
     superagent (Goal 17's slice 9: #781 and #905) and the UI work of the parked Goals 5 and 6, under the collision rule
     ("a stopped goal's slice is not scheduled: the app goal that needs it takes it").
   - **Where it lives:** in this repository, as `examples/coworker` on its own goal branch, until Orthograph's packages
     are on npm.
   - **Live updates** are a framework decision, with this direction: what a screen shows updates from the journal's
     events over one connection a page, and a thread streams from Pi's own conversation watch, relayed by the agent's
     actor.
   - **On, ask or off, handed down:** Coworker's own guard first, lifted into the framework once it works.
   - **The four blanks in the model:** a task keeps both its lane and what happens next; a worker is a saved agent (a
     role) with versions; a person's own permission changes stay, as grants a person holds; a connector's own view
     waits until pages exist.

## What is sketched, and not decided

The proposal in `design/briefs/coworker-audit/end-to-end.md` is the audit's, and Aaron asked for it as a proposal.
"Agreed on all" answered the decisions listed above, not every line of it. Its main design, written to be argued with:

- **Between agents, Pi's own pattern for a webhook or a person** (its examples 39 and 40) and its background reporter
  (22): a thing keeps the record of what is awaited (a `Run`, an `Ask`), and its event is delivered to the other
  agent's actor as a submission with a request id. Inside an actor, Pi as it is.
- **An agent's tool never waits for another agent or a person**, from Pi's own spec ("a parked call keeps its run
  busy") and K46 call 2.
- **The screens** as pages (K31), references and pieces, seven composites (K36), a theme and live reads.
- The spellings in `design/briefs/coworker-audit/blueprint/` and `web/`, every new one marked `// new`.

## What stays open

- **"The canvas."** Coworker's findings speak of screens "drawn on the canvas". Nobody has said whether that is a file
  to rebuild from, and if so where it is. It decides the authority for the screens Coworker never built.
- How live updates are built, past the direction above: the connection, what a reference subscribes to, and how a
  relayed transcript is authorised.
- Pi Durable 1.6.0 now, and 1.6.1 (which renamed `submit(tx, …)` to `admit`) once it is three days old.
- Who answers for a workspace's own model keys and vault, which Coworker has and Orthograph does not.
- A store per tenant: Coworker gives each workspace its own Durable Object; Orthograph keeps tenants apart by roles.

## Who builds it

A new app goal, which Goal 18 numbers and starts. Its brief is drafted at
`design/briefs/coworker-audit/goal-brief.md` for Goal 18 to adopt into `design/goals/`. This record adds no goal, lane,
status row or slice: those are Goal 18's (`design/goals/map.md`).

**Live phrases left for Goal 18**, whose paths they are. Each still says two things are built, and Goal 18 carries the
change in its own pull request, as K46 left its two phrases to their owner:

- `design/goals/map.md`: "Two things are built now (K44): the alpha, by the framework goal, and Capxul."
- `design/goals/map.md`: "Capxul is the one app building now (K44), so no piece is split between two apps."
- `design/goals/map.md`: "the superagent's pull requests stay open and unmerged"
- `.agents/skills/conductor/SKILL.md`: "Two things are built now: the Orthograph alpha, by Goal 18 itself"
- `.agents/skills/github/SKILL.md`: "Milestones are the two builds'"
- `docs/canon/status.md`: "parked the superagent, so Capxul is the one app building"

Until Goal 18 carries them, this record and AGENTS.md win over those six lines.

## Supersedes

- AGENTS.md: "Two goals build (K44): the framework goal (Goal 18), which builds the Orthograph alpha, and Capxul (Goal 16)." → "Three goals build (K44, K47): the framework goal (Goal 18), which builds the Orthograph alpha, Capxul (Goal 16), and Coworker (K47; Goal 18 gives it its number)."
- AGENTS.md: "Capxul dogfoods the framework: it builds its app and the framework gaps it claims." → "Capxul and Coworker dogfood the framework: each builds its app and the framework gaps it claims."

K44 keeps its words, and gains a note beside its section 1 and its section 5. K44's other calls stand: the alpha, its
order, Capxul's critical path, and the superagent parked as a goal. What changes is that its agent runtime and outbox are
landed by Coworker's goal, in pieces, rather than left unmerged.
