# CX-payroll-tax: payroll's tax is a module per jurisdiction, the United States first

**Decided 26 November 2026.** Aaron's call, by voice, to Goal 16's lead, and the lead's reading of it under the standing
authority in `AGENTS.md`. It settles what slice 9 left open: how India's tax-exemption shapes are generalised
(`design/goals/16-capxul.md`, slice 9; `examples/capxul/doctypes.md`, Payroll). As in CX-grill, **Aaron's call** is what
he said and **the goal's reading** is how the lead applies it. His word overrides any reading.

## Aaron's call

Heard through speech to text and kept as heard: "As far as tax goes, obviously not India ... we need to target different
jurisdictions as well, right? So we want to target USA, obviously number one, Europe, UK, and UAE, Middle East type
things. But mainly the main one is obviously the state side." And: "Ideally, it would be great if we could do it in this
workflow."

So: not India; the United States first and mainly; then Europe, the UK and the UAE. (Superseded by CX-payroll-tax, "Narrowed the same day", 26 November 2026: the United States only.)

## The goal's reading

1. **Payroll's core holds no tax rule.** Salary components and structures, their assignment, payroll periods, pay runs,
   payslips and the journal each run posts are jurisdiction-free. A payslip's tax lines come from the jurisdiction
   module for the employee's place of work.
2. **Each jurisdiction is its own module**, a plugin under `examples/capxul/plugins/`, so a new country is a new
   plugin, not a change to core. Slice 9 mounts the United States module when the app is made; mounting a module into
   a Capxul that already holds data waits on slice 11, which proves it (K43, section 2). (Superseded by CX-composable-pieces, 26 November 2026:
   adding a module to a deployed Capxul is a rebuild with a forward migration, gap 5.)
3. **Rates are dated data, never code.** Brackets, rates, wage bases, thresholds and allowances are rows with the
   period they apply to and the official publication they are read from. ERPNext's Income Tax Slab is the shape they
   generalise. A new tax year is new rows.
4. **The order.** The United States first, as Aaron said; the order inside it and after it is the lead's (Superseded by CX-payroll-tax, "Narrowed the same day", 26 November 2026: nothing after it is scheduled):
   1. Federal: income tax withholding by the IRS's percentage method (Publication 15-T), Social Security and
      Medicare, the additional Medicare tax, and federal unemployment tax (FUTA), with the employee's withholding
      certificate (Form W-4) as a thing.
   2. The states, one module each. Every state module carries state unemployment insurance (SUTA), which every state
      levies on wages and on which FUTA's credit depends, and any other wage contribution the state levies (such as
      paid family leave). The states without a state income tax come first, then California and New York, then the
      rest.
   3. Then the United Kingdom (PAYE and National Insurance), the United Arab Emirates (no personal income tax; the
      pension contribution for nationals) and Europe, one country at a time. These are not in dollars, so their modules
      wait on Aaron's call on a company's own currency, which CX-grill section 3 deferred on 24 November 2026. (Superseded by CX-payroll-tax, "Narrowed the same day", 26 November 2026: the United States only, in dollars.)
5. **Journeys come from the publications' own worked examples.** Each jurisdiction's checks are written first by an
   author, from the official tables and examples, and a builder makes them green, as every Capxul slice does.
6. **Not now:** filing returns and year-end forms (940, 941, W-2 and the states' own), tax deposits, payment files
   (the UAE's wage protection system's salary file among them), local taxes below the state, and reciprocity between
   states. Each comes later as its own slice.
7. **No outside payroll-tax provider for now.** "In this workflow" is read as the calculation being Capxul's own, built
   here, and free, as K43 says the software is. Using a provider would be a new outside dependency, so Aaron's call. (Superseded by CX-payroll-tax, "Filing and paying", 26 November 2026: this holds for the calculation; filing and paying go through an outside service.)
8. **A payroll professional reviews each jurisdiction's numbers before real wages are paid with it.** Journeys prove the
   translation of a publication, not that it was read the way a regulator reads it. Who reviews, and when, is Aaron's
   call: it is production, and likely money.

## Narrowed the same day: the United States only, in dollars

**Aaron's call, 26 November 2026,** in reply to the lead's "Currency. The UK, UAE and Europe payroll modules need pounds,
dirhams and euros, so your dollars-only call would need reopening. Not needed until US payroll is done.": "keep usa and
usd".

**The goal's reading:** Capxul's payroll is built for the United States alone, in USDC, the one dollar asset of CX-grill
section 3. The UK, UAE and European modules in point 4.3 are not scheduled, and a company's own currency stays deferred.
The shape is unchanged (point 2: a module per jurisdiction), so another country can be added later as a plugin without
touching core, once Aaron reopens it.

## Filing and paying: an outside service, later

**Aaron's call, 26 November 2026,** in reply to the lead's "Tax filing. Do you agree we calculate tax ourselves, and use
an outside payroll-tax service later for filing and paying the authorities?" and, in the same list, "a payroll
professional to check numbers before real wages": "agreed on all".

**The goal's reading:** point 7 stands for the calculation, which is Capxul's own and free. Filing returns and
depositing tax (point 6's "not now") go through an outside payroll-tax service, reached through an adapter like
Bridge's, once a real company runs payroll. Which service is chosen then. Point 8 stands as Aaron agreed it; who
reviews, and when, is still his.

## What this changes in the catalogue

India's four income-tax exemption record types (Category, Sub Category, Declaration, Proof Submission) and the two lines
of the Declaration and the Proof Submission, six rows in all, are not generalised. They stay listed and are not taken
until a jurisdiction needs that shape. For the United States, the withholding certificate (Form W-4) takes the
Declaration's place.

## Supersedes

- `design/goals/16-capxul.md`: "India's tax-exemption shapes generalised" → "tax from a module per jurisdiction, the United States first (CX-payroll-tax)"
- `design/goals/16-capxul.md`: "tax from a module per jurisdiction, the United States first (CX-payroll-tax)" → "tax from a module per jurisdiction, the United States only, in dollars (CX-payroll-tax)"
- `examples/capxul/doctypes.md`: "India's income-tax exemption shape; slice 9 decides how to generalise it" → "India's income-tax exemption shape: not taken until a jurisdiction needs it (CX-payroll-tax)"
