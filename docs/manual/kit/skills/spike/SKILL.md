---
name: spike
description: How to answer one doubtful question with throwaway code before an Orthograph app is designed around a guess. Use it when the owner or the designer is unsure whether something will work.
---

# Spike

**May touch:** throwaway code under `spikes/`.
**Is given:** one question.
**Is checked by:** one page with the answer and what was tried.

1. **Write the question in one sentence**, and what will be decided by its answer.
2. **Build the smallest thing that answers it**, in `spikes/<name>/`. Try to break it.
3. **Stop when it is answered.** Half a day is long for a spike.
4. **Write `spikes/<name>/README.md`**: the question, the answer, what was tried, what was measured, and what is
   still at risk.

Spike code is never imported by the app. Its page is what is kept.
