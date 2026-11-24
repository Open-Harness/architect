// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// The world's clock starts at Tuesday 1 December 2026, 09:00 UTC (environments/local.ts). Feedback is judged by the
// clock's day in UTC against the interview's day (HRMS's `validate_interview_date`). The order of refusals
// (interview-feedback/errors.ts): FeedbackGiverNotInterviewer, then FeedbackBeforeInterview; FeedbackAlreadyGiven is
// the rule's, at commit. A leaver may still give feedback on an interview they were on (CX-recruitment).
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { InterviewFeedbackGiven } from "../blueprint/things/interview-feedback/events.ts";
import { FeedbackAlreadyGiven, FeedbackBeforeInterview, FeedbackGiverNotInterviewer } from "../blueprint/things/interview-feedback/errors.ts";
import { machine as feedback } from "../blueprint/things/interview-feedback/machine.ts";
import { machine as interviews } from "../blueprint/things/interview/machine.ts";
import relieve from "../blueprint/things/employee/verbs/relieve.ts";
import createRound from "../blueprint/things/interview-round/verbs/create.ts";
import schedule from "../blueprint/things/interview/verbs/create.ts";
import rejectInterview from "../blueprint/things/interview/verbs/reject.ts";
import clearInterview from "../blueprint/things/interview/verbs/clear.ts";
import getInterview from "../blueprint/things/interview/verbs/get.ts";
import give from "../blueprint/things/interview-feedback/verbs/give.ts";
import get from "../blueprint/things/interview-feedback/verbs/get.ts";

export default Blueprint.journey("give interview feedback", {
  // Pat's Technical interview is on Thursday 3 December 2026, ten to eleven, with Olga and Cy, engineers at Acme
  // Trading. Ada runs Acme Trading and Acme Logistics, where Bo drives.
  cast: { ada: owner, olga: Blueprint.signedIn, cy: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "an interview",
  steps: (s) => [
    s.step(
      "Olga can't give feedback two days before the interview",
      s.olga.run(give, { interview: s.world.interview, interviewer: s.world.employee, result: "Cleared" }),
      refuses(FeedbackBeforeInterview, { scheduledOn: "2026-12-03" }),
      noEvents(),
      spans({ absent: ["interview-feedback.give.insert"] }),
    ),
    s.step(
      "Ada can't give it for her",
      s.ada.run(give, { interview: s.world.interview, interviewer: s.world.employee, result: "Cleared" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["interview-feedback.give", "interview-feedback.give.insert"] }),
    ),
    s.step(
      "nor can Bo",
      s.bo.run(give, { interview: s.world.interview, interviewer: s.world.employee, result: "Rejected" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Bo can't give his own: he isn't one of its interviewers, which is judged before the day",
      s.bo.run(give, { interview: s.world.interview, interviewer: s.world.outsider, result: "Rejected" }),
      refuses(FeedbackGiverNotInterviewer),
      noEvents(),
      spans({ absent: ["interview-feedback.give.insert"] }),
    ),
    s.step(
      "the clock reaches a second before midnight on the eve of the interview",
      s.clock.moveTo("2026-12-02T23:59:59Z"),
      expect((a) => a.now).toBe("2026-12-02T23:59:59.000Z"),
    ),
    s.step(
      "Olga still can't give it",
      s.olga.run(give, { interview: s.world.interview, interviewer: s.world.employee, result: "Cleared" }),
      refuses(FeedbackBeforeInterview, { scheduledOn: "2026-12-03" }),
      noEvents(),
    ),
    s.step(
      "nor can Cy",
      s.cy.run(give, { interview: s.world.interview, interviewer: s.world.secondEmployee, result: "Rejected" }),
      refuses(FeedbackBeforeInterview, { scheduledOn: "2026-12-03" }),
      noEvents(),
    ),
    s.step(
      "the clock reaches midnight on the interview's day",
      s.clock.moveTo("2026-12-03T00:00:00Z"),
      expect((a) => a.now).toBe("2026-12-03T00:00:00.000Z"),
    ),
    s.step(
      "Bo still can't give his own",
      s.bo.run(give, { interview: s.world.interview, interviewer: s.world.outsider, result: "Cleared" }),
      refuses(FeedbackGiverNotInterviewer),
      noEvents(),
    ),
    s.step(
      "Olga clears Pat, on the day itself",
      s.olga.run(give, { interview: s.world.interview, interviewer: s.world.employee, result: "Cleared" }),
      expect((a) => a.interviewFeedback).toMatch(/^ifb_[0-9a-z]+$/),
      emits(InterviewFeedbackGiven, { interviewFeedback: s.last.interviewFeedback, interview: s.world.interview, interviewer: s.world.employee, result: "Cleared" }),
      feedback.isIn(s.last.interviewFeedback, "given"),
      spans({ present: ["interview-feedback.give", "interview-feedback.give.load", "interview-feedback.give.insert"] }),
    ),
    s.step(
      "Cy can't read Olga's",
      s.cy.run(get, { id: s.last.interviewFeedback }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "it reads back in Acme Trading, as she gave it",
      s.olga.run(get, { id: s.last.interviewFeedback }),
      expect((a) => [a.company, a.interview, a.interviewer, a.result, a.state]).toEqual([
        s.world.company,
        s.world.interview,
        s.world.employee,
        "Cleared",
        "given",
      ]),
      noEvents(),
    ),
    s.step(
      "Olga can't give a second, even another result",
      s.olga.run(give, { interview: s.world.interview, interviewer: s.world.employee, result: "Rejected" }),
      refuses(FeedbackAlreadyGiven),
      noEvents(),
    ),
    s.step(
      "the interview is still pending: feedback doesn't decide it",
      s.ada.run(getInterview, { id: s.world.interview }),
      expect((a) => a.state).toBe("pending"),
      noEvents(),
    ),
    s.step(
      "Ada adds a culture round",
      s.ada.run(createRound, { company: s.world.company, roundName: "Culture", interviewers: [] }),
      expect((a) => a.interviewRound).toMatch(/^irn_[0-9a-z]+$/),
    ),
    s.step(
      "and schedules Pat's culture interview for Saturday 5 December, with Olga and Cy",
      s.ada.run(schedule, {
        jobApplicant: s.world.jobApplicant,
        interviewRound: s.last.interviewRound,
        scheduledOn: "2026-12-05",
        fromTime: "10:00",
        toTime: "11:00",
        interviewers: [s.world.employee, s.world.secondEmployee],
      }),
      expect((a) => a.interview).toMatch(/^ivw_[0-9a-z]+$/),
    ),
    s.step(
      "Olga can't give feedback on that one yet: its own day is judged",
      s.olga.run(give, { interview: s.last.interview, interviewer: s.world.employee, result: "Cleared" }),
      refuses(FeedbackBeforeInterview, { scheduledOn: "2026-12-05" }),
      noEvents(),
    ),
    s.step(
      "nor Cy",
      s.cy.run(give, { interview: s.last.interview, interviewer: s.world.secondEmployee, result: "Cleared" }),
      refuses(FeedbackBeforeInterview, { scheduledOn: "2026-12-05" }),
      noEvents(),
    ),
    s.step(
      "Ada adds the final round",
      s.ada.run(createRound, { company: s.world.company, roundName: "Final", interviewers: [] }),
      expect((a) => a.interviewRound).toMatch(/^irn_[0-9a-z]+$/),
    ),
    s.step(
      "and schedules Pat's final interview for today, with Olga alone",
      s.ada.run(schedule, {
        jobApplicant: s.world.jobApplicant,
        interviewRound: s.last.interviewRound,
        scheduledOn: "2026-12-03",
        fromTime: "15:00",
        toTime: "16:00",
        interviewers: [s.world.employee],
      }),
      expect((a) => a.interview).toMatch(/^ivw_[0-9a-z]+$/),
    ),
    s.step(
      "Cy can't give feedback on it: she isn't one of its interviewers",
      s.cy.run(give, { interview: s.last.interview, interviewer: s.world.secondEmployee, result: "Cleared" }),
      refuses(FeedbackGiverNotInterviewer),
      noEvents(),
    ),
    s.step(
      "Ada marks Pat's final interview cleared before any feedback",
      s.ada.run(clearInterview, { interview: s.last.interview }),
      expect((a) => a.interview).toMatch(/^ivw_[0-9a-z]+$/),
      interviews.isIn(s.last.interview, "cleared"),
    ),
    s.step(
      "Olga, who gave feedback on the technical interview, may still give it on the cleared final one",
      s.olga.run(give, { interview: s.last.interview, interviewer: s.world.employee, result: "Rejected" }),
      expect((a) => a.interviewFeedback).toMatch(/^ifb_[0-9a-z]+$/),
      emits(InterviewFeedbackGiven, { interviewFeedback: s.last.interviewFeedback, interviewer: s.world.employee, result: "Rejected" }),
    ),
    s.step(
      "Ada reads it back rejected",
      s.ada.run(get, { id: s.last.interviewFeedback }),
      expect((a) => [a.company, a.interviewer, a.result]).toEqual([s.world.company, s.world.employee, "Rejected"]),
      noEvents(),
    ),
    s.step(
      "Ada relieves Cy on 3 December",
      s.ada.run(relieve, { employee: s.world.secondEmployee, relievingDate: "2026-12-03" }),
      expect((a) => a.relievingDate).toBe("2026-12-03"),
    ),
    s.step(
      "Cy, who has left, still gives her feedback on the technical interview she was on, still pending",
      s.cy.run(give, { interview: s.world.interview, interviewer: s.world.secondEmployee, result: "Rejected" }),
      expect((a) => a.interviewFeedback).toMatch(/^ifb_[0-9a-z]+$/),
      emits(InterviewFeedbackGiven, { interviewFeedback: s.last.interviewFeedback, interview: s.world.interview, interviewer: s.world.secondEmployee, result: "Rejected" }),
      feedback.isIn(s.last.interviewFeedback, "given"),
    ),
    s.step(
      "it reads back as hers",
      s.cy.run(get, { id: s.last.interviewFeedback }),
      expect((a) => [a.company, a.interview, a.interviewer, a.result, a.state]).toEqual([
        s.world.company,
        s.world.interview,
        s.world.secondEmployee,
        "Rejected",
        "given",
      ]),
      noEvents(),
    ),
    s.step(
      "Cy can't give a second",
      s.cy.run(give, { interview: s.world.interview, interviewer: s.world.secondEmployee, result: "Cleared" }),
      refuses(FeedbackAlreadyGiven),
      noEvents(),
    ),
    s.step(
      "Ada marks the technical interview rejected, though Olga cleared Pat",
      s.ada.run(rejectInterview, { interview: s.world.interview }),
      expect((a) => a.interview).toBe(s.world.interview),
      interviews.isIn(s.world.interview, "rejected"),
    ),
  ],
});
