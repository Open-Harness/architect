// Check 00: the instrument. A control, true today and always: the checks that follow kill a world mid-delivery and start
// it again, and a check that cannot kill a world, or that loses its state in the restart, would pass or fail for the
// wrong reason. So, on examples/signup as it is (no events, no outbox): a launched world answers, holds a sheet it was
// given, is killed with SIGKILL to its whole process group, starts again on the same port over the same state, still
// holds the sheet, and leaves no process behind. It needs nothing of M5 and is not in `expected-failing/`.
import { afterAll, describe, expect, it } from "vitest";
import { copyOf, generated, nothingRunning, signup } from "./support.ts";
import { call, launchWorld, record } from "./world.ts";

const copy = copyOf(signup);
afterAll(() => copy.remove());

describe("00 control: the instrument", () => {
  it("a launched world keeps its state across a kill and a start, and nothing is left running", async () => {
    const root = generated(copy.root);
    const world = await launchWorld(root, "events-instrument");
    try {
      const opened = await call(world.url, "sheet.open", { title: "Saturday clean-up", places: "2" });
      expect(opened.status, JSON.stringify(opened.body)).toBe(200);
      const sheet = String(opened.body["sheet"]);
      expect((await record(world.url, "sheet", sheet))?.["title"]).toBe("Saturday clean-up");

      await world.kill();
      await expect(fetch(`${world.url}/_world/health`, { signal: AbortSignal.timeout(2000) })).rejects.toThrow();

      await world.restart();
      expect((await record(world.url, "sheet", sheet))?.["title"]).toBe("Saturday clean-up");
      const joined = await call(world.url, "sheet.join", { sheet, people: "1" });
      expect([joined.status, joined.body["left"]], JSON.stringify(joined.body)).toEqual([200, "1"]);
    } finally {
      await world.stop();
    }
    nothingRunning(root);
  });
});
