#!/usr/bin/env bash
# Which suites does a pull request touch? CI's `changes` job runs this, and a job whose project is not affected passes
# without running its steps (design/decisions/CI-integration.md, B3). When in doubt it says run: every failure, and every
# change that no single project owns, answers true for all.
#   tools/ci/affected.sh <base> <head> <project>...
# Prints `affected_<project>=true|false` per project, with `-` in the name written as `_`, for $GITHUB_OUTPUT. Exits 0 even
# when it could not tell (all true); only a usage error exits 2.
# A project is affected when `nx show projects --affected` lists it. That graph is built from imports, so a project that
# reaches another through a process, a file path or the command line must declare it in `implicitDependencies`
# (none does yet; e2e is the one special case, below). Run everything, without asking Nx, when:
#   - any changed path belongs to no project, or only to the root project (workflows, the lockfile, root config, tools/ci,
#     design/, spikes/);
#   - the changed list, the project graph or the affected list cannot be read.
# Test hooks: AFFECTED_GRAPH (a file holding `nx graph` JSON) and AFFECTED_LIST (a file with the affected project names,
# one per line) stand in for the two nx calls.
set -uo pipefail

base="${1:?usage: affected.sh <base> <head> <project>...}"
head="${2:?usage: affected.sh <base> <head> <project>...}"
shift 2
[ "$#" -ge 1 ] || { echo "usage: affected.sh <base> <head> <project>..." >&2; exit 2; }

emit() { # <true|false> for every project
  local p
  for p in "${projects[@]}"; do echo "affected_${p//-/_}=$1"; done
}
projects=("$@")
all() { echo "affected: run everything, $1" >&2; emit true; exit 0; }

# --no-renames, so a file moved out of a project counts as the deletion and addition it is.
changed=$(git diff --no-renames --name-only "$base...$head") || all "the diff could not be read"
[ -n "$changed" ] || all "an empty diff"

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
if [ -n "${AFFECTED_GRAPH:-}" ]; then graph="$AFFECTED_GRAPH"; else
  graph="$tmp/graph.json"
  pnpm nx graph --file="$graph" > /dev/null 2>&1 || all "the project graph could not be built"
fi
roots=$(node -e '
  const g = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).graph.nodes;
  for (const [name, node] of Object.entries(g)) console.log(node.data.root + "\t" + name);
' "$graph" 2> /dev/null) || all "the project graph could not be read"
[ -n "$roots" ] || all "the project graph is empty"

while IFS= read -r file; do
  best=""
  while IFS=$'\t' read -r root name; do
    [ "$root" = "." ] && continue
    case "$file" in "$root"/*) [ "${#root}" -gt "${#best}" ] && best="$root" ;; esac
  done <<< "$roots"
  [ -n "$best" ] || all "$file belongs to no project"
  case "$file" in e2e/fixtures/*) all "$file is copied by prove's tests" ;; esac
  # Nx drops what .nxignore lists (gitignore syntax) from its affected calculation, and the suites read those files anyway.
  if [ -f .nxignore ] && git -c core.excludesFile="$PWD/.nxignore" check-ignore -q --no-index -- "$file"; then
    all "$file is hidden from Nx by .nxignore"
  fi
done <<< "$changed"

if [ -n "${AFFECTED_LIST:-}" ]; then list=$(cat "$AFFECTED_LIST") || all "the affected list could not be read"; else
  list=$(pnpm nx show projects --affected --base="$base" --head="$head" --json 2> /dev/null | node -e '
    const names = JSON.parse(require("fs").readFileSync(0, "utf8")); for (const n of names) console.log(n);
  ') || all "nx could not list the affected projects"
fi
# The graph says too little for two projects, whose tests reach other projects by path and by process, not by import:
#   e2e runs the whole product, through the CLI and the examples, and reads docs/canon (e2e/m1 on goal/stage-1): any affected
#       project but the design docs (`docs`) and the root affects it.
#   prove's tests read examples/acme, examples/starter and packages/wallets, and run the CLI (grep of packages/prove on main and
#       goal/stage-1, 22 November 2026): those four affect it too.
# Add a line here when a test starts to reach a project that its imports do not show.
for p in "${projects[@]}"; do
  hit=false
  case "$p" in
    e2e) [ -n "$(awk 'NF && $0 !~ /^(docs|workspace)$/' <<< "$list")" ] && hit=true ;;
    prove) grep -qxE -- 'prove|cli|acme|starter|wallets' <<< "$list" && hit=true ;;
    *) grep -qx -- "$p" <<< "$list" && hit=true ;;
  esac
  echo "affected_${p//-/_}=$hit"
done
