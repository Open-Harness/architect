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
