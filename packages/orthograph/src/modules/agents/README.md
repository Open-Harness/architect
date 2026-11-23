# agents

Owns `Blueprint.agent` (K40 fix 3, GOAL17-executor-slots): what one kind of agent runs with, in a file of
`blueprint/agents/`. An agent is a thing in `@orthograph/agents`; this declaration is the kind's model, instructions,
tools and, for a kind that holds a seat, `slots: { size, reserve, held }`. The compiler names each by its file and says
`slots` in the model. Test: `agents.test.ts`.
