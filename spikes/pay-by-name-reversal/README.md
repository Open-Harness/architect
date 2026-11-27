# Spike: pay-by-name-reversal

**Question.** Can a late reversal be mirrored without a balance going below zero?
**Answer.** Not with the rules as the plan page has them. Once the holder has withdrawn, a late reversal breaks one of three rules, and the app only chooses which. A balance can be kept at zero or above if a new thing, a shortfall, carries the rest and two rules are reworded to count it.

The question is one of the doubts on the first page an agent drew for Plugged In's next stage, "pay by name"
(`docs/manual/captures/plan-page.txt`). Nobody has agreed that page: its owner has not answered its first question. An
agent ran this spike on 26 November 2026 for chapter 2 of the manual. It is small, and it is real.

## What was tried

- A ledger for one wallet in plain Node, `spike.mjs`, with no dependencies and no provider. It keeps the app's balance,
  the money still held, and the figure a provider would hold for the same wallet.
- Eight events: payment A of 50 arrives and clears, payment B of 30 arrives and clears, the holder withdraws 40 and
  then 30 (a withdrawal the balance cannot cover is refused), the provider reverses A, and that notice comes a second
  time.
- Every order of those events in which each comes after what it needs: 2,520 orders. A reversal is late when A had
  already cleared, which is 840 of them.
- Three ways to mirror a late reversal: take the money out of the balance at once; refuse to mirror it; take what is
  there and write the rest down as a shortfall, which freezes the wallet and is paid first by the next payment that
  clears.
- After every event, three rules from the page: a balance never goes below zero; a balance is exactly the settled
  payments in, minus the withdrawals and returns out; the app's balance and the money the provider really holds agree.

Run it with `node spikes/pay-by-name-reversal/spike.mjs`. It prints the same counts every time: nothing in it is
random or timed.

## What was found

1. **A reversal that comes before the payment clears is safe.** In all 1,680 such orders every rule is kept under
   every way. The held state on the page does its job, for as long as it lasts.
2. **Mirrored at once, the balance goes below zero in 225 of the 840 late orders.** The shortest: A clears, the holder
   withdraws 30, the provider reverses A, and the balance is -30.
3. **Refusing to mirror keeps the balance right and makes it untrue.** The app and the provider disagree in all 840
   late orders, from the reversal on, including the ones where the money was still there.
4. **A shortfall keeps the balance at zero or above in all 840,** and breaks the other two rules as they are written,
   in the same 225 orders. Both hold again in all 840 once the shortfall is counted in them.
5. **The negative number is real.** In 171 of the 225 the provider's own figure for the whole wallet is below zero,
   even counting money still held. No bookkeeping in the app removes it. The app chooses where it is written.
6. **The shortfall is somebody's money.** It reaches 40 at most here, and in 150 orders it is still owed when the
   events run out. Until the holder repays it, the app is out of pocket.
7. **A notice that comes twice changes nothing,** in any order, once the payment is marked returned.

## Measurements

| Orders played | Reversal before A clears | Late | Late, and the balance cannot cover it | Of those, provider's figure below zero |
|---:|---:|---:|---:|---:|
| 2,520 | 1,680 | 840 | 225 | 171 |

Two runs printed the same bytes. No timing was measured: the question is about orders, not speed.

## The decision it supports

None is made here, and a spike makes none. It gives the owner three things to decide with, before the blueprint is
written.

- The rule "a balance never goes below zero" cannot stand beside "a payment that has settled can still be reversed"
  unless something else carries the difference. Either settled is final, or the page gains a thing.
- If settled can be reversed, the page needs a shortfall on the wallet, with states of its own, and the two rules
  about the balance reworded to count it. It also needs a line under "Who may do what" saying who carries it.
- The first question on the page (is the money real, and who holds it) decides which of those it is. This spike is
  one more reason to answer it first.

## Open risks

- No provider was called. Whether a real one reverses a payment after it tells us the payment settled, and for how
  long afterwards, is not known. That is the other spike on the page.
- One wallet, one reversal, eight events. Two reversals, a reversal of a payment that already repaid a shortfall, and
  a withdrawal that is asked for and bounces were not played.
- Withdrawals here leave at once. On the page a withdrawal waits for the provider, and a reversal that lands while
  one is waiting was not played.
- A name that changes hands with a shortfall on its wallet was not played. The page says the money belongs to whoever
  held the name when it was sent, so the shortfall should too; nothing here tries it.
- A longer clearing time makes late reversals rarer and makes every holder wait. How long is long enough was not
  measured, because it depends on the provider.
