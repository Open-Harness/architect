import { defineConfig } from "vitest/config";
import { BaseSequencer, type TestSpecification } from "vitest/node";

/** Files run by name, so a check that reads what the ones before it left (48, nothing is left) runs after them. */
class ByName extends BaseSequencer {
  override sort(files: TestSpecification[]): Promise<TestSpecification[]> {
    return Promise.resolve([...files].sort((a, b) => a.moduleId.localeCompare(b.moduleId)));
  }
}

// Goal 17's adapter checks generate and build plugins into project copies and start stand-ins as processes: one file at a
// time, each with room to finish. The whole-spec checks fetch the published specs once into tmp/specs.
export default defineConfig({
  test: { include: ["superagent/**/*.test.ts"], fileParallelism: false, maxWorkers: 1, testTimeout: 900_000, hookTimeout: 600_000, sequence: { sequencer: ByName } },
});
