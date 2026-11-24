# declare

Owns `Blueprint.declare` (K39, "A superagent is a thing, and the actor"): one instance of a thing that the blueprint
makes at the first deploy, as the same create a person would call. A plugin wraps it for its own thing
(`Superagent.declare`). The compiler lists each in the model's `declared`, by its thing. Test: `declare.test.ts`.
