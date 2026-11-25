import { Blueprint } from "orthograph";
import { Schema } from "effect";

/**
 * A page on Bridge's side that a person opens in a browser: the hosted KYC or KYB form (Bridge's `kyc_link`) or its
 * terms of service (`tos_link`). Bridge makes both when a verification starts (`POST /v0/kyc_links`).
 */
export const BridgeLink = Blueprint.value(Schema.String.check(Schema.isPattern(/^https:\/\/\S+$/)));
/** A name as a government document gives it: a business's registered name or a person's full name (Bridge's `full_name`). */
export const LegalName = Blueprint.value(Blueprint.text({ max: 140 }));
/** Why Bridge turned a check down, in its words (a `kyc_status` of `rejected` comes with `rejection_reasons`). */
export const RejectionReason = Blueprint.value(Blueprint.text({ max: 500 }));
/**
 * A currency a Bridge virtual account takes deposits in, written as an ISO 4217 code like a company's
 * `defaultCurrency`. Bridge's `EuroInclusiveFiatCurrency` also has `mxn`, `brl`, `cop` and `gbp`; each joins with the
 * check of its deposit details (journeys/README.md, "Bridge, part two").
 */
export const AccountCurrency = Blueprint.value(Schema.Literals(["USD", "EUR"]));
/** A detail of the bank deposit instructions Bridge gives for a virtual account: a bank's name, an account or routing number. */
export const DepositDetail = Blueprint.value(Blueprint.text({ max: 140 }));
/**
 * An id Bridge gives a movement of money: a deposit's `deposit_id` on a virtual account's activity, or a transfer's `id`.
 * Bridge's ids are its own (`tr_…`, uuids), so only their length is judged.
 */
export const BridgeRef = Blueprint.value(Blueprint.text({ max: 140 }));
/**
 * An amount as Bridge writes it: a decimal string in dollars, with at most six places (`"100.25"`, `"0.1"`,
 * `"1.234567"`). A virtual account's activity is "a dollar denominated string", and a transfer's amount is "in the fiat
 * currency to which the source currency is pegged" (Bridge's `VirtualAccountEvent.amount`, `TransferRequest.amount`),
 * so every amount Capxul and Bridge exchange is in dollars, which USDC holds one for one.
 */
export const Dollars = Blueprint.value(Blueprint.decimal({ places: 6 }));
/** Who is on the other side of a movement, as Bridge names them: a deposit's `source.sender_name`, or the external account a transfer pays. */
export const Party = Blueprint.value(Blueprint.text({ max: 140 }));
/** The final states Bridge gives a transfer that didn't reach its payee (Bridge's `TransferState`). */
export const TransferFailure = Blueprint.value(Schema.Literals(["canceled", "undeliverable", "returned", "refunded"]));
