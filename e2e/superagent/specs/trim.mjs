// Cuts a published API description down to what the superagent's checks name, plus a few neighbours that must NOT be
// included, so "exactly the spec's calls" and "only what the mount includes" both mean something. It changes nothing
// inside an operation or a schema: the same text the publisher wrote, with every path, webhook and component left out
// that nothing kept refers to.
//
//   node e2e/superagent/specs/trim.mjs <name> <full-spec.json> > e2e/superagent/specs/<name>.trimmed.json
//
// `<name>` is github, slack or posthog. The full file is the one pins.json names (specs/README.md says how it is fetched).
import { readFileSync } from "node:fs";

const KEEP = {
  github: {
    // the calls the superagent includes, then neighbours that are in the spec and not included
    operations: [
      "issues/create-comment", "issues/list-comments", "pulls/create", "pulls/get", "pulls/create-review", "pulls/list-reviews",
      "pulls/create-review-comment", "pulls/list-review-comments",
      "repos/list-collaborators",
      "issues/get", "issues/get-comment", "issues/update-comment", "issues/delete-comment", "pulls/list", "pulls/merge", "repos/get",
    ],
    // The webhook entries (the spec lists one per action): the six events the superagent listens to, three actions of each
    // (a full set is megabytes of payload schema), then `push` and `star`, which it does not.
    webhooks: [
      "issue-comment-created", "issue-comment-edited", "issue-comment-deleted",
      "issues-opened", "issues-closed", "issues-edited",
      "pull-request-opened", "pull-request-closed", "pull-request-synchronize",
      "pull-request-review-submitted", "pull-request-review-edited", "pull-request-review-dismissed",
      "pull-request-review-comment-created", "pull-request-review-comment-edited", "pull-request-review-comment-deleted",
      "check-run-created", "check-run-completed", "check-run-rerequested",
      "push", "star-created", "star-deleted",
    ],
  },
  slack: {
    operations: ["chat_postMessage", "conversations_replies", "usergroups_users_list", "conversations_history", "chat_delete", "auth_test"],
    webhooks: [],
  },
  posthog: {
    operations: [
      "error_tracking_issues_list", "error_tracking_issues_retrieve", "error_tracking_issues_partial_update",
      "error_tracking_issues_update", "error_tracking_issues_destroy", "error_tracking_issues_exists_retrieve",
    ],
    webhooks: [],
  },
};

const [name, file] = process.argv.slice(2);
const keep = KEEP[name];
if (!keep || !file) { console.error("usage: trim.mjs <github|slack|posthog> <full-spec.json>"); process.exit(2); }
const spec = JSON.parse(readFileSync(file, "utf8"));
const swagger = spec.swagger !== undefined;

const paths = {};
const found = new Set();
for (const [path, item] of Object.entries(spec.paths)) {
  const ids = Object.values(item).map((op) => op?.operationId).filter(Boolean);
  const hit = ids.filter((id) => keep.operations.includes(id));
  if (hit.length > 0) { paths[path] = item; for (const id of hit) found.add(id); }
}
const missing = keep.operations.filter((id) => !found.has(id));
if (missing.length > 0) { console.error(`not in the spec: ${missing.join(", ")}`); process.exit(1); }
const gone = keep.webhooks.filter((key) => !(key in (spec.webhooks ?? {})));
if (gone.length > 0) { console.error(`no such webhook: ${gone.join(", ")}`); process.exit(1); }

const webhooks = {};
for (const [key, item] of Object.entries(spec.webhooks ?? {})) if (keep.webhooks.includes(key)) webhooks[key] = item;

const out = { ...spec, paths, ...(spec.webhooks ? { webhooks } : {}) };
if (swagger) out.definitions = {}; else out.components = { ...spec.components, schemas: {}, parameters: {}, responses: {}, examples: {}, headers: {}, requestBodies: {} };

// every $ref reachable from what was kept, and the components they name
const refs = (node, into) => {
  if (Array.isArray(node)) node.forEach((n) => refs(n, into));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k === "$ref" && typeof v === "string") into.add(v);
      else refs(v, into);
    }
  }
};
const wanted = new Set();
const queue = new Set();
refs({ paths, webhooks }, queue);
while (queue.size > 0) {
  const [ref] = queue;
  queue.delete(ref);
  if (wanted.has(ref)) continue;
  wanted.add(ref);
  let target = spec;
  for (const part of ref.replace(/^#\//, "").split("/")) target = target?.[part];
  if (target === undefined) { console.error(`dangling ${ref}`); process.exit(1); }
  refs(target, queue);
}
for (const ref of [...wanted].sort()) {
  const [, section, kind, id] = ref.match(/^#\/(components|definitions)\/(?:([^/]+)\/)?(.+)$/) ?? [];
  if (swagger) out.definitions[kind ?? id] = spec.definitions[kind ?? id];
  else if (section === "components") out.components[kind][id] = spec.components[kind][id];
}
// the keys of each section, in the publisher's order
if (!swagger) for (const kind of Object.keys(out.components)) {
  const original = spec.components[kind];
  if (original === undefined) { delete out.components[kind]; continue; }
  const kept = out.components[kind];
  if (kind === "securitySchemes") continue;
  out.components[kind] = Object.fromEntries(Object.keys(original).filter((k) => k in kept).map((k) => [k, kept[k]]));
  if (Object.keys(out.components[kind]).length === 0) delete out.components[kind];
}
if (swagger) out.definitions = Object.fromEntries(Object.keys(spec.definitions).filter((k) => k in out.definitions).map((k) => [k, out.definitions[k]]));
process.stdout.write(JSON.stringify(out) + "\n");
