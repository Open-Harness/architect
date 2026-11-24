// A role path that walks to nothing (#767, the compiler side of #761). `owner.of("<path>")` is decided at runtime by
// walking the path field by field to an instance of the role's thing (language-effect's access/service.ts): from the
// payload field its first key names, else from the subject, and on a read by id a first key may name the subject's own
// thing. A path that can't reach the role's thing admits nobody, so `check` refuses it, naming the path, instead of
// letting every call be refused NotAllowed. Each case changes one `allowed` in a copy of Capxul, whose `owner` is a role
// on Company.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { nodeSource } from "#modules/source/service.js";
import { BlueprintInvalid } from "./types.ts";
import { Compiler } from "./service.ts";

const examples = resolve(import.meta.dirname, "../../../../../examples");
const scratch = resolve(import.meta.dirname, "../../../test/tmp-role-paths");
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));
const problemsOf = (exit: Exit.Exit<unknown, unknown>): ReadonlyArray<string> => {
  const error = Exit.isFailure(exit) ? exit.cause.reasons.map((r) => (r as { error?: unknown }).error).find((e) => e instanceof BlueprintInvalid) : undefined;
  if (Exit.isFailure(exit) && !(error instanceof BlueprintInvalid)) throw new Error(`the compiler failed without a problem list: ${JSON.stringify(exit.cause)}`);
  return error instanceof BlueprintInvalid ? error.problems : [];
};

/** A copy of Capxul's blueprint with one verb's `allowed: [owner.of("<was>")]` written as `owner.of("<path>")`. */
const capxulWith = (verb: string, was: string, path: string): string => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "c-"));
  cpSync(join(examples, "capxul/blueprint"), join(root, "blueprint"), {
    recursive: true,
    filter: (p) => !basename(p).startsWith(".") && !["starting-worlds"].includes(basename(p)),
  });
  const file = join(root, `blueprint/things/${verb}.ts`);
  const text = readFileSync(file, "utf8");
  const from = `owner.of("${was}")`;
  if (!text.includes(from)) throw new Error(`${verb} has no ${from}: the fixture moved`);
  writeFileSync(file, text.replace(from, `owner.of("${path}")`));
  return root;
};

/** The problems that name this verb's file and this path. */
const refusalsOf = async (verb: string, was: string, path: string) =>
  problemsOf(await modelOf(capxulWith(verb, was, path))).filter((p) => p.startsWith(`blueprint/things/${verb}.ts`) && p.includes(path));

describe("check refuses a role path that walks to nothing (#767)", () => {
  // The done check in #767: a read, from the subject, through the company to a key Company doesn't have.
  it("refuses a read's path that walks past the role's thing to a field it doesn't have", async () => {
    const [problem] = await refusalsOf("department/verbs/get", "company", "company.nothing");
    expect(problem, "no problem names department.get and company.nothing").toBeDefined();
    // It names the fields the walk could take where it stopped: Company's.
    expect(problem).toMatch(/companyName/);
  });

  it("refuses a read's first key that is neither a field of the subject nor the subject's own thing", async () => {
    // The runtime reads `departmnt` as the subject's own thing and admits the owner (#768), so only `check` can catch it.
    expect(await refusalsOf("department/verbs/get", "company", "departmnt.company")).toHaveLength(1);
  });

  it("refuses a read's path that ends on a thing that isn't the role's", async () => {
    // From the employee, `department` reaches a Department, and `owner` is a role on Company.
    expect(await refusalsOf("employee/verbs/get", "company", "department")).toHaveLength(1);
  });

  it("refuses an operation's first key that is neither a payload field nor a field of the subject", async () => {
    expect(await refusalsOf("employee/verbs/relieve", "employee.company", "employe.company")).toHaveLength(1);
  });

  it("refuses an operation's path that walks from a payload field to another thing", async () => {
    expect(await refusalsOf("employee/verbs/relieve", "employee.company", "employee.department")).toHaveLength(1);
  });

  it("refuses an operation's path with a key past the role's thing", async () => {
    expect(await refusalsOf("department/verbs/create", "company", "company.owner")).toHaveLength(1);
  });
});

describe("check keeps every path that reaches the role's thing", () => {
  it.each([
    ["a read's path that names its own thing first", "department/verbs/get", "company", "department.company"],
    ["a read's two-key path from the subject", "employee/verbs/get", "company", "department.company"],
    ["an operation's three-key path from a payload field", "employee/verbs/relieve", "employee.company", "employee.designation.company"],
  ])("accepts %s", async (_, verb, was, path) => {
    expect(problemsOf(await modelOf(capxulWith(verb, was, path)))).toEqual([]);
  });

  it.each(["acme", "starter", "capxul"])("still passes on %s", async (name) => {
    expect(problemsOf(await modelOf(join(examples, name)))).toEqual([]);
  });
});
