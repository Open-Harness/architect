// A salary slip has no role of its own: the company's owner reads every slip, through `owner.of("company")` or
// `owner.of("payrollEntry.company")`, and an employee reads their own, through `self.of("employee")`.
export {};
