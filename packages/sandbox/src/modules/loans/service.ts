import { Effect } from "effect";
import { BadLoanName, LoanExpired, type LoansApi } from "./types.ts";
import { lendable, redactor } from "./internal/rules.ts";

export const Loans: LoansApi = {
  take: (lent, now) =>
    Effect.gen(function* () {
      for (const loan of lent) {
        if (!lendable(loan.name)) return yield* Effect.fail(new BadLoanName({ variable: loan.name }));
        if (loan.expiresAt <= now) return yield* Effect.fail(new LoanExpired({ variable: loan.name, expiresAt: loan.expiresAt }));
      }
      return {
        env: Object.fromEntries(lent.map((l) => [l.name, l.value])),
        loans: lent.map((l) => ({ name: l.name, scope: l.scope, expiresAt: l.expiresAt })),
        redact: redactor(lent),
      };
    }),
};
