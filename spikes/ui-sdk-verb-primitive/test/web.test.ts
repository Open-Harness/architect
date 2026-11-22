import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createAgent } from "@ui-sdk/web/agent";
import { expect, test } from "vitest";
import "../generated/handle-claim.web.ts";
import { makeWorld } from "../src/world.ts";

mkdirSync("evidence", { recursive: true });
writeFileSync("evidence/web.txt", "");
const note = (title: string, value: unknown) => appendFileSync("evidence/web.txt", `## ${title}\n${JSON.stringify(value, null, 1)}\n\n`);

test("8. the same primitive as custom elements, driven by the same bridge", async () => {
  const world = makeWorld();
  const agent = createAgent();
  document.body.innerHTML = `
    <linkup-handle-claim>
      <form aria-label="Claim your name">
        <linkup-handle-claim-name><input aria-label="Name" /></linkup-handle-claim-name>
        <linkup-handle-claim-refusal></linkup-handle-claim-refusal>
        <linkup-handle-claim-submit><button>Claim</button></linkup-handle-claim-submit>
      </form>
    </linkup-handle-claim>`;
  const root = document.querySelector("linkup-handle-claim") as HTMLElement;
  const heard: string[] = [];
  for (const name of ["send", "namechange", "done"]) {
    // prettier-ignore
    root.addEventListener(name, (event) => {
      heard.push(`${name}:${event.constructor.name}:${JSON.stringify(Object.keys(((event as CustomEvent).detail ?? {}) as object))}`);
      const detail = (event as CustomEvent).detail as { value?: { name: string }; source?: string; settle?: (sent: Promise<unknown>) => void } | undefined;
      if (name === "send" && detail?.settle && detail.value) detail.settle(world.handleClaim(detail.value, { via: detail.source ?? "unknown" }));
    });
  }
  await new Promise((done) => setTimeout(done, 0));
  const seen = agent.snapshot();
  note("8 web components: snapshot", seen);
  const result = await agent.act({
    steps: [
      { ref: "Claim your name", action: "setName", args: ["firstpage"] },
      { ref: "Claim your name", action: "submit" },
    ],
  });
  note("8 web components: act", result);
  note("8 web components: events heard, and calls", { heard, calls: world.calls });
  expect(seen.find((entry) => entry.component === "handle-claim")?.actions).toEqual(["setName", "submit"]);
  expect(result.ok).toBe(true);
  expect(world.calls).toEqual([{ verb: "handle.claim", payload: { name: "firstpage" }, via: "agent" }]);
});
