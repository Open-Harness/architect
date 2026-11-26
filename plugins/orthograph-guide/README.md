# Orthograph guide

A plugin that drives you through building an Orthograph app. You say what you want; the guide says where the project
is, what comes next and why, asks one thing at a time, and does the work itself or in threads it starts. It keeps the
project's roadmap and log in your repository, in `.orthograph/guide/`, so it picks up where it left off in any session.

What is here covers the first four stages, from an idea to journeys that fail on purpose: plan, spike, describe and say
what done means. The stages after that (build, review, trace, stage, watch, change) are on the roadmap, and the guide
points you to the manual's chapters for them until their skills are written.

## What is in it

- `skills/guide/`: the router. `SKILL.md` is how the guide works each turn; `CONTRACT.md` is how it briefs a thread and
  what a thread hands back; `STATE.md` is the state's shape and how to use it.
- `skills/guide-plan`, `guide-spike`, `guide-describe`, `guide-done`: one skill per stage, each with its done checks.
- `scripts/guide-state.mjs`: the state (plain Node, no dependencies), and `guide-state.test.ts`, its tests (`bun test`).
- `hooks/hooks.json`: prints where the project is at the start of a session and on every message.

## Install

**Claude Code.** From the folder holding this one: `claude plugin install ./orthograph-guide` (or add it to a
marketplace you use). The hook needs `node` on the path. Then, in your app's repository, say what you want to build;
the `guide` skill starts the project.

**Amp, Codex and other agents.** Copy the five `skills/*` folders to the app's `.agents/skills/` and `scripts/` beside
them, and replace `<plugin>` in the skills with that path. There is no turn hook there, so the guide runs `brief`
itself at the start of each turn, as its skill says. This has not been tried yet in Amp.
