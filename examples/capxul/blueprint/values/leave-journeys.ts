// Journey-author file: what the leave journeys share. A decimal goes in as an exact BigDecimal, and a decimal that comes
// back is compared as its normalized text, so "2.50" and "2.5" are the same number of days.
import { BigDecimal } from "effect";

/** A number of leave days, exact: `days("10.5")`. */
export const days = (text: string): BigDecimal.BigDecimal => BigDecimal.fromStringUnsafe(text);
/** A decimal as normalized text, or what it was when it is no decimal, so a wrong type shows in the failure. */
export const daysOf = (value: unknown): unknown =>
  BigDecimal.isBigDecimal(value) ? BigDecimal.format(BigDecimal.normalize(value)) : value;
