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
