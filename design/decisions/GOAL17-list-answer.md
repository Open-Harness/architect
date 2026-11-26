# GOAL17-list-answer: a derived list read still answers `{ items, next }`; its added fields are in `derive.adds`

Decided 23 November 2026 by Goal 17's lead, during slice 5's build, on the builder's finding.

## The problem

Check 16 (#648) asks `ticket.waiting`'s model `answer` for top-level `stage`, `why` and `label`. A list read's answer
today is a page, `{ items, next }`: the work example's `attention.list` has `answer: { items, next }` in
`examples/work/generated/model/model.json`. Answering the check by reshaping every list's `answer` would change the
model of every existing list read. That breaks check 17 (byte for byte), and the generators that read it would have to
change too.

## The call

- **A list read's `answer` stays `{ items, next }`,** derived or not. GOAL17-derived-reads changes what an item holds,
  never the page.
- **What a derived read adds to each row is `derive.adds`,** the key the README contract already fixes (`derive: { looks,
  adds, hash }`). For `ticket.waiting` it holds `stage`, `why` and `label`, the same as `ticket.stage`'s.
- **Check 16 changes, by its author:** `ticket.waiting`'s `answer` keys are `["items", "next"]`, and its `derive.adds`
  keys include `stage`, `why` and `label`.

## Evidence

- `examples/work/generated/model/model.json`, `operations["attention.list"].answer`: `{ "items": …, "next": … }`.
- `e2e/superagent/README.md`, the contract: "an operation's `derive`: `{ looks, adds, hash }`".
