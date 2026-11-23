// node --test tools/github/gate.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { gate } from "./gate.mjs";

const types = [{ do: "createIssueType", name: "Capability" }, { do: "createIssueType", name: "Gap" }];
const rest = [{ do: "createIssue", title: "x" }, { do: "createLabel", name: "l" }];
const admin = new Set(["repo", "admin:org"]);

test("the workflow's board step with types missing warns and writes nothing, whatever it can read of its token", () => {
  for (const scopes of [null, new Set(["repo"]), admin]) {
    const g = gate({ steps: [...types, ...rest], board: true, bootstrap: false, scopes });
    assert.equal(g.action, "skip");
    assert.deepEqual(g.steps, []);
    assert.match(g.message, /^::warning::/);
    assert.match(g.message, /--board --bootstrap --apply/);
    assert.match(g.message, /Capability, Gap/);
  }
});

test("the board step with the types present writes everything, with no scope read at all", () => {
  assert.deepEqual(gate({ steps: rest, board: true, bootstrap: false, scopes: null }), { action: "run", steps: rest });
});

test("--bootstrap makes the types and nothing else, and only with admin:org", () => {
  assert.deepEqual(gate({ steps: [...types, ...rest], board: true, bootstrap: true, scopes: admin }), { action: "run", steps: types });
  assert.equal(gate({ steps: [...types, ...rest], board: true, bootstrap: true, scopes: new Set(["repo"]) }).code, 3);
  assert.equal(gate({ steps: [...types, ...rest], board: true, bootstrap: true, scopes: null }).code, 3, "unreadable scopes: stop, never guess");
  assert.equal(gate({ steps: rest, board: true, bootstrap: true, scopes: admin }).action, "nothing");
});

test("a run without --board and a token that cannot read its scopes (the workflow's first step) warns, never goes red", () => {
  const g = gate({ steps: [...types, ...rest], board: false, bootstrap: false, scopes: null });
  assert.deepEqual([g.action, g.steps], ["skip", []]);
});

test("a run without --board keeps the old rule when it can read its scopes: stop with exit 3 unless the token has admin:org", () => {
  assert.equal(gate({ steps: [...types], board: false, bootstrap: false, scopes: new Set(["repo"]) }).code, 3);
  assert.equal(gate({ steps: [...types], board: false, bootstrap: false, scopes: admin }).action, "run");
});
