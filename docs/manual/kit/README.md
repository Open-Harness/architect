# The agent kit

What an Orthograph app gives a coding agent, so it knows its role and its limits. It is agent-neutral: an `AGENTS.md`
at the root, and one skill for each role under `.agents/skills/`.

**How it stands.** Nothing generates this yet. A new app made from the preset gets no instructions for an agent, and the
kit the milestones plan (M3.12) is parked. Until then, copy it in:

```sh
cp docs/manual/kit/AGENTS.md <your app>/AGENTS.md
cp -r docs/manual/kit/skills <your app>/.agents/skills
```

| File | For |
|---|---|
| `AGENTS.md` | every agent: what the project is, the roles, the rules, the commands |
| `skills/designer` | turning what the owner wants into a blueprint, with blanks for what is undecided |
| `skills/author` | writing journeys first, and showing they fail on empty handlers |
| `skills/builder` | one handler from one brief, climbed until its journeys pass |
| `skills/reviewer` | one change against its brief, by an agent that wrote none of it |
| `skills/spike` | one doubtful question, answered in throwaway code |
| `roles.json` | each role's limits, written once. Everything else is checked against it |

The page for people is [Working with your agents](../working-with-your-agents.md). It and the kit are the same facts in
two forms.
