# work

The work system, declared in Orthograph's own language (decision F5, `design/decisions/F5-work-blueprint.md`). A person
or an agent opens a **mission**; it has **milestones** (steps of the build loop over a thing or operation, as far as an
environment); intake asks **questions** about the blueprint's gaps; **runs** are agents working one task each;
**attention** is what only you decide. Tasks are never stored: `mission.tasks` works them out from the milestones, the
blueprint and the logbook's facts.

- `ortho model --root examples/work` lists what is declared; `ortho check --root examples/work` names the one
  blank (the logbook dependency, L3.01).
- `generated/` is made by `ortho generate --root examples/work`: the `work` CLI, `@work/sdk`, the MCP server (the
  manager's and the runs' tools), docs and the portal wire.
- `src/` holds the handler scaffolds. None is written yet; journeys come first, from another agent.
<!-- probe -->
