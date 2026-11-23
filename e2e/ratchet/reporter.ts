// A vitest reporter for the ratchet: writes what the JSON reporter leaves out, the hooks (beforeAll, afterAll, ...) that threw
// and the errors that belong to no file. Where it writes: the RATCHET_ERRORS_FILE environment variable (check.ts reads it).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

interface Suite {
  readonly fullName?: string;
  readonly name: string;
  readonly parent: { readonly type: string; readonly name: string };
  errors(): ReadonlyArray<unknown>;
}
interface Test {
  readonly name: string;
  readonly parent: { readonly type: string; readonly name: string };
  meta(): Record<string, unknown>;
  result(): { readonly state: string; readonly errors?: ReadonlyArray<unknown> };
}
interface Module {
  readonly moduleId: string;
  readonly children: { allSuites(): Iterable<Suite>; allTests(): Iterable<Test> };
  errors(): ReadonlyArray<unknown>;
}

const titles = (suite: { readonly name: string; readonly parent: { readonly type: string; readonly name: string } }): ReadonlyArray<string> => {
  const path: string[] = [suite.name];
  let parent = suite.parent;
  while (parent.type === "suite") {
    path.unshift(parent.name);
    parent = (parent as unknown as Suite).parent;
  }
  return path;
};

const firstLine = (error: unknown): string => String((error as { message?: unknown })?.message ?? error).split("\n")[0] ?? "";

export default class RatchetReporter {
  onTestRunEnd(modules: ReadonlyArray<Module>, unhandled: ReadonlyArray<unknown>): void {
    const file = process.env["RATCHET_ERRORS_FILE"];
    if (file === undefined) return;
    const suiteErrors: Array<{ name: string; path: ReadonlyArray<string>; label?: string }> = [];
    // Without ratchet/runner.ts (a package run, G11) no test is marked, and a test's own failure would read as a beforeEach error: judge suites and files only.
    const marked = modules.some((module) => [...module.children.allTests()].some((test) => test.meta()["ratchetBodyRan"] !== undefined));
    for (const module of modules) {
      if (module.errors().length > 0) suiteErrors.push({ name: module.moduleId, path: [] });
      for (const suite of module.children.allSuites()) if (suite.errors().length > 0) suiteErrors.push({ name: module.moduleId, path: titles(suite) });
      for (const test of marked ? module.children.allTests() : []) {
        const meta = test.meta();
        const errors = test.result().errors?.length ?? 0;
        const before = typeof meta["ratchetErrorsBefore"] === "number" ? meta["ratchetErrorsBefore"] : errors;
        const path = titles(test);
        if (errors > 0 && meta["ratchetBodyRan"] !== true) suiteErrors.push({ name: module.moduleId, path, label: "[beforeEach error]" });
        if (errors > before) suiteErrors.push({ name: module.moduleId, path, label: "[afterEach error]" });
      }
    }
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ suiteErrors, unhandled: unhandled.map(firstLine) }));
  }
}
