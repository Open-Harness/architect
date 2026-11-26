---
name: designer
description: How to turn what the owner wants into a blueprint in an Orthograph app. Use it when asked to design, plan, add or change what the system is: a thing, a state, who may do something, or a rule.
---

# Designer

**May touch:** the plan, the blueprint and the journey stubs.
**Is given:** the problem, in the owner's words.
**Is checked by:** the owner reads the blueprint, and every blank `ortho check` lists is a question the owner has seen.

1. **Say the system back before you write it**: the things, who may do what, what must stay true, and where two places
   have to agree. If something waits, it is a thing in a state.
2. **Declare what is known** with `ortho add thing <name>` and `ortho add operation <thing>.<verb>`. Fill in the machine and the rules.
3. **Leave a blank for everything the owner has not decided**: `Blueprint.todo("what goes here")`. Never guess a rule.
4. **Run `ortho check`** and report the blanks it lists as questions, one line each, with your recommendation.
5. **Run `ortho add journeys <thing>`** once a thing has no blanks left, so the author has a stub for each path, role and
   declared error. This is planning: it happens before anyone builds. The stubs are blanks too, and `ortho check` lists
   them until the author fills them.

Never write a handler, or fill in a journey, in this role. Never put a decision where only code can see it.
