// Journey 7 (M3-workflows, section 2 and "What the checks prove"): registering a `call` on an operation without
// `idempotent: "request"` is refused, naming the workflow and the activity. In-process: no Worker, no engine, nothing started.
import { Cause, Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { Workflows, WorkflowRefused, type Registration } from "@orthograph/workflows";
import { repo } from "./support.ts";

type Declared = Registration["workflow"];

/** A project's own file, loaded by path: the example is a project, and e2e depends on packages, not on projects. */
const load = async <A>(relative: string): Promise<A> => (await import(pathToFileURL(join(repo, relative)).href)) as A;

const handler: Registration["handler"] = () => Effect.void;

const registering = (registrations: Parameters<typeof Workflows.register>[0]) => Effect.runPromiseExit(Workflows.register(registrations));

/** The refusal in an exit: `WorkflowRefused`, or the plain words of what the exit was instead (a defect, a success). */
const refusalOf = (exit: Exit.Exit<unknown, unknown>): WorkflowRefused => {
  if (Exit.isFailure(exit)) {
    const failure = Cause.findError(exit.cause);
    if (failure._tag === "Success" && failure.success instanceof WorkflowRefused) return failure.success;
    throw new Error(`expected WorkflowRefused, got: ${Cause.pretty(exit.cause).split("\n")[0]}`);
  }
  throw new Error("expected WorkflowRefused, got a registration that succeeded");
};

const fixtures = () => load<{ readonly allSafe: Declared; readonly firstIsUnsafe: Declared; readonly laterIsUnsafe: Declared }>("examples/workflows/test/fixtures/unsafe.ts");

describe("07 M3.28: a `call` on an operation that is not idempotent is refused at registration, naming the activity", () => {
  it("the first activity is the unsafe one: refused, naming `freeze` and its workflow", async () => {
    const { firstIsUnsafe } = await fixtures();
    const refused = refusalOf(await registering({ unsafe: { workflow: firstIsUnsafe, handler } }));
    expect(refused._tag).toBe("WorkflowRefused");
    expect(refused.workflow).toBe("unsafe");
    expect(refused.activity).toBe("freeze");
    expect(refused.message).toContain("freeze");
  });

  it("a later activity is the unsafe one: refused naming `link`, never `freeze`", async () => {
    const { laterIsUnsafe } = await fixtures();
    const refused = refusalOf(await registering({ later: { workflow: laterIsUnsafe, handler } }));
    expect(refused.workflow).toBe("later");
    expect(refused.activity).toBe("link");
    expect(refused.message).toContain("link");
    expect(refused.message).not.toContain("freeze");
  });

  it("one unsafe workflow among registered safe ones is still refused, and the safe ones are not named", async () => {
    const { allSafe, laterIsUnsafe } = await fixtures();
    const refused = refusalOf(await registering({ safe: { workflow: allSafe, handler }, later: { workflow: laterIsUnsafe, handler } }));
    expect(refused.workflow).toBe("later");
    expect(refused.activity).toBe("link");
  });

  it("every call safe, with an await and a timer beside them, registers", async () => {
    const { allSafe } = await fixtures();
    const exit = await registering({ safe: { workflow: allSafe, handler } });
    expect(Exit.isSuccess(exit), Exit.isFailure(exit) ? Cause.pretty(exit.cause) : "").toBe(true);
  });

  it("the example's publish registers: its six activities are three kinds, and every call in them is idempotent", async () => {
    const declared = await load<{ readonly default: Declared }>("examples/workflows/blueprint/workflows/publish.ts");
    const handled = await load<{ readonly publish: Registration["handler"] }>("examples/workflows/src/workflows/publish.ts");
    const exit = await registering({ publish: { workflow: declared.default, handler: handled.publish } });
    expect(Exit.isSuccess(exit), Exit.isFailure(exit) ? Cause.pretty(exit.cause) : "").toBe(true);
  });
});
