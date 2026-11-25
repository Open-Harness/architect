// The generated CLI's JSON keeps every value's own `toJSON` (#742 item 5, after #969). To print a decimal as its text, a
// replacer may read the value from its holder (`this[k]`), since `JSON.stringify` has already called `toJSON` by then.
// A replacer that does that for every value skips each value's `toJSON`. An `HttpClientRequest`'s `toJSON` redacts its
// headers, so with that replacer a refusal from an unreachable server printed `authorization: Bearer <token>`.
// `decimal-answer.test.ts` checks only decimals and bigints, so it can't see this; this file can.
//
// Green today and on #969's build. It exists to fail on a replacer that skips `toJSON`.
//
// The rendered `output.ts` is run as written: it is put in a scratch project beside a stand-in for the SDK's `Errors`,
// which is all it imports from the SDK.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { type Context, Effect, Option } from "effect";
import { HttpClientError, HttpClientRequest } from "effect/http";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { Model } from "@orthograph/compiler";
import { renderCli } from "./internal/cli.ts";

// Under the package, so `effect` resolves from the scratch project the way generated code's imports do.
const scratch = resolve(import.meta.dirname, "../../../.ortho/json-keeps-tojson");
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

type Output = {
  readonly answer: (json: boolean) => <A extends object, E>(effect: Effect.Effect<A, E>) => Effect.Effect<unknown, never, unknown>;
  readonly ExitCode: Context.Key<unknown, { readonly set: (code: number) => Effect.Effect<void> }>;
};
const loadOutput = async (): Promise<Output> => {
  const model = { operations: {}, things: {} } as unknown as Model;
  const file = renderCli(model, "books").find((f) => f.path === "generated/cli/src/output.ts");
  if (file === undefined) throw new Error("renderCli wrote no generated/cli/src/output.ts");
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "p-"));
  mkdirSync(join(root, "generated/cli/src"), { recursive: true });
  mkdirSync(join(root, "generated/sdk/src"), { recursive: true });
  writeFileSync(join(root, "generated/cli/src/output.ts"), file.content);
  writeFileSync(join(root, "generated/sdk/src/index.ts"), "export const Errors = { refusals: {}, codes: {}, declared: {} };\n");
  return (await import(join(root, "generated/cli/src/output.ts"))) as Output;
};

/** What the CLI writes to stdout and stderr for `effect`, with `--json` or not. */
const printed = async (json: boolean, effect: Effect.Effect<object, unknown>): Promise<string> => {
  const { answer, ExitCode } = await loadOutput();
  const lines: Array<string> = [];
  const keep = (...args: Array<unknown>) => void lines.push(args.map(String).join(" "));
  const log = vi.spyOn(console, "log").mockImplementation(keep);
  const error = vi.spyOn(console, "error").mockImplementation(keep);
  // The refusal path sets the exit code through this service; the check reads only what is printed.
  try {
    const run = answer(json)(effect).pipe(Effect.provideService(ExitCode, { set: () => Effect.void })) as Effect.Effect<unknown>;
    await Effect.runPromise(run);
  } finally {
    log.mockRestore();
    error.mockRestore();
  }
  return lines.join("\n");
};

const TOKEN = "sk_live_7f3kQ9zT";
const request = HttpClientRequest.get("https://books.invalid/v1/rates").pipe(HttpClientRequest.bearerToken(TOKEN));
const unreachable = new HttpClientError.HttpClientError({ reason: new HttpClientError.TransportError({ request, cause: new Error("connect ECONNREFUSED") }) } as never);

describe("The generated CLI's JSON keeps each value's own toJSON", () => {
  it("never prints a request's bearer token when the server can't be reached", async () => {
    const out = await printed(true, Effect.fail(unreachable));
    expect(out).toContain("books.invalid");
    expect(out).not.toContain(TOKEN);
  });

  it("never prints a request's bearer token held in a --json answer, and shows it redacted", async () => {
    const out = await printed(true, Effect.succeed({ request }));
    expect(out).not.toContain(TOKEN);
    expect(JSON.parse(out)).toEqual({ request: JSON.parse(JSON.stringify(request)) });
  });

  it("prints an Option in a --json answer as its own toJSON makes it", async () => {
    const out = JSON.parse(await printed(true, Effect.succeed({ due: Option.some(3), paid: Option.none() }))) as unknown;
    expect(out).toEqual({ due: { _id: "Option", _tag: "Some", value: 3 }, paid: { _id: "Option", _tag: "None" } });
  });
});
