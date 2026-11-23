// Check 66 (Goal 17 slice 10): the journeys that need GOAL17-check-harness's instruments (`e2e/superagent/journeys/`): a webhook
// and a catch-up poll of one comment make one trigger and a bad signature none; a comment made while the world was down is found
// by the poll once; a webhook accepted just before a kill makes one trigger; a reply goes out once, in order; Slack's door. They
// are overlaid on a copy of the app's `journeys/` and run as a user runs them, `ortho prove`, and each must pass, step by step.
// Needs, from others, and red until they land: slice 9's journey surface (`s.runner`, `s.clock.settle`, `outbox`, `Stand.command`),
// slice 11's stand-in commands (`github.comment`, `deliver`, `replies`; `slack.say`, `deliver`) and its doors and catch-up, and the
// starting worlds the journeys name (`a-live-superagent-listening-to-acme-widgets`, and slice 8's `a-live-superagent-with-a-ticket`).
import { cpSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { copyApp, removeCopies, run } from "./app.ts";

afterAll(removeCopies);
const mine = join(import.meta.dirname, "journeys");
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

  it("every journey passes, each of its steps, and none is skipped for want of an instrument or a world", () => {
    const root = copyApp();
    cpSync(mine, join(root, "journeys"), { recursive: true });
    const generated = run(root, ["generate"]);
    expect(generated.status, `ortho generate with the journeys:\n${generated.out}`).toBe(0);
    const proved = run(root, ["prove"]);
    for (const title of TITLES) expect(proved.out, `${title} is run`).toContain(title);
    expect(proved.out, "no journey is refused for a step or a world that is not built").not.toMatch(/not built yet|is not in blueprint\/starting-worlds|no such step|Cannot find module/i);
    expect(proved.status, `ortho prove:\n${proved.out}`).toBe(0);
  });
});
