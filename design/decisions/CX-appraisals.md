# CX-appraisals: KRAs, templates, cycles, appraisals, goals and performance feedback, which rules are HRMS's and which are Capxul's own

**Decided 25 November 2026** by Goal 16's lead (thread T-01a2093c-8643-7794-9ce7-5dbc110ce4aa), with slice 8g's checks
author (thread T-01a210a3-ed84-7616-ad24-0b27ad67babe), who read HRMS at `46b38904`
(`hrms/hr/doctype/{appraisal_cycle,appraisee,appraisal_template,appraisal_template_goal,kra,appraisal,appraisal_kra,appraisal_goal,goal,employee_performance_feedback,employee_feedback_criteria,employee_feedback_rating}`
and `hrms/hr/utils.py`). Where the lead's outline and the source differed, the source won. Each difference is listed below; the lead confirmed every one on #1030, 25 November 2026, two
places on every score as a deliberate departure from HRMS.

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

- Manual Rating: a KRA line earns score × weightage ÷ 100, stored rounded; the total sums the unrounded earned scores
  and rounds once (out of 5), as HRMS's loop does (`total += flt(entry.score_earned)` with no precision). So 4.25 × 30%
  and 3.15 × 70% read back as lines of 1.28 and 2.21 but total 3.48, not 3.49.
- Automated Based on Goal Progress: a KRA's score is the average progress of its top-level goals that aren't archived,
  rounded; a line earns score × weightage ÷ 100, rounded (HRMS's `goal_completion` and `goal_score` have precision 2);
  the total is those rounded lines summed ÷ 20.
- A group goal's progress is the average of its children that aren't archived, and this climbs to the root. Its
  status follows that progress by its own call (below, #972).
- Self and feedback scores are Σ rating × 5 × weightage ÷ 100, summed unrounded and rounded once (0.33 and 0.33 give
  1.155 + 0.495 = 1.65). The average feedback score covers submitted feedback
  only. The final score is (total + self + average feedback) ÷ 3.
- A goal move or a feedback submitted after the appraisal is submitted still rescores that appraisal, as HRMS does at
  `46b38904`. A goal's `on_update` calls `update_goal_progress_in_appraisal` (`goal.py` lines 46 and 125–134), and a
  feedback's `on_submit` calls `calculate_avg_feedback_score(update=True)` (`employee_performance_feedback.py` lines
  23–24 and 56–61). Both write the appraisal with `db_update` (`appraisal.py` lines 183–185 and 264–266), whatever its
  state. A completed cycle stops both (`validate_active_appraisal_cycle`, `appraisal_cycle.py` line 199).
- Every stored score has two places, rounded half up, as Frappe's default `Banker's Rounding (legacy)` rounds a half
  up. **This is Capxul's choice, from the brief, not HRMS's:** HRMS gives only `goal_completion` and `goal_score` two
  places; `total_score`, `self_score`, `avg_feedback_score`, `final_score`, `score_earned` and a goal's `progress` take
  the site's float precision, 3 by default (`test_appraisal.py` asserts a total of 1.938). Nor does HRMS store
  `score_earned` rounded; Capxul's line reads back at two places.

The journeys pin the arithmetic with hand-worked numbers, including half-up cases (1.275 → 1.28, 3.025 → 3.03) and
the rounding points above.

## A group's status: a second call, for now (#972)

HRMS's `update_parent_progress` sets each parent's progress and status as a child saves. An Orthograph handler may not
move another record's state: `Records.update(…, state)` is reserved for sweeps, and that gap is #972 (as in
CX-recruitment, for the offer and the applicant). So, the lead's call on 25 November 2026:

- A child's move rolls its parents' **progress** up as a field update on Goal, which the move's own `writes` cover.
- A group's **status** follows by its own call, `goal.roll-up` (`rollUp`, from and to pending, in progress or
  completed), made by the employee or the owner. It sets the status the group's progress gives and refuses a goal that
  isn't a group (`GoalNotGroup`) and a completed cycle (`GoalCycleCompleted`, judged first). Until it is called, a
  group reads with its old status.
- When #972 lands, roll-up folds into the child's moves, and the journeys lose those steps.

A group is never archived or closed (`GoalIsGroup`), so no journey reaches roll-up's machine refusal.

## Writes

`appraisal-cycle.start` writes `[AppraisalCycle, Appraisal]`. `goal.create` and the goal moves write `[Goal, Appraisal]`,
because progress feeds the appraisal's scores; `goal.roll-up` writes only its own Goal, since a status feeds no score.
`employee-performance-feedback.submit` writes
`[EmployeePerformanceFeedback, Appraisal]`, for the average.

## Where the source changed the outline

- **Feedback is refused only against a completed cycle.** The outline said "when the cycle isn't in progress". HRMS's
  `validate_active_appraisal_cycle` refuses only `Completed`, so a cycle not yet started takes feedback. It is judged by
  the cycle's state, never the clock.
- **A reviewer may give any number of feedbacks on one appraisal.** HRMS has no limit.
- **A completed cycle can be reopened** (`reopen`, back to `inProgress`): HRMS's form allows it. A completed cycle
  takes no new appraisal, goal, goal move or feedback.
- **Start makes the appraisals.** In HRMS, Start only sets the status (`appraisal_cycle.js`), and Create Appraisals is
  a separate button that may be pressed again while the cycle isn't completed; its check, "Please select employees to
  create appraisals for", becomes start's `CycleWithoutAppraisees`. HRMS starts an empty cycle; Capxul doesn't. An
  appraisal for an employee added later is made by hand (`appraisal.create`).
- **Start skips appraisals that already exist**, as `create_appraisals_for_cycle` skips a `DuplicateEntryError`. **It
  also skips employees who have left**, Capxul's own call under CX-expense-leavers: HRMS's `validate_active_employee`
  refuses only Inactive employees (and its error aborts the whole run), so a Left employee would get an appraisal.
- **An employee may create and move their own goals.** HRMS gives the Employee role create and write on Goal.
- **Submit has no condition on the cycle.** HRMS's completed-cycle check runs on every save, but a cycle completes only
  when none of its appraisals is a draft, so a draft's cycle is never completed.
- **Goals have `archived` and `closed`, and group goals**, as HRMS does. A group's progress isn't typed; it follows its
  children.
- **Cycles are the owner's alone.** HRMS gives the Employee role read on Appraisal Cycle.
- **Feedback is the reviewer's and the owner's.** HRMS shows the appraised employee their feedback history, and lets
  the HR Manager submit anyone's feedback; Capxul does neither. HRMS also refuses feedback on an Inactive employee's
  appraisal; Capxul's employees can't be Inactive, and feedback on a leaver's open appraisal is allowed.
- **A group goal is never archived, closed or completed by hand.** HRMS's list view refuses these on a group, though its
  form offers Archive and Close; Capxul follows the list (`GoalIsGroup`).
- **A goal always belongs to a cycle.** HRMS's cycle field is optional.
- **Left out:** HRMS's check for an appraisal with an overlapping period, its custom final-score formula option, and
  site-wide templates (Capxul's are per company).
- **Capxul's own bounds:** each weightage is above 0 and at most 100, a line appears once in a template, a rating by
  hand or a self or feedback rating names each line exactly once, and scores, ratings and progress below 0 are refused.
- **A goal's KRA is one of the appraisal's KRA lines, under either method** (`GoalKraNotInAppraisal`). HRMS's form
  offers KRAs from Appraisal KRA (`get_kras_for_employee`), which is empty under Manual Rating, so HRMS offers none
  there; Capxul allows a goal under a manual appraisal's KRA, and it scores nothing.

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
   Gaps 1 and 2 are #1018 (the read half #1023, the eval half #1029); they reach goal/capxul with the lead's next merge
   of main, and `goal.create` may then answer the parent and `goal.get` read it.
3. **A parent goal's status can't follow its children in the same call.** That is #972; `goal.roll-up` stands in
   (above).
4. **A docs worked example renders `undefined` differently between `generate` and `check`**, which shows up as drift.
   Journeys avoid `undefined` in expectations. Filed as #1031.
5. **Decimals render as `{value, scale}` in generated docs.** Cosmetic. Filed as #1032.
6. **`s.last` is the only answer that carries forward**, so a long journey reaches back to earlier records through list
   reads (`appraisal.list`, `goal.list`).

## Known limits, left out of 8g

- A group goal's status lags its progress until someone calls `goal.roll-up` (#972).
- Appraisal-linked promotions, energy points, reminders and emails.
- Cycle-wide recalculation tools beyond the final score each move keeps current.
- Cancelling and amending appraisals and feedback.
- Branch, department and job-title filters on a cycle.

## What the checks leave open

32 planted wrong builds are all caught, among them weightages that don't total 100 accepted, feedback on oneself
allowed and two appraisals per employee per cycle. A hostile pass then tried 33 more and 20 survived. New steps catch
19 of them: refusal order between a leaver and another company, given order kept on rate and self-rate, each rating
line rounded, `appraisal.create` not copying the cycle's method, start giving every row the first row's template or
refusing a start that makes nothing, feedback, goals and progress refused before a cycle starts, a feedback average
across cycles, a KRA the company has but the appraisal doesn't, a closed child left out of its group, a group
averaging its leaves, and goal moves dropping the feedback score. Each was rerun and caught.

One survives and can't be caught: a final score that uses the unrounded feedback average. The two always round to
the same final score, because the gap is at most 0.005 and lands exactly on a rounding boundary only where both round up.

The pass also found a rounding difference from HRMS: its manual total sums unrounded line scores. The journeys now
follow HRMS (Scores, above).
