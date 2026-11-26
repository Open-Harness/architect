import { Blueprint } from "orthograph";
import { ExpenseClaim } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's Expense Claim is a draft until it is submitted Approved (status Unpaid, until it is paid) or Rejected.
// Cancelling, and Paid, come with the books and getting paid.
export const machine = Blueprint.machine(ExpenseClaim, {
  states: ["draft", "approved", "rejected"],
  moves: {
    create: { from: [], to: "draft", emits: Events.ExpenseClaimCreated },
    approve: { from: ["draft"], to: "approved", emits: Events.ExpenseClaimApproved },
    reject: { from: ["draft"], to: "rejected", emits: Events.ExpenseClaimRejected },
  },
  notFrom: { exit: 40 },
});
