import { Effect } from "effect";
import { BadLoanName, LoanExpired, type LoansApi } from "./types.ts";

const NAME = /^[A-Z][A-Z0-9_]{0,63}$/;

export const Loans: LoansApi = {
  take: (lent, now) =>
    Effect.gen(function* () {
      for (const loan of lent) {
        if (!NAME.test(loan.name) || loan.name.startsWith("SUPERAGENT_") || loan.name === "PATH" || loan.name === "HOME") return yield* Effect.fail(new BadLoanName({ variable: loan.name }));
        if (loan.expiresAt <= now) return yield* Effect.fail(new LoanExpired({ variable: loan.name, expiresAt: loan.expiresAt }));
      }
      // Longest values first, so a value that holds another is replaced whole.
      const byLength = lent.filter((l) => l.value !== "").sort((a, b) => b.value.length - a.value.length);
      return {
        env: Object.fromEntries(lent.map((l) => [l.name, l.value])),
        loans: lent.map((l) => ({ name: l.name, scope: l.scope, expiresAt: l.expiresAt })),
        redact: (text) => byLength.reduce((out, l) => out.replaceAll(l.value, `[redacted:${l.name}]`), text),
      };
    }),
};
