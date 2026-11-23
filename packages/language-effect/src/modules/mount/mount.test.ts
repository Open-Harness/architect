import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { Mount } from "./service.ts";

const style = Blueprint.choice({ plain: "As given.", loud: "In capitals." });
const echo = Blueprint.feature({ description: "Repeats.", choices: { style } });

describe("mount", () => {
  it("answers what the mount picked, and the first option outside any mount", async () => {
    const loud = Blueprint.use(echo, (e) => [e.choose(e.choices.style.loud)]);
    expect(await Effect.runPromise(Mount.picked(style.loud).pipe(Mount.under(loud)))).toBe(true);
    expect(await Effect.runPromise(Mount.picked(style.plain).pipe(Mount.under(loud)))).toBe(false);
    expect(await Effect.runPromise(Mount.picked(style.plain))).toBe(true);
  });

  it("serves a handler under its mount on every call", async () => {
    const loud = Blueprint.use(echo, (e) => [e.choose(e.choices.style.loud)]);
    const handler = (text: string) => Effect.map(Mount.picked(style.loud), (on) => (on ? text.toUpperCase() : text));
    expect(await Effect.runPromise(Mount.serving(loud, handler)("hi"))).toBe("HI");
    expect(await Effect.runPromise(handler("hi"))).toBe("hi");
  });
});
