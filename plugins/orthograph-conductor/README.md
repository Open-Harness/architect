# Orthograph conductor

A plugin that drives you through building an Orthograph app. You say what you want; the conductor says where the project
is, what comes next and why, asks one thing at a time, and does the work itself or in workers it starts. It keeps the
project's roadmap and log in your repository, in `.orthograph/conductor/`, so it picks up where it left off in any session.

What is here covers the first four stages, from an idea to journeys that fail on purpose: plan, spike, describe and say
what done means. The stages after that (build, review, trace, stage, watch, change) are on the roadmap, and the conductor
says how to work them by hand until their skills are written. Every skill carries what it needs: nothing points
to files outside the plugin.

## What is in it

- `skills/conductor/`: the router. `SKILL.md` is how the conductor works each turn; `CONTRACT.md` is how it briefs a worker and
  what a worker hands back; `STATE.md` is the state's shape and how to use it.
- `skills/ortho-plan`, `ortho-spike`, `ortho-describe`, `ortho-done`: one skill per stage, each with its done checks.
- `scripts/conductor-state.mjs`: the state (plain Node, no dependencies), and `conductor-state.test.ts`, its tests (`bun test`).
- `scripts/conductor-tick.sh`: a scheduled wake. Run it from cron (or any scheduler) in the app's folder; it wakes the
  agent only when there is work it can do without you, so the project keeps moving between your messages.
- `hooks/hooks.json`: prints where the project is at the start of a session and on every message.

## Install

**Claude Code.** From the folder holding this one: `claude plugin install ./orthograph-conductor` (or add it to a
marketplace you use). The hook needs `node` on the path. Then, in your app's repository, say what you want to build;
the `conductor` skill starts the project.

**Amp, Codex and other agents.** Copy the five `skills/*` folders to the app's `.agents/skills/` and `scripts/` beside
them, and replace `<plugin>` in the skills with that path. There is no turn hook there, so the conductor runs `brief`
itself at the start of each turn, as its skill says. This has not been tried yet in Amp.

**On a schedule.** For example, every 30 minutes:
`*/30 * * * * cd /path/to/app && /path/to/orthograph-conductor/scripts/conductor-tick.sh >> .orthograph/conductor/tick.log 2>&1`.
Set `CONDUCTOR_AGENT` to the command that runs one agent turn from a prompt on stdin (`claude -p` by default).
