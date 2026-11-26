# CX-payroll-tax: payroll's tax is a module per jurisdiction, the United States first

**Decided 26 November 2026** by Aaron, by voice, with Goal 16's lead. It settles what slice 9 left open: how India's
tax-exemption shapes are generalised (`design/goals/16-capxul.md`, slice 9; `examples/capxul/doctypes.md`, Payroll).

## Aaron's call

Heard through speech to text and kept as heard: "As far as tax goes, obviously not India ... we need to target different
jurisdictions as well, right? So we want to target USA, obviously number one, Europe, UK, and UAE, Middle East type
things. But mainly the main one is obviously the state side." And: "Ideally, it would be great if we could do it in this
workflow."

## The decision

1. **Payroll's core holds no tax rule.** Salary components and structures, their assignment, payroll periods, pay runs,
   payslips and the journal each run posts are jurisdiction-free. A payslip's tax lines come from the jurisdiction
   module mounted for the employee's place of work.
2. **Each jurisdiction is its own module**, a plugin under `examples/capxul/plugins/`, so a company mounts the ones it
   needs and a new country is a new plugin, not a change to core.
3. **Rates are dated data, never code.** Brackets, rates, wage bases, thresholds and allowances are rows with the
   period they apply to and the official publication they are read from. ERPNext's Income Tax Slab is the shape they
   generalise. A new tax year is new rows.
4. **The order:**
   1. The United States, federal: income tax withholding by the IRS's percentage method (Publication 15-T), Social
      Security and Medicare, the additional Medicare tax, and federal unemployment tax (FUTA), with the employee's
      withholding certificate (Form W-4) as a thing.
   2. The states without a tax on wages, then California and New York, then the other states, one module each.
   3. The United Kingdom (PAYE and National Insurance), the United Arab Emirates (no personal income tax; the pension
      contribution for nationals and the wage protection system's salary file), then Europe, one country at a time.
5. **Journeys come from the publications' own worked examples.** Each jurisdiction's checks are written first by an
   author, from the official tables and examples, and a builder makes them green, as every Capxul slice does.
6. **Not now:** filing returns and year-end forms (941, W-2 and the states' own), tax deposits, local taxes below the
   state, and reciprocity between states. Each comes later as its own slice.
7. **No outside payroll-tax provider.** The calculation is Capxul's own and free, as K43 says the software is. Using a
   provider would be a new outside dependency, so Aaron's call.
8. **A payroll professional reviews each jurisdiction's numbers before real wages are paid with it.** Journeys prove the
   translation of a publication, not that the publication was read the way a regulator reads it.

## What this changes in the catalogue

India's four income-tax exemption record types (Category, Sub Category, Declaration, Proof Submission) are not
generalised. They stay listed and are not taken until a jurisdiction needs that shape. The US withholding certificate
takes the declaration's place for the United States.

## Supersedes

- `design/goals/16-capxul.md`: "India's tax-exemption shapes generalised" → "tax from a module per jurisdiction, the United States first (CX-payroll-tax)"
- `examples/capxul/doctypes.md`: "India's income-tax exemption shape; slice 9 decides how to generalise it" → "India's income-tax exemption shape: not taken until a jurisdiction needs it (CX-payroll-tax)"
