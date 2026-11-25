// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// KRAs and feedback criteria are each company's named lists, unique by title or name within it (CX-appraisals).
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { KraCreated } from "../blueprint/things/kra/events.ts";
import { KraTitleTaken } from "../blueprint/things/kra/errors.ts";
import { machine as kras } from "../blueprint/things/kra/machine.ts";
import createKra from "../blueprint/things/kra/verbs/create.ts";
import getKra from "../blueprint/things/kra/verbs/get.ts";
import { FeedbackCriteriaCreated } from "../blueprint/things/employee-feedback-criteria/events.ts";
import { CriteriaNameTaken } from "../blueprint/things/employee-feedback-criteria/errors.ts";
import { machine as criteria } from "../blueprint/things/employee-feedback-criteria/machine.ts";
import createCriteria from "../blueprint/things/employee-feedback-criteria/verbs/create.ts";
import getCriteria from "../blueprint/things/employee-feedback-criteria/verbs/get.ts";

export default Blueprint.journey("set up kras and criteria", {
  // Ada runs Acme Trading and Acme Logistics; Bo runs Bo Ltd.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "three companies",
  steps: (s) => [
    s.step(
      "Ada adds a KRA to Acme Trading",
      s.ada.run(createKra, { company: s.world.company, title: "Quality" }),
      expect((a) => a.kra).toMatch(/^kra_[0-9a-z]+$/),
      emits(KraCreated, { kra: s.last.kra, company: s.world.company }),
      kras.isIn(s.last.kra, "active"),
      spans({ present: ["kra.create", "kra.create.insert"] }),
    ),
    s.step("Bo can't read it", s.bo.run(getKra, { id: s.last.kra }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step(
      "it reads back as she typed it",
      s.ada.run(getKra, { id: s.last.kra }),
      expect((a) => [a.company, a.title, a.state]).toEqual([s.world.company, "Quality", "active"]),
      noEvents(),
    ),
    s.step(
      "the same title can't be added to Acme Trading twice",
      s.ada.run(createKra, { company: s.world.company, title: "Quality" }),
      refuses(KraTitleTaken, { title: "Quality" }),
      noEvents(),
    ),
    s.step(
      "but Acme Logistics may have its own",
      s.ada.run(createKra, { company: s.world.otherCompany, title: "Quality" }),
      expect((a) => a.kra).toMatch(/^kra_[0-9a-z]+$/),
      emits(KraCreated, { kra: s.last.kra, company: s.world.otherCompany }),
    ),
    s.step(
      "which reads back in Acme Logistics",
      s.ada.run(getKra, { id: s.last.kra }),
      expect((a) => [a.company, a.title]).toEqual([s.world.otherCompany, "Quality"]),
      noEvents(),
    ),
    s.step(
      "Bo can't add a KRA to Acme Trading",
      s.bo.run(createKra, { company: s.world.company, title: "Speed" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["kra.create.insert"] }),
    ),
    s.step(
      "Bo may use the title in Bo Ltd",
      s.bo.run(createKra, { company: s.world.boCompany, title: "Quality" }),
      expect((a) => a.kra).toMatch(/^kra_[0-9a-z]+$/),
    ),
    s.step("Ada can't read Bo's", s.ada.run(getKra, { id: s.last.kra }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step(
      "Ada adds a criteria to Acme Trading",
      s.ada.run(createCriteria, { company: s.world.company, criteria: "Problem Solving" }),
      expect((a) => a.employeeFeedbackCriteria).toMatch(/^efc_[0-9a-z]+$/),
      emits(FeedbackCriteriaCreated, { employeeFeedbackCriteria: s.last.employeeFeedbackCriteria, company: s.world.company }),
      criteria.isIn(s.last.employeeFeedbackCriteria, "active"),
      spans({ present: ["employee-feedback-criteria.create", "employee-feedback-criteria.create.insert"] }),
    ),
    s.step("Bo can't read it", s.bo.run(getCriteria, { id: s.last.employeeFeedbackCriteria }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step(
      "it reads back as she typed it",
      s.ada.run(getCriteria, { id: s.last.employeeFeedbackCriteria }),
      expect((a) => [a.company, a.criteria, a.state]).toEqual([s.world.company, "Problem Solving", "active"]),
      noEvents(),
    ),
    s.step(
      "a name in lower case is kept as typed",
      s.ada.run(createCriteria, { company: s.world.company, criteria: "teamwork" }),
      expect((a) => a.employeeFeedbackCriteria).toMatch(/^efc_[0-9a-z]+$/),
    ),
    s.step(
      "it reads back in lower case",
      s.ada.run(getCriteria, { id: s.last.employeeFeedbackCriteria }),
      expect((a) => [a.company, a.criteria]).toEqual([s.world.company, "teamwork"]),
      noEvents(),
    ),
    s.step(
      "the same criteria can't be added to Acme Trading twice",
      s.ada.run(createCriteria, { company: s.world.company, criteria: "Problem Solving" }),
      refuses(CriteriaNameTaken, { criteria: "Problem Solving" }),
      noEvents(),
    ),
    s.step(
      "but Acme Logistics may have its own",
      s.ada.run(createCriteria, { company: s.world.otherCompany, criteria: "Problem Solving" }),
      expect((a) => a.employeeFeedbackCriteria).toMatch(/^efc_[0-9a-z]+$/),
      emits(FeedbackCriteriaCreated, { employeeFeedbackCriteria: s.last.employeeFeedbackCriteria, company: s.world.otherCompany }),
    ),
    s.step(
      "Bo can't add criteria to Acme Trading",
      s.bo.run(createCriteria, { company: s.world.company, criteria: "Speed" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["employee-feedback-criteria.create.insert"] }),
    ),
  ],
});
