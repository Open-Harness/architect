// Journey step: "no credential among the execution variables" (the canary is nowhere in what the bridge saw): what a loan does and does not carry.
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Loans } from "./service.ts";

const NOW = 1_000_000;
const gh = { name: "GH_TOKEN", value: "ghs_canary123", scope: "acme/widgets contents:write", expiresAt: NOW + 3_600_000 };
const take = (lent: ReadonlyArray<typeof gh>, now = NOW) => Effect.runPromise(Effect.result(Loans.take(lent, now)));

describe("loans", () => {
  it("puts the value in that call's environment and lists the loan without it", async () => {
    const result = await take([gh]);
    expect(result).toMatchObject({ _tag: "Success" });
    const taken = (result as { success: { env: object; loans: ReadonlyArray<object> } }).success;
    expect(taken.env).toEqual({ GH_TOKEN: "ghs_canary123" });
    expect(taken.loans).toEqual([{ name: "GH_TOKEN", scope: "acme/widgets contents:write", expiresAt: NOW + 3_600_000 }]);
    expect(JSON.stringify(taken.loans)).not.toContain("canary");
  });

  it("redacts every occurrence of every lent value, the longer value first", async () => {
    const result = await take([gh, { ...gh, name: "GH_TOKEN_LONG", value: "ghs_canary123-and-more" }]);
    const { redact } = (result as { success: { redact: (t: string) => string } }).success;
    expect(redact("token=ghs_canary123 again ghs_canary123; long ghs_canary123-and-more")).toBe("token=[redacted:GH_TOKEN] again [redacted:GH_TOKEN]; long [redacted:GH_TOKEN_LONG]");
    expect(redact("nothing here")).toBe("nothing here");
  });

  it("refuses a loan that has expired or expires this instant, by name", async () => {
    expect(await take([gh], NOW + 3_600_000)).toMatchObject({ _tag: "Failure", failure: { _tag: "LoanExpired", variable: "GH_TOKEN" } });
    expect(await take([gh], NOW + 3_600_001)).toMatchObject({ _tag: "Failure", failure: { _tag: "LoanExpired" } });
  });

  it("refuses a name the process could not read as a variable, or one the sandbox sets itself", async () => {
    for (const name of ["gh_token", "SUPERAGENT_DIR", "PATH", "HOME", ""]) expect(await take([{ ...gh, name }]), name).toMatchObject({ _tag: "Failure", failure: { _tag: "BadLoanName", variable: name } });
  });
});
