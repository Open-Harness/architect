// Journey-author file: the settled list the importer check runs with, over the synthetic second source beside it.
// Same shape and hash rule as ../settled.ts. Georgia's head of household deduction is the fixture's one invented
// disagreement; Illinois' Line 2 stands for a disagreement the second source shows only by leaving a figure out.
import type { Settled } from "../settled.ts";

export const settledFixture: ReadonlyArray<Settled> = [
  {
    id: "ga-hoh-deduction-fixture",
    status: "settled",
    ruling: "Synthetic. The open-withholding fixture's $15,000 stands; the synthetic second source's 15750 is invented.",
    evidence: [{ document: "Synthetic", url: "https://example.test/synthetic/ga-june", at: "none", read: "2026-11-26" }],
    secondSource: {
      file: "data/tax/2026/state-income-tax.json",
      figures: ["/states/GA/1/annualStandardDeduction/head_of_household"],
      sha256: "990f6d8889bf6b95c3a8e04c83fd3f05b0ed98889ba39d6e339643ecaec2b12f",
    },
    review: false,
  },
  {
    id: "il-line-2-fixture",
    status: "settled",
    ruling: "Synthetic. The second source carries Line 1 only; the open-withholding fixture's Line 2 ($1,000) stands.",
    evidence: [{ document: "Synthetic", url: "https://example.test/synthetic/il", at: "none", read: "2026-11-26" }],
    secondSource: {
      file: "data/tax/2026/state-income-tax.json",
      figures: ["/states/IL/0/exemptionPerAllowance"],
      sha256: "923d241db72f80b3cc2602e334133e8ea74cdcb8bad7b180717fd2594f36ea41",
    },
    review: false,
  },
];
