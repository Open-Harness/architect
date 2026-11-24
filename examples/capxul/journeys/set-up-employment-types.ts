// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { EmploymentTypeCreated } from "../blueprint/things/employment-type/events.ts";
import { EmploymentTypeNameTaken } from "../blueprint/things/employment-type/errors.ts";
import { machine as types } from "../blueprint/things/employment-type/machine.ts";
import create from "../blueprint/things/employment-type/verbs/create.ts";
import get from "../blueprint/things/employment-type/verbs/get.ts";

export default Blueprint.journey("set up employment types", {
  // Ada runs Acme Trading and Acme Logistics; Bo runs Bo Ltd.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "three companies",
  steps: (s) => [
    s.step(
      "Ada adds an employment type to Acme Trading",
      s.ada.run(create, { company: s.world.company, employmentTypeName: "Full-time" }),
      expect((a) => a.employmentType).toMatch(/^ety_[0-9a-z]+$/),
      emits(EmploymentTypeCreated, { employmentType: s.last.employmentType, company: s.world.company }),
      types.isIn(s.last.employmentType, "active"),
      spans({ present: ["employment-type.create", "employment-type.create.insert"] }),
    ),
    s.step(
      "Bo can't read it",
      s.bo.run(get, { id: s.last.employmentType }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "it reads back as she typed it",
      s.ada.run(get, { id: s.last.employmentType }),
      expect((a) => [a.company, a.employmentTypeName, a.state]).toEqual([s.world.company, "Full-time", "active"]),
      noEvents(),
    ),
    s.step(
      "Ada adds a second one",
      s.ada.run(create, { company: s.world.company, employmentTypeName: "Contract" }),
      expect((a) => a.employmentType).toMatch(/^ety_[0-9a-z]+$/),
      emits(EmploymentTypeCreated, { employmentType: s.last.employmentType, company: s.world.company }),
    ),
    s.step(
      "the second reads back under its own name",
      s.ada.run(get, { id: s.last.employmentType }),
      expect((a) => [a.company, a.employmentTypeName, a.state]).toEqual([s.world.company, "Contract", "active"]),
      noEvents(),
    ),
    s.step(
      "the first name can't be added to Acme Trading twice",
      s.ada.run(create, { company: s.world.company, employmentTypeName: "Full-time" }),
      refuses(EmploymentTypeNameTaken, { employmentTypeName: "Full-time" }),
      noEvents(),
    ),
    s.step(
      "Bo can't add a type to Ada's company",
      s.bo.run(create, { company: s.world.company, employmentTypeName: "Intern" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["employment-type.create", "employment-type.create.insert"] }),
    ),
    s.step(
      "Acme Logistics may have one of that name of its own",
      s.ada.run(create, { company: s.world.otherCompany, employmentTypeName: "Full-time" }),
      expect((a) => a.employmentType).toMatch(/^ety_[0-9a-z]+$/),
      emits(EmploymentTypeCreated, { employmentType: s.last.employmentType, company: s.world.otherCompany }),
    ),
    s.step(
      "it reads back in Acme Logistics",
      s.ada.run(get, { id: s.last.employmentType }),
      expect((a) => [a.company, a.employmentTypeName, a.state]).toEqual([s.world.otherCompany, "Full-time", "active"]),
      noEvents(),
    ),
    s.step(
      "Bo adds one of that name to Bo Ltd",
      s.bo.run(create, { company: s.world.boCompany, employmentTypeName: "Full-time" }),
      expect((a) => a.employmentType).toMatch(/^ety_[0-9a-z]+$/),
      emits(EmploymentTypeCreated, { employmentType: s.last.employmentType, company: s.world.boCompany }),
    ),
    s.step(
      "Ada can't read Bo's",
      s.ada.run(get, { id: s.last.employmentType }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Bo reads his back, in Bo Ltd",
      s.bo.run(get, { id: s.last.employmentType }),
      expect((a) => [a.company, a.employmentTypeName, a.state]).toEqual([s.world.boCompany, "Full-time", "active"]),
      noEvents(),
    ),
  ],
});
