// A goal has no role of its own. HRMS gives the Employee role create, read and write on goals, and `validate_goal_access`
// keeps an employee to their own: here the employee, signed in as themselves (`self.of("employee")`), and the company's
// owner (`owner.of("company")`) set, move and read them; anyone else is refused.
export {};
