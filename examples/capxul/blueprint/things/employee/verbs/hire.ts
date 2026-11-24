import { Blueprint } from "orthograph";
import { Employee } from "../thing.ts";
import { machine } from "../machine.ts";
import { DepartmentNotInCompany, DesignationNotInCompany, JoinedBeforeBorn } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// EmployeeAlreadyHired belongs to the rule in ../invariants.ts, and the runtime refuses it.
export default Blueprint.operation(Employee, {
  description: "Hire a person into a company, placed in one of its departments under one of its job titles.",
  payload: {
    company: Employee.fields.company,
    person: Employee.fields.person,
    firstName: Employee.fields.firstName,
    gender: Employee.fields.gender,
    dateOfBirth: Employee.fields.dateOfBirth,
    dateOfJoining: Employee.fields.dateOfJoining,
    department: Employee.fields.department,
    designation: Employee.fields.designation,
  },
  answer: { employee: Employee.fields.id },
  move: machine.moves.hire,
  errors: [DepartmentNotInCompany, DesignationNotInCompany, JoinedBeforeBorn],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database(), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "200 millis" },
});
