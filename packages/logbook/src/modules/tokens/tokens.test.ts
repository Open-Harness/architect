// The token policy on its own, with tokens signed by a key of the test's own (the issuer-process run is local/local.test.ts).
import { Effect, Exit, Cause } from "effect";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { Tokens } from "./service.ts";
import type { TokenPolicy } from "./types.ts";

const policy: TokenPolicy = {
  issuer: "https://issuer.test", audience: "ortho-logbook", repository: "acme/acme",
  refs: ["refs/heads/main", "refs/pull/*/merge"], workflows: ["ci", ".github/workflows/prove.yml"],
};
const good = { repository: "acme/acme", ref: "refs/heads/main", workflow: "ci", event_name: "push", sha: "abc", job_workflow_ref: "acme/acme/.github/workflows/ci.yml@refs/heads/main" };

let privateKey: CryptoKey;
let tokens: ReturnType<typeof Tokens.make>;
beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  tokens = Tokens.make(policy, createLocalJWKSet({ keys: [{ ...(await exportJWK(pair.publicKey)), kid: "k", alg: "RS256" }] }));
});

const sign = (claims: Record<string, unknown>, o: { audience?: string; expires?: string } = {}) =>
  new SignJWT(claims).setProtectedHeader({ alg: "RS256", kid: "k" }).setIssuer(policy.issuer).setAudience(o.audience ?? policy.audience)
    .setIssuedAt().setExpirationTime(o.expires ?? "5m").sign(privateKey);

/** The reason a token was refused, or "accepted". */
const verdictOn = async (token: string | null) => {
  const exit = await Effect.runPromiseExit(tokens.verify(token === null ? null : `Bearer ${token}`));
  return Exit.isSuccess(exit) ? "accepted" : (Cause.squash(exit.cause) as { reason: string }).reason;
};

describe("the token policy", () => {
  it("accepts a token that meets it, keeping what the ledger stores", async () => {
    const claims = await Effect.runPromise(tokens.verify(`Bearer ${await sign(good)}`));
    expect(claims).toEqual({ repository: "acme/acme", ref: "refs/heads/main", workflow: "ci", eventName: "push", sha: "abc", jobWorkflowRef: good.job_workflow_ref });
  });

  it("takes a pull request's merge ref but only that shape: one segment, never a prefix", async () => {
    const pr = { ...good, ref: "refs/pull/7/merge", job_workflow_ref: "acme/acme/.github/workflows/ci.yml@refs/pull/7/merge" };
    expect(await verdictOn(await sign(pr))).toBe("accepted");
    expect(await verdictOn(await sign({ ...pr, ref: "refs/pull/7/merge/../x" }))).toBe("ref");
    expect(await verdictOn(await sign({ ...pr, ref: "refs/pull//merge" }))).toBe("ref");
    expect(await verdictOn(await sign({ ...good, ref: "refs/heads/main2" }))).toBe("ref");
  });

  it("refuses another repository, another workflow, and a job_workflow_ref from elsewhere", async () => {
    expect(await verdictOn(await sign({ ...good, repository: "someone/else" }))).toBe("repository");
    expect(await verdictOn(await sign({ ...good, workflow: "release", job_workflow_ref: "acme/acme/.github/workflows/release.yml@refs/heads/main" }))).toBe("workflow");
    expect(await verdictOn(await sign({ ...good, job_workflow_ref: "someone/else/.github/workflows/ci.yml@refs/heads/main" }))).toBe("job_workflow_ref");
    expect(await verdictOn(await sign({ ...good, job_workflow_ref: "acme/acme/.github/workflows/ci.yml@refs/heads/feature" }))).toBe("job_workflow_ref");
  });

  it("pins a workflow by file path when the entry is a path, whatever its name says", async () => {
    const byPath = { ...good, workflow: "anything", job_workflow_ref: "acme/acme/.github/workflows/prove.yml@refs/heads/main" };
    expect(await verdictOn(await sign(byPath))).toBe("accepted");
    expect(await verdictOn(await sign({ ...byPath, job_workflow_ref: "acme/acme/.github/workflows/other.yml@refs/heads/main" }))).toBe("workflow");
  });

  it("is RS256 only, and checks audience, expiry and the claims it needs", async () => {
    const pss = await generateKeyPair("PS256");
    const ps256 = await new SignJWT(good).setProtectedHeader({ alg: "PS256", kid: "k" }).setIssuer(policy.issuer).setAudience(policy.audience).setIssuedAt().setExpirationTime("5m").sign(pss.privateKey);
    expect(await verdictOn(ps256)).toBe("ERR_JOSE_ALG_NOT_ALLOWED");
    expect(await verdictOn(await sign(good, { audience: "other" }))).toBe("ERR_JWT_CLAIM_VALIDATION_FAILED");
    expect(await verdictOn(await sign(good, { expires: "-5m" }))).toBe("ERR_JWT_EXPIRED");
    const { ref: _, ...noRef } = good;
    expect(await verdictOn(await sign(noRef))).toBe("ERR_JWT_CLAIM_VALIDATION_FAILED");
    expect(await verdictOn(null)).toBe("missing token");
    expect(await verdictOn("not-a-jwt")).toBe("ERR_JWS_INVALID");
  });
});

describe("the policy from the worker's variables", () => {
  const vars = { OIDC_ISSUER: "https://i", OIDC_JWKS_URL: "https://i/jwks", OIDC_AUDIENCE: "ortho-logbook", ALLOWED_REPOSITORY: "a/b", ALLOWED_REFS: "refs/heads/main, refs/pull/*/merge", ALLOWED_WORKFLOWS: "ci" };
  it("reads them, trimming the lists", async () => {
    const read = await Effect.runPromise(Tokens.fromVars(vars));
    expect(read.jwksUrl).toBe("https://i/jwks");
    expect(read.policy).toEqual({ issuer: "https://i", audience: "ortho-logbook", repository: "a/b", refs: ["refs/heads/main", "refs/pull/*/merge"], workflows: ["ci"] });
  });
  it("names what is missing, and nothing else", async () => {
    const exit = await Effect.runPromiseExit(Tokens.fromVars({ ...vars, OIDC_ISSUER: "", ALLOWED_REFS: undefined }));
    expect(Exit.isFailure(exit) && (Cause.squash(exit.cause) as { missing: string[] }).missing).toEqual(["OIDC_ISSUER", "ALLOWED_REFS"]);
  });
});
