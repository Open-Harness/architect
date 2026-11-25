# CX-appraisals: KRAs, templates, cycles, appraisals, goals and performance feedback, which rules are HRMS's and which are Capxul's own

**Decided 25 November 2026** by Goal 16's lead (thread T-01a2093c-8643-7794-9ce7-5dbc110ce4aa), with slice 8g's checks
author (thread T-01a210a3-ed84-7616-ad24-0b27ad67babe), who read HRMS at `46b38904`
(`hrms/hr/doctype/{appraisal_cycle,appraisee,appraisal_template,appraisal_template_goal,kra,appraisal,appraisal_kra,appraisal_goal,goal,employee_performance_feedback,employee_feedback_criteria,employee_feedback_rating}`
and `hrms/hr/utils.py`). Where the lead's outline and the source differed, the source won. Each difference is listed
below for the lead to confirm.

## What 8g holds

Seven things, each in one company:

- **KRA** (`kra_`) and **Employee Feedback Criteria** (`efc_`): a company's named lists, unique by title (by name) in it.
  HRMS's are site-wide.
- **Appraisal Template** (`apt_`): a title (unique in the company), KRA lines with weightages totalling 100, and
  optional criteria lines whose weightages also total 100.
- **Appraisal Cycle** (`apc_`, `notStarted → inProgress → completed`, and `completed → inProgress` to reopen): its name
  (unique in the company), `startDate`, `endDate`, the KRA evaluation method (`Manual Rating` or
  `Automated Based on Goal Progress`) and appraisee rows (employee and template).
- **Appraisal** (`apr_`, `draft → submitted`): employee, cycle, template, the method copied from the cycle, KRA lines
  and self-rating lines copied from the template, and the total, self, average feedback and final scores. One per
  employee per cycle, as the unique rule `oneAppraisalPerCycle` (`AppraisalAlreadyExists`).
- **Goal** (`gol_`, `pending`, `inProgress`, `completed`, `archived`, `closed`): employee, cycle, KRA, name, progress
  0–100, `isGroup` and an optional `parentGoal` in the same employee's tree.
- **Employee Performance Feedback** (`epf_`, `draft → submitted`): the appraisal, its employee, cycle and company, the
  reviewer, what they wrote, criteria ratings and a total.

Weightages, ratings, scores and progress are decimals with two places, as leave's are. Ratings are 0 to 1, HRMS's
Rating field; a KRA score by hand is 0 to 5.

## Who calls what

The company's owner runs everything: KRAs, criteria, templates, cycles and their moves, creating, rating and submitting
appraisals, and any goal. The employee, signed in as themselves, reads their own appraisal and goals, rates themselves,
and creates and moves their own goals. A reviewer, signed in as themselves, drafts, submits and reads their own feedback;
the owner reads it too, and the appraised employee does not. Anyone else in the company is refused `NotAllowed`, and
each journey has one such caller per move.

## Scores (HRMS's formulas)

- Manual Rating: a KRA line earns score × weightage ÷ 100; the total is the earned scores summed (out of 5).
- Automated Based on Goal Progress: a KRA's score is the average progress of its top-level goals that aren't archived;
  a line earns score × weightage ÷ 100; the total is their sum ÷ 20.
- A group goal's progress is the average of its children that aren't archived, and its status follows unless it is
  archived or closed; this climbs to the root.
- Self and feedback scores are Σ rating × 5 × weightage ÷ 100. The average feedback score covers submitted feedback
  only. The final score is (total + self + average feedback) ÷ 3.
- Each score is rounded to two places, half up (Frappe's `flt` at precision 2).

The journeys pin the arithmetic with hand-worked numbers, including half-up cases (1.275 → 1.28, 3.025 → 3.03).

## Writes

`appraisal-cycle.start` writes `[AppraisalCycle, Appraisal]`. `goal.create` and the goal moves write `[Goal, Appraisal]`,
because progress feeds the appraisal's scores. `employee-performance-feedback.submit` writes
`[EmployeePerformanceFeedback, Appraisal]`, for the average.

## Where the source changed the outline

- **Feedback is refused only against a completed cycle.** The outline said "when the cycle isn't in progress". HRMS's
  `validate_active_appraisal_cycle` refuses only `Completed`, so a cycle not yet started takes feedback. It is judged by
  the cycle's state, never the clock.
- **A reviewer may give any number of feedbacks on one appraisal.** HRMS has no limit.
- **A completed cycle can be reopened** (`reopen`, back to `inProgress`): HRMS's form allows it. A completed cycle
  takes no new appraisal, goal, goal move or feedback.
- **Start skips appraisals that already exist** and employees who have left since the cycle was set up
  (`create_appraisals`), rather than refusing.
- **An employee may create and move their own goals.** HRMS gives the Employee role create and write on Goal.
- **Submit has no condition on the cycle.** HRMS's completed-cycle check runs on every save, but a cycle completes only
  when none of its appraisals is a draft, so a draft's cycle is never completed.
- **Goals have `archived` and `closed`, and group goals**, as HRMS does. A group's progress isn't typed; it follows its
  children.
- **Cycles are the owner's alone.** HRMS gives the Employee role read on Appraisal Cycle.
- **A goal always belongs to a cycle.** HRMS's cycle field is optional.
- **Left out:** HRMS's check for an appraisal with an overlapping period, its custom final-score formula option, and
  site-wide templates (Capxul's are per company).
- **Capxul's own bounds:** each weightage is above 0 and at most 100, a line appears once in a template, a rating by
  hand or a self or feedback rating names each line exactly once, and scores, ratings and progress below 0 are refused.

## Leavers (CX-expense-leavers, with Interview Feedback as the precedent)

An employee who has left gets no new appraisal, goal or feedback, and can't be an appraisee in a new cycle. One already
open still moves: they may self-rate and submit a drafted feedback, and the owner may rate and submit their appraisal.

## Time

Nothing reads the clock. Cycle days are typed in, and no journey steps the clock, so snag #1001 isn't in the way.

## Framework gaps, for core

1. **An optional answer field fails `prove`'s answer-shape eval when absent** ("answer.parentGoal: expected gol_<id>,
   got undefined"). `goal.create` no longer answers the parent; journeys reach it through `goal.list`.
2. **A read by id that names an optional field dies on a row without it** ("answered outside its declaration: Expected
   string"). `goal.get` leaves out `parentGoal`; `goal.list` carries it.
3. **A parent goal's status follows its children through `Records.update(…, state)`**, whose own comment reserves a
   state argument for sweeps (like #972). The throwaway build does it that way; core should say whether a handler may.
4. **A docs worked example renders `undefined` differently between `generate` and `check`**, which shows up as drift.
   Journeys avoid `undefined` in expectations.
5. **Decimals render as `{value, scale}` in generated docs.** Cosmetic.
6. **`s.last` is the only answer that carries forward**, so a long journey reaches back to earlier records through list
   reads (`appraisal.list`, `goal.list`).

## Known limits, left out of 8g

- Appraisal-linked promotions, energy points, reminders and emails.
- Cycle-wide recalculation tools beyond the final score each move keeps current.
- Cancelling and amending appraisals and feedback.
- Branch, department and job-title filters on a cycle.

## What the checks leave open

See the hostile-pass results in the pull request; survivors are listed there and below once the pass settles.
