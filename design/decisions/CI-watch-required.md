# CI-watch-required: the watcher waits for every required check by name

23 November 2026, by the conductor.

## The problem

CI-integration part A tells every lead to start `gh pr checks <n> -R Open-Harness/orthograph --watch --required` in the
background after each push, and to start it again if a check is still pending on wake. On #653 (a pull request into
`main`) the watch ended with eight checks passed and the merge still `BLOCKED`: `e2e-m1` needs its four shards, and
GitHub does not list a job at all until the jobs it needs finish. With nothing pending in the list, the re-check rule saw
nothing to wait for either. A lead following the rule would end its turn with no watcher, which AGENTS.md forbids.

## The call

`tools/ci/watch-required.sh <n> [poll seconds]` reads the base branch's required checks from its protection and waits
until each one has reported and none is pending, then prints them; it exits 0 when all passed and 1 when any failed. It
replaces the `gh pr checks --watch --required` line in the `threads` skill. Tried on #653 after its merge: all nine of
`main`'s required checks listed, exit 0.

## Supersedes

- .agents/skills/threads/SKILL.md: "`gh pr checks <n> -R Open-Harness/orthograph --watch --required`, so you are woken" → "`tools/ci/watch-required.sh <n>` (it waits for every check the base branch requires"
