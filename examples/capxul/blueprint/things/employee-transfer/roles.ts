// A transfer has no role of its own. The company's owner drafts, submits and cancels it, through `owner.of("company")`
// or `owner.of("employeeTransfer.company")`; the employee reads their own, through `self.of("employee")`, as HRMS
// gives the Employee role read.
export {};
