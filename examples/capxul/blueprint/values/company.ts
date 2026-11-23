import { Blueprint } from "orthograph";
import { Schema } from "effect";

/** A company's or a person's name, as a person types it (ERPNext's `company_name`, `employee_name`). */
export const Name = Blueprint.value(Blueprint.text({ max: 140 }));
/** A company's short code, written before its accounts' and documents' names (ERPNext's `abbr`). */
export const Abbr = Blueprint.value(Blueprint.text({ max: 10 }));
/** A country, by its name in ERPNext's Country list. */
export const Country = Blueprint.value(Blueprint.text({ max: 60 }));
/**
 * A currency's ISO 4217 code (ERPNext's `default_currency`). Held as text until a company's currency is an asset in
 * Orthograph's money (`decisions/CX-grill.md`, section 3).
 */
export const CurrencyCode = Blueprint.value(Schema.String.check(Schema.isPattern(/^[A-Z]{3}$/)));
