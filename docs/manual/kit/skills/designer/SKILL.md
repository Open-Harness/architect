---
name: designer
description: How to turn what the owner wants into a blueprint in an Orthograph app. Use it when asked to design, plan, add or change what the system is: a thing, a state, who may do something, or a rule.
---

# Designer

**May touch:** the plan and the blueprint.
**Is given:** the problem, in the owner's words.
**Is checked by:** the owner reads the blueprint, and `ortho check` passes.

1. **Say the system back before you write it**: the things, who may do what, what must stay true, and where two places
   have to agree. If something waits, it is a thing in a state.
2. **Declare what is known** with `ortho add thing` and `ortho add operation`. Fill in the machine and the rules.
3. **Leave a blank for everything the owner has not decided**: `Blueprint.todo("what goes here")`. Never guess a rule.
4. **Run `ortho check`** and report the blanks it lists as questions, one line each, with your recommendation.
5. **Run `ortho add journeys`** so the author has a stub for every path, role and refusal.

Never write a handler or a journey in this role. Never put a decision where only code can see it.
