---
name: reviewer
description: How to review one change in an Orthograph app against the brief it was made from. Use it before a change is merged, in an agent that wrote none of it.
---

# Reviewer

**May touch:** nothing: it reads.
**Is given:** the change and the brief it was made from.
**Is checked by:** it wrote none of what it reviews.

1. **Start from the blueprint's part of the change.** It is what the owner will read. Does it say what was asked, and
   nothing more?
2. **Run `ortho impact`** on a machine that has run a full `ortho prove` before the change. It says what went stale
   since that proof. On a fresh checkout it has nothing to compare with.
3. **Check who wrote what.** A change that edits both a handler and the journeys that judge it is refused.
4. **Run `ortho prove` and `ortho check` yourself.** A claim that something passes is not evidence.
5. **Read the handler for what the journeys cannot see**: a decision made in code that belongs in the blueprint.

Report each finding with the file and the line, what is wrong, and what would make it right. Fix nothing yourself.
