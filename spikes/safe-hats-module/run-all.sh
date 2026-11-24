#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p evidence
summary=evidence/run-all.txt
: > "$summary"
scratch=$(mktemp -d)
child_pid=
cleanup() {
  if [[ -n $child_pid ]]; then
    kill -TERM "$child_pid" 2>/dev/null || true
    wait "$child_pid" || true
  fi
  rm -rf "$scratch"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

report() {
  printf '%s\n' "$*" | tee -a "$summary"
}

run_stage() {
  local log="evidence/$1.txt" status=0
  local TIMEFORMAT='Wall time: %3R s'
  shift
  report "Running $* (output in $log)" || return
  "$@" > "$log" 2>&1 &
  child_pid=$!
  { time wait "$child_pid"; } 2> "$scratch/time" || status=$?
  child_pid=
  cat "$scratch/time" >> "$log" || return
  tee -a "$summary" < "$log" || return
  report "Exit: $status" || return
  return "$status"
}

run_stage install ./script/install-pins.sh

export PATH="$PWD/node_modules/.bin:$PATH"
export FOUNDRY_SOLC="$PWD/node_modules/.bin/solc"
export HAT_BUDGET_MUTANT=false
run_stage build forge build --offline
FOUNDRY_INVARIANT_FAILURE_PERSIST_DIR="$scratch/real" \
  run_stage forge-test forge test --offline --threads 1 -vv
grep -Fq '[PASS] invariant_budgetAccounting()' evidence/forge-test.txt

if FOUNDRY_INVARIANT_FAILURE_PERSIST_DIR="$scratch/mutant" HAT_BUDGET_MUTANT=true \
  run_stage mutant forge test --offline --threads 1 -vv --match-contract '^HatBudgetInvariantTest$'; then
  report 'FAIL: the rollover mutant passed'
  exit 1
else
  mutant_status=$?
fi
if [[ $mutant_status != 1 ]] || ! grep -Fq '[FAIL: period spend: 100 != 0]' evidence/mutant.txt; then
  report 'FAIL: the mutant run did not show the expected rollover failure'
  exit 1
fi
report 'PASS: the invariant caught the rollover mutant'

run_stage typecheck "$PWD/node_modules/.bin/tsc" -p .
# The Node process owns Anvil and waits for it to exit when the runner forwards a signal.
run_stage anvil node script/main.ts
report 'PASS: all checks completed'
