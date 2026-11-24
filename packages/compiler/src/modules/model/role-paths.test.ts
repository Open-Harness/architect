// A role path that walks to nothing (#767, the compiler side of #761). `owner.of("<path>")` is decided at runtime by
// walking the path field by field to an instance of the role's thing (language-effect's access/service.ts): from the
// payload field its first key names, else from the subject, and on a read by id a first key may name the subject's own
// thing. A path that can't reach the role's thing admits nobody, so `check` refuses it, naming the path, instead of
// letting every call be refused NotAllowed. Each case changes one `allowed` in a copy of an example: mostly Capxul, whose
// `owner` is a role on Company. How a thing whose folder has two words (`bank-account`) is spelt as a first key is the
// builder's call; these cases use one-word things only.
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
  if (Exit.isSuccess(exit)) return [];
  const error = exit.cause.reasons.map((r) => (r as { error?: unknown }).error).find((e) => e instanceof BlueprintInvalid);
  if (!(error instanceof BlueprintInvalid)) throw new Error(`the compiler failed without a problem list: ${JSON.stringify(exit.cause)}`);
  return error.problems;
};

/** A copy of an example's blueprint with one verb's `owner.of("<was>")` written as `owner.of("<path>")`. */
const copyWith = (example: string, verb: string, was: string, path: string): string => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "c-"));
  cpSync(join(examples, example, "blueprint"), join(root, "blueprint"), {
    recursive: true,
    filter: (p) => !basename(p).startsWith(".") && !["projections", "starting-worlds"].includes(basename(p)),
  });
  const file = join(root, `blueprint/things/${verb}.ts`);
  const text = readFileSync(file, "utf8");
  const from = `owner.of("${was}")`;
  if (!text.includes(from)) throw new Error(`${verb} has no ${from}: the fixture moved`);
  writeFileSync(file, text.replace(from, `owner.of("${path}")`));
  return root;
};

const capxulWith = (verb: string, was: string, path: string) => copyWith("capxul", verb, was, path);

/** The problems that name this verb's file and this path, in a copy of `example`. */
const refusalsIn = async (example: string, verb: string, was: string, path: string) =>
  problemsOf(await modelOf(copyWith(example, verb, was, path))).filter((p) => p.startsWith(`blueprint/things/${verb}.ts`) && p.includes(path));
const refusalsOf = (verb: string, was: string, path: string) => refusalsIn("capxul", verb, was, path);

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
    expect(await refusalsOf("department/verbs/get", "company", "departmnt.company")).not.toHaveLength(0);
  });

  it("refuses a read's path that ends on a thing that isn't the role's", async () => {
    // From the employee, `department` reaches a Department, and `owner` is a role on Company.
    expect(await refusalsOf("employee/verbs/get", "company", "department")).not.toHaveLength(0);
  });

  it("refuses an operation's first key that is neither a payload field nor a field of the subject", async () => {
    expect(await refusalsOf("employee/verbs/relieve", "employee.company", "employe.company")).not.toHaveLength(0);
  });

  it("refuses an operation's path that walks from a payload field to another thing", async () => {
    expect(await refusalsOf("employee/verbs/relieve", "employee.company", "employee.department")).not.toHaveLength(0);
  });

  it("refuses an operation's path with a key past the role's thing", async () => {
    expect(await refusalsOf("department/verbs/create", "company", "company.owner")).not.toHaveLength(0);
  });

  it("refuses a narrowed entry's path, as it does a plain one", async () => {
    // acme's api-key.create allows `owner.of("organization").via(Via.session, Via.device)`.
    expect(await refusalsIn("acme", "api-key/verbs/create", "organization", "organizaton")).not.toHaveLength(0);
  });

  it("refuses a list read's first key that is not one of its filters", async () => {
    // work's question.list filters by mission and allows `owner.of("mission")`; a list has no subject to start from.
    expect(await refusalsIn("work", "question/verbs/list", "mission", "misson")).not.toHaveLength(0);
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

  // work's lists are the only role paths on a list read in the examples.
  it.each(["acme", "starter", "capxul", "work"])("still passes on %s", async (name) => {
    expect(problemsOf(await modelOf(join(examples, name)))).toEqual([]);
  });
});
