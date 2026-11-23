import { Data, type Effect } from "effect";

/** What an adapter lends one call: a value, named as the process reads it, what it may do, and when it dies (epoch milliseconds). */
export interface Lent {
  readonly name: string;
  readonly value: string;
  /** In words, for the portal's list: "acme/widgets contents:write pull_requests:write". */
  readonly scope: string;
  readonly expiresAt: number;
}

/** A loan as recorded and listed: never the value. */
export interface Loan {
  readonly name: string;
  readonly scope: string;
  readonly expiresAt: number;
}

/** A loan that had already expired when the call came. */
export class LoanExpired extends Data.TaggedError("LoanExpired")<{ readonly variable: string; readonly expiresAt: number }> {}

/** A loan's name is not an environment name, or is one the sandbox sets itself. */
export class BadLoanName extends Data.TaggedError("BadLoanName")<{ readonly variable: string }> {}

/** What one call takes of its loans. */
export interface Taken {
  /** The variables to add to that one process's environment. */
  readonly env: Readonly<Record<string, string>>;
  readonly loans: ReadonlyArray<Loan>;
  /** `text` with every lent value replaced by `[redacted:<name>]`. */
  readonly redact: (text: string) => string;
}

export interface LoansApi {
  readonly take: (lent: ReadonlyArray<Lent>, now: number) => Effect.Effect<Taken, LoanExpired | BadLoanName>;
}
