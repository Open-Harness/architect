---
name: app-audit
description: How to audit an existing application before rebuilding it on Orthograph (the system its screens imply, read from several sides, then mapped onto what Orthograph has today, with every gap named and owned). Use it when Aaron asks to rebuild an app with Orthograph, to make an app "Orthograph native", or to find what the framework is missing for a real product. First written on 26 November 2026, before its first use on Coworker: correct it from that work.
---

# Auditing an app for a rebuild

The aim is not to port code. It is to find the system the app means to be, say it as a blueprint, and learn exactly
where Orthograph cannot yet hold it. Aaron's rule for an app he designed: **the screens are the authority.** The data
model the interface implies is the one he wants; the code behind it is evidence, and often wrong.

## Read it from each side

Do each as its own pass, and write down facts with the file each came from. Several can run at once.

1. **The screens.** Every screen, list and form: what it shows, what you can do there, what it says while it waits
   and when it refuses. From these, the nouns, their fields and their states. This pass decides the model.
2. **The model the app says it has.** Its own model docs, its schema and its migrations, against pass 1. Each
   disagreement is a question for Aaron, never a silent choice.
3. **The verbs.** Every action a person or an agent can take: what goes in, what comes back, who may do it, and how
   it can be refused. These become operations.
4. **The lives.** For each noun, the states it moves through and what moves it: a caller, an event from elsewhere, or
   a clock. Anything that waits is a thing in a state (K46), never a call held open.
5. **The agents.** Who manages whom, what a run is, what is kept between turns, what must survive a restart, and
   what one agent may ask of another.
6. **The outside.** Each connector: the events it brings in, the calls it makes out, the secret it needs, and what
   stands in for it in a test.
7. **Who is who.** Sign-in, organisations, membership, roles, and what one tenant can see of another.
8. **How it is proved and run.** Its tests, its end-to-end runs, its staging and deploy scripts, its telemetry, and
   any score it keeps of itself. The stories its tests tell are the first journeys.

## Map it onto what exists

For each finding, look it up before you judge it: the canon page, `docs/canon/status.md`, the decision records, and
the examples that already do something like it. Give each one a standing:

- **runs today**, with the example that proves it;
- **being built**, with the goal and branch that has it;
- **decided**, with the record, and no code;
- **missing.**

Much may already exist in another shape. Before writing anything new, read what the repository has for agents, for a
board of work, and for connectors, including parked goals and their branches.

## What comes out

1. **An audit board** for Aaron (`design-board` skill): the system on one page, the questions only he can answer,
   and the gaps sorted by standing.
2. **A first blueprint**, with a marked blank wherever he has not decided.
3. **A gap list.** For each gap: fix it in the framework, or work round it for now. A framework fix is a pull
   request into this repository under AGENTS.md: check who has claimed the paths, take a lane, and open an Ask when
   two claims overlap.
4. **An order to build in**, as slices, each ending green on a named check.

## Rules

- Do not copy the old code's shape into the blueprint. If a table exists only because of how the old code worked,
  leave it out and say so.
- Journeys and checks are written by a different agent from the builder, and fail on empty handlers first.
- Every gap is written down when it is found, even one you work round the same hour.
- Say what you could not run. An app you only read is an app you have not seen working.
