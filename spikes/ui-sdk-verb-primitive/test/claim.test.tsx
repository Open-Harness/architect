import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createAgent } from "@ui-sdk/react/agent";
import { afterEach, describe, expect, test } from "vitest";
import { HandleClaim, HandleClaimName, HandleClaimRefusal, HandleClaimSubmit } from "../generated/handle-claim.react.tsx";
import { makeWorld } from "../src/world.ts";

mkdirSync("evidence", { recursive: true });
writeFileSync("evidence/run.txt", "");
const note = (title: string, value: unknown) => appendFileSync("evidence/run.txt", `## ${title}\n${JSON.stringify(value, null, 1)}\n\n`);
const agent = createAgent();
afterEach(cleanup);

const Page = ({ world, label = "Claim your name" }: { world: ReturnType<typeof makeWorld>; label?: string }) => (
  <HandleClaim send={world.handleClaim} aria-label={label}>
    <HandleClaimName aria-label="Name" />
    <HandleClaimRefusal>{(state) => `Refused: ${state.code}`}</HandleClaimRefusal>
    <HandleClaimSubmit>Claim</HandleClaimSubmit>
  </HandleClaim>
);

const live = () => agent.snapshot().filter((entry) => !entry.offPage);

describe("a generated verb primitive", () => {
  test("1. the agent sees the verb, named, with the actions the generator listed", () => {
    render(<Page world={makeWorld()} />);
    const seen = live();
    note("1 snapshot", seen);
    const claim = seen.find((entry) => entry.component === "handle-claim");
    expect(claim?.actions).toEqual(["setName", "submit"]);
    expect(claim?.label).toBe("Claim your name");
  });

  test("2. act fills and sends; the call carries the agent as its source", async () => {
    const world = makeWorld();
    render(<Page world={world} />);
    const result = await agent.act({
      steps: [
        { ref: "Claim your name", action: "setName", args: ["firstpage"] },
        { ref: "Claim your name", action: "submit" },
      ],
    });
    note("2 act, name is free", result);
    note("2 call the world received", world.calls);
    expect(result.ok).toBe(true);
    expect(world.calls).toEqual([{ verb: "handle.claim", payload: { name: "firstpage" }, via: "agent" }]);
    expect(world.claimed.get("firstpage")).toBe("hdl_1");
  });

  test("3. a person typing and pressing sends the same call, with a different source", async () => {
    const world = makeWorld();
    render(<Page world={world} />);
    const input = screen.getByLabelText<HTMLInputElement>("Name");
    fireEvent.input(input, { target: { value: "aaron" } });
    fireEvent.click(screen.getByText("Claim"));
    await Promise.resolve();
    note("3 call the world received from a person", world.calls);
    expect(world.calls).toHaveLength(1);
    expect(world.calls[0]?.payload).toEqual({ name: "aaron" });
    expect(world.calls[0]?.via).toBe("mouse");
  });

  test("4. BREAK: the declared refusal must reach the agent, not a silent ok", async () => {
    const world = makeWorld();
    world.claimed.set("taken", "hdl_x");
    render(<Page world={world} />);
    const result = await agent.act({
      steps: [
        { ref: "Claim your name", action: "setName", args: ["taken"] },
        { ref: "Claim your name", action: "submit" },
      ],
    });
    await new Promise((done) => setTimeout(done, 0));
    note("4 act, name is taken", result);
    note("4 snapshot after the refusal", live());
    expect(screen.getByRole("alert").textContent).toBe("Refused: HN-001");
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain("HN-001");
    expect(live()[0]?.error).toContain("HN-001");
  });

  test("5. BREAK: two verbs with the same name on one page", async () => {
    const world = makeWorld();
    render(
      <>
        <Page world={world} />
        <Page world={world} />
      </>,
    );
    const result = await agent.act({ steps: [{ ref: "Claim your name", action: "setName", args: ["x"] }] });
    note("5 two with one name", result.error ?? result);
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain("names 2 components");
  });

  test("6. BREAK: an action the generator did not list is refused", async () => {
    render(<Page world={makeWorld()} />);
    const result = await agent.act({ steps: [{ ref: "Claim your name", action: "destroy" }] });
    note("6 unlisted action", result.error ?? result);
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain("takes no destroy");
  });

  test("7. a person-only mark stops the agent sending", async () => {
    const world = makeWorld();
    render(
      <div data-agent-confirm="Claims the name firstpage for you">
        <Page world={world} />
      </div>,
    );
    const result = await agent.act({ steps: [{ ref: "Claim your name", action: "submit" }] });
    note("7 needs a person", result.error ?? result);
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain("Needs a person");
    expect(world.calls).toHaveLength(0);
  });
  test("9. BREAK: a send that rejects must not leave the verb pending for ever", async () => {
    const world = makeWorld();
    let fail = true;
    const send: typeof world.handleClaim = (payload, meta) => (fail ? Promise.reject(new Error("network down")) : world.handleClaim(payload, meta));
    render(
      <HandleClaim send={send} aria-label="Claim your name">
        <HandleClaimName aria-label="Name" />
        <HandleClaimSubmit>Claim</HandleClaimSubmit>
      </HandleClaim>,
    );
    const steps = [
      { ref: "Claim your name", action: "setName", args: ["firstpage"] },
      { ref: "Claim your name", action: "submit" },
    ];
    const first = await agent.act({ steps });
    note("9 the send rejects", first.error ?? first);
    expect(first.ok).toBe(false);
    expect(first.error?.message).toContain("The call failed before it was answered.");
    expect(screen.getByText<HTMLButtonElement>("Claim").disabled).toBe(false);
    fail = false;
    const second = await agent.act({ steps: [{ ref: "Claim your name", action: "submit" }] });
    note("9 the retry", second);
    expect(second.ok).toBe(true);
    expect(world.claimed.get("firstpage")).toBe("hdl_1");
  });
});
