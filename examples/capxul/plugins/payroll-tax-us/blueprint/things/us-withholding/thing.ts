import { Blueprint } from "orthograph";

// One pay's US tax, worked out from the government's published figures (design/goals/16-lane-payroll-tax.md). Slice 0
// answers only: a computation is recorded once a journey reads one back.
export const UsWithholding = Blueprint.thing({
  description: "One pay's US tax lines: federal and state, each employee's and employer's share.",
  code: "UW",
  fields: {
    id: Blueprint.id("uwh"),
  },
});
