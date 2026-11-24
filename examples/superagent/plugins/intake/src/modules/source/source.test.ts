import { describe, expect, it } from "vitest";
import { mentions } from "./service.ts";

describe("source", () => {
  it("a mention is the login as a word after an @", () => {
    expect(mentions("@agent fix the flaky test", "agent")).toBe(true);
    expect(mentions("thanks, @Agent!", "agent")).toBe(true);
    expect(mentions("mail agent@example.com", "agent")).toBe(false);
    expect(mentions("@agentsmith hello", "agent")).toBe(false);
  });
});
