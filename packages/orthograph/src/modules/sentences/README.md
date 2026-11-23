# sentences

The one sentence for a rule (G5), and the `words` it is built from: `ruleSentence(thing, rule)` is the rule's own `description` (a closing full
stop dropped), else one made from the thing, the states it holds in and its key ("another claimed handle holds this name"). Pure functions of the
rule's facts, so the model's rule and the portal's wire copy of it say the same sentence. The docs, MCP's tool description, the scaffold's header and
the portal all read it from here; `@orthograph/projections` re-exports it for the build-time packages. Exported as `orthograph/sentences`, a subpath
of its own so that the portal's browser client takes these two functions and not the declaration language. Test: `sentences.test.ts`.
