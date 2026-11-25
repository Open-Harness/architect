// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// What makes deposit details a bank's own, for the bridge-* journeys to judge (#912). Not a journey: prove reads only the
// files directly in journeys/. The expected values come from the banking rules, never from what a handler answers.

/**
 * A US routing number (an ABA RTN): nine digits whose first two are a Federal Reserve routing symbol (01 to 12, 21 to
 * 32, 61 to 72, or 80), and whose digits weighted 3, 7, 1, 3, 7, 1, 3, 7, 1 sum to a multiple of ten. Lead Bank's
 * 101019644, the one Bridge's guides give, is one.
 */
export const isRoutingNumber = (rtn: unknown): boolean => {
  if (typeof rtn !== "string" || !/^\d{9}$/.test(rtn)) return false;
  const prefix = Number(rtn.slice(0, 2));
  const assigned = (prefix >= 1 && prefix <= 12) || (prefix >= 21 && prefix <= 32) || (prefix >= 61 && prefix <= 72) || prefix === 80;
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1];
  return assigned && [...rtn].reduce((sum, d, i) => sum + Number(d) * weights[i]!, 0) % 10 === 0;
};

/** Countries in SWIFT's IBAN registry, each with its IBAN's length: every SEPA country among them. A code not here, such as `XX`, is refused. */
const IBAN_LENGTHS: Readonly<Record<string, number>> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29, BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24,
  DE: 22, DK: 18, DO: 28, EE: 20, EG: 29, ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28,
  HR: 21, HU: 28, IE: 22, IL: 23, IQ: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28, LC: 32, LI: 21, LT: 20, LU: 20,
  LV: 21, MC: 27, MD: 24, ME: 22, MK: 19, MR: 27, MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29,
  RO: 24, RS: 22, SA: 24, SC: 31, SE: 24, SI: 19, SK: 24, SM: 27, ST: 25, SV: 28, TL: 23, TN: 24, TR: 26, UA: 29, VA: 22,
  VG: 24, XK: 20,
};

/**
 * An IBAN (ISO 13616): a registry country, that country's length, two check digits, then capitals and digits, and the
 * whole passes mod 97 (the first four characters moved to the end, each letter as 10 to 35, leaving 1). Bridge's guide's
 * IE90MODR14035307970528 is not (it leaves 57); Modulr's same account with true check digits, IE34MODR14035307970528, is.
 */
export const isIban = (iban: unknown): boolean => {
  // Check digits 00, 01 and 99 are never issued, though 01 and 99 can pass mod 97.
  if (typeof iban !== "string" || !/^[A-Z]{2}(0[2-9]|[1-8]\d|9[0-8])[A-Z0-9]+$/.test(iban)) return false;
  if (IBAN_LENGTHS[iban.slice(0, 2)] !== iban.length) return false;
  const digits = [...`${iban.slice(4)}${iban.slice(0, 4)}`].map((c) => (/\d/.test(c) ? c : String(c.charCodeAt(0) - 55))).join("");
  return BigInt(digits) % 97n === 1n;
};

/** A BIC (ISO 9362) of a bank in the IBAN's own country: four letters, the country, two more, and an optional branch of three. */
export const isBicFor = (bic: unknown, iban: unknown): boolean =>
  typeof bic === "string" && typeof iban === "string" && /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic) && bic.slice(4, 6) === iban.slice(0, 2);

/** A US account number as Bridge gives one: four to seventeen digits. */
export const isUsAccountNumber = (n: unknown): boolean => typeof n === "string" && /^\d{4,17}$/.test(n);
