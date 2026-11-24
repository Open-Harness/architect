// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// The order of refusals (interview-round/errors.ts): RoundInterviewerNotInCompany if any interviewer works for another
// company, then RoundInterviewerHasLeft if any has left, wherever each stands; RoundNameTaken is the rule's, at commit.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { InterviewRoundCreated } from "../blueprint/things/interview-round/events.ts";
import { RoundInterviewerHasLeft, RoundInterviewerNotInCompany, RoundNameTaken } from "../blueprint/things/interview-round/errors.ts";
import { machine as rounds } from "../blueprint/things/interview-round/machine.ts";
import createCompany from "../blueprint/things/company/verbs/create.ts";
import relieve from "../blueprint/things/employee/verbs/relieve.ts";
import create from "../blueprint/things/interview-round/verbs/create.ts";
import get from "../blueprint/things/interview-round/verbs/get.ts";

export default Blueprint.journey("set up interview rounds", {
  // Ada runs Acme Trading, where Olga and Cy are engineers and the round Technical has Olga, and Acme Logistics, where
  // Bo drives. Dee runs nothing yet.
  cast: { ada: owner, bo: Blueprint.signedIn, olga: Blueprint.signedIn, dee: Blueprint.signedIn },
  starts: "an outside employee",
  steps: (s) => [
    s.step(
      "the technical round reads back with Olga",
      s.ada.run(get, { id: s.world.interviewRound }),
      expect((a) => [a.company, a.roundName, a.interviewers, a.state]).toEqual([s.world.company, "Technical", [s.world.employee], "active"]),
      noEvents(),
    ),
    s.step(
      "Olga can't read it",
      s.olga.run(get, { id: s.world.interviewRound }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Bo can't add a round to Acme Trading",
      s.bo.run(create, { company: s.world.company, roundName: "Culture", interviewers: [] }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["interview-round.create", "interview-round.create.insert"] }),
    ),
    s.step(
      "Ada can't add a second technical round",
      s.ada.run(create, { company: s.world.company, roundName: "Technical", interviewers: [s.world.secondEmployee] }),
      refuses(RoundNameTaken, { roundName: "Technical" }),
      noEvents(),
    ),
    s.step(
      "Ada adds a panel round, with Cy then Olga",
      s.ada.run(create, { company: s.world.company, roundName: "Panel", interviewers: [s.world.secondEmployee, s.world.employee] }),
      expect((a) => a.interviewRound).toMatch(/^irn_[0-9a-z]+$/),
      emits(InterviewRoundCreated, { interviewRound: s.last.interviewRound, company: s.world.company }),
      rounds.isIn(s.last.interviewRound, "active"),
      spans({ present: ["interview-round.create", "interview-round.create.load", "interview-round.create.insert"] }),
    ),
    s.step(
      "it reads back with both, in the order given",
      s.ada.run(get, { id: s.last.interviewRound }),
      expect((a) => [a.company, a.roundName, a.interviewers, a.state]).toEqual([
        s.world.company,
        "Panel",
        [s.world.secondEmployee, s.world.employee],
        "active",
      ]),
      noEvents(),
    ),
    s.step(
      "Ada adds a culture round, in lower case, with nobody yet",
      s.ada.run(create, { company: s.world.company, roundName: "culture", interviewers: [] }),
      expect((a) => a.interviewRound).toMatch(/^irn_[0-9a-z]+$/),
      emits(InterviewRoundCreated, { interviewRound: s.last.interviewRound, company: s.world.company }),
    ),
    s.step(
      "it reads back as she typed it, with nobody",
      s.ada.run(get, { id: s.last.interviewRound }),
      expect((a) => [a.roundName, a.interviewers]).toEqual(["culture", []]),
      noEvents(),
    ),
    s.step(
      "Acme Logistics may have its own technical round, with Bo",
      s.ada.run(create, { company: s.world.otherCompany, roundName: "Technical", interviewers: [s.world.outsider] }),
      expect((a) => a.interviewRound).toMatch(/^irn_[0-9a-z]+$/),
      emits(InterviewRoundCreated, { interviewRound: s.last.interviewRound, company: s.world.otherCompany }),
    ),
    s.step(
      "it reads back in Acme Logistics",
      s.ada.run(get, { id: s.last.interviewRound }),
      expect((a) => [a.company, a.roundName, a.interviewers]).toEqual([s.world.otherCompany, "Technical", [s.world.outsider]]),
      noEvents(),
    ),
    s.step(
      "Dee sets up a company of her own",
      s.dee.run(createCompany, { companyName: "Dee Ltd", abbr: "DL", country: "Kenya", defaultCurrency: "KES" }),
      expect((a) => a.company).toMatch(/^com_[0-9a-z]+$/),
    ),
    s.step(
      "Dee's company may have its own technical round too",
      s.dee.run(create, { company: s.last.company, roundName: "Technical", interviewers: [] }),
      expect((a) => a.interviewRound).toMatch(/^irn_[0-9a-z]+$/),
    ),
    s.step(
      "Ada can't put Bo on an Acme Trading round: he works for Acme Logistics, though she runs both",
      s.ada.run(create, { company: s.world.company, roundName: "Final", interviewers: [s.world.outsider] }),
      refuses(RoundInterviewerNotInCompany),
      noEvents(),
      spans({ absent: ["interview-round.create.insert"] }),
    ),
    s.step(
      "nor after Olga",
      s.ada.run(create, { company: s.world.company, roundName: "Final", interviewers: [s.world.employee, s.world.outsider] }),
      refuses(RoundInterviewerNotInCompany),
      noEvents(),
    ),
    s.step(
      "nor put Olga on an Acme Logistics round",
      s.ada.run(create, { company: s.world.otherCompany, roundName: "Final", interviewers: [s.world.outsider, s.world.employee] }),
      refuses(RoundInterviewerNotInCompany),
      noEvents(),
    ),
    s.step(
      "Ada relieves Olga on 30 November",
      s.ada.run(relieve, { employee: s.world.employee, relievingDate: "2026-11-30" }),
      expect((a) => a.relievingDate).toBe("2026-11-30"),
    ),
    s.step(
      "Ada can't put Olga on a new round now she has left",
      s.ada.run(create, { company: s.world.company, roundName: "Final", interviewers: [s.world.employee] }),
      refuses(RoundInterviewerHasLeft),
      noEvents(),
      spans({ absent: ["interview-round.create.insert"] }),
    ),
    s.step(
      "nor after Cy",
      s.ada.run(create, { company: s.world.company, roundName: "Final", interviewers: [s.world.secondEmployee, s.world.employee] }),
      refuses(RoundInterviewerHasLeft),
      noEvents(),
    ),
    s.step(
      "Olga gone and Bo from another company is refused for Bo first, though Olga comes first",
      s.ada.run(create, { company: s.world.company, roundName: "Final", interviewers: [s.world.employee, s.world.outsider] }),
      refuses(RoundInterviewerNotInCompany),
      noEvents(),
    ),
    s.step(
      "the final round, with Cy alone, is taken",
      s.ada.run(create, { company: s.world.company, roundName: "Final", interviewers: [s.world.secondEmployee] }),
      expect((a) => a.interviewRound).toMatch(/^irn_[0-9a-z]+$/),
      emits(InterviewRoundCreated, { interviewRound: s.last.interviewRound, company: s.world.company }),
    ),
    s.step(
      "the technical round still reads back with Olga, who was on it before she left",
      s.ada.run(get, { id: s.world.interviewRound }),
      expect((a) => [a.roundName, a.interviewers]).toEqual(["Technical", [s.world.employee]]),
      noEvents(),
    ),
  ],
});
