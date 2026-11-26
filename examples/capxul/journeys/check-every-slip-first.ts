// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// HRMS's Payroll Entry `before_submit` judges `validate_existing_salary_slips` over every employee before any slip's
// `set_salary_structure_assignment` (decisions/CX-payroll.md): an earlier hire with no assignment at the start doesn't
// hide a later hire's slip from another entry.
import { Blueprint, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { SalarySlipExists } from "../blueprint/things/payroll-entry/errors.ts";
import draftPayroll from "../blueprint/things/payroll-entry/verbs/create.ts";
import submitPayroll from "../blueprint/things/payroll-entry/verbs/submit.ts";
import payrollEmployees from "../blueprint/things/payroll-employee-detail/verbs/list.ts";
import assign from "../blueprint/things/salary-structure-assignment/verbs/create.ts";
import submitAssignment from "../blueprint/things/salary-structure-assignment/verbs/submit.ts";
import relieve from "../blueprint/things/employee/verbs/relieve.ts";

const employees = (p: { readonly items: ReadonlyArray<{ readonly employee: string }> }) => p.items.map((i) => i.employee);

export default Blueprint.journey("check every slip first", {
  // Acme Trading's engineers' structure, assigned to Olga from 5 January 2026; Cy joined on 12 January and Eve on 19
  // January, neither assigned.
  cast: { ada: owner },
  starts: "a third paid employee",
  steps: (s) => {
    const draft = () =>
      s.ada.run(draftPayroll, {
        company: s.world.company, postingDate: "2026-02-28", startDate: "2026-02-01", endDate: "2026-02-28", costCenter: s.world.costCenter, payrollPayableAccount: s.world.payable,
      });
    const to = (employee: unknown, fromDate: string) =>
      s.ada.run(assign, { company: s.world.company, employee, salaryStructure: s.world.salaryStructure, fromDate } as never);
    return [
      s.step("Ada relieves Olga on 31 January", s.ada.run(relieve, { employee: s.world.employee, relievingDate: "2026-01-31" })),
      s.step("she assigns the structure to Eve from 1 February", to(s.world.thirdEmployee, "2026-02-01")),
      s.step("and submits it", s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment })),
      s.step("February's first payroll holds Eve alone", draft(), expect((a) => a.numberOfEmployees).toBe(1n)),
      s.step("it holds Eve", s.ada.run(payrollEmployees, { payrollEntry: s.last.payrollEntry }), expect(employees).toEqual([s.world.thirdEmployee])),
      s.step("Ada submits it: Eve's draft slip", s.ada.run(submitPayroll, { payrollEntry: s.last.items[0].payrollEntry }), expect((a) => a.slips).toBe(1n)),
      s.step("she assigns the structure to Cy from 10 February", to(s.world.secondEmployee, "2026-02-10")),
      s.step("and submits it", s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment })),
      s.step("February's second payroll holds Cy and Eve: a draft slip doesn't keep Eve out", draft(), expect((a) => a.numberOfEmployees).toBe(2n)),
      s.step("Cy first, then Eve", s.ada.run(payrollEmployees, { payrollEntry: s.last.payrollEntry }), expect(employees).toEqual([s.world.secondEmployee, s.world.thirdEmployee])),
      s.step(
        "it can't be submitted: Eve's slip is judged before Cy's late assignment, though Cy comes first",
        s.ada.run(submitPayroll, { payrollEntry: s.last.items[0].payrollEntry }),
        refuses(SalarySlipExists, { employee: s.world.thirdEmployee }),
        noEvents(),
        spans({ absent: ["payroll-entry.submit.slips"] }),
      ),
    ];
  },
});
