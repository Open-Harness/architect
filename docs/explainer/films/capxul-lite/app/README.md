# Capxul Lite, as a design

A stripped-back Capxul, written as if all of Orthograph existed: each company has a contract of its own that is its
treasury, with budgets built into it, and a server that keeps each payment's reason and the books.

**Nothing here is compiled or run.** It is the text the two films and their docs page quote. Most of its syntax is real
or decided (`examples/budgets`, K20, K23, K25, M6-chain, M6-money). A line that ends `// new` is a proposal made by
this design, and is drawn with an amber edge wherever it is shown. `falls-out/` holds sketches of what would be
generated, and of what `ortho` would print. `design-only/` holds what is designed and not used here.

The design rests on two layers Aaron agreed on 26 November 2026 (`../board/board.html`):

- **Things last, operations are short.** A thing that waits says what it needs, and the framework asks. A grant is a
  proposal that needs its owners (`blueprint/things/proposal/`).
- **When the other half is only data, seal it.** A spend is one operation and one signature; its reason is kept by the
  server under a seal the chain carries (`blueprint/things/budget/verbs/spend.ts`).
