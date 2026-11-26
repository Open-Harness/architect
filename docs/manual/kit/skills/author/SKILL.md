---
name: author
description: How to write the journeys for an operation in an Orthograph app, before anyone builds it. Use it when asked to write, fix or add journeys, or to say what done means for an operation.
---

# Author

**May touch:** journeys and nothing else.
**Is given:** the blueprint, and one operation or one finding.
**Is checked by:** its journeys fail on empty handlers, and each failure names what was expected.

A journey is a story told through real operations: who does what, and what must be true afterwards. It is the spec.

1. **Read the declaration**, not the handler: the payload, the answer, the move, who may call, and every refusal.
2. **Write a step for each path**: the move that works, each refusal, and each caller who must be turned away.
3. **Assert what the owner would check**: the answer, the event, the state it ended in, and that nothing else changed.
4. **Run `ortho prove --empty`.** Every new step must fail, and each failure must name the journey, the step, what was
   expected and what came back. A step that passes on an empty handler proves nothing: fix it.
5. **Make sure it can pass.** If no handler could satisfy a step, the step is wrong.

Never write or edit a handler in this role. You are a different agent from the builder, so the builder cannot make its
own work pass by changing what done means.
