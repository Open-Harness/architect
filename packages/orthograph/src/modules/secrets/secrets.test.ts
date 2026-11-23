import { describe, expect, it } from "vitest";
import { Secret, Secrets } from "./service.ts";

describe("secrets", () => {
  it("are named, with how they get a value, who holds them and no value", () => {
    expect(Secrets.secret.generated()).toEqual({ kind: "secret", how: "generated", secretKind: "runtime" });
    expect(Secrets.secret.stored()).toEqual({ kind: "secret", how: "stored", secretKind: "runtime" });
  });

  it("carry their options, and a kind is not decided by how the value is given", () => {
    expect(Secrets.secret.stored({ kind: Secret.release, describe: "a token", test: "t" })).toEqual({ kind: "secret", how: "stored", secretKind: "release", describe: "a token", test: "t" });
    expect(Secrets.secret.generated({ kind: Secret.builder, bytes: 16 })).toEqual({ kind: "secret", how: "generated", secretKind: "builder", bytes: 16 });
  });
});
