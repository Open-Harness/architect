# Orthograph conductor

A plugin that drives you through building an Orthograph app. You say what you want; the conductor says where the project
is, what comes next and why, asks one thing at a time, and does the work itself or in workers it starts. It keeps the
project's roadmap and log in your repository, in `.orthograph/conductor/`, so it picks up where it left off in any session.

What is here covers an idea all the way to an app the owner has used and believes: plan, spike, describe, say what done
means, build until green, and validate it (an independent review, then the owner running it and trying to break it).
The stages after that (stage, watch, change) are on the roadmap, and the conductor says to work them by hand until their
skills are written. It runs workers in parallel where their work is independent, lands their work as small (stacked
where they depend on each other) pull requests, keeps them from going stale, and wakes itself on a schedule. Every skill carries what it needs: nothing points
to files outside the plugin.

## What is in it

- `skills/conductor/`: the router. `SKILL.md` is how the conductor works each turn; `CONTRACT.md` is how it briefs a worker and
  what a worker hands back; `STATE.md` is the state's shape and how to use it.
- `skills/ortho-plan`, `ortho-spike`, `ortho-describe`, `ortho-done`, `ortho-build`, `ortho-validate`: the stage skills,
  each with its done checks and the worker's side of the job.
- `scripts/conductor-state.mjs`: the state (plain Node, no dependencies), and `conductor-state.test.ts`, its tests (`bun test`).
- `hooks/hooks.json`: prints where the project is at the start of a session and on every message.

## Install

**Claude Code.** The folder is its own marketplace. Unzip it anywhere, then:

```sh
claude plugin marketplace add /path/to/orthograph-conductor
claude plugin install orthograph-conductor@orthograph
```

Or, for one session without installing: `claude --plugin-dir /path/to/orthograph-conductor`. The hook needs `node` on
the path, and prints nothing in a folder that has no project. Then, in your app's repository, say what you want to build;
the `conductor` skill starts the project.

**Amp, Codex and other agents.** In the app's repository, copy each `skills/*` folder into `.agents/skills/` and the
`scripts/` folder to `.agents/scripts/`, so the state script is `.agents/scripts/conductor-state.mjs`. Then `<plugin>`
in the skills is `.agents`. There is no turn hook there, so the conductor runs `brief` itself at the start of each turn,
as its skill says. This has not been tried yet in Amp or Codex.

**Proactive.** The conductor sets up its own wake, about every 30 minutes, with the scheduler of whatever harness it is
running in, and each woken turn starts with `conductor-state.mjs due`, so it does nothing when nothing can move without
you. It asks you once to allow `node`, `ortho` and `git` for the app, so a woken turn can run unattended.
