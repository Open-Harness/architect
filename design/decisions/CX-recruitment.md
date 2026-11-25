# CX-recruitment: recruitment's shape, which rules are HRMS's and which are Capxul's own

**Decided 24 November 2026** by Goal 16's lead (thread T-01a2093c-8643-7794-9ce7-5dbc110ce4aa), with slice 8e's checks
author, who read HRMS at `46b38904` (`hrms/hr/doctype/{job_opening,job_applicant,interview_round,interview,
interview_feedback,job_offer}`). Where the lead's outline and the source differed, the source won, and the lead accepted
each change.

## What 8e holds

Six things, each per company: **Job Opening** (`open → closed`), **Job Applicant** (`open → hold`; `open | hold → rejected | accepted`),
**Interview Round**, **Interview** (`pending → cleared | rejected`), **Interview Feedback** (`given`) and **Job Offer**
(`awaiting → accepted | rejected`). The company's owner runs all of them. An interviewer gives feedback signed in as
themselves (`self.of("interviewer")`). No amount appears; an offer's pay, when it comes, is USDC base units (CX-grill,
section 3).

## The rules

| Rule | Whose | Where |
|---|---|---|
| A new applicant for a closed opening is refused (`OpeningClosed`) | HRMS, `JobApplicant.before_insert` | `job-applicant.create` |
| One interview per applicant per round (`InterviewAlreadyScheduled`) | HRMS, `validate_duplicate_interview`; stricter here: every state, not only submitted ones, since counting by state needs a list (#764) | unique rule `interview.oneInterviewPerRound` |
| Only the interview's interviewers give feedback (`FeedbackGiverNotInterviewer`) | HRMS, `validate_interviewer` | `interview-feedback.give` |
| No feedback before the interview's day (`FeedbackBeforeInterview`), by the world's clock in UTC; the day itself is allowed | HRMS, `validate_interview_date` | `interview-feedback.give` |
| One feedback per interviewer per interview (`FeedbackAlreadyGiven`) | HRMS, `validate_duplicate` | unique rule `interview-feedback.oneFeedbackPerInterviewer` |
| One offer per applicant (`OfferAlreadyMade`), in every state | HRMS, `JobOffer.validate`, which counts every offer not cancelled; Capxul has no cancel yet | unique rule `job-offer.oneOfferPerApplicant` |
| A round's name is unique in its company (`RoundNameTaken`) | HRMS names a round by it, site-wide; per company here (K42, call 10) | unique rule `interview-round.oneNamePerCompany` |
| An opening hires at least one person (`OpeningWithoutVacancies`) | Capxul's own; HRMS leaves `vacancies` optional | `job-opening.create` |
| A rejected applicant isn't interviewed (`ApplicantRejected`) | Capxul's own | `interview.create` |
| An interview's round is in the applicant's company (`RoundNotInCompany`) | Capxul's own; HRMS's rounds are site-wide | `interview.create` |
| An interview ends after it starts (`InterviewEndsBeforeStart`) | Capxul's own; HRMS doesn't check its times | `interview.create` |
| Interviewers are employees of the company (`RoundInterviewerNotInCompany`, `InterviewerNotInCompany`) | Capxul's own; HRMS's interviewers are any User | `interview-round.create`, `interview.create` |
| A leaver isn't put on a new round or interview (`RoundInterviewerHasLeft`, `InterviewerHasLeft`) | Capxul's own, following CX-expense-leavers | `interview-round.create`, `interview.create` |
| An offer's job title is the applicant's company's (`OfferDesignationNotInCompany`) | Capxul's own; HRMS's designations are site-wide | `job-offer.create` |
| An applicant is accepted only once their offer is accepted (`OfferNotAccepted`) | Capxul's, standing in for HRMS's `update_job_applicant` (below). Stricter than HRMS, which can also mark an applicant Accepted from a cleared interview (`update_job_applicant_status`) | `job-applicant.accept` |
| Two openings may share a title in a company | Capxul's own. HRMS's `route` (`jobs/<company>/<title>`) is unique and filled in by default, so HRMS refuses a second opening of one title unless someone edits the route; Capxul has no web route, and a title is not a rule of the business | none |

When several apply, the company check over every interviewer comes before the leaver check, wherever each interviewer
stands in the list. The refusal orders are in each thing's `errors.ts`, and journeys pin them.

## Where the source changed the outline

- **An applicant's email isn't unique.** The outline had it unique per opening, after a `check_email_id_is_unique`. HRMS
  at `46b38904` has no such check: `JobApplicant.autoname` appends a number to a repeated email ("applicant can apply more
  than once for a different job title or reapply"), and `test_job_applicant_naming` inserts one email twice. A journey
  step pins a second application under the same email.
- **One interview per applicant per round** wasn't in the outline. HRMS has it, so Capxul does too.

## Leavers

Following CX-expense-leavers, a leaver starts nothing new: they aren't put on a new round or interview. A leaver may still
give feedback on an interview they were on, since that finishes an open record. Interviews and rounds made before they
left keep them.

## The offer and the applicant: a second call, for now (#972)

HRMS's `JobOffer.on_change` sets the applicant Accepted or Rejected in the same save. An Orthograph handler can't move a
second thing's state yet: an operation has one move, on its own thing, and `Records.update` writes fields, never a state.
That gap is #972.

Until #972 lands, `job-offer.accept` and `job-offer.reject` move only the offer and answer the applicant's id. The
applicant's own `job-applicant.accept` follows as a second call. It finds the applicant's offer through
`job-offer.oneOfferPerApplicant` with `findBy`, and refuses `OfferNotAccepted` when there's none or it isn't accepted.
`job-applicant.reject` needs no offer, since an applicant may be turned down after an interview without one. When #972
lands, the second call folds into the offer's moves, and the journeys that make it lose that step.

## Time

Feedback's day rule reads the world's clock, so Capxul's local environment is stepped, starting at Tuesday
1 December 2026, 09:00 UTC (`blueprint/environments/local.ts`). No other handler reads the clock.

## Left out of 8e

- Staffing Plan and Job Requisition, and so HRMS's vacancy checks against a staffing plan (`validate_current_vacancies`,
  `validate_vacancies`).
- Employee Referral, Job Applicant Source, the opening, offer-term and appointment-letter templates, Appointment Letter,
  skills and skill assessments, ratings, and Interview Type.
- Onboarding, which goes to 8f. Turning an offer into an employee is out too: `employee.hire` stays separate, and a
  journey hires after acceptance.
- An interview's status doesn't follow from feedback: the owner sets it. HRMS's Under Review comes later.
- Overlapping interviewer schedules, a closing day and closing openings when they fill, and the interview's designation
  check (`validate_designation`): the first needs a list (#764), and the others wait on optional fields (#742, item 5).
- Cancelling and amending offers, interviews and feedback.
- An interviewer listed twice on a round or an interview: HRMS's tables allow it, and no rule here settles it.
- Whether an applicant already turned down may still be made an offer: HRMS doesn't refuse it, and no journey settles it.
