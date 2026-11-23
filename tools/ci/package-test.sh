#!/usr/bin/env bash
# One package's tests, the nx `test` target (G11): tools/ci/package-test.sh <package folder>
# A package with no `expected-failing/` folder runs exactly as it always did: `vitest run --root <package> --passWithNoTests`.
# A package with one runs the same vitest, then the ratchet (e2e/ratchet/check.ts, the tool the m1 checks use): the run fails on a failing test that is not
# on a list in the folder (one file per test file, named after it: `find-by.txt` holds `src/modules/records/find-by.test.ts > ...`), and it reports a
# listed test that now passes ("newly passing, take it off the list"). A builder may only delete lines from these files (tools/ci/builder-paths.sh).
set -uo pipefail

package="${1:?usage: package-test.sh <package folder>}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# nx puts node_modules/.bin on PATH; a direct run does not.
vitest_bin="$here/node_modules/.bin/vitest"
[ -x "$vitest_bin" ] || vitest_bin="vitest"

if [ ! -d "$package/expected-failing" ]; then
  exec "$vitest_bin" run --root "$package" --passWithNoTests
fi

out="$(mktemp -d "${TMPDIR:-/tmp}/package-ratchet.XXXXXX")"
trap 'rm -rf "$out"' EXIT
# The run's own exit is not the verdict: the listed failures make it non-zero. The ratchet's is.
# As the m1 run does: the hook-error reporter writes what the JSON report leaves out (a hook that threw, an unhandled error), check.ts reads it, and each is a
# failure unless it is listed under its own key. vitest's own exit goes to check.ts as a backstop: non-zero with no failing test in the report fails the run.
RATCHET_ERRORS_FILE="$out/errors.json" "$vitest_bin" run --root "$package" --passWithNoTests \
  --reporter=default --reporter=json --reporter="$here/e2e/ratchet/reporter.ts" --outputFile.json="$out/report.json"
vitest_exit=$?
RATCHET_VITEST_EXIT="$vitest_exit" RATCHET_ROOT="$package" node "$here/e2e/ratchet/check.ts" "$out/report.json" "$package/expected-failing" "$out/errors.json"
