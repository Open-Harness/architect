import { join } from "node:path";
import type { ProveRun, WorldApi } from "../types.ts";

export const proveFresh: WorldApi["proveFresh"] = ({ repo, project, report, telemetry, node }) => {
  node.remove(report);
  node.remove(telemetry);
  const ran = node.run("node", [join(repo, "packages/cli/src/main.ts"), "prove", "--root", project, "--env", "local", "--report", report], repo);
  const output = `${ran.stdout}${ran.stderr}`;
  // Fresh means this run wrote both: the report, and the spans of the Collector it started. Either one missing is a prove that did not get that far.
  const wroteReport = node.read(report) !== undefined;
  const wroteSpans = node.list(telemetry).length > 0;
  const fresh = wroteReport && wroteSpans;
  const head = output.split("\n").filter((l) => l.trim() !== "").slice(0, 5).join(" / ");
  const missing = [...(wroteReport ? [] : ["no report"]), ...(wroteSpans ? [] : ["no spans"])].join(" and ");
  const problems = fresh ? [] : [`prove wrote ${missing} (status ${String(ran.status)}), so there is no run to judge: ${head === "" ? "it printed nothing" : head}`];
  return { status: ran.status, output, fresh, problems } satisfies ProveRun;
};
