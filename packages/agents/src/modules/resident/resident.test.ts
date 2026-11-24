// The pure parts of the resident: the endpoint from the environment, and a conversation's steps from its entries. The turn itself runs in a real world (`packages/prove`'s `agent-turn.test.ts`).
import { describe, expect, it } from "vitest";
import { configOf } from "./internal/config.ts";
import { stepsOf } from "./internal/steps.ts";

describe("the endpoint", () => {
  it("is the stand-in's address in a world, and each kind's own name is its model", () => {
    const config = configOf({ ORTHO_STAND_MODELS: "http://127.0.0.1:4000" })!;
    expect(config.baseUrl).toBe("http://127.0.0.1:4000/v1");
    expect(config.modelFor("executor")).toBe("executor");
    expect(config.apiKey).toBeUndefined();
  });
  it("is the real endpoint when the environment names one, with each kind's model", () => {
    const config = configOf({ MODELS_BASE_URL: "http://localhost:8317/v1", MODEL_MAIN: "deepseek-v4-flash-0731", MODEL_EXECUTOR: "gpt-6.2-sol", ORTHO_STAND_MODELS: "http://127.0.0.1:4000" })!;
    expect([config.baseUrl, config.modelFor("main"), config.modelFor("executor")]).toEqual(["http://localhost:8317/v1", "deepseek-v4-flash-0731", "gpt-6.2-sol"]);
  });
  it("is nothing when the world names none", () => {
    expect(configOf({})).toBeUndefined();
  });
});

describe("a conversation's steps", () => {
  const assistant = (content: unknown) => ({ kind: "pi.assistant", model: [{ content }] });
  it("are one for each assistant entry, numbered again from 1 in each run, with the tools it called and the text it said", () => {
    const steps = stepsOf([
      { kind: "pi.user", data: { requestId: "evt_1" } }, assistant([{ type: "toolCall", name: "bash" }]), assistant([{ type: "text", text: "Added both." }]),
      { kind: "pi.user", data: { requestId: "evt_2" } }, assistant([{ type: "text", text: "Again." }]),
    ]);
    expect(steps).toEqual([
      { requestId: "evt_1", round: 1, tools: ["bash"], text: "" },
      { requestId: "evt_1", round: 2, tools: [], text: "Added both." },
      { requestId: "evt_2", round: 1, tools: [], text: "Again." },
    ]);
  });
});
