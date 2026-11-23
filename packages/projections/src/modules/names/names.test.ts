// What the renderers share: a name from a path, and a built-in projection's files made relative to its mount's folder.
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { camel, pascal, within } from "./service.ts";

describe("names", () => {
  it("turns a thing's dashed name into an identifier", () => {
    expect(pascal("api-key")).toBe("ApiKey");
    expect(camel("api-key")).toBe("apiKey");
  });

  it("makes each file relative to the mount's folder, and refuses a mount named otherwise", async () => {
    const files = [{ path: "generated/api/src/index.ts", content: "x", scaffold: false }];
    expect(await Effect.runPromise(within({ mount: "api" }, "api", files))).toEqual([{ path: "src/index.ts", content: "x" }]);
    const refused = await Effect.runPromise(Effect.result(within({ mount: "contract" }, "api", files)));
    expect(refused._tag).toBe("Failure");
  });
});
