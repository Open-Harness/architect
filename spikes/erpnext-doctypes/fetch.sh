#!/usr/bin/env bash
# Fetch ERPNext's record-type files at one pinned commit of version-15. They are outside data (GPL v3), read and never
# run, and they are not committed: `fixtures/` is ignored.
set -euo pipefail
cd "$(dirname "$0")"
sha=a6f54f9c88dcc24fdf3c59319f24cd9cd9aa91bd # frappe/erpnext refs/heads/version-15, read 23 November 2026
dir=fixtures/erpnext-v15
mkdir -p "$dir"
for d in sales_invoice sales_invoice_item sales_taxes_and_charges sales_invoice_payment sales_invoice_advance \
  sales_invoice_timesheet payment_entry payment_entry_reference payment_entry_deduction gl_entry; do
  [ -s "$dir/$d.json" ] || curl -sfL -o "$dir/$d.json" "https://raw.githubusercontent.com/frappe/erpnext/$sha/erpnext/accounts/doctype/$d/$d.json"
done
echo "fetched $(ls "$dir" | wc -l) doctypes at erpnext@${sha:0:8}"

# The six-doctype run that tries to break the mapping (README, \"What was tried\" 5): these ten, plus Purchase Invoice and
# Journal Entry with their tables, and HRMS's Salary Slip. Only with `./fetch.sh --break`.
[ "${1:-}" = "--break" ] || exit 0
hrms=46b389047bb12fb9c86c1300c3d7bfd5f897f171 # frappe/hrms refs/heads/version-15, read 23 November 2026
mkdir -p fixtures/break
cp "$dir"/*.json fixtures/break/
for d in purchase_invoice purchase_invoice_item purchase_taxes_and_charges purchase_invoice_advance journal_entry journal_entry_account; do
  [ -s "fixtures/break/$d.json" ] || curl -sfL -o "fixtures/break/$d.json" "https://raw.githubusercontent.com/frappe/erpnext/$sha/erpnext/accounts/doctype/$d/$d.json"
done
for d in salary_slip salary_detail; do
  [ -s "fixtures/break/$d.json" ] || curl -sfL -o "fixtures/break/$d.json" "https://raw.githubusercontent.com/frappe/hrms/$hrms/hrms/payroll/doctype/$d/$d.json"
done
echo "fetched $(ls fixtures/break | wc -l) doctypes for the break run"
