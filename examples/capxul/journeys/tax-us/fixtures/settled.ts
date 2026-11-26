// Journey-author file: the settled list the importer check runs with, over the synthetic second source beside it.
// Same shape and hash rule as ../settled.ts. Two disagreements are invented: Georgia's head of household deduction
// from 11 May and the additional Medicare rate. Illinois' Line 2 stands for a disagreement the second source shows
// only by leaving a figure out, so it covers nothing; its figures are listed out of pointer order, one of them holds
// null and one an object whose keys are not in order (withoutCertificate), so the hash rule is judged whole.
import type { Settled } from "../settled.ts";

const synthetic = (url: string) => [{ document: "Synthetic", url, at: "none", read: "2026-11-26" }];

export const settledFixture: ReadonlyArray<Settled> = [
  {
    id: "ga-hoh-deduction-fixture",
    status: "settled",
    ruling: "Synthetic. The open-withholding fixture's $15,000 stands; the synthetic second source's 15750 is invented.",
    evidence: synthetic("https://example.test/synthetic/ga-june"),
    secondSource: {
      file: "data/tax/2026/state-income-tax.json",
      figures: ["/states/GA/0/annualStandardDeduction/head_of_household"],
      sha256: "990f6d8889bf6b95c3a8e04c83fd3f05b0ed98889ba39d6e339643ecaec2b12f",
    },
    covers: [{ pointer: "/states/GA/0/annualStandardDeduction/head_of_household", first: "15000" }],
    review: false,
  },
  {
    id: "il-line-2-fixture",
    status: "settled",
    ruling: "Synthetic. The second source carries Line 1 only; the open-withholding fixture's Line 2 ($1,000) stands.",
    evidence: synthetic("https://example.test/synthetic/il"),
    secondSource: {
      file: "data/tax/2026/state-income-tax.json",
      figures: ["/states/IL/0/exemptionPerAllowance", "/states/IL/0/lineTwoAllowance", "/states/IL/0/withoutCertificate"],
      sha256: "c5758f2810118088efe6fb3c4d03bb05d9cf09c1ff544f00ea212bf6fb712076",
    },
    covers: [],
    review: false,
  },
  {
    id: "medicare-additional-rate-fixture",
    status: "settled",
    ruling: "Synthetic. The open-withholding fixture's 0.9% stands; the synthetic second source's 0.0091 is invented.",
    evidence: synthetic("https://example.test/synthetic/fica"),
    secondSource: { file: "data/tax/2026/fica.json", figures: ["/medicare/additionalRate"], sha256: "0779dc3c9fdf5d38534bcad1a87b54533a7c643bc553be01a5bcd33358f48aac" },
    covers: [{ pointer: "/medicare/additionalRate", first: "0.009" }],
    review: false,
  },
];
