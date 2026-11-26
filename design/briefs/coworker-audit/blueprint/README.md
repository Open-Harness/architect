# Coworker, a first blueprint

A sketch of Coworker's core as an Orthograph blueprint: its nouns, their states, the main verbs and who may do what.
Written by the audit of 26 November 2026 (`../README.md`). It is a design, in the spelling the repository uses today.

**It does not compile, and nobody has tried.** It sits under `design/`, outside any project; it imports three plugins
that live in `examples/superagent/plugins/` and are not packages yet; and it uses `Blueprint.todo` in places the
compiler does not take a blank (`allowed`, a role's rule). No handler, journey or check exists for it.

How to read it:

- `Blueprint.todo("AARON: …")` is a blank only Aaron can fill. Each is a decision on the board.
- `Blueprint.todo("GAP <id>: …")` is a blank the framework cannot hold yet. Each id is a row in `../map.md`.
- A line ending `// new` uses a form that is only sketched in K46 and has no slice.
- Everything else is a form that exists on `main` today (`examples/work`, `examples/superagent`, `examples/starter`).
- `end-to-end.md` is the proposal these files were written for. `app/` and `../web/` are its worked example of the
  screens; `features/agents.ts` is its worked example of agents as actors talking through hops.

What is left out on purpose, because it exists only for how the old code works (`../audit.md`, pass 2): the dedupe
tables (`trigger`, `notice_sent`, receipts), the fan-out links (`join_item`, `person_ask_item`, `waiters`), the
outboxes (`dt.sends`, `dt.audit-outbox`), the routing index (`follow`, `workspace_directory`), `run_image`,
`environment_build`, `schema_version`, and the whole older chat app (`Directory`, the chat-room `Workspace`, Library,
Admin). The audit log is not a thing either: Orthograph's journal and traces already record who did what under which
role.

What is not here yet, and comes from a plugin or a later slice: sign-in, organisations, membership and invitations
(`examples/starter`'s things, mounted in `features/teams.ts`); triggers, the gate, policy, threads and accounts
(`@orthograph/intake`); model connections, the vault, environments, skills, billing and usage.
