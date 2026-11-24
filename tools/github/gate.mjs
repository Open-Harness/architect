// Which steps this run may write (K42, section 5). Pure: no I/O.
//
// Making an organization's issue types needs the `admin:org` scope, which the `goals` workflow's own token never has.
// So they are made once, locally, by `sync.mjs --board --bootstrap --apply`, and the workflow's board step never tries:
// when a type is missing it warns and writes nothing. Everything else is written by the workflow, one run at a time in
// its concurrency group, so a local run cannot race it.

/** The steps only a token with `admin:org` can do. */
export const ADMIN_STEPS = ["createIssueType"];
const canAdmin = (scopes) => Boolean(scopes && (scopes.has("admin:org") || scopes.has("user")));

/**
 * steps: the plan. scopes: the token's scopes as a Set, or null when they can't be read (an installation token).
 * Returns { action, steps, message?, code? }:
 *   run      write `steps`
 *   skip     write nothing and exit 0, with `message` as a workflow warning (the board step, types missing)
 *   stop     write nothing and exit `code`, with `message`
 *   nothing  nothing to do
 */
export const gate = ({ steps, board, bootstrap, scopes }) => {
  const admin = steps.filter((s) => ADMIN_STEPS.includes(s.do));
  if (bootstrap) {
    if (!admin.length) return { action: "nothing", steps: [], message: "The issue types exist: nothing to bootstrap." };
    if (!canAdmin(scopes)) return { action: "stop", code: 3, steps: [], message: "Making the issue types needs the admin:org scope (or a token that can read it), so nothing was written. Run: gh auth refresh -s admin:org" };
    return { action: "run", steps: admin };
  }
  if (!admin.length) return { action: "run", steps };
  // The board step, and any run whose token cannot even say what it may do (the workflow's), warns instead of failing.
  if (board || !scopes) {
    const names = admin.map((s) => s.name).join(", ");
    return { action: "skip", steps: [], message: `::warning::The issue types (${names}) do not exist yet and this token cannot make them; nothing was written. Run \`node tools/github/sync.mjs --board --bootstrap --apply\` locally once, with a token that has admin:org.` };
  }
  if (!canAdmin(scopes)) return { action: "stop", code: 3, steps: [], message: "Making the issue types needs the admin:org scope, so nothing was written. Run: gh auth refresh -s admin:org" };
  return { action: "run", steps };
};
