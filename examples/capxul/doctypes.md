# Capxul's record types

Every ERPNext, Frappe HRMS and Frappe CRM record type (doctype) Capxul takes, in one place, as Aaron asked on 23
November 2026: "I want to document all the record types that we need, which is pretty much all of them, and then have
them all together" (`design/decisions/CX-grill.md`, section 2). Goal 16's slice 6 (#712) wrote it, and each part's slice
keeps it current: a row's notes say what building found, and a row moves to "not taken" only with its reason.

Read from ERPNext `version-15` at `a6f54f9c`, Frappe HRMS `version-15` at `46b38904` and Frappe CRM `main` at
`638bf3db`. The ERPNext and HRMS commits are the ones slice 4's spike used (#710, `spikes/erpnext-doctypes`); the spike
didn't read the CRM, so the CRM is read at its release branch. The doctype files are outside data under GPL v3 (ERPNext,
HRMS) and AGPL v3 (CRM): read, never run, and not copied here. Each row names its file.

## How to read it

- **Kind.** `thing`: a record, which becomes an Orthograph thing. `line`: a child table, a thing with `parent` and
  `idx`, as the spike scaffolds it. `settings`: a single, which becomes a company's settings thing. `job`: a tool or a
  background process in Frappe, which becomes an operation or a workflow rather than a thing.
- **Flags.** `SUB`: submittable, so it gets ERPNext's draft, submitted and cancelled machine. `FX`: it holds an
  exchange rate or a `base_` amount beside a foreign one. Each is taken with its rate and base fields as its slice builds it, since a
  company keeps its books in its own currency (CX-money-global-payroll). `WIDE`: more than 97 stored columns, so it hits D1's 100-column limit once id,
  state and version are added (the spike's gap 4, in #742).
- **Columns.** The doctype's stored fields: not its layout fields, and not its tables, which become lines. Sales
  Invoice has 133. The spike counted 142 with its 9 tables, kept 130 and dropped 12 that point at record types not
  taken here.
- **Stage.** Every row is provisional (K42, section 2). Slice 4's scaffolder moves a thing to scaffoldable.

## Summary

| Part | Record types | Of which lines | Slice |
|---|---|---|---|
| The books | 284 | 133 | 2, then 7 |
| HR | 124 | 39 | 8 |
| Payroll | 37 | 15 | 9 |
| The CRM | 40 | 10 | 11 |
| **All** | **485** | **197** | |

35 carry exchange rates (`FX`, CX-money-global-payroll), and 5 are wider than D1 allows (`WIDE`: POS Invoice, Purchase Invoice, Purchase Order,
Sales Invoice, Sales Order).

## The books

Accounts, selling, buying, fixed assets and the records they need from stock and projects. Slices 2 and 7.

| Doctype | Kind | Flags | Columns | Source | Notes |
|---|---|---|---|---|---|
| Account | thing |  | 17 | `erpnext/erpnext/accounts/doctype/account/account.json` | a tree: its company, name, an optional parent group, root type (a child carries its parent's), report type (worked out), account type (Bank, Cash, Receivable, Payable, Tax, or none). Group or ledger is its state; a group with nothing under it can become a ledger. Number, currency, freezing and the way back to a group come later (CX-ledger) |
| Account Closing Balance | thing |  | 13 | `erpnext/erpnext/accounts/doctype/account_closing_balance/account_closing_balance.json` |  |
| Accounting Dimension | thing |  | 4 | `erpnext/erpnext/accounts/doctype/accounting_dimension/accounting_dimension.json` |  |
| Accounting Dimension Filter | thing |  | 6 | `erpnext/erpnext/accounts/doctype/accounting_dimension_filter/accounting_dimension_filter.json` |  |
| Accounting Period | thing |  | 4 | `erpnext/erpnext/accounts/doctype/accounting_period/accounting_period.json` |  |
| Accounts Settings | settings |  | 56 | `erpnext/erpnext/accounts/doctype/accounts_settings/accounts_settings.json` |  |
| Activity Cost | thing |  | 7 | `erpnext/erpnext/projects/doctype/activity_cost/activity_cost.json` |  |
| Activity Type | thing |  | 4 | `erpnext/erpnext/projects/doctype/activity_type/activity_type.json` |  |
| Advance Payment Ledger Entry | thing |  | 9 | `erpnext/erpnext/accounts/doctype/advance_payment_ledger_entry/advance_payment_ledger_entry.json` |  |
| Asset | thing | SUB | 53 | `erpnext/erpnext/assets/doctype/asset/asset.json` |  |
| Asset Activity | thing |  | 4 | `erpnext/erpnext/assets/doctype/asset_activity/asset_activity.json` |  |
| Asset Capitalization | thing | SUB | 28 | `erpnext/erpnext/assets/doctype/asset_capitalization/asset_capitalization.json` |  |
| Asset Category | thing |  | 3 | `erpnext/erpnext/assets/doctype/asset_category/asset_category.json` |  |
| Asset Depreciation Schedule | thing | SUB | 18 | `erpnext/erpnext/assets/doctype/asset_depreciation_schedule/asset_depreciation_schedule.json` |  |
| Asset Maintenance | thing |  | 8 | `erpnext/erpnext/assets/doctype/asset_maintenance/asset_maintenance.json` |  |
| Asset Maintenance Log | thing | SUB | 19 | `erpnext/erpnext/assets/doctype/asset_maintenance_log/asset_maintenance_log.json` |  |
| Asset Maintenance Team | thing |  | 4 | `erpnext/erpnext/assets/doctype/asset_maintenance_team/asset_maintenance_team.json` |  |
| Asset Movement | thing | SUB | 6 | `erpnext/erpnext/assets/doctype/asset_movement/asset_movement.json` |  |
| Asset Repair | thing | SUB | 20 | `erpnext/erpnext/assets/doctype/asset_repair/asset_repair.json` |  |
| Asset Shift Allocation | thing | SUB | 5 | `erpnext/erpnext/assets/doctype/asset_shift_allocation/asset_shift_allocation.json` |  |
| Asset Shift Factor | thing |  | 3 | `erpnext/erpnext/assets/doctype/asset_shift_factor/asset_shift_factor.json` |  |
| Asset Value Adjustment | thing | SUB | 12 | `erpnext/erpnext/assets/doctype/asset_value_adjustment/asset_value_adjustment.json` |  |
| Authorization Control | settings |  | 0 | `erpnext/erpnext/setup/doctype/authorization_control/authorization_control.json` |  |
| Authorization Rule | thing |  | 12 | `erpnext/erpnext/setup/doctype/authorization_rule/authorization_rule.json` |  |
| Bank | thing |  | 4 | `erpnext/erpnext/accounts/doctype/bank/bank.json` |  |
| Bank Account | thing |  | 17 | `erpnext/erpnext/accounts/doctype/bank_account/bank_account.json` | Bridge's bank accounts land here (slice 10) |
| Bank Account Subtype | thing |  | 1 | `erpnext/erpnext/accounts/doctype/bank_account_subtype/bank_account_subtype.json` |  |
| Bank Account Type | thing |  | 1 | `erpnext/erpnext/accounts/doctype/bank_account_type/bank_account_type.json` |  |
| Bank Clearance | job |  | 7 | `erpnext/erpnext/accounts/doctype/bank_clearance/bank_clearance.json` |  |
| Bank Guarantee | thing | SUB | 24 | `erpnext/erpnext/accounts/doctype/bank_guarantee/bank_guarantee.json` |  |
| Bank Reconciliation Tool | job |  | 10 | `erpnext/erpnext/accounts/doctype/bank_reconciliation_tool/bank_reconciliation_tool.json` |  |
| Bank Statement Import | thing |  | 15 | `erpnext/erpnext/accounts/doctype/bank_statement_import/bank_statement_import.json` |  |
| Bank Transaction | thing | SUB | 22 | `erpnext/erpnext/accounts/doctype/bank_transaction/bank_transaction.json` | Bridge's transfers land here (slice 10) |
| Bisect Accounting Statements | job |  | 10 | `erpnext/erpnext/accounts/doctype/bisect_accounting_statements/bisect_accounting_statements.json` |  |
| Bisect Nodes | job |  | 9 | `erpnext/erpnext/accounts/doctype/bisect_nodes/bisect_nodes.json` |  |
| Brand | thing |  | 3 | `erpnext/erpnext/setup/doctype/brand/brand.json` |  |
| Budget | thing | SUB | 17 | `erpnext/erpnext/accounts/doctype/budget/budget.json` |  |
| Buying Settings | settings |  | 26 | `erpnext/erpnext/buying/doctype/buying_settings/buying_settings.json` |  |
| Cashier Closing | thing | SUB | 11 | `erpnext/erpnext/accounts/doctype/cashier_closing/cashier_closing.json` |  |
| Chart of Accounts Importer | job |  | 2 | `erpnext/erpnext/accounts/doctype/chart_of_accounts_importer/chart_of_accounts_importer.json` |  |
| Cheque Print Template | thing |  | 26 | `erpnext/erpnext/accounts/doctype/cheque_print_template/cheque_print_template.json` |  |
| Company | thing |  | 81 | `erpnext/erpnext/setup/doctype/company/company.json` | Capxul's companies, its own organisations (K42, call 10) |
| Cost Center | thing |  | 9 | `erpnext/erpnext/accounts/doctype/cost_center/cost_center.json` | a tree like Account: company, name, an optional parent group; group or ledger is its state (CX-ledger) |
| Cost Center Allocation | thing | SUB | 4 | `erpnext/erpnext/accounts/doctype/cost_center_allocation/cost_center_allocation.json` |  |
| Coupon Code | thing |  | 11 | `erpnext/erpnext/accounts/doctype/coupon_code/coupon_code.json` |  |
| Currency Exchange | thing | FX | 6 | `erpnext/erpnext/setup/doctype/currency_exchange/currency_exchange.json` | a rate between two currencies, in `rates` (CX-money-global-payroll) |
| Currency Exchange Settings | settings |  | 6 | `erpnext/erpnext/accounts/doctype/currency_exchange_settings/currency_exchange_settings.json` | where rates come from; a rate source is an adapter |
| Customer | thing |  | 42 | `erpnext/erpnext/selling/doctype/customer/customer.json` |  |
| Customer Group | thing |  | 8 | `erpnext/erpnext/setup/doctype/customer_group/customer_group.json` |  |
| Dunning | thing | SUB FX | 34 | `erpnext/erpnext/accounts/doctype/dunning/dunning.json` |  |
| Dunning Type | thing |  | 7 | `erpnext/erpnext/accounts/doctype/dunning_type/dunning_type.json` |  |
| Email Digest | job |  | 29 | `erpnext/erpnext/setup/doctype/email_digest/email_digest.json` |  |
| Exchange Rate Revaluation | job | SUB | 7 | `erpnext/erpnext/accounts/doctype/exchange_rate_revaluation/exchange_rate_revaluation.json` | in `ledger` (CX-money-global-payroll) |
| Finance Book | thing |  | 1 | `erpnext/erpnext/accounts/doctype/finance_book/finance_book.json` |  |
| Fiscal Year | thing |  | 6 | `erpnext/erpnext/accounts/doctype/fiscal_year/fiscal_year.json` | per company, not site-wide with a Fiscal Year Company table: name, first and last day, short year. A year not marked short is exactly a year less a day; a short one no longer; no overlap with the company's other years (CX-ledger) |
| GL Entry | thing |  | 32 | `erpnext/erpnext/accounts/doctype/gl_entry/gl_entry.json` | ledger line; posted only by a voucher's submit, and by its cancel as a reversal with debit and credit swapped, both lines marked `isCancelled`. No machine and no operation of its own; read by account (CX-ledger) |
| Global Defaults | settings |  | 8 | `erpnext/erpnext/setup/doctype/global_defaults/global_defaults.json` |  |
| Incoterm | thing |  | 3 | `erpnext/erpnext/setup/doctype/incoterm/incoterm.json` |  |
| Industry Type | thing |  | 1 | `erpnext/erpnext/selling/doctype/industry_type/industry_type.json` |  |
| Installation Note | thing | SUB | 17 | `erpnext/erpnext/selling/doctype/installation_note/installation_note.json` |  |
| Invoice Discounting | thing | SUB | 15 | `erpnext/erpnext/accounts/doctype/invoice_discounting/invoice_discounting.json` |  |
| Item | thing |  | 69 | `erpnext/erpnext/stock/doctype/item/item.json` |  |
| Item Group | thing |  | 7 | `erpnext/erpnext/setup/doctype/item_group/item_group.json` |  |
| Item Price | thing |  | 19 | `erpnext/erpnext/stock/doctype/item_price/item_price.json` |  |
| Item Tax Template | thing |  | 3 | `erpnext/erpnext/accounts/doctype/item_tax_template/item_tax_template.json` |  |
| Journal Entry | thing | SUB | 41 | `erpnext/erpnext/accounts/doctype/journal_entry/journal_entry.json` | draft, submitted, cancelled: company, posting day, remark and its totals, in USDC; created with its lines in one call; submit refuses unbalanced and outside every fiscal year, and posts one GL Entry per line, unmerged (CX-ledger) |
| Journal Entry Template | thing |  | 6 | `erpnext/erpnext/accounts/doctype/journal_entry_template/journal_entry_template.json` |  |
| Ledger Health | job |  | 5 | `erpnext/erpnext/accounts/doctype/ledger_health/ledger_health.json` |  |
| Ledger Health Monitor | job |  | 4 | `erpnext/erpnext/accounts/doctype/ledger_health_monitor/ledger_health_monitor.json` |  |
| Ledger Merge | job |  | 7 | `erpnext/erpnext/accounts/doctype/ledger_merge/ledger_merge.json` |  |
| Location | thing |  | 12 | `erpnext/erpnext/assets/doctype/location/location.json` |  |
| Loyalty Point Entry | thing |  | 11 | `erpnext/erpnext/accounts/doctype/loyalty_point_entry/loyalty_point_entry.json` |  |
| Loyalty Program | thing |  | 13 | `erpnext/erpnext/accounts/doctype/loyalty_program/loyalty_program.json` |  |
| Mode of Payment | thing |  | 3 | `erpnext/erpnext/accounts/doctype/mode_of_payment/mode_of_payment.json` |  |
| Monthly Distribution | thing |  | 2 | `erpnext/erpnext/accounts/doctype/monthly_distribution/monthly_distribution.json` |  |
| Opening Invoice Creation Tool | job |  | 5 | `erpnext/erpnext/accounts/doctype/opening_invoice_creation_tool/opening_invoice_creation_tool.json` |  |
| POS Closing Entry | thing | SUB | 14 | `erpnext/erpnext/accounts/doctype/pos_closing_entry/pos_closing_entry.json` |  |
| POS Invoice | thing | SUB FX WIDE | 114 | `erpnext/erpnext/accounts/doctype/pos_invoice/pos_invoice.json` |  |
| POS Invoice Merge Log | job | SUB | 10 | `erpnext/erpnext/accounts/doctype/pos_invoice_merge_log/pos_invoice_merge_log.json` |  |
| POS Opening Entry | thing | SUB | 10 | `erpnext/erpnext/accounts/doctype/pos_opening_entry/pos_opening_entry.json` |  |
| POS Profile | thing |  | 35 | `erpnext/erpnext/accounts/doctype/pos_profile/pos_profile.json` |  |
| POS Settings | settings |  | 0 | `erpnext/erpnext/accounts/doctype/pos_settings/pos_settings.json` |  |
| Party Link | thing |  | 4 | `erpnext/erpnext/accounts/doctype/party_link/party_link.json` |  |
| Party Specific Item | thing |  | 4 | `erpnext/erpnext/selling/doctype/party_specific_item/party_specific_item.json` |  |
| Party Type | thing |  | 2 | `erpnext/erpnext/setup/doctype/party_type/party_type.json` |  |
| Payment Entry | thing | SUB FX | 64 | `erpnext/erpnext/accounts/doctype/payment_entry/payment_entry.json` | slice 2: the payment that settles an invoice |
| Payment Gateway Account | thing |  | 7 | `erpnext/erpnext/accounts/doctype/payment_gateway_account/payment_gateway_account.json` | a card gateway account; Capxul's payments settle on the chain, so only its shape is kept for later |
| Payment Ledger Entry | thing |  | 20 | `erpnext/erpnext/accounts/doctype/payment_ledger_entry/payment_ledger_entry.json` | ledger line for outstanding amounts |
| Payment Order | thing | SUB | 9 | `erpnext/erpnext/accounts/doctype/payment_order/payment_order.json` |  |
| Payment Reconciliation | job |  | 20 | `erpnext/erpnext/accounts/doctype/payment_reconciliation/payment_reconciliation.json` |  |
| Payment Request | thing | SUB | 39 | `erpnext/erpnext/accounts/doctype/payment_request/payment_request.json` |  |
| Payment Term | thing |  | 11 | `erpnext/erpnext/accounts/doctype/payment_term/payment_term.json` |  |
| Payment Terms Template | thing |  | 2 | `erpnext/erpnext/accounts/doctype/payment_terms_template/payment_terms_template.json` |  |
| Pegged Currencies | settings |  | 0 | `erpnext/erpnext/accounts/doctype/pegged_currencies/pegged_currencies.json` | in `rates` (CX-money-global-payroll) |
| Period Closing Voucher | thing | SUB | 10 | `erpnext/erpnext/accounts/doctype/period_closing_voucher/period_closing_voucher.json` |  |
| Price List | thing |  | 6 | `erpnext/erpnext/stock/doctype/price_list/price_list.json` |  |
| Pricing Rule | thing |  | 59 | `erpnext/erpnext/accounts/doctype/pricing_rule/pricing_rule.json` |  |
| Print Heading | thing |  | 2 | `erpnext/erpnext/setup/doctype/print_heading/print_heading.json` |  |
| Process Deferred Accounting | job | SUB | 7 | `erpnext/erpnext/accounts/doctype/process_deferred_accounting/process_deferred_accounting.json` |  |
| Process Payment Reconciliation | job | SUB | 14 | `erpnext/erpnext/accounts/doctype/process_payment_reconciliation/process_payment_reconciliation.json` |  |
| Process Payment Reconciliation Log | job |  | 7 | `erpnext/erpnext/accounts/doctype/process_payment_reconciliation_log/process_payment_reconciliation_log.json` |  |
| Process Period Closing Voucher | job | SUB | 5 | `erpnext/erpnext/accounts/doctype/process_period_closing_voucher/process_period_closing_voucher.json` |  |
| Process Statement Of Accounts | job |  | 35 | `erpnext/erpnext/accounts/doctype/process_statement_of_accounts/process_statement_of_accounts.json` |  |
| Process Subscription | job | SUB | 3 | `erpnext/erpnext/accounts/doctype/process_subscription/process_subscription.json` |  |
| Product Bundle | thing |  | 3 | `erpnext/erpnext/selling/doctype/product_bundle/product_bundle.json` |  |
| Project | thing |  | 42 | `erpnext/erpnext/projects/doctype/project/project.json` |  |
| Promotional Scheme | thing |  | 15 | `erpnext/erpnext/accounts/doctype/promotional_scheme/promotional_scheme.json` |  |
| Purchase Invoice | thing | SUB FX WIDE | 125 | `erpnext/erpnext/accounts/doctype/purchase_invoice/purchase_invoice.json` |  |
| Purchase Order | thing | SUB FX WIDE | 99 | `erpnext/erpnext/buying/doctype/purchase_order/purchase_order.json` |  |
| Purchase Taxes and Charges Template | thing |  | 5 | `erpnext/erpnext/accounts/doctype/purchase_taxes_and_charges_template/purchase_taxes_and_charges_template.json` |  |
| Quotation | thing | SUB FX | 76 | `erpnext/erpnext/selling/doctype/quotation/quotation.json` |  |
| Quotation Lost Reason | thing |  | 1 | `erpnext/erpnext/setup/doctype/quotation_lost_reason/quotation_lost_reason.json` |  |
| Repost Accounting Ledger | job | SUB | 6 | `erpnext/erpnext/accounts/doctype/repost_accounting_ledger/repost_accounting_ledger.json` |  |
| Repost Accounting Ledger Settings | settings |  | 0 | `erpnext/erpnext/accounts/doctype/repost_accounting_ledger_settings/repost_accounting_ledger_settings.json` |  |
| Repost Payment Ledger | job | SUB | 7 | `erpnext/erpnext/accounts/doctype/repost_payment_ledger/repost_payment_ledger.json` |  |
| Request for Quotation | thing | SUB | 24 | `erpnext/erpnext/buying/doctype/request_for_quotation/request_for_quotation.json` |  |
| SMS Center | job |  | 10 | `erpnext/erpnext/selling/doctype/sms_center/sms_center.json` |  |
| Sales Invoice | thing | SUB FX WIDE | 133 | `erpnext/erpnext/accounts/doctype/sales_invoice/sales_invoice.json` | slice 2 starts here: a pay link, settled by the chain |
| Sales Order | thing | SUB FX WIDE | 100 | `erpnext/erpnext/selling/doctype/sales_order/sales_order.json` |  |
| Sales Partner | thing |  | 11 | `erpnext/erpnext/setup/doctype/sales_partner/sales_partner.json` |  |
| Sales Partner Type | thing |  | 1 | `erpnext/erpnext/selling/doctype/sales_partner_type/sales_partner_type.json` |  |
| Sales Person | thing |  | 10 | `erpnext/erpnext/setup/doctype/sales_person/sales_person.json` |  |
| Sales Taxes and Charges Template | thing |  | 5 | `erpnext/erpnext/accounts/doctype/sales_taxes_and_charges_template/sales_taxes_and_charges_template.json` |  |
| Selling Settings | settings |  | 25 | `erpnext/erpnext/selling/doctype/selling_settings/selling_settings.json` |  |
| Share Transfer | thing | SUB | 17 | `erpnext/erpnext/accounts/doctype/share_transfer/share_transfer.json` |  |
| Share Type | thing |  | 2 | `erpnext/erpnext/accounts/doctype/share_type/share_type.json` |  |
| Shareholder | thing |  | 6 | `erpnext/erpnext/accounts/doctype/shareholder/shareholder.json` | cap table; Capxul Next's equity contracts were parked |
| Shipping Rule | thing |  | 9 | `erpnext/erpnext/accounts/doctype/shipping_rule/shipping_rule.json` |  |
| Subscription | thing |  | 24 | `erpnext/erpnext/accounts/doctype/subscription/subscription.json` | repeating invoices; waits on timers and workflows |
| Subscription Plan | thing |  | 11 | `erpnext/erpnext/accounts/doctype/subscription_plan/subscription_plan.json` |  |
| Subscription Settings | settings |  | 3 | `erpnext/erpnext/accounts/doctype/subscription_settings/subscription_settings.json` |  |
| Supplier | thing |  | 35 | `erpnext/erpnext/buying/doctype/supplier/supplier.json` |  |
| Supplier Group | thing |  | 7 | `erpnext/erpnext/setup/doctype/supplier_group/supplier_group.json` |  |
| Supplier Quotation | thing | SUB FX | 69 | `erpnext/erpnext/buying/doctype/supplier_quotation/supplier_quotation.json` |  |
| Supplier Scorecard | thing |  | 13 | `erpnext/erpnext/buying/doctype/supplier_scorecard/supplier_scorecard.json` |  |
| Supplier Scorecard Criteria | thing |  | 4 | `erpnext/erpnext/buying/doctype/supplier_scorecard_criteria/supplier_scorecard_criteria.json` |  |
| Supplier Scorecard Period | thing | SUB | 7 | `erpnext/erpnext/buying/doctype/supplier_scorecard_period/supplier_scorecard_period.json` |  |
| Supplier Scorecard Standing | thing |  | 11 | `erpnext/erpnext/buying/doctype/supplier_scorecard_standing/supplier_scorecard_standing.json` |  |
| Supplier Scorecard Variable | thing |  | 5 | `erpnext/erpnext/buying/doctype/supplier_scorecard_variable/supplier_scorecard_variable.json` |  |
| Task | thing |  | 35 | `erpnext/erpnext/projects/doctype/task/task.json` |  |
| Tax Category | thing |  | 2 | `erpnext/erpnext/accounts/doctype/tax_category/tax_category.json` |  |
| Tax Rule | thing |  | 25 | `erpnext/erpnext/accounts/doctype/tax_rule/tax_rule.json` |  |
| Tax Withholding Category | thing |  | 4 | `erpnext/erpnext/accounts/doctype/tax_withholding_category/tax_withholding_category.json` |  |
| Terms and Conditions | thing |  | 6 | `erpnext/erpnext/setup/doctype/terms_and_conditions/terms_and_conditions.json` |  |
| Territory | thing |  | 7 | `erpnext/erpnext/setup/doctype/territory/territory.json` |  |
| Timesheet | thing | SUB FX | 27 | `erpnext/erpnext/projects/doctype/timesheet/timesheet.json` |  |
| Transaction Deletion Record | job | SUB | 11 | `erpnext/erpnext/setup/doctype/transaction_deletion_record/transaction_deletion_record.json` |  |
| UOM | thing |  | 3 | `erpnext/erpnext/setup/doctype/uom/uom.json` |  |
| UOM Category | thing |  | 1 | `erpnext/erpnext/stock/doctype/uom_category/uom_category.json` |  |
| UOM Conversion Factor | thing |  | 4 | `erpnext/erpnext/setup/doctype/uom_conversion_factor/uom_conversion_factor.json` |  |
| Unreconcile Payment | job | SUB | 4 | `erpnext/erpnext/accounts/doctype/unreconcile_payment/unreconcile_payment.json` |  |
| Accounting Dimension Detail | line |  | 7 | `erpnext/erpnext/accounts/doctype/accounting_dimension_detail/accounting_dimension_detail.json` |  |
| Advance Tax | line |  | 5 | `erpnext/erpnext/accounts/doctype/advance_tax/advance_tax.json` |  |
| Advance Taxes and Charges | line | FX | 15 | `erpnext/erpnext/accounts/doctype/advance_taxes_and_charges/advance_taxes_and_charges.json` |  |
| Allowed Dimension | line |  | 2 | `erpnext/erpnext/accounts/doctype/allowed_dimension/allowed_dimension.json` |  |
| Allowed To Transact With | line |  | 1 | `erpnext/erpnext/accounts/doctype/allowed_to_transact_with/allowed_to_transact_with.json` |  |
| Applicable On Account | line |  | 2 | `erpnext/erpnext/accounts/doctype/applicable_on_account/applicable_on_account.json` |  |
| Asset Capitalization Asset Item | line |  | 10 | `erpnext/erpnext/assets/doctype/asset_capitalization_asset_item/asset_capitalization_asset_item.json` |  |
| Asset Capitalization Service Item | line |  | 8 | `erpnext/erpnext/assets/doctype/asset_capitalization_service_item/asset_capitalization_service_item.json` |  |
| Asset Capitalization Stock Item | line |  | 14 | `erpnext/erpnext/assets/doctype/asset_capitalization_stock_item/asset_capitalization_stock_item.json` |  |
| Asset Category Account | line |  | 5 | `erpnext/erpnext/assets/doctype/asset_category_account/asset_category_account.json` |  |
| Asset Finance Book | line |  | 14 | `erpnext/erpnext/assets/doctype/asset_finance_book/asset_finance_book.json` |  |
| Asset Maintenance Task | line |  | 12 | `erpnext/erpnext/assets/doctype/asset_maintenance_task/asset_maintenance_task.json` |  |
| Asset Movement Item | line |  | 7 | `erpnext/erpnext/assets/doctype/asset_movement_item/asset_movement_item.json` |  |
| Asset Repair Consumed Item | line |  | 7 | `erpnext/erpnext/assets/doctype/asset_repair_consumed_item/asset_repair_consumed_item.json` |  |
| Bank Clearance Detail | line |  | 8 | `erpnext/erpnext/accounts/doctype/bank_clearance_detail/bank_clearance_detail.json` |  |
| Bank Transaction Mapping | line |  | 2 | `erpnext/erpnext/accounts/doctype/bank_transaction_mapping/bank_transaction_mapping.json` |  |
| Bank Transaction Payments | line |  | 4 | `erpnext/erpnext/accounts/doctype/bank_transaction_payments/bank_transaction_payments.json` |  |
| Budget Account | line |  | 2 | `erpnext/erpnext/accounts/doctype/budget_account/budget_account.json` |  |
| Campaign Item | line |  | 1 | `erpnext/erpnext/accounts/doctype/campaign_item/campaign_item.json` |  |
| Cashier Closing Payments | line |  | 2 | `erpnext/erpnext/accounts/doctype/cashier_closing_payments/cashier_closing_payments.json` |  |
| Closed Document | line |  | 2 | `erpnext/erpnext/accounts/doctype/closed_document/closed_document.json` |  |
| Competitor Detail | line |  | 1 | `erpnext/erpnext/crm/doctype/competitor_detail/competitor_detail.json` |  |
| Cost Center Allocation Percentage | line |  | 2 | `erpnext/erpnext/accounts/doctype/cost_center_allocation_percentage/cost_center_allocation_percentage.json` |  |
| Currency Exchange Settings Details | line |  | 2 | `erpnext/erpnext/accounts/doctype/currency_exchange_settings_details/currency_exchange_settings_details.json` |  |
| Currency Exchange Settings Result | line |  | 1 | `erpnext/erpnext/accounts/doctype/currency_exchange_settings_result/currency_exchange_settings_result.json` |  |
| Customer Credit Limit | line |  | 3 | `erpnext/erpnext/selling/doctype/customer_credit_limit/customer_credit_limit.json` |  |
| Customer Group Item | line |  | 1 | `erpnext/erpnext/accounts/doctype/customer_group_item/customer_group_item.json` |  |
| Customer Item | line |  | 1 | `erpnext/erpnext/accounts/doctype/customer_item/customer_item.json` |  |
| Depreciation Schedule | line |  | 5 | `erpnext/erpnext/assets/doctype/depreciation_schedule/depreciation_schedule.json` |  |
| Discounted Invoice | line |  | 5 | `erpnext/erpnext/accounts/doctype/discounted_invoice/discounted_invoice.json` |  |
| Dunning Letter Text | line |  | 4 | `erpnext/erpnext/accounts/doctype/dunning_letter_text/dunning_letter_text.json` |  |
| Email Digest Recipient | line |  | 1 | `erpnext/erpnext/setup/doctype/email_digest_recipient/email_digest_recipient.json` |  |
| Exchange Rate Revaluation Account | line |  | 12 | `erpnext/erpnext/accounts/doctype/exchange_rate_revaluation_account/exchange_rate_revaluation_account.json` |  |
| Fiscal Year Company | line |  | 1 | `erpnext/erpnext/accounts/doctype/fiscal_year_company/fiscal_year_company.json` |  |
| Installation Note Item | line |  | 8 | `erpnext/erpnext/selling/doctype/installation_note_item/installation_note_item.json` |  |
| Item Barcode | line |  | 3 | `erpnext/erpnext/stock/doctype/item_barcode/item_barcode.json` |  |
| Item Customer Detail | line |  | 3 | `erpnext/erpnext/stock/doctype/item_customer_detail/item_customer_detail.json` |  |
| Item Default | line |  | 12 | `erpnext/erpnext/stock/doctype/item_default/item_default.json` |  |
| Item Reorder | line |  | 5 | `erpnext/erpnext/stock/doctype/item_reorder/item_reorder.json` |  |
| Item Supplier | line |  | 2 | `erpnext/erpnext/stock/doctype/item_supplier/item_supplier.json` |  |
| Item Tax | line |  | 5 | `erpnext/erpnext/stock/doctype/item_tax/item_tax.json` |  |
| Item Tax Template Detail | line |  | 3 | `erpnext/erpnext/accounts/doctype/item_tax_template_detail/item_tax_template_detail.json` |  |
| Item Variant Attribute | line |  | 8 | `erpnext/erpnext/stock/doctype/item_variant_attribute/item_variant_attribute.json` |  |
| Journal Entry Account | line | FX | 23 | `erpnext/erpnext/accounts/doctype/journal_entry_account/journal_entry_account.json` | its line number, account, cost center, debit and credit in USDC; written only by its entry's create; party, reference and currency fields left out (CX-ledger) |
| Journal Entry Template Account | line |  | 1 | `erpnext/erpnext/accounts/doctype/journal_entry_template_account/journal_entry_template_account.json` |  |
| Ledger Health Monitor Company | line |  | 1 | `erpnext/erpnext/accounts/doctype/ledger_health_monitor_company/ledger_health_monitor_company.json` |  |
| Ledger Merge Accounts | line |  | 3 | `erpnext/erpnext/accounts/doctype/ledger_merge_accounts/ledger_merge_accounts.json` |  |
| Loyalty Program Collection | line |  | 3 | `erpnext/erpnext/accounts/doctype/loyalty_program_collection/loyalty_program_collection.json` |  |
| Maintenance Team Member | line |  | 3 | `erpnext/erpnext/assets/doctype/maintenance_team_member/maintenance_team_member.json` |  |
| Mode of Payment Account | line |  | 2 | `erpnext/erpnext/accounts/doctype/mode_of_payment_account/mode_of_payment_account.json` |  |
| Monthly Distribution Percentage | line |  | 2 | `erpnext/erpnext/accounts/doctype/monthly_distribution_percentage/monthly_distribution_percentage.json` |  |
| Opening Invoice Creation Tool Item | line |  | 11 | `erpnext/erpnext/accounts/doctype/opening_invoice_creation_tool_item/opening_invoice_creation_tool_item.json` |  |
| Overdue Payment | line |  | 14 | `erpnext/erpnext/accounts/doctype/overdue_payment/overdue_payment.json` |  |
| POS Closing Entry Detail | line |  | 5 | `erpnext/erpnext/accounts/doctype/pos_closing_entry_detail/pos_closing_entry_detail.json` |  |
| POS Closing Entry Taxes | line |  | 3 | `erpnext/erpnext/accounts/doctype/pos_closing_entry_taxes/pos_closing_entry_taxes.json` |  |
| POS Customer Group | line |  | 1 | `erpnext/erpnext/accounts/doctype/pos_customer_group/pos_customer_group.json` |  |
| POS Field | line |  | 7 | `erpnext/erpnext/accounts/doctype/pos_field/pos_field.json` |  |
| POS Invoice Item | line | FX | 71 | `erpnext/erpnext/accounts/doctype/pos_invoice_item/pos_invoice_item.json` |  |
| POS Invoice Reference | line |  | 6 | `erpnext/erpnext/accounts/doctype/pos_invoice_reference/pos_invoice_reference.json` |  |
| POS Item Group | line |  | 1 | `erpnext/erpnext/accounts/doctype/pos_item_group/pos_item_group.json` |  |
| POS Opening Entry Detail | line |  | 2 | `erpnext/erpnext/accounts/doctype/pos_opening_entry_detail/pos_opening_entry_detail.json` |  |
| POS Payment Method | line |  | 3 | `erpnext/erpnext/accounts/doctype/pos_payment_method/pos_payment_method.json` |  |
| POS Profile User | line |  | 2 | `erpnext/erpnext/accounts/doctype/pos_profile_user/pos_profile_user.json` |  |
| POS Search Fields | line |  | 2 | `erpnext/erpnext/accounts/doctype/pos_search_fields/pos_search_fields.json` |  |
| PSOA Cost Center | line |  | 1 | `erpnext/erpnext/accounts/doctype/psoa_cost_center/psoa_cost_center.json` |  |
| PSOA Project | line |  | 1 | `erpnext/erpnext/accounts/doctype/psoa_project/psoa_project.json` |  |
| Packed Item | line |  | 26 | `erpnext/erpnext/stock/doctype/packed_item/packed_item.json` |  |
| Party Account | line |  | 3 | `erpnext/erpnext/accounts/doctype/party_account/party_account.json` |  |
| Payment Entry Deduction | line |  | 6 | `erpnext/erpnext/accounts/doctype/payment_entry_deduction/payment_entry_deduction.json` |  |
| Payment Entry Reference | line | FX | 20 | `erpnext/erpnext/accounts/doctype/payment_entry_reference/payment_entry_reference.json` |  |
| Payment Order Reference | line |  | 9 | `erpnext/erpnext/accounts/doctype/payment_order_reference/payment_order_reference.json` |  |
| Payment Reconciliation Allocation | line | FX | 16 | `erpnext/erpnext/accounts/doctype/payment_reconciliation_allocation/payment_reconciliation_allocation.json` |  |
| Payment Reconciliation Invoice | line | FX | 7 | `erpnext/erpnext/accounts/doctype/payment_reconciliation_invoice/payment_reconciliation_invoice.json` |  |
| Payment Reconciliation Payment | line | FX | 11 | `erpnext/erpnext/accounts/doctype/payment_reconciliation_payment/payment_reconciliation_payment.json` |  |
| Payment Schedule | line | FX | 20 | `erpnext/erpnext/accounts/doctype/payment_schedule/payment_schedule.json` |  |
| Payment Terms Template Detail | line |  | 11 | `erpnext/erpnext/accounts/doctype/payment_terms_template_detail/payment_terms_template_detail.json` |  |
| Pegged Currency Details | line |  | 3 | `erpnext/erpnext/accounts/doctype/pegged_currency_details/pegged_currency_details.json` |  |
| Portal User | line |  | 1 | `erpnext/erpnext/utilities/doctype/portal_user/portal_user.json` |  |
| Price List Country | line |  | 1 | `erpnext/erpnext/stock/doctype/price_list_country/price_list_country.json` |  |
| Pricing Rule Brand | line |  | 2 | `erpnext/erpnext/accounts/doctype/pricing_rule_brand/pricing_rule_brand.json` |  |
| Pricing Rule Detail | line |  | 6 | `erpnext/erpnext/accounts/doctype/pricing_rule_detail/pricing_rule_detail.json` |  |
| Pricing Rule Item Code | line |  | 2 | `erpnext/erpnext/accounts/doctype/pricing_rule_item_code/pricing_rule_item_code.json` |  |
| Pricing Rule Item Group | line |  | 2 | `erpnext/erpnext/accounts/doctype/pricing_rule_item_group/pricing_rule_item_group.json` |  |
| Process Payment Reconciliation Log Allocations | line | FX | 15 | `erpnext/erpnext/accounts/doctype/process_payment_reconciliation_log_allocations/process_payment_reconciliation_log_allocations.json` |  |
| Process Period Closing Voucher Detail | line |  | 4 | `erpnext/erpnext/accounts/doctype/process_period_closing_voucher_detail/process_period_closing_voucher_detail.json` |  |
| Process Statement Of Accounts CC | line |  | 1 | `erpnext/erpnext/accounts/doctype/process_statement_of_accounts_cc/process_statement_of_accounts_cc.json` |  |
| Process Statement Of Accounts Customer | line |  | 4 | `erpnext/erpnext/accounts/doctype/process_statement_of_accounts_customer/process_statement_of_accounts_customer.json` |  |
| Product Bundle Item | line |  | 5 | `erpnext/erpnext/selling/doctype/product_bundle_item/product_bundle_item.json` |  |
| Project User | line |  | 8 | `erpnext/erpnext/projects/doctype/project_user/project_user.json` |  |
| Promotional Scheme Price Discount | line |  | 17 | `erpnext/erpnext/accounts/doctype/promotional_scheme_price_discount/promotional_scheme_price_discount.json` |  |
| Promotional Scheme Product Discount | line |  | 19 | `erpnext/erpnext/accounts/doctype/promotional_scheme_product_discount/promotional_scheme_product_discount.json` |  |
| Purchase Invoice Advance | line |  | 9 | `erpnext/erpnext/accounts/doctype/purchase_invoice_advance/purchase_invoice_advance.json` |  |
| Purchase Invoice Item | line | FX | 83 | `erpnext/erpnext/accounts/doctype/purchase_invoice_item/purchase_invoice_item.json` |  |
| Purchase Order Item | line | FX | 77 | `erpnext/erpnext/buying/doctype/purchase_order_item/purchase_order_item.json` |  |
| Purchase Order Item Supplied | line |  | 14 | `erpnext/erpnext/buying/doctype/purchase_order_item_supplied/purchase_order_item_supplied.json` |  |
| Purchase Receipt Item Supplied | line |  | 16 | `erpnext/erpnext/buying/doctype/purchase_receipt_item_supplied/purchase_receipt_item_supplied.json` |  |
| Purchase Taxes and Charges | line | FX | 22 | `erpnext/erpnext/accounts/doctype/purchase_taxes_and_charges/purchase_taxes_and_charges.json` |  |
| Quotation Item | line | FX | 54 | `erpnext/erpnext/selling/doctype/quotation_item/quotation_item.json` |  |
| Quotation Lost Reason Detail | line |  | 1 | `erpnext/erpnext/setup/doctype/quotation_lost_reason_detail/quotation_lost_reason_detail.json` |  |
| Repost Accounting Ledger Items | line |  | 4 | `erpnext/erpnext/accounts/doctype/repost_accounting_ledger_items/repost_accounting_ledger_items.json` |  |
| Repost Allowed Types | line |  | 2 | `erpnext/erpnext/accounts/doctype/repost_allowed_types/repost_allowed_types.json` |  |
| Repost Payment Ledger Items | line |  | 2 | `erpnext/erpnext/accounts/doctype/repost_payment_ledger_items/repost_payment_ledger_items.json` |  |
| Request for Quotation Item | line |  | 18 | `erpnext/erpnext/buying/doctype/request_for_quotation_item/request_for_quotation_item.json` |  |
| Request for Quotation Supplier | line |  | 7 | `erpnext/erpnext/buying/doctype/request_for_quotation_supplier/request_for_quotation_supplier.json` |  |
| Sales Invoice Advance | line |  | 9 | `erpnext/erpnext/accounts/doctype/sales_invoice_advance/sales_invoice_advance.json` |  |
| Sales Invoice Item | line | FX | 80 | `erpnext/erpnext/accounts/doctype/sales_invoice_item/sales_invoice_item.json` |  |
| Sales Invoice Payment | line | FX | 8 | `erpnext/erpnext/accounts/doctype/sales_invoice_payment/sales_invoice_payment.json` |  |
| Sales Invoice Timesheet | line |  | 9 | `erpnext/erpnext/accounts/doctype/sales_invoice_timesheet/sales_invoice_timesheet.json` |  |
| Sales Order Item | line | FX | 81 | `erpnext/erpnext/selling/doctype/sales_order_item/sales_order_item.json` |  |
| Sales Partner Item | line |  | 1 | `erpnext/erpnext/accounts/doctype/sales_partner_item/sales_partner_item.json` |  |
| Sales Taxes and Charges | line | FX | 20 | `erpnext/erpnext/accounts/doctype/sales_taxes_and_charges/sales_taxes_and_charges.json` |  |
| Sales Team | line |  | 6 | `erpnext/erpnext/selling/doctype/sales_team/sales_team.json` |  |
| Share Balance | line |  | 8 | `erpnext/erpnext/accounts/doctype/share_balance/share_balance.json` |  |
| Shipping Rule Condition | line |  | 3 | `erpnext/erpnext/accounts/doctype/shipping_rule_condition/shipping_rule_condition.json` |  |
| Shipping Rule Country | line |  | 1 | `erpnext/erpnext/accounts/doctype/shipping_rule_country/shipping_rule_country.json` |  |
| Subscription Plan Detail | line |  | 2 | `erpnext/erpnext/accounts/doctype/subscription_plan_detail/subscription_plan_detail.json` |  |
| Supplier Group Item | line |  | 1 | `erpnext/erpnext/accounts/doctype/supplier_group_item/supplier_group_item.json` |  |
| Supplier Item | line |  | 1 | `erpnext/erpnext/accounts/doctype/supplier_item/supplier_item.json` |  |
| Supplier Quotation Item | line | FX | 50 | `erpnext/erpnext/buying/doctype/supplier_quotation_item/supplier_quotation_item.json` |  |
| Supplier Scorecard Scoring Criteria | line |  | 5 | `erpnext/erpnext/buying/doctype/supplier_scorecard_scoring_criteria/supplier_scorecard_scoring_criteria.json` |  |
| Supplier Scorecard Scoring Standing | line |  | 11 | `erpnext/erpnext/buying/doctype/supplier_scorecard_scoring_standing/supplier_scorecard_scoring_standing.json` |  |
| Supplier Scorecard Scoring Variable | line |  | 5 | `erpnext/erpnext/buying/doctype/supplier_scorecard_scoring_variable/supplier_scorecard_scoring_variable.json` |  |
| Target Detail | line |  | 5 | `erpnext/erpnext/setup/doctype/target_detail/target_detail.json` |  |
| Task Depends On | line |  | 3 | `erpnext/erpnext/projects/doctype/task_depends_on/task_depends_on.json` |  |
| Tax Withheld Vouchers | line |  | 3 | `erpnext/erpnext/accounts/doctype/tax_withheld_vouchers/tax_withheld_vouchers.json` |  |
| Tax Withholding Account | line |  | 2 | `erpnext/erpnext/accounts/doctype/tax_withholding_account/tax_withholding_account.json` |  |
| Tax Withholding Rate | line |  | 5 | `erpnext/erpnext/accounts/doctype/tax_withholding_rate/tax_withholding_rate.json` |  |
| Territory Item | line |  | 1 | `erpnext/erpnext/accounts/doctype/territory_item/territory_item.json` |  |
| Timesheet Detail | line | FX | 21 | `erpnext/erpnext/projects/doctype/timesheet_detail/timesheet_detail.json` |  |
| Transaction Deletion Record Details | line |  | 4 | `erpnext/erpnext/accounts/doctype/transaction_deletion_record_details/transaction_deletion_record_details.json` |  |
| Transaction Deletion Record Item | line |  | 1 | `erpnext/erpnext/setup/doctype/transaction_deletion_record_item/transaction_deletion_record_item.json` |  |
| UOM Conversion Detail | line |  | 2 | `erpnext/erpnext/stock/doctype/uom_conversion_detail/uom_conversion_detail.json` |  |
| Unreconcile Payment Entries | line |  | 8 | `erpnext/erpnext/accounts/doctype/unreconcile_payment_entries/unreconcile_payment_entries.json` |  |

## HR

A company's people, leave, attendance, recruitment, appraisals and expenses. Slice 8.

| Doctype | Kind | Flags | Columns | Source | Notes |
|---|---|---|---|---|---|
| Appointment Letter | thing |  | 7 | `hrms/hrms/hr/doctype/appointment_letter/appointment_letter.json` |  |
| Appointment Letter Template | thing |  | 3 | `hrms/hrms/hr/doctype/appointment_letter_template/appointment_letter_template.json` |  |
| Appraisal | thing | SUB | 20 | `hrms/hrms/hr/doctype/appraisal/appraisal.json` | one per employee per cycle (a unique rule), made by the cycle's start or by the owner; KRA and self-rating lines copied from the template. The owner rates by hand under Manual Rating, the employee rates themselves; HRMS's scores, rounded half up (`decisions/CX-appraisals.md`) |
| Appraisal Cycle | thing |  | 12 | `hrms/hrms/hr/doctype/appraisal_cycle/appraisal_cycle.json` | the owner's: notStarted, inProgress, completed (and reopened). Start makes the appraisals; complete waits on every one submitted. Branch, department and job-title filters come later |
| Appraisal Template | thing |  | 2 | `hrms/hrms/hr/doctype/appraisal_template/appraisal_template.json` | the company's, unique by title; KRA weightages total 100, criteria too when there are any |
| Attendance | thing | SUB | 19 | `hrms/hrms/hr/doctype/attendance/attendance.json` | one per employee per day (a unique rule), in the employee's company, not before joining, not for a leaver; Present, Absent, Half Day or Work From Home by `mark`; On Leave only by a leave's approval, and `mark` refuses a day an approved leave covers (`decisions/CX-leave.md`); its shift, leave type and application wait on optional references (#967). HRMS has no future-day check at `46b38904` |
| Attendance Request | thing | SUB | 13 | `hrms/hrms/hr/doctype/attendance_request/attendance_request.json` | a draft, then approved or rejected; approving marks every day from its first to its last in one call (found through the attendance rule with `findBy`), changing a day marked with another status. It refuses a draft or approved request of the employee sharing a day (`validate_request_overlap`, by list) and skips the days an approved leave covers (`decisions/CX-leave.md`). Half days, shift and holidays wait on optional fields and holiday lists per employee |
| Branch | thing |  | 1 | `erpnext/erpnext/setup/doctype/branch/branch.json` | a place a company works from, its name unique within the company |
| Compensatory Leave Request | thing | SUB | 11 | `hrms/hrms/hr/doctype/compensatory_leave_request/compensatory_leave_request.json` |  |
| Daily Work Summary | thing |  | 3 | `hrms/hrms/hr/doctype/daily_work_summary/daily_work_summary.json` |  |
| Daily Work Summary Group | thing |  | 5 | `hrms/hrms/hr/doctype/daily_work_summary_group/daily_work_summary_group.json` |  |
| Department | thing |  | 8 | `erpnext/erpnext/setup/doctype/department/department.json` |  |
| Designation | thing |  | 2 | `erpnext/erpnext/setup/doctype/designation/designation.json` |  |
| Driver | thing |  | 10 | `erpnext/erpnext/setup/doctype/driver/driver.json` |  |
| Employee | thing |  | 66 | `erpnext/erpnext/setup/doctype/employee/employee.json` | a person employed by a company; linked to an Orthograph user |
| Employee Advance | thing | SUB FX | 19 | `hrms/hrms/hr/doctype/employee_advance/employee_advance.json` |  |
| Employee Attendance Tool | job |  | 12 | `hrms/hrms/hr/doctype/employee_attendance_tool/employee_attendance_tool.json` |  |
| Employee Checkin | thing |  | 16 | `hrms/hrms/hr/doctype/employee_checkin/employee_checkin.json` |  |
| Employee Feedback Criteria | thing |  | 1 | `hrms/hrms/hr/doctype/employee_feedback_criteria/employee_feedback_criteria.json` | the company's, unique by name |
| Employee Grade | thing |  | 3 | `hrms/hrms/hr/doctype/employee_grade/employee_grade.json` | a level employees are placed at, its name unique within the company; its salary structure, base pay and currency come with payroll |
| Employee Grievance | thing | SUB | 19 | `hrms/hrms/hr/doctype/employee_grievance/employee_grievance.json` |  |
| Employee Group | thing |  | 1 | `erpnext/erpnext/setup/doctype/employee_group/employee_group.json` |  |
| Employee Health Insurance | thing |  | 1 | `hrms/hrms/hr/doctype/employee_health_insurance/employee_health_insurance.json` |  |
| Employee Onboarding | thing | SUB | 16 | `hrms/hrms/hr/doctype/employee_onboarding/employee_onboarding.json` |  |
| Employee Onboarding Template | thing |  | 5 | `hrms/hrms/hr/doctype/employee_onboarding_template/employee_onboarding_template.json` |  |
| Employee Performance Feedback | thing | SUB | 15 | `hrms/hrms/hr/doctype/employee_performance_feedback/employee_performance_feedback.json` | given by a colleague signed in as themselves, never on oneself, refused only against a completed cycle; any number per reviewer. A leaver may submit a draft but start none |
| Employee Promotion | thing | SUB | 9 | `hrms/hrms/hr/doctype/employee_promotion/employee_promotion.json` | the job title only, as one property line: the current one copied from the employee on create and a new one of the company's; draft, submitted on or after its day by the world's clock (setting the employee's job title), cancelled (putting the old one back). Not for a leaver, judged on create. Grade, branch and pay (`revised_ctc`) come later (CX-employee-moves) |
| Employee Referral | thing | SUB | 20 | `hrms/hrms/hr/doctype/employee_referral/employee_referral.json` |  |
| Employee Separation | thing | SUB | 14 | `hrms/hrms/hr/doctype/employee_separation/employee_separation.json` | the resignation letter's day and the day it begins; pending, in process, completed, moved by the owner. One open separation per employee (a unique rule, Capxul's own). It doesn't relieve the employee. Activities, template, project and tasks, exit interview and Full and Final come later (CX-employee-moves) |
| Employee Separation Template | thing |  | 5 | `hrms/hrms/hr/doctype/employee_separation_template/employee_separation_template.json` |  |
| Employee Skill Map | thing |  | 3 | `hrms/hrms/hr/doctype/employee_skill_map/employee_skill_map.json` |  |
| Employee Transfer | thing | SUB | 10 | `hrms/hrms/hr/doctype/employee_transfer/employee_transfer.json` | the department only, as one property line, with the same shape and rules as a promotion. It stays in its company: HRMS's move to another company makes a new employee, and waits, as do `reallocate_leaves` and other lines (CX-employee-moves) |
| Employment Type | thing |  | 1 | `hrms/hrms/hr/doctype/employment_type/employment_type.json` | a way a company employs people, its name unique within the company |
| Exit Interview | thing | SUB | 18 | `hrms/hrms/hr/doctype/exit_interview/exit_interview.json` |  |
| Expense Claim | thing | SUB | 26 | `hrms/hrms/hr/doctype/expense_claim/expense_claim.json` |  |
| Expense Claim Type | thing |  | 3 | `hrms/hrms/hr/doctype/expense_claim_type/expense_claim_type.json` |  |
| Full and Final Statement | thing | SUB | 13 | `hrms/hrms/hr/doctype/full_and_final_statement/full_and_final_statement.json` |  |
| Goal | thing |  | 17 | `hrms/hrms/hr/doctype/goal/goal.json` | pending, inProgress, completed, archived, closed; a group's progress follows its children, and under the automated method goals score the appraisal. Always in a cycle |
| Grievance Type | thing |  | 1 | `hrms/hrms/hr/doctype/grievance_type/grievance_type.json` |  |
| HR Settings | settings |  | 34 | `hrms/hrms/hr/doctype/hr_settings/hr_settings.json` |  |
| Holiday List | thing |  | 8 | `erpnext/erpnext/setup/doctype/holiday_list/holiday_list.json` |  |
| Identification Document Type | thing |  | 1 | `hrms/hrms/hr/doctype/identification_document_type/identification_document_type.json` |  |
| Interest | thing |  | 1 | `hrms/hrms/hr/doctype/interest/interest.json` |  |
| Interview | thing | SUB | 14 | `hrms/hrms/hr/doctype/interview/interview.json` | an applicant's interview at a round of the same company, on a day between two times (to after from), with interviewers who are employees still at work; one per applicant per round in every state; pending, then cleared or rejected by the owner, not by feedback. Under Review, rating and reminders come later; overlapping interviewers' times wait on #764 |
| Interview Feedback | thing | SUB | 8 | `hrms/hrms/hr/doctype/interview_feedback/interview_feedback.json` | one per interviewer per interview (a unique rule), given by one of the interview's interviewers signed in as themselves, not before the interview's day by the world's clock; Cleared or Rejected. A leaver may still give it. Skill assessments and rating come later |
| Interview Round | thing |  | 4 | `hrms/hrms/hr/doctype/interview_round/interview_round.json` | its name unique within the company, with the employees who interview at it (none to ten, in the company, not leavers). Designation, interview type and expected skills come later |
| Interview Type | thing |  | 1 | `hrms/hrms/hr/doctype/interview_type/interview_type.json` |  |
| Job Applicant | thing |  | 18 | `hrms/hrms/hr/doctype/job_applicant/job_applicant.json` | a name, an email (not unique: HRMS lets one email apply again) and the opening, whose company it takes; none for a closed opening. Open, hold, rejected or accepted; accepted only once its offer is (a second call until #972) |
| Job Applicant Source | thing |  | 2 | `hrms/hrms/hr/doctype/job_applicant_source/job_applicant_source.json` |  |
| Job Offer | thing | SUB | 13 | `hrms/hrms/hr/doctype/job_offer/job_offer.json` | one per applicant in every state (a unique rule), under a job title of the applicant's company; awaiting, then accepted or rejected. HRMS moves the applicant in the same call; here it is a second call until #972 (CX-recruitment). Terms, pay (USDC base units when it comes) and the staffing plan's vacancy check come later |
| Job Offer Term Template | thing |  | 1 | `hrms/hrms/hr/doctype/job_offer_term_template/job_offer_term_template.json` |  |
| Job Opening | thing |  | 25 | `hrms/hrms/hr/doctype/job_opening/job_opening.json` | under a job title, whose company it takes, for at least one person; open, then closed by the owner (never by itself). Staffing plan, requisition, salary range and closing day come later (CX-recruitment) |
| Job Opening Template | thing |  | 5 | `hrms/hrms/hr/doctype/job_opening_template/job_opening_template.json` |  |
| Job Requisition | thing |  | 17 | `hrms/hrms/hr/doctype/job_requisition/job_requisition.json` |  |
| KRA | thing |  | 2 | `hrms/hrms/hr/doctype/kra/kra.json` | the company's, unique by title |
| Leave Allocation | thing | SUB | 21 | `hrms/hrms/hr/doctype/leave_allocation/leave_allocation.json` | 8b: draft then submitted; leaves allocated an exact decimal; no overlap with a submitted one of the same employee and type, judged by list (`decisions/CX-leave.md`). Carry-forward, policy and period are out of scope |
| Leave Application | thing | SUB | 22 | `hrms/hrms/hr/doctype/leave_application/leave_application.json` | 8b: open, then approved, rejected or cancelled; the balance, overlap, days in a row and covering allocation judged by list, approve marks its days On Leave (`decisions/CX-leave.md`). Half days are out of scope |
| Leave Block List | thing |  | 4 | `hrms/hrms/hr/doctype/leave_block_list/leave_block_list.json` |  |
| Leave Control Panel | job |  | 15 | `hrms/hrms/hr/doctype/leave_control_panel/leave_control_panel.json` |  |
| Leave Encashment | thing | SUB | 22 | `hrms/hrms/hr/doctype/leave_encashment/leave_encashment.json` |  |
| Leave Ledger Entry | thing | SUB | 14 | `hrms/hrms/hr/doctype/leave_ledger_entry/leave_ledger_entry.json` | not taken in 8b: the balance is computed from lists of allocations and approved applications (`decisions/CX-leave.md`) |
| Leave Period | thing |  | 5 | `hrms/hrms/hr/doctype/leave_period/leave_period.json` |  |
| Leave Policy | thing | SUB | 2 | `hrms/hrms/hr/doctype/leave_policy/leave_policy.json` |  |
| Leave Policy Assignment | thing | SUB | 11 | `hrms/hrms/hr/doctype/leave_policy_assignment/leave_policy_assignment.json` |  |
| Leave Type | thing |  | 23 | `hrms/hrms/hr/doctype/leave_type/leave_type.json` | 8b: per company, its name unique there; days in a row (0 for no limit), leave without pay, holidays counted (`decisions/CX-leave.md`) |
| Offer Term | thing |  | 1 | `hrms/hrms/hr/doctype/offer_term/offer_term.json` |  |
| Purpose of Travel | thing |  | 1 | `hrms/hrms/hr/doctype/purpose_of_travel/purpose_of_travel.json` |  |
| Shift Assignment | thing | SUB | 12 | `hrms/hrms/hr/doctype/shift_assignment/shift_assignment.json` |  |
| Shift Assignment Tool | job |  | 17 | `hrms/hrms/hr/doctype/shift_assignment_tool/shift_assignment_tool.json` |  |
| Shift Location | thing |  | 5 | `hrms/hrms/hr/doctype/shift_location/shift_location.json` |  |
| Shift Request | thing | SUB | 10 | `hrms/hrms/hr/doctype/shift_request/shift_request.json` |  |
| Shift Schedule | thing | SUB | 3 | `hrms/hrms/hr/doctype/shift_schedule/shift_schedule.json` |  |
| Shift Schedule Assignment | thing |  | 8 | `hrms/hrms/hr/doctype/shift_schedule_assignment/shift_schedule_assignment.json` |  |
| Shift Type | thing |  | 19 | `hrms/hrms/hr/doctype/shift_type/shift_type.json` | its name unique within the company, a start and an end time (`HH:MM`) that differ; an end before the start runs past midnight. HRMS's 22-hour limit (its default check-in buffers), check-in rules and auto attendance come with check-ins |
| Skill | thing |  | 2 | `hrms/hrms/hr/doctype/skill/skill.json` |  |
| Staffing Plan | thing | SUB | 6 | `hrms/hrms/hr/doctype/staffing_plan/staffing_plan.json` |  |
| Training Event | thing | SUB | 18 | `hrms/hrms/hr/doctype/training_event/training_event.json` |  |
| Training Feedback | thing | SUB | 9 | `hrms/hrms/hr/doctype/training_feedback/training_feedback.json` |  |
| Training Program | thing |  | 9 | `hrms/hrms/hr/doctype/training_program/training_program.json` |  |
| Training Result | thing | SUB | 3 | `hrms/hrms/hr/doctype/training_result/training_result.json` |  |
| Travel Request | thing | SUB | 20 | `hrms/hrms/hr/doctype/travel_request/travel_request.json` |  |
| Upload Attendance | job |  | 2 | `hrms/hrms/hr/doctype/upload_attendance/upload_attendance.json` |  |
| Vehicle | thing |  | 20 | `erpnext/erpnext/setup/doctype/vehicle/vehicle.json` |  |
| Vehicle Log | thing | SUB | 13 | `hrms/hrms/hr/doctype/vehicle_log/vehicle_log.json` |  |
| Vehicle Service Item | thing |  | 1 | `hrms/hrms/hr/doctype/vehicle_service_item/vehicle_service_item.json` |  |
| Appointment Letter content | line |  | 2 | `hrms/hrms/hr/doctype/appointment_letter_content/appointment_letter_content.json` |  |
| Appraisal Goal | line |  | 4 | `hrms/hrms/hr/doctype/appraisal_goal/appraisal_goal.json` |  |
| Appraisal KRA | line |  | 4 | `hrms/hrms/hr/doctype/appraisal_kra/appraisal_kra.json` |  |
| Appraisal Template Goal | line |  | 2 | `hrms/hrms/hr/doctype/appraisal_template_goal/appraisal_template_goal.json` |  |
| Appraisee | line |  | 6 | `hrms/hrms/hr/doctype/appraisee/appraisee.json` |  |
| Daily Work Summary Group User | line |  | 2 | `hrms/hrms/hr/doctype/daily_work_summary_group_user/daily_work_summary_group_user.json` |  |
| Department Approver | line |  | 1 | `hrms/hrms/hr/doctype/department_approver/department_approver.json` | attached by HRMS through a custom field |
| Designation Skill | line |  | 1 | `hrms/hrms/hr/doctype/designation_skill/designation_skill.json` | attached by HRMS through a custom field |
| Driving License Category | line |  | 4 | `erpnext/erpnext/setup/doctype/driving_license_category/driving_license_category.json` |  |
| Employee Boarding Activity | line |  | 9 | `hrms/hrms/hr/doctype/employee_boarding_activity/employee_boarding_activity.json` |  |
| Employee Education | line |  | 6 | `erpnext/erpnext/setup/doctype/employee_education/employee_education.json` |  |
| Employee External Work History | line |  | 6 | `erpnext/erpnext/setup/doctype/employee_external_work_history/employee_external_work_history.json` |  |
| Employee Feedback Rating | line |  | 3 | `hrms/hrms/hr/doctype/employee_feedback_rating/employee_feedback_rating.json` |  |
| Employee Group Table | line |  | 3 | `erpnext/erpnext/setup/doctype/employee_group_table/employee_group_table.json` |  |
| Employee Internal Work History | line |  | 5 | `erpnext/erpnext/setup/doctype/employee_internal_work_history/employee_internal_work_history.json` |  |
| Employee Property History | line |  | 4 | `hrms/hrms/hr/doctype/employee_property_history/employee_property_history.json` | folded into a promotion's job titles and a transfer's departments as two fields each; other properties wait (CX-employee-moves) |
| Employee Skill | line |  | 3 | `hrms/hrms/hr/doctype/employee_skill/employee_skill.json` |  |
| Employee Training | line |  | 2 | `hrms/hrms/hr/doctype/employee_training/employee_training.json` |  |
| Expected Skill Set | line |  | 2 | `hrms/hrms/hr/doctype/expected_skill_set/expected_skill_set.json` |  |
| Expense Claim Account | line |  | 2 | `hrms/hrms/hr/doctype/expense_claim_account/expense_claim_account.json` |  |
| Expense Claim Advance | line |  | 7 | `hrms/hrms/hr/doctype/expense_claim_advance/expense_claim_advance.json` |  |
| Expense Claim Detail | line |  | 8 | `hrms/hrms/hr/doctype/expense_claim_detail/expense_claim_detail.json` |  |
| Expense Taxes and Charges | line |  | 7 | `hrms/hrms/hr/doctype/expense_taxes_and_charges/expense_taxes_and_charges.json` |  |
| Full and Final Asset | line |  | 9 | `hrms/hrms/hr/doctype/full_and_final_asset/full_and_final_asset.json` |  |
| Full and Final Outstanding Statement | line |  | 8 | `hrms/hrms/hr/doctype/full_and_final_outstanding_statement/full_and_final_outstanding_statement.json` |  |
| Holiday | line |  | 3 | `erpnext/erpnext/setup/doctype/holiday/holiday.json` |  |
| Interview Detail | line |  | 1 | `hrms/hrms/hr/doctype/interview_detail/interview_detail.json` |  |
| Interviewer | line |  | 1 | `hrms/hrms/hr/doctype/interviewer/interviewer.json` |  |
| Job Offer Term | line |  | 2 | `hrms/hrms/hr/doctype/job_offer_term/job_offer_term.json` |  |
| Leave Block List Allow | line |  | 1 | `hrms/hrms/hr/doctype/leave_block_list_allow/leave_block_list_allow.json` |  |
| Leave Block List Date | line |  | 2 | `hrms/hrms/hr/doctype/leave_block_list_date/leave_block_list_date.json` |  |
| Leave Policy Detail | line |  | 2 | `hrms/hrms/hr/doctype/leave_policy_detail/leave_policy_detail.json` |  |
| Skill Assessment | line |  | 2 | `hrms/hrms/hr/doctype/skill_assessment/skill_assessment.json` |  |
| Staffing Plan Detail | line |  | 7 | `hrms/hrms/hr/doctype/staffing_plan_detail/staffing_plan_detail.json` |  |
| Training Event Employee | line |  | 6 | `hrms/hrms/hr/doctype/training_event_employee/training_event_employee.json` |  |
| Training Result Employee | line |  | 6 | `hrms/hrms/hr/doctype/training_result_employee/training_result_employee.json` |  |
| Travel Itinerary | line |  | 13 | `hrms/hrms/hr/doctype/travel_itinerary/travel_itinerary.json` |  |
| Travel Request Costing | line |  | 5 | `hrms/hrms/hr/doctype/travel_request_costing/travel_request_costing.json` |  |
| Vehicle Service | line |  | 4 | `hrms/hrms/hr/doctype/vehicle_service/vehicle_service.json` |  |

## Payroll

Salary structures, pay runs, slips, benefits and tax. Slice 9.

| Doctype | Kind | Flags | Columns | Source | Notes |
|---|---|---|---|---|---|
| Additional Salary | thing | SUB | 19 | `hrms/hrms/payroll/doctype/additional_salary/additional_salary.json` |  |
| Bulk Salary Structure Assignment | job |  | 11 | `hrms/hrms/payroll/doctype/bulk_salary_structure_assignment/bulk_salary_structure_assignment.json` |  |
| Employee Benefit Application | thing | SUB | 12 | `hrms/hrms/payroll/doctype/employee_benefit_application/employee_benefit_application.json` |  |
| Employee Benefit Claim | thing | SUB | 13 | `hrms/hrms/payroll/doctype/employee_benefit_claim/employee_benefit_claim.json` |  |
| Employee Incentive | thing | SUB | 9 | `hrms/hrms/payroll/doctype/employee_incentive/employee_incentive.json` |  |
| Employee Other Income | thing | SUB | 7 | `hrms/hrms/payroll/doctype/employee_other_income/employee_other_income.json` |  |
| Employee Tax Exemption Category | thing |  | 2 | `hrms/hrms/payroll/doctype/employee_tax_exemption_category/employee_tax_exemption_category.json` | India's income-tax exemption shape: not taken until a jurisdiction needs it (CX-payroll-tax); for the United States, the withholding certificate (Form W-4) takes the Declaration's place |
| Employee Tax Exemption Declaration | thing | SUB | 9 | `hrms/hrms/payroll/doctype/employee_tax_exemption_declaration/employee_tax_exemption_declaration.json` | as above |
| Employee Tax Exemption Proof Submission | thing | SUB | 11 | `hrms/hrms/payroll/doctype/employee_tax_exemption_proof_submission/employee_tax_exemption_proof_submission.json` | as above |
| Employee Tax Exemption Sub Category | thing |  | 3 | `hrms/hrms/payroll/doctype/employee_tax_exemption_sub_category/employee_tax_exemption_sub_category.json` | as above |
| Gratuity | thing | SUB | 19 | `hrms/hrms/payroll/doctype/gratuity/gratuity.json` |  |
| Gratuity Rule | thing |  | 5 | `hrms/hrms/payroll/doctype/gratuity_rule/gratuity_rule.json` |  |
| Income Tax Slab | thing | SUB | 8 | `hrms/hrms/payroll/doctype/income_tax_slab/income_tax_slab.json` | a progressive tax table; check against each country payroll supports |
| Payroll Entry | thing | SUB FX | 26 | `hrms/hrms/payroll/doctype/payroll_entry/payroll_entry.json` | draft, submitted, accrued: company, typed first and last day, posting day, cost center, payable account (a ledger with no type). Create fills in the company's employees still at work with a submitted assignment; submit makes a draft slip each; submit-slips submits them and posts one accrual journal entry. Cancelling comes later (CX-payroll) |
| Payroll Period | thing |  | 3 | `hrms/hrms/payroll/doctype/payroll_period/payroll_period.json` | per company: name, first and last day, no overlap with the company's other periods. Its sub-periods come with tax, 9b (CX-payroll) |
| Payroll Settings | settings |  | 15 | `hrms/hrms/payroll/doctype/payroll_settings/payroll_settings.json` |  |
| Retention Bonus | thing | SUB | 10 | `hrms/hrms/payroll/doctype/retention_bonus/retention_bonus.json` |  |
| Salary Component | thing |  | 25 | `hrms/hrms/payroll/doctype/salary_component/salary_component.json` | per company: name, earning or deduction, default amount, the ledger it is booked to. Formulas, conditions and the tax and benefit flags come later (CX-payroll) |
| Salary Slip | thing | SUB FX | 62 | `hrms/hrms/payroll/doctype/salary_slip/salary_slip.json` | made and submitted only by its payroll entry, so no machine: its status is Draft or Submitted. Its lines are Salary Slip Detail, copied from its structure; every line pays in full until payment days (9c) (CX-payroll) |
| Salary Structure | thing | SUB | 17 | `hrms/hrms/payroll/doctype/salary_structure/salary_structure.json` | draft, submitted, cancelled: per company, its lines fixed amounts with no formulas; no net pay below nothing on submit; can't be cancelled while used (CX-payroll) |
| Salary Structure Assignment | thing | SUB | 17 | `hrms/hrms/payroll/doctype/salary_structure_assignment/salary_structure_assignment.json` | draft, submitted, cancelled: employee, submitted structure, typed first day; one submitted per employee and day; not before joining; not for a leaver (CX-payroll) |
| Salary Withholding | thing | SUB | 13 | `hrms/hrms/payroll/doctype/salary_withholding/salary_withholding.json` |  |
| Employee Benefit Application Detail | line |  | 4 | `hrms/hrms/payroll/doctype/employee_benefit_application_detail/employee_benefit_application_detail.json` |  |
| Employee Cost Center | line |  | 2 | `hrms/hrms/payroll/doctype/employee_cost_center/employee_cost_center.json` |  |
| Employee Tax Exemption Declaration Category | line |  | 4 | `hrms/hrms/payroll/doctype/employee_tax_exemption_declaration_category/employee_tax_exemption_declaration_category.json` | a line of Employee Tax Exemption Declaration; as above |
| Employee Tax Exemption Proof Submission Detail | line |  | 6 | `hrms/hrms/payroll/doctype/employee_tax_exemption_proof_submission_detail/employee_tax_exemption_proof_submission_detail.json` | a line of Employee Tax Exemption Proof Submission; as above |
| Gratuity Applicable Component | line |  | 1 | `hrms/hrms/payroll/doctype/gratuity_applicable_component/gratuity_applicable_component.json` |  |
| Gratuity Rule Slab | line |  | 3 | `hrms/hrms/payroll/doctype/gratuity_rule_slab/gratuity_rule_slab.json` |  |
| Income Tax Slab Other Charges | line |  | 4 | `hrms/hrms/payroll/doctype/income_tax_slab_other_charges/income_tax_slab_other_charges.json` |  |
| Payroll Employee Detail | line |  | 5 | `hrms/hrms/payroll/doctype/payroll_employee_detail/payroll_employee_detail.json` | written by the entry's create, in hiring order (CX-payroll) |
| Payroll Period Date | line |  | 2 | `hrms/hrms/payroll/doctype/payroll_period_date/payroll_period_date.json` |  |
| Salary Component Account | line |  | 2 | `hrms/hrms/payroll/doctype/salary_component_account/salary_component_account.json` |  |
| Salary Detail | line |  | 22 | `hrms/hrms/payroll/doctype/salary_detail/salary_detail.json` | a structure's lines; a slip's are a second thing, Salary Slip Detail, so each has one parent (CX-payroll) |
| Salary Slip Leave | line |  | 6 | `hrms/hrms/payroll/doctype/salary_slip_leave/salary_slip_leave.json` |  |
| Salary Slip Timesheet | line |  | 2 | `hrms/hrms/payroll/doctype/salary_slip_timesheet/salary_slip_timesheet.json` |  |
| Salary Withholding Cycle | line |  | 4 | `hrms/hrms/payroll/doctype/salary_withholding_cycle/salary_withholding_cycle.json` |  |
| Taxable Salary Slab | line |  | 4 | `hrms/hrms/payroll/doctype/taxable_salary_slab/taxable_salary_slab.json` |  |

## The CRM

Frappe CRM, an optional piece picked when a Capxul is built (CX-composable-pieces). Slice 11.

| Doctype | Kind | Flags | Columns | Source | Notes |
|---|---|---|---|---|---|
| CRM Availability Status | thing |  | 5 | `crm/crm/fcrm/doctype/crm_availability_status/crm_availability_status.json` |  |
| CRM Call Log | thing |  | 16 | `crm/crm/fcrm/doctype/crm_call_log/crm_call_log.json` |  |
| CRM Communication Status | thing |  | 1 | `crm/crm/fcrm/doctype/crm_communication_status/crm_communication_status.json` |  |
| CRM Dashboard | thing |  | 4 | `crm/crm/fcrm/doctype/crm_dashboard/crm_dashboard.json` |  |
| CRM Deal | thing | FX | 48 | `crm/crm/fcrm/doctype/crm_deal/crm_deal.json` |  |
| CRM Deal Status | thing |  | 5 | `crm/crm/fcrm/doctype/crm_deal_status/crm_deal_status.json` |  |
| CRM Exotel Settings | settings |  | 7 | `crm/crm/fcrm/doctype/crm_exotel_settings/crm_exotel_settings.json` |  |
| CRM Fields Layout | thing |  | 3 | `crm/crm/fcrm/doctype/crm_fields_layout/crm_fields_layout.json` |  |
| CRM Form Script | thing |  | 5 | `crm/crm/fcrm/doctype/crm_form_script/crm_form_script.json` |  |
| CRM Global Settings | thing |  | 3 | `crm/crm/fcrm/doctype/crm_global_settings/crm_global_settings.json` |  |
| CRM Holiday List | thing |  | 5 | `crm/crm/fcrm/doctype/crm_holiday_list/crm_holiday_list.json` |  |
| CRM Industry | thing |  | 1 | `crm/crm/fcrm/doctype/crm_industry/crm_industry.json` |  |
| CRM Invitation | thing |  | 7 | `crm/crm/fcrm/doctype/crm_invitation/crm_invitation.json` |  |
| CRM Lead | thing |  | 44 | `crm/crm/fcrm/doctype/crm_lead/crm_lead.json` |  |
| CRM Lead Source | thing |  | 2 | `crm/crm/fcrm/doctype/crm_lead_source/crm_lead_source.json` |  |
| CRM Lead Status | thing |  | 4 | `crm/crm/fcrm/doctype/crm_lead_status/crm_lead_status.json` |  |
| CRM Lost Reason | thing |  | 2 | `crm/crm/fcrm/doctype/crm_lost_reason/crm_lost_reason.json` |  |
| CRM Notification | thing |  | 11 | `crm/crm/fcrm/doctype/crm_notification/crm_notification.json` |  |
| CRM Organization | thing | FX | 14 | `crm/crm/fcrm/doctype/crm_organization/crm_organization.json` |  |
| CRM Product | thing |  | 7 | `crm/crm/fcrm/doctype/crm_product/crm_product.json` |  |
| CRM Sales Hierarchy | thing |  | 7 | `crm/crm/fcrm/doctype/crm_sales_hierarchy/crm_sales_hierarchy.json` |  |
| CRM Service Level Agreement | thing |  | 10 | `crm/crm/fcrm/doctype/crm_service_level_agreement/crm_service_level_agreement.json` |  |
| CRM Task | thing |  | 9 | `crm/crm/fcrm/doctype/crm_task/crm_task.json` |  |
| CRM Telephony Agent | thing |  | 7 | `crm/crm/fcrm/doctype/crm_telephony_agent/crm_telephony_agent.json` |  |
| CRM Territory | thing |  | 7 | `crm/crm/fcrm/doctype/crm_territory/crm_territory.json` |  |
| CRM Twilio Settings | settings |  | 9 | `crm/crm/fcrm/doctype/crm_twilio_settings/crm_twilio_settings.json` |  |
| CRM View Settings | thing |  | 20 | `crm/crm/fcrm/doctype/crm_view_settings/crm_view_settings.json` |  |
| ERPNext CRM Settings | settings |  | 9 | `crm/crm/fcrm/doctype/erpnext_crm_settings/erpnext_crm_settings.json` |  |
| FCRM Note | thing |  | 7 | `crm/crm/fcrm/doctype/fcrm_note/fcrm_note.json` |  |
| FCRM Settings | settings |  | 15 | `crm/crm/fcrm/doctype/fcrm_settings/fcrm_settings.json` |  |
| CRM Contacts | line |  | 7 | `crm/crm/fcrm/doctype/crm_contacts/crm_contacts.json` |  |
| CRM Dropdown Item | line |  | 8 | `crm/crm/fcrm/doctype/crm_dropdown_item/crm_dropdown_item.json` |  |
| CRM Holiday | line |  | 3 | `crm/crm/fcrm/doctype/crm_holiday/crm_holiday.json` |  |
| CRM Product Sync Issue | line |  | 5 | `crm/crm/fcrm/doctype/crm_product_sync_issue/crm_product_sync_issue.json` |  |
| CRM Products | line |  | 8 | `crm/crm/fcrm/doctype/crm_products/crm_products.json` |  |
| CRM Rolling Response Time | line |  | 3 | `crm/crm/fcrm/doctype/crm_rolling_response_time/crm_rolling_response_time.json` |  |
| CRM Service Day | line |  | 3 | `crm/crm/fcrm/doctype/crm_service_day/crm_service_day.json` |  |
| CRM Service Level Priority | line |  | 3 | `crm/crm/fcrm/doctype/crm_service_level_priority/crm_service_level_priority.json` |  |
| CRM Status Change Log | line |  | 9 | `crm/crm/fcrm/doctype/crm_status_change_log/crm_status_change_log.json` |  |
| CRM Telephony Phone | line |  | 2 | `crm/crm/fcrm/doctype/crm_telephony_phone/crm_telephony_phone.json` |  |

## Not taken

Each with its reason. A link field that points at one of these is dropped from the thing that holds it.

Leaving out stock (warehouses, stock movements, batches and serial numbers) is the goal's reading of "the books, HR and
payroll", not Aaron's call: the books link Warehouse from Company and many lines, and those links are dropped. He may
reverse it. Item, its prices and its units are taken, so an invoice can carry goods and services.

### Inside the modules Capxul takes

| Doctype | Kind | Flags | Columns | Source | Notes |
|---|---|---|---|---|---|
| CRM Enrichment Field Mapping | thing |  | 7 | `crm/crm/domain_enrichment/doctype/crm_enrichment_field_mapping/crm_enrichment_field_mapping.json` | an integration (Domain Enrichment); later, if the CRM wants it |
| CRM Enrichment Rule | thing |  | 7 | `crm/crm/domain_enrichment/doctype/crm_enrichment_rule/crm_enrichment_rule.json` | an integration (Domain Enrichment); later, if the CRM wants it |
| CRM Enrichment Run | thing |  | 16 | `crm/crm/domain_enrichment/doctype/crm_enrichment_run/crm_enrichment_run.json` | an integration (Domain Enrichment); later, if the CRM wants it |
| CRM Enrichment Settings | settings |  | 9 | `crm/crm/domain_enrichment/doctype/crm_enrichment_settings/crm_enrichment_settings.json` | an integration (Domain Enrichment); later, if the CRM wants it |
| Facebook Lead Form | thing |  | 3 | `crm/crm/lead_syncing/doctype/facebook_lead_form/facebook_lead_form.json` | an integration (Lead Syncing); later, if the CRM wants it |
| Facebook Page | thing |  | 5 | `crm/crm/lead_syncing/doctype/facebook_page/facebook_page.json` | an integration (Lead Syncing); later, if the CRM wants it |
| Failed Lead Sync Log | job |  | 4 | `crm/crm/lead_syncing/doctype/failed_lead_sync_log/failed_lead_sync_log.json` | an integration (Lead Syncing); later, if the CRM wants it |
| Lead Sync Source | thing |  | 7 | `crm/crm/lead_syncing/doctype/lead_sync_source/lead_sync_source.json` | an integration (Lead Syncing); later, if the CRM wants it |
| PWA Notification | thing |  | 6 | `hrms/hrms/hr/doctype/pwa_notification/pwa_notification.json` | Frappe's app notifications; Orthograph's outbox does this |
| CRM Enrichment Domain | line |  | 1 | `crm/crm/domain_enrichment/doctype/crm_enrichment_domain/crm_enrichment_domain.json` | a line of CRM Enrichment Settings, not taken |
| CRM Enrichment Link Priority | line |  | 2 | `crm/crm/domain_enrichment/doctype/crm_enrichment_link_priority/crm_enrichment_link_priority.json` | a line of CRM Enrichment Settings, not taken |
| CRM Enrichment Rule Pattern | line |  | 2 | `crm/crm/domain_enrichment/doctype/crm_enrichment_rule_pattern/crm_enrichment_rule_pattern.json` | a line of CRM Enrichment Rule, not taken |
| CRM Enrichment Run Change | line |  | 3 | `crm/crm/domain_enrichment/doctype/crm_enrichment_run_change/crm_enrichment_run_change.json` | a line of CRM Enrichment Run, not taken |
| CRM Enrichment Skip Pattern | line |  | 1 | `crm/crm/domain_enrichment/doctype/crm_enrichment_skip_pattern/crm_enrichment_skip_pattern.json` | a line of CRM Enrichment Settings, not taken |
| Facebook Lead Form Question | line |  | 5 | `crm/crm/lead_syncing/doctype/facebook_lead_form_question/facebook_lead_form_question.json` | a line of Facebook Lead Form, not taken |
| Linked Location | line |  | 1 | `erpnext/erpnext/assets/doctype/linked_location/linked_location.json` | a line no doctype in ERPNext, HRMS or the CRM holds at this commit (another Frappe app may use it) |
| Loyalty Point Entry Redemption | line |  | 3 | `erpnext/erpnext/accounts/doctype/loyalty_point_entry_redemption/loyalty_point_entry_redemption.json` | a line no doctype in ERPNext, HRMS or the CRM holds at this commit (another Frappe app may use it) |
| Salary Slip Loan | line |  | 8 | `hrms/hrms/payroll/doctype/salary_slip_loan/salary_slip_loan.json` | a loan repayment line; loans are Frappe's lending app, not taken |
| South Africa VAT Account | line |  | 1 | `erpnext/erpnext/accounts/doctype/south_africa_vat_account/south_africa_vat_account.json` | a line of South Africa VAT Settings, not taken |
| Subscription Invoice | line |  | 2 | `erpnext/erpnext/accounts/doctype/subscription_invoice/subscription_invoice.json` | a line no doctype in ERPNext, HRMS or the CRM holds at this commit (another Frappe app may use it) |
| Website Item Group | line |  | 1 | `erpnext/erpnext/setup/doctype/website_item_group/website_item_group.json` | a line no doctype in ERPNext, HRMS or the CRM holds at this commit (another Frappe app may use it) |

### Linked from a taken record type, but outside Capxul core

| Doctype | Module | Linked from | Why not |
|---|---|---|---|
| Campaign | CRM | Campaign Item, POS Invoice, POS Profile and 4 more | ERPNext's own CRM; Frappe CRM replaces it in slice 11 |
| Competitor | CRM | Competitor Detail | ERPNext's own CRM; Frappe CRM replaces it in slice 11 |
| Lead | CRM | Customer | ERPNext's own CRM; Frappe CRM replaces it in slice 11 |
| Lead Source | CRM | POS Invoice, Quotation, Sales Invoice and 1 more | ERPNext's own CRM; Frappe CRM replaces it in slice 11 |
| Market Segment | CRM | Customer | ERPNext's own CRM; Frappe CRM replaces it in slice 11 |
| Opportunity | CRM | Customer, Quotation, Request for Quotation and 1 more | ERPNext's own CRM; Frappe CRM replaces it in slice 11 |
| Prospect | CRM | Customer | ERPNext's own CRM; Frappe CRM replaces it in slice 11 |
| BOM | Manufacturing | Item, Purchase Invoice Item, Purchase Order Item and 1 more | manufacturing is not part of Capxul core |
| Blanket Order | Manufacturing | Purchase Order Item, Quotation Item, Sales Order Item | manufacturing is not part of Capxul core |
| Production Plan | Manufacturing | Purchase Order Item | manufacturing is not part of Capxul core |
| Project Template | Projects | Project | not needed beyond project, task and timesheet |
| Project Type | Projects | Project | not needed beyond project, task and timesheet |
| Task Type | Projects | Task | not needed beyond project, task and timesheet |
| Batch | Stock | Asset Capitalization, Asset Capitalization Stock Item, Item Price and 5 more | stock, left out by the goal's reading (above); a stock piece can be added later |
| Customs Tariff Number | Stock | Item | stock, left out by the goal's reading (above); a stock piece can be added later |
| Delivery Note | Stock | POS Invoice Item, Sales Invoice Item | stock, left out by the goal's reading (above); a stock piece can be added later |
| Delivery Trip | Stock | Expense Claim | stock, left out by the goal's reading (above); a stock piece can be added later |
| Item Attribute | Stock | Item Variant Attribute | stock, left out by the goal's reading (above); a stock piece can be added later |
| Manufacturer | Stock | Item, Purchase Invoice Item, Purchase Order Item and 1 more | stock, left out by the goal's reading (above); a stock piece can be added later |
| Material Request | Stock | Purchase Invoice Item, Purchase Order Item, Request for Quotation Item and 2 more | stock, left out by the goal's reading (above); a stock piece can be added later |
| Purchase Receipt | Stock | Asset, Purchase Invoice Item | stock, left out by the goal's reading (above); a stock piece can be added later |
| Quality Inspection | Stock | POS Invoice Item, Purchase Invoice Item, Sales Invoice Item | stock, left out by the goal's reading (above); a stock piece can be added later |
| Quality Inspection Template | Stock | Item | stock, left out by the goal's reading (above); a stock piece can be added later |
| Serial and Batch Bundle | Stock | Asset Capitalization Stock Item, Asset Repair Consumed Item, Installation Note Item and 4 more | stock, left out by the goal's reading (above); a stock piece can be added later |
| Stock Entry | Stock | Journal Entry | stock, left out by the goal's reading (above); a stock piece can be added later |
| Warehouse | Stock | Asset Capitalization Stock Item, Asset Repair Consumed Item, Company and 21 more | stock, left out by the goal's reading (above); a stock piece can be added later |
| Issue | Support | Task | not part of Capxul core |

### The rest of ERPNext, by module

| ERPNext module | Record types | Why not |
|---|---|---|
| Bulk Transaction | 2 | not part of Capxul core |
| CRM | 21 | ERPNext's own CRM; Frappe CRM replaces it in slice 11 |
| Communication | 2 | not part of Capxul core |
| EDI | 2 | not part of Capxul core |
| ERPNext Integrations | 1 | not part of Capxul core |
| Maintenance | 5 | not part of Capxul core |
| Manufacturing | 37 | manufacturing is not part of Capxul core |
| Portal | 5 | not part of Capxul core |
| Projects | 4 | not needed beyond project, task and timesheet |
| Quality Management | 16 | not part of Capxul core |
| Regional | 5 | country-specific records; a country's rules come with the company that needs them |
| Stock | 45 | stock, left out by the goal's reading (above); a stock piece can be added later |
| Subcontracting | 8 | manufacturing is not part of Capxul core |
| Support | 10 | not part of Capxul core |
| Telephony | 5 | not part of Capxul core |
| Utilities | 4 | not part of Capxul core |

## Frappe's own record types

Record types Capxul's taken doctypes link to that come from the Frappe framework, not from ERPNext, HRMS or the CRM.
Orthograph replaces Frappe, so each maps to something Orthograph already has, or to a Capxul thing.

| Frappe doctype | Linked from | Becomes |
|---|---|---|
| Address | CRM Organization, Customer, Driver and 12 more | Capxul's own thing, in Frappe's shape |
| Auto Repeat | Journal Entry, POS Invoice, Payment Entry and 6 more | Orthograph's timers and workflows |
| Comment | CRM Notification | a CRM note: a Capxul thing in slice 11 |
| Contact | CRM Contacts, CRM Deal, Company and 13 more | Capxul's own thing, in Frappe's shape |
| Country | Company, Global Defaults, Item and 5 more | a value |
| Currency | Account, Account Closing Balance, Additional Salary and 63 more | an asset in Orthograph's money (M6-money) |
| DocType | Accounting Dimension, Accounting Dimension Detail, Additional Salary and 54 more | not taken: Frappe's own metadata; a dynamic link becomes 'Blueprint.refAny()' (spike #710) |
| Email Account | Buying Settings, HR Settings, Payroll Settings and 1 more | Orthograph's outbox |
| Email Template | HR Settings, Payroll Settings, Request for Quotation | Orthograph's outbox |
| Gender | CRM Contacts, CRM Deal, CRM Lead and 2 more | a value |
| Language | Customer, Dunning, Dunning Letter Text and 1 more | a value |
| Letter Head | Company, Dunning, Job Offer and 15 more | Orthograph's screens |
| Payment Gateway | Payment Gateway Account | not taken: payments settle on the chain |
| Print Format | POS Profile | Orthograph's screens |
| RQ Job | Repost Accounting Ledger | not taken: Frappe's job queue |
| Role | Accounts Settings, Authorization Rule, Buying Settings and 5 more | Orthograph roles (who may act) |
| Salutation | CRM Deal, CRM Lead, Customer and 1 more | a value |
| User | Asset Activity, Asset Maintenance Task, Asset Maintenance Team and 40 more | Orthograph's sign-in and people |
| Web Form | HR Settings | Orthograph's screens |
