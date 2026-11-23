// What the M1.23 checks share: one Worker per file, a rig (the module, a host calling the Worker as a role, and a person who is
// counted), and the two shapes a call may end in: a typed refusal, or a plain redacted error. Written for check 01, 02 and 03.
import { afterAll, beforeAll, beforeEach, expect } from "vitest";
import { type ActionContext, type ActionOptions, type ActionRefusalShape, type ApprovalRequest, loadActions } from "./contract.ts";
import { makeHost } from "./stand-in/actions.ts";
import { SECRET, startWorker, type Worker } from "./stand-in/worker.ts";

/** One real Worker for the file that calls this, emptied of writes before each test. Read `.current`. */
export const useWorker = (): { readonly current: Worker } => {
  const holder = {} as { current: Worker };
  beforeAll(async () => {
    holder.current = await startWorker();
  });
  afterAll(async () => {
    await holder.current.close();
  });
  beforeEach(() => {
    holder.current.writes.length = 0;
  });
  return holder;
};

export const ADD = { room: "kitchen", text: "buy milk" } as const;
export const REMOVE = { room: "kitchen", noteId: "n1" } as const;

/** Everything one check needs: the module, a host calling the Worker as `role`, and a person who answers `answer` and is counted. */
export const rig = async (worker: Worker, role: "editor" | "viewer", answer: boolean | ReadonlyArray<boolean> = true) => {
  const actions = await loadActions();
  const host = makeHost(actions, worker.url, role);
  const asked: ApprovalRequest[] = [];
  const writesWhenAsked: number[] = [];
  const approver = {
    ask: async (request: ApprovalRequest) => {
      asked.push(request);
      writesWhenAsked.push(worker.writes.length);
      return typeof answer === "boolean" ? answer : (answer[asked.length - 1] ?? false);
    },
  };
  /** The action's options with `run` counted, so "runs once" is read from a count and not from the answer. */
  const counted = <Args, Answer>(options: ActionOptions<Args, Answer>) => {
    const calls = { n: 0 };
    return { calls, options: { ...options, run: (args: Args, ctx?: ActionContext) => (calls.n++, options.run(args, ctx)) } };
  };
  return { actions, host, asked, writesWhenAsked, approver, counted };
};

export const rejection = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the call to reject, and it resolved");
};

/** The shape agent-native reads by duck typing (spike finding 3), with the one refusal this check expects. */
export const expectRefusal = async (error: unknown, code: string, details: Record<string, unknown> | undefined) => {
  const { ActionRefusal } = await loadActions();
  expect(error).toBeInstanceOf(ActionRefusal);
  expect(error).toBeInstanceOf(Error);
  const refusal = error as ActionRefusalShape;
  expect(refusal.actionContractError).toBe(true);
  expect(refusal.noWrite).toBe(true);
  expect(refusal.errorCode).toBe(code);
  expect(refusal.statusCode).toBe(422);
  expect(refusal.details).toEqual(details);
  expect(refusal.message.length).toBeGreaterThan(0);
};

/** What a defect's message carried that no caller may see: the Worker's own secret, and two others the checks plant. */
export const LEAKS = [SECRET, "hunter2", "db.internal", "sk_live_4242", "10.0.0.7:5432"];

/** A plain failure: not a refusal in any member agent-native reads, and nothing of the defect anywhere on it (message, stack, cause, own fields). */
export const expectRedacted = (error: unknown, leaks: ReadonlyArray<string> = LEAKS) => {
  expect(error).toBeInstanceOf(Error);
  const failure = error as Error & Partial<ActionRefusalShape>;
  expect(failure.actionContractError).not.toBe(true);
  expect(failure.noWrite).not.toBe(true);
  expect(failure.errorCode).toBeUndefined();
  expect(failure.statusCode).toBeUndefined();
  expect(failure.details).toBeUndefined();
  expect(failure.cause).toBeUndefined();
  expect(failure.message.length).toBeGreaterThan(0);
  const everything = [failure.message, failure.stack ?? "", JSON.stringify({ ...failure }), JSON.stringify(Object.getOwnPropertyNames(failure))].join("\n");
  for (const leak of leaks) expect(everything).not.toContain(leak);
};

