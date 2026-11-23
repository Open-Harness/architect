import { describe, expect, it } from "vitest";
import { ruleSentence, words } from "./service.ts";

describe("the sentence for a rule (G5)", () => {
  it("is the rule's own description when it wrote one, else made from the thing, the states it holds in and its key", () => {
    expect(ruleSentence("handle", { fields: ["name"], while: ["claimed"] })).toBe("another claimed handle holds this name");
    expect(ruleSentence("handle", { fields: ["owner"], while: ["claimed"], description: "you already hold a name" })).toBe("you already hold a name");
    expect(ruleSentence("handle", { fields: ["owner"], description: "you already hold a name." })).toBe("you already hold a name");
    expect(ruleSentence("handle", { fields: ["owner"], description: "wait..." })).toBe("wait...");
    expect(ruleSentence("handle", { fields: ["owner"], while: ["claimed"], description: "." })).toBe("another claimed handle holds this owner");
    expect(ruleSentence("profile", { fields: ["handle"] })).toBe("another profile holds this handle");
    expect(ruleSentence("run", { fields: ["mission", "task"], while: ["claimed", "running"] })).toBe("another claimed or running run holds this mission and task");
    expect(ruleSentence("sign-in", { fields: ["person-id"] })).toBe("another sign in holds this person id");
  });

  it("writes a name as words", () => {
    expect(words("HandleName")).toBe("handle name");
    expect(words("sign-in")).toBe("sign in");
  });
});
