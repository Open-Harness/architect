// M1.42: the SDK's types file on acme's model with a few words changed. Hostile descriptions (a comment's end) must not break it.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { FieldModel, Model, ThingModel } from "@orthograph/compiler";
import { sdkTypes } from "./internal/types.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const acme = JSON.parse(execFileSync(process.execPath, [resolve(repo, "packages/compiler/src/main.ts"), resolve(repo, "examples/acme")], { encoding: "utf8" })) as Model;

/** Acme's model with `allowance.limit` saying `description` (and that field in the thing's events and operation payloads too). */
const saying = (description: string): Model => {
  const told = (f: FieldModel): FieldModel => ({ ...f, description });
  const allowance = acme.things["allowance"]!;
  const thing: ThingModel = { ...allowance, fields: { ...allowance.fields, limit: told(allowance.fields["limit"]!) } };
  return { ...acme, things: { ...acme.things, allowance: thing } };
};

describe("the SDK's types", () => {
  const types = (model: Model) => sdkTypes(model).files.find((f) => f.path === "generated/sdk/src/allowance/types.ts")!.content;

  it("export the thing, its states as a union and each event, and the front door re-exports them", () => {
    const text = types(acme);
    expect(text).toMatch(/export type AllowanceState = "[a-z]+"( \| "[a-z]+")*;/);
    expect(text).toContain("export type Allowance = {");
    expect(text).toContain('readonly "state": AllowanceState;');
    expect(text).toContain("export type AllowanceGranted = {");
    expect(sdkTypes(acme).exports.join("\n")).toMatch(/export type \{ Allowance, AllowanceState, [^}]*AllowanceGranted[^}]*\} from "\.\/allowance\/types\.ts";/);
  });

  it("use the article that fits the thing's name", () => {
    expect(types(acme)).toContain("The states an allowance moves between");
    expect(types(acme)).not.toContain("a allowance");
    expect(sdkTypes(acme).files.map((f) => f.content).join("\n")).not.toMatch(/\ba (allowance|organization|invitation|api-key|[aeiou]\w+) moves/);
  });

  it("put a field's description in a doc comment that a comment's end cannot cut short", () => {
    const text = types(saying("closes */ early\nand breaks a line"));
    const line = text.split("\n").find((l) => l.includes("closes"))!;
    expect(line).toBe("  /** closes *\\/ early and breaks a line */");
    expect(line.indexOf("*/")).toBe(line.length - 2);
  });
});

describe("InvalidPayload", () => {
  it("names where a payload is refused and why, and never the value that was refused", async () => {
    const { Effect, Exit, Cause } = await import("effect");
    const Sdk = await import(resolve(repo, "examples/acme/generated/sdk/src/index.ts"));
    const secret = "hunter2-not-a-string-9981";
    const exit = await Effect.runPromiseExit(Sdk.session.signIn({ email: "ada@example.com", password: 123456789, note: secret } as never).pipe(Effect.provide(Sdk.layer("http://127.0.0.1:1"))));
    expect(Exit.isFailure(exit)).toBe(true);
    const error = Exit.isFailure(exit) ? (Cause.squash(exit.cause) as { readonly _tag: string; readonly message: string }) : undefined;
    expect(error?._tag).toBe("InvalidPayload");
    expect(error?.message).toContain("password");
    expect(error?.message).not.toContain("123456789");
    expect(error?.message).not.toContain(secret);
  });
});
