import { Blueprint } from "orthograph";
import { Employee } from "./thing.ts";
import { machine } from "./machine.ts";
import { EmployeeAlreadyHired } from "./errors.ts";

// A person is one active employee of a company at a time. Someone who has left may be hired again, as ERPNext allows.
export const onePlacePerPerson = Blueprint.invariant.unique([Employee.fields.company, Employee.fields.person], {
  while: [machine.states.active],
  refuse: EmployeeAlreadyHired,
});
