// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// The order of refusals (interview/errors.ts): ApplicantRejected, RoundNotInCompany, InterviewEndsBeforeStart, then
// InterviewerNotInCompany if any interviewer works for another company, then InterviewerHasLeft if any has left;
// InterviewAlreadyScheduled is the rule's, at commit, in every state of the first interview.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { InterviewCleared, InterviewRejected, InterviewScheduled } from "../blueprint/things/interview/events.ts";
import {
  ApplicantRejected,
  InterviewAlreadyScheduled,
  InterviewEndsBeforeStart,
  InterviewerHasLeft,
  InterviewerNotInCompany,
  RoundNotInCompany,
} from "../blueprint/things/interview/errors.ts";
import { machine as interviews } from "../blueprint/things/interview/machine.ts";
import relieve from "../blueprint/things/employee/verbs/relieve.ts";
import createRound from "../blueprint/things/interview-round/verbs/create.ts";
import apply from "../blueprint/things/job-applicant/verbs/create.ts";
import rejectApplicant from "../blueprint/things/job-applicant/verbs/reject.ts";
import holdApplicant from "../blueprint/things/job-applicant/verbs/hold.ts";
import schedule from "../blueprint/things/interview/verbs/create.ts";
import clear from "../blueprint/things/interview/verbs/clear.ts";
import reject from "../blueprint/things/interview/verbs/reject.ts";
import get from "../blueprint/things/interview/verbs/get.ts";

const at = (scheduledOn: string, fromTime: string, toTime: string) => ({ scheduledOn, fromTime, toTime });

export default Blueprint.journey("schedule an interview", {
  // Pat applied for Backend Engineer at Acme Trading, where Olga and Cy are engineers and the round Technical has Olga;
  // Ada runs Acme Trading and Acme Logistics, where Bo drives.
  cast: { ada: owner, bo: Blueprint.signedIn, olga: Blueprint.signedIn },
  starts: "an outside employee",
  steps: (s) => [
    s.step(
      "Bo can't schedule Pat",
      s.bo.run(schedule, { jobApplicant: s.world.jobApplicant, interviewRound: s.world.interviewRound, ...at("2026-12-03", "10:00", "11:00"), interviewers: [s.world.employee] }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["interview.create", "interview.create.insert"] }),
    ),
    s.step(
      "nor can Olga",
      s.olga.run(schedule, { jobApplicant: s.world.jobApplicant, interviewRound: s.world.interviewRound, ...at("2026-12-03", "10:00", "11:00"), interviewers: [s.world.employee] }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada can't schedule one that ends when it starts",
      s.ada.run(schedule, { jobApplicant: s.world.jobApplicant, interviewRound: s.world.interviewRound, ...at("2026-12-03", "10:00", "10:00"), interviewers: [s.world.employee] }),
      refuses(InterviewEndsBeforeStart),
      noEvents(),
      spans({ absent: ["interview.create.insert"] }),
    ),
    s.step(
      "nor one that ends a quarter of an hour before it starts, in the same hour",
      s.ada.run(schedule, { jobApplicant: s.world.jobApplicant, interviewRound: s.world.interviewRound, ...at("2026-12-03", "10:30", "10:15"), interviewers: [s.world.employee] }),
      refuses(InterviewEndsBeforeStart),
      noEvents(),
    ),
    s.step(
      "nor one that runs past midnight",
      s.ada.run(schedule, { jobApplicant: s.world.jobApplicant, interviewRound: s.world.interviewRound, ...at("2026-12-03", "23:30", "00:30"), interviewers: [s.world.employee] }),
      refuses(InterviewEndsBeforeStart),
      noEvents(),
    ),
    s.step(
      "nor put Bo on it: he works for Acme Logistics, though she runs both",
      s.ada.run(schedule, { jobApplicant: s.world.jobApplicant, interviewRound: s.world.interviewRound, ...at("2026-12-03", "10:00", "11:00"), interviewers: [s.world.outsider] }),
      refuses(InterviewerNotInCompany),
      noEvents(),
    ),
    s.step(
      "nor after Olga",
      s.ada.run(schedule, { jobApplicant: s.world.jobApplicant, interviewRound: s.world.interviewRound, ...at("2026-12-03", "10:00", "11:00"), interviewers: [s.world.employee, s.world.outsider] }),
      refuses(InterviewerNotInCompany),
      noEvents(),
    ),
    s.step(
      "times are judged before interviewers",
      s.ada.run(schedule, { jobApplicant: s.world.jobApplicant, interviewRound: s.world.interviewRound, ...at("2026-12-03", "11:00", "10:00"), interviewers: [s.world.outsider] }),
      refuses(InterviewEndsBeforeStart),
      noEvents(),
    ),
    s.step(
      "Ada adds a technical round to Acme Logistics",
      s.ada.run(createRound, { company: s.world.otherCompany, roundName: "Technical", interviewers: [s.world.outsider] }),
      expect((a) => a.interviewRound).toMatch(/^irn_[0-9a-z]+$/),
    ),
    s.step(
      "she can't interview Pat at it: Pat applied to Acme Trading",
      s.ada.run(schedule, { jobApplicant: s.world.jobApplicant, interviewRound: s.last.interviewRound, ...at("2026-12-03", "10:00", "11:00"), interviewers: [s.world.employee] }),
      refuses(RoundNotInCompany),
      noEvents(),
      spans({ absent: ["interview.create.insert"] }),
    ),
    s.step(
      "the round is judged before the times",
      s.ada.run(schedule, { jobApplicant: s.world.jobApplicant, interviewRound: s.last.interviewRound, ...at("2026-12-03", "11:00", "10:00"), interviewers: [s.world.outsider] }),
      refuses(RoundNotInCompany),
      noEvents(),
    ),
    s.step(
      "Ada schedules Pat's technical interview with Cy and Olga, ten to half past",
      s.ada.run(schedule, { jobApplicant: s.world.jobApplicant, interviewRound: s.world.interviewRound, ...at("2026-12-03", "10:00", "10:30"), interviewers: [s.world.secondEmployee, s.world.employee] }),
      expect((a) => a.interview).toMatch(/^ivw_[0-9a-z]+$/),
      emits(InterviewScheduled, { interview: s.last.interview, jobApplicant: s.world.jobApplicant, interviewRound: s.world.interviewRound }),
      interviews.isIn(s.last.interview, "pending"),
      spans({ present: ["interview.create", "interview.create.load", "interview.create.insert"] }),
    ),
    s.step(
      "Olga can't read it",
      s.olga.run(get, { id: s.last.interview }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada can't schedule Pat's technical interview twice",
      s.ada.run(schedule, { jobApplicant: s.world.jobApplicant, interviewRound: s.world.interviewRound, ...at("2026-12-04", "14:00", "15:00"), interviewers: [s.world.secondEmployee] }),
      refuses(InterviewAlreadyScheduled),
      noEvents(),
    ),
    s.step(
      "Bo can't reject it",
      s.bo.run(reject, { interview: s.last.interview }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["interview.reject", "interview.reject.update"] }),
    ),
    s.step(
      "Ada marks it rejected",
      s.ada.run(reject, { interview: s.last.interview }),
      expect((a) => a.interview).toMatch(/^ivw_[0-9a-z]+$/),
      emits(InterviewRejected, { interview: s.last.interview }),
      interviews.isIn(s.last.interview, "rejected"),
      spans({ present: ["interview.reject", "interview.reject.update"] }),
    ),
    s.step(
      "it can't then be cleared",
      s.ada.run(clear, { interview: s.last.interview }),
      refuses(interviews.notFrom, { state: "rejected" }),
      noEvents(),
    ),
    s.step(
      "nor rejected again",
      s.ada.run(reject, { interview: s.last.interview }),
      refuses(interviews.notFrom, { state: "rejected" }),
      noEvents(),
    ),
    s.step(
      "it reads back in Acme Trading, as she set it, rejected",
      s.ada.run(get, { id: s.last.interview }),
      expect((a) => [a.company, a.jobApplicant, a.interviewRound, a.scheduledOn, a.fromTime, a.toTime, a.interviewers, a.state]).toEqual([
        s.world.company,
        s.world.jobApplicant,
        s.world.interviewRound,
        "2026-12-03",
        "10:00",
        "10:30",
        [s.world.secondEmployee, s.world.employee],
        "rejected",
      ]),
      noEvents(),
    ),
    s.step(
      "Pat's technical interview still can't be scheduled again, now the first is rejected",
      s.ada.run(schedule, { jobApplicant: s.world.jobApplicant, interviewRound: s.world.interviewRound, ...at("2026-12-04", "14:00", "15:00"), interviewers: [s.world.secondEmployee] }),
      refuses(InterviewAlreadyScheduled),
      noEvents(),
    ),
    s.step(
      "Ada adds a culture round, with nobody",
      s.ada.run(createRound, { company: s.world.company, roundName: "Culture", interviewers: [] }),
      expect((a) => a.interviewRound).toMatch(/^irn_[0-9a-z]+$/),
    ),
    s.step(
      "Pat may be interviewed at another round, a minute long, late on a day already past",
      s.ada.run(schedule, { jobApplicant: s.world.jobApplicant, interviewRound: s.last.interviewRound, ...at("2026-11-20", "23:58", "23:59"), interviewers: [s.world.employee] }),
      expect((a) => a.interview).toMatch(/^ivw_[0-9a-z]+$/),
      emits(InterviewScheduled, { interview: s.last.interview, jobApplicant: s.world.jobApplicant }),
    ),
    s.step(
      "Bo can't clear it",
      s.bo.run(clear, { interview: s.last.interview }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["interview.clear", "interview.clear.update"] }),
    ),
    s.step(
      "Ada marks it cleared",
      s.ada.run(clear, { interview: s.last.interview }),
      expect((a) => a.interview).toMatch(/^ivw_[0-9a-z]+$/),
      emits(InterviewCleared, { interview: s.last.interview }),
      interviews.isIn(s.last.interview, "cleared"),
      spans({ present: ["interview.clear", "interview.clear.update"] }),
    ),
    s.step(
      "it can't then be rejected",
      s.ada.run(reject, { interview: s.last.interview }),
      refuses(interviews.notFrom, { state: "cleared" }),
      noEvents(),
    ),
    s.step(
      "nor cleared again",
      s.ada.run(clear, { interview: s.last.interview }),
      refuses(interviews.notFrom, { state: "cleared" }),
      noEvents(),
    ),
    s.step(
      "it reads back with Olga alone, cleared",
      s.ada.run(get, { id: s.last.interview }),
      expect((a) => [a.scheduledOn, a.fromTime, a.toTime, a.interviewers, a.state]).toEqual(["2026-11-20", "23:58", "23:59", [s.world.employee], "cleared"]),
      noEvents(),
    ),
    s.step(
      "Ada relieves Olga on 30 November",
      s.ada.run(relieve, { employee: s.world.employee, relievingDate: "2026-11-30" }),
      expect((a) => a.relievingDate).toBe("2026-11-30"),
    ),
    s.step(
      "Ada adds the final round, with Cy",
      s.ada.run(createRound, { company: s.world.company, roundName: "Final", interviewers: [s.world.secondEmployee] }),
      expect((a) => a.interviewRound).toMatch(/^irn_[0-9a-z]+$/),
    ),
    s.step(
      "she can't put Olga on a new interview now she has left",
      s.ada.run(schedule, { jobApplicant: s.world.jobApplicant, interviewRound: s.last.interviewRound, ...at("2026-12-07", "09:00", "10:00"), interviewers: [s.world.employee] }),
      refuses(InterviewerHasLeft),
      noEvents(),
      spans({ absent: ["interview.create.insert"] }),
    ),
    s.step(
      "nor on a day already past, before she left",
      s.ada.run(schedule, { jobApplicant: s.world.jobApplicant, interviewRound: s.last.interviewRound, ...at("2026-11-20", "09:00", "10:00"), interviewers: [s.world.employee] }),
      refuses(InterviewerHasLeft),
      noEvents(),
    ),
    s.step(
      "nor after Cy",
      s.ada.run(schedule, { jobApplicant: s.world.jobApplicant, interviewRound: s.last.interviewRound, ...at("2026-12-07", "09:00", "10:00"), interviewers: [s.world.secondEmployee, s.world.employee] }),
      refuses(InterviewerHasLeft),
      noEvents(),
    ),
    s.step(
      "Olga gone and Bo from another company is refused for Bo, though Olga comes first",
      s.ada.run(schedule, { jobApplicant: s.world.jobApplicant, interviewRound: s.last.interviewRound, ...at("2026-12-07", "09:00", "10:00"), interviewers: [s.world.employee, s.world.outsider] }),
      refuses(InterviewerNotInCompany),
      noEvents(),
    ),
    s.step(
      "Cy alone may interview Pat at the final round, on a day still to come",
      s.ada.run(schedule, { jobApplicant: s.world.jobApplicant, interviewRound: s.last.interviewRound, ...at("2027-01-11", "09:00", "17:00"), interviewers: [s.world.secondEmployee] }),
      expect((a) => a.interview).toMatch(/^ivw_[0-9a-z]+$/),
      emits(InterviewScheduled, { interview: s.last.interview, jobApplicant: s.world.jobApplicant }),
      interviews.isIn(s.last.interview, "pending"),
    ),
    s.step(
      "Lee applies for the same job",
      s.ada.run(apply, { jobOpening: s.world.jobOpening, applicantName: "Lee Wanjiru", email: "lee@example.com" }),
      expect((a) => a.jobApplicant).toMatch(/^jap_[0-9a-z]+$/),
    ),
    s.step(
      "Ada puts Lee on hold",
      s.ada.run(holdApplicant, { jobApplicant: s.last.jobApplicant }),
      expect((a) => a.jobApplicant).toMatch(/^jap_[0-9a-z]+$/),
    ),
    s.step(
      "Ada can't put Olga on Lee's interview at the technical round, though that round lists her: she has left",
      s.ada.run(schedule, { jobApplicant: s.last.jobApplicant, interviewRound: s.world.interviewRound, ...at("2026-12-08", "09:00", "10:00"), interviewers: [s.world.employee] }),
      refuses(InterviewerHasLeft),
      noEvents(),
    ),
    s.step(
      "Lee, on hold, may be interviewed at the technical round with Cy",
      s.ada.run(schedule, { jobApplicant: s.last.jobApplicant, interviewRound: s.world.interviewRound, ...at("2026-12-08", "09:00", "10:00"), interviewers: [s.world.secondEmployee] }),
      expect((a) => a.interview).toMatch(/^ivw_[0-9a-z]+$/),
      emits(InterviewScheduled, { interview: s.last.interview, interviewRound: s.world.interviewRound }),
      interviews.isIn(s.last.interview, "pending"),
    ),
    s.step(
      "Sam applies for the same job",
      s.ada.run(apply, { jobOpening: s.world.jobOpening, applicantName: "Sam Otieno", email: "sam@example.com" }),
      expect((a) => a.jobApplicant).toMatch(/^jap_[0-9a-z]+$/),
    ),
    s.step(
      "and Ada turns Sam down at once",
      s.ada.run(rejectApplicant, { jobApplicant: s.last.jobApplicant }),
      expect((a) => a.jobApplicant).toMatch(/^jap_[0-9a-z]+$/),
    ),
    s.step(
      "she can't then interview Sam",
      s.ada.run(schedule, { jobApplicant: s.last.jobApplicant, interviewRound: s.world.interviewRound, ...at("2026-12-07", "09:00", "10:00"), interviewers: [s.world.secondEmployee] }),
      refuses(ApplicantRejected),
      noEvents(),
      spans({ absent: ["interview.create.insert"] }),
    ),
    s.step(
      "a rejected applicant is judged first, before the times and the interviewers",
      s.ada.run(schedule, { jobApplicant: s.last.jobApplicant, interviewRound: s.world.interviewRound, ...at("2026-12-07", "10:00", "09:00"), interviewers: [s.world.employee, s.world.outsider] }),
      refuses(ApplicantRejected),
      noEvents(),
    ),
    s.step(
      "Ada turns Pat down",
      s.ada.run(rejectApplicant, { jobApplicant: s.world.jobApplicant }),
      expect((a) => a.jobApplicant).toBe(s.world.jobApplicant),
    ),
    s.step(
      "and adds a panel round to Acme Logistics",
      s.ada.run(createRound, { company: s.world.otherCompany, roundName: "Panel", interviewers: [s.world.outsider] }),
      expect((a) => a.interviewRound).toMatch(/^irn_[0-9a-z]+$/),
    ),
    s.step(
      "Pat, now rejected, is refused for that first, before the other company's round, the times and the interviewers",
      s.ada.run(schedule, { jobApplicant: s.world.jobApplicant, interviewRound: s.last.interviewRound, ...at("2026-12-09", "10:00", "09:00"), interviewers: [s.world.outsider] }),
      refuses(ApplicantRejected),
      noEvents(),
    ),
  ],
});
