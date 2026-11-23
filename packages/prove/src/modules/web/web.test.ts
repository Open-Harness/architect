// The scene a call is replayed in, without a browser: what a person does to each operation's piece is told from the model as the web projection
// tells it, the scene names the piece the projection writes, and the project's own pieces are what get bundled (a broken one bundles and fails in the page).
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { bundle, planOf, sceneSource } from "./internal/scene.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const pluggedIn = join(repo, "examples/plugged-in");
const model = JSON.parse(readFileSync(join(pluggedIn, "generated/model/model.json"), "utf8")) as Model;

describe("web scene", () => {
  it("tells a read, a form and a dialog, and what is typed and what the page gives", () => {
    expect(planOf(model, "handle.claim")).toMatchObject({ kind: "form", piece: "HandleClaim", inputs: ["name"], given: [] });
    expect(planOf(model, "handle.release")).toMatchObject({ kind: "confirm", piece: "HandleRelease", inputs: [], given: ["handle"] });
    expect(planOf(model, "link.order")).toMatchObject({ kind: "form", inputs: ["position"], given: ["link"] });
    expect(planOf(model, "profile.get")).toMatchObject({ kind: "read", piece: "ProfileGet", inputs: [], given: ["handle"] });
    expect(planOf(model, "no.such")).toBeUndefined();
  });

  it("mounts the operation's piece on the app's host and nothing else", () => {
    const source = sceneSource(pluggedIn, "plugged-in", planOf(model, "handle.release")!);
    expect(source).toContain(`import { HandleRelease as Piece } from ${JSON.stringify(join(pluggedIn, "generated/web/handle/release.react.tsx"))}`);
    expect(source).toContain("PluggedInHost as Provider");
    expect(source).toContain("<Piece.Confirm {...props} />");
  });

  it("bundles the project's own pieces for the browser", async () => {
    const plan = planOf(model, "handle.claim")!;
    const made = await Effect.runPromise(bundle(pluggedIn, sceneSource(pluggedIn, "plugged-in", plan)));
    expect(made.js).toContain("handle-claim");
    expect(made.css.length).toBeGreaterThan(0);
  });

  it("says why when the pieces would not bundle, instead of failing the run", async () => {
    const empty = mkdtempSync(join(tmpdir(), "ortho-web-scene-"));
    mkdirSync(join(empty, "generated"), { recursive: true });
    writeFileSync(join(empty, "package.json"), "{}");
    const made = await Effect.runPromise(Effect.result(bundle(empty, sceneSource(empty, "plugged-in", planOf(model, "handle.claim")!))));
    expect(made._tag).toBe("Failure");
    expect(JSON.stringify(made)).toContain("would not bundle");
  });
});
