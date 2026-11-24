// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { DepartmentCreated } from "../blueprint/things/department/events.ts";
import { DepartmentNameTaken } from "../blueprint/things/department/errors.ts";
import { machine as departments } from "../blueprint/things/department/machine.ts";
import { DesignationCreated } from "../blueprint/things/designation/events.ts";
import { DesignationNameTaken } from "../blueprint/things/designation/errors.ts";
import { machine as designations } from "../blueprint/things/designation/machine.ts";
import createCompany from "../blueprint/things/company/verbs/create.ts";
import createDepartment from "../blueprint/things/department/verbs/create.ts";
import getDepartment from "../blueprint/things/department/verbs/get.ts";
import createDesignation from "../blueprint/things/designation/verbs/create.ts";
import getDesignation from "../blueprint/things/designation/verbs/get.ts";

export default Blueprint.journey("set up departments and job titles", {
  // Ada runs Acme Trading; Bo is signed in and runs nothing of hers.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "a company",
  steps: (s) => [
    s.step(
      "Ada adds a department",
      s.ada.run(createDepartment, { company: s.world.company, departmentName: "Engineering" }),
      expect((a) => a.department).toMatch(/^dep_[0-9a-z]+$/),
      emits(DepartmentCreated, { department: s.last.department, company: s.world.company }),
      departments.isIn(s.last.department, "active"),
      spans({ present: ["department.create", "department.create.insert"] }),
    ),
    s.step(
      "Bo can't read Ada's department",
      s.bo.run(getDepartment, { id: s.last.department }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada can't add a second department of the same name",
      s.ada.run(createDepartment, { company: s.world.company, departmentName: "Engineering" }),
      refuses(DepartmentNameTaken, { departmentName: "Engineering" }),
      noEvents(),
    ),
    s.step(
      "Bo can't add a department to Ada's company",
      s.bo.run(createDepartment, { company: s.world.company, departmentName: "Sales" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["department.create", "department.create.insert"] }),
    ),
    s.step(
      "Ada reads the department back",
      s.ada.run(getDepartment, { id: s.last.department }),
      expect((a) => [a.company, a.departmentName, a.state]).toEqual([s.world.company, "Engineering", "active"]),
      noEvents(),
    ),
    s.step(
      "Ada adds a second department",
      s.ada.run(createDepartment, { company: s.world.company, departmentName: "Finance and Accounts" }),
      expect((a) => a.department).toMatch(/^dep_[0-9a-z]+$/),
      emits(DepartmentCreated, { department: s.last.department, company: s.world.company }),
    ),
    s.step(
      "it reads back under its own name",
      s.ada.run(getDepartment, { id: s.last.department }),
      expect((a) => [a.company, a.departmentName, a.state]).toEqual([s.world.company, "Finance and Accounts", "active"]),
      noEvents(),
    ),
    s.step(
      "Ada adds a job title",
      s.ada.run(createDesignation, { company: s.world.company, designationName: "Engineer" }),
      expect((a) => a.designation).toMatch(/^dsg_[0-9a-z]+$/),
      emits(DesignationCreated, { designation: s.last.designation, company: s.world.company }),
      designations.isIn(s.last.designation, "active"),
      spans({ present: ["designation.create", "designation.create.insert"] }),
    ),
    s.step(
      "Ada can't add the same job title twice",
      s.ada.run(createDesignation, { company: s.world.company, designationName: "Engineer" }),
      refuses(DesignationNameTaken, { designationName: "Engineer" }),
      noEvents(),
    ),
    s.step(
      "Bo can't read Ada's job title",
      s.bo.run(getDesignation, { id: s.last.designation }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada reads the job title back",
      s.ada.run(getDesignation, { id: s.last.designation }),
      expect((a) => [a.company, a.designationName, a.state]).toEqual([s.world.company, "Engineer", "active"]),
      noEvents(),
    ),
    s.step(
      "Ada adds a second job title",
      s.ada.run(createDesignation, { company: s.world.company, designationName: "Senior Accountant" }),
      expect((a) => a.designation).toMatch(/^dsg_[0-9a-z]+$/),
      emits(DesignationCreated, { designation: s.last.designation, company: s.world.company }),
    ),
    s.step(
      "that reads back under its own name too",
      s.ada.run(getDesignation, { id: s.last.designation }),
      expect((a) => [a.company, a.designationName, a.state]).toEqual([s.world.company, "Senior Accountant", "active"]),
      noEvents(),
    ),
    s.step(
      "Bo sets up a company of his own",
      s.bo.run(createCompany, { companyName: "Bo Ltd", abbr: "BL", country: "Kenya", defaultCurrency: "KES" }),
      expect((a) => a.company).toMatch(/^com_[0-9a-z]+$/),
    ),
    s.step(
      "Bo's company may have a department of that name too, because names are unique within a company",
      s.bo.run(createDepartment, { company: s.last.company, departmentName: "Engineering" }),
      expect((a) => a.department).toMatch(/^dep_[0-9a-z]+$/),
      emits(DepartmentCreated, { department: s.last.department }),
    ),
  ],
});
