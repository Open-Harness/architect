#!/usr/bin/env bash
# The spike end to end: fetch the doctypes, scaffold them, lay the hand-written proof over the scaffold, generate,
# check, and prove the two journeys on the local runtime. Everything it writes is under out/, which git ignores.
set -euo pipefail
cd "$(dirname "$0")"
ortho="node $(pwd)/../../packages/cli/src/main.ts"
./fetch.sh
node scaffold.mjs fixtures/erpnext-v15 out/books "Sales Invoice" "Payment Entry" "GL Entry"
node scaffold.mjs fixtures/erpnext-v15 out/pe --roles open "Payment Entry" "GL Entry"
cp -r proof/. out/pe/
cd out/pe
$ortho generate >/dev/null
$ortho check
# Stands in for a framework fix (the server projection writes every column NOT NULL, even for a nullable value):
# the scaffolded things' columns may be empty. Only the generated copy under out/ is changed.
sed -i -E '/^CREATE TABLE "(payment-entry|gl-entry|payment-entry-reference|payment-entry-deduction)"/,/\);/ s/^(  "[a-zA-Z]+" TEXT) NOT NULL/\1/' generated/server/migrations/0001_things.sql
$ortho prove "$@"
