// Check 66 (Goal 17 slice 10): the journeys that need GOAL17-check-harness's instruments (`e2e/superagent/journeys/`): a webhook
// and a catch-up poll of one comment make one trigger and a bad signature none; a comment made while the world was down is found
// by the poll once; a webhook accepted just before a kill makes one trigger; a reply goes out once, in order; Slack's door. They
// are overlaid on a copy of the app's `journeys/` and run as a user runs them, `ortho prove`, and each must pass, step by step.
// Red until others land what the journeys use: slice 9's journey surface (`s.runner`, `s.clock.settle`, `outbox`, `Stand.command`, the
// scripted model `@orthograph/stand-in-model/stand`) and slice 11's stand-in commands (`github.comment`, `deliver`, `replies`; `slack.say`,
// `deliver`) and its doors and catch-up. The starting worlds they name are this check's own, in `connection-worlds/` (overlaid on the app's
// `blueprint/starting-worlds/`; not `starting-worlds/`, which is slice 8's): `a-live-superagent-listening-to-acme-widgets`, and `a-live-superagent-with-a-ticket`, a ticket on issue 12
// that waits paused so the journey scripts its model first; both stand on a chain of `reply-…` worlds, so nothing of slice 8's is needed.
import { cpSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { copyApp, removeCopies, run } from "./app.ts";

afterAll(removeCopies);
const mine = join(import.meta.dirname, "journeys");
const worlds = join(import.meta.dirname, "connection-worlds");
const TITLES = [
  "a webhook and a catch-up poll of one comment make one trigger",
  "a comment made while the world was down is found by the poll once",
  "a webhook accepted just before a kill makes one trigger",
  "a reply goes out once, in order",
  "a message in a listened channel makes one trigger, and a bad signature none",
];

describe("66 the connection journeys run through `ortho prove`", () => {
  it("the five journeys are in this folder, each with the title this check names", () => {
    expect(readdirSync(mine).filter((f) => f.endsWith(".ts")).sort()).toEqual(["a-delivery-survives-a-kill.ts", "a-poll-after-sleep.ts", "a-reply-goes-out-once-in-order.ts", "one-comment.ts", "slack-door.ts"]);
  });

  it("the starting worlds the journeys name are in `connection-worlds/`, each by the name a journey gives", () => {
    const found = readdirSync(worlds).filter((f) => f.endsWith(".ts")).flatMap((f) => [...readFileSync(join(worlds, f), "utf8").matchAll(/startingWorld\("([^"]+)"/g)].map((m) => m[1]!)).sort();
    expect(found).toEqual(["a-live-superagent-listening-to-acme-widgets", "a-live-superagent-with-a-ticket", "reply-a-listed-account", "reply-a-live-superagent", "reply-a-main-agent-exists", "reply-an-account-was-seen", "reply-an-executor-waits", "reply-an-observing-superagent"]);
    const named = new Set(readdirSync(mine).flatMap((f) => [...readFileSync(join(mine, f), "utf8").matchAll(/starts: "([^"]+)"/g)].map((m) => m[1]!)));
    for (const w of named) expect(found, `${w} is a world of this check`).toContain(w);
  });

  it("the worlds load: the app with them overlaid generates and passes `ortho check`, and each is a starting world of its model", () => {
    const root = copyApp();
    cpSync(worlds, join(root, "blueprint/starting-worlds"), { recursive: true });
    const generated = run(root, ["generate"]);
    expect(generated.status, `ortho generate with the starting worlds:\n${generated.out}`).toBe(0);
    const checked = run(root, ["check"]);
    expect(checked.status, `ortho check with the starting worlds:\n${checked.out}`).toBe(0);
    const model = JSON.parse(run(root, ["model", "--json"]).stdout) as { startingWorlds?: Record<string, unknown> | ReadonlyArray<unknown> };
    const all = (model.startingWorlds ?? {}) as Record<string, { from: string | null }>;
    expect(Object.keys(all), "the model names the worlds").toContain("a-live-superagent-with-a-ticket");
    const dangling = Object.entries(all).filter(([, w]) => w.from !== null && !(w.from in all)).map(([n, w]) => `${n} from ${w.from}`);
    expect(dangling, "every world stands on a world that is there, or on nothing").toEqual([]);
  });

  it("every journey passes, each of its steps, and none is skipped for want of an instrument or a world", () => {
    const root = copyApp();
    cpSync(mine, join(root, "journeys"), { recursive: true });
    cpSync(worlds, join(root, "blueprint/starting-worlds"), { recursive: true });
    const generated = run(root, ["generate"]);
    expect(generated.status, `ortho generate with the journeys:\n${generated.out}`).toBe(0);
    const proved = run(root, ["prove"]);
    for (const title of TITLES) expect(proved.out, `${title} is run`).toContain(title);
    expect(proved.out, "no journey is refused for a step or a world that is not built").not.toMatch(/not built yet|is not in blueprint\/starting-worlds|no such step|Cannot find module/i);
    expect(proved.status, `ortho prove:\n${proved.out}`).toBe(0);
  });
});
