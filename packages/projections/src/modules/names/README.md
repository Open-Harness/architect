# names

What every renderer here shares: the do-not-edit and scaffold lines, `pascal` and `camel`, where a declaration, a thing's
file, a store's file and a handler are imported from (the project's by path, a plugin's by its package), and the
`RenderedFile` a renderer hands back. `within` makes a built-in projection's files relative to its mount's folder and
refuses a mount named otherwise (`MountedElsewhere`): the other tools read `generated/server/` and `generated/api/` by
those names, so the mount's name must be one of them until M1.13 threads the name through. Test: `names.test.ts`.

`ruleSentence` (kept in `orthograph`, as `orthograph/sentences`, and re-exported here) is the one sentence for a rule (G5): its written `description` (a closing full stop dropped), else one made from
the thing, the states it holds in and its key ("another claimed handle holds this name"). `ruleBehind(model, op, refusal)` finds the
rule an operation's refusal is made for, from `op.invariants`, with its owning thing, which may not be the operation's own. The docs,
MCP's tool description, the scaffold's header and the portal all say that sentence.
