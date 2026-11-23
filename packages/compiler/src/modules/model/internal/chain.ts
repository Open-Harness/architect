// What a value is on a chain store (M6-chain item 2, K25 item 5): its Solidity type, and what a public chain can't hold.
import type { Value, Visibility } from "orthograph";
import type { ValueMeta } from "../types.ts";

/** A minted id is its prefix, `_` and 16 characters (`language-effect/src/modules/ids/service.ts`), which must fit `bytes32`. */
const MAX_PREFIX = 15;

const widthOk = (bits: number) => Number.isInteger(bits) && bits >= 8 && bits <= 256 && bits % 8 === 0;

/** The Solidity type of a value: `uint<bits>`, `int<bits>` for signed money, `bytes32` for an id, `string`, `address`; undefined for none. */
export const solidityOf = (meta: ValueMeta): string | undefined => {
  switch (meta.type) {
    case "uint": return widthOk(meta.bits) ? `uint${meta.bits}` : undefined;
    case "money": return widthOk(meta.bits) ? `${meta.signed ? "int" : "uint"}${meta.bits}` : undefined;
    case "id": return meta.prefix.length <= MAX_PREFIX ? "bytes32" : undefined;
    case "text": return "string";
    case "account": return "address";
    default: return undefined;
  }
};

/** Why a value has no Solidity type, or undefined when it has one. */
const noType = (meta: ValueMeta): string | undefined => {
  switch (meta.type) {
    case "uint": case "money": return widthOk(meta.bits) ? undefined : `a ${meta.type === "uint" ? "uint" : "money"} of ${meta.bits} bits is no Solidity width: uint and int are 8 to 256 bits, in steps of 8`;
    case "id": return meta.prefix.length <= MAX_PREFIX ? undefined : `the id prefix "${meta.prefix}" leaves no room to mint a suffix in 32 bytes (a minted id is the prefix, an underscore and 16 characters): use a prefix of at most ${MAX_PREFIX} characters`;
    case "schema": return "a schema value declares no Solidity type, so a contract can't hold it";
    default: return undefined;
  }
};

const seen = (v: Visibility): string | undefined =>
  v === "public" ? undefined : v === "secret" ? "is secret, and a public chain shows every field" : "is private to some roles, and a public chain shows every field";

/**
 * The Solidity type of a field of a chain-stored thing (its own, its events', its errors', its operations' payloads and
 * answers), or undefined with the problem found: an email, a secret or private field, and a value with no Solidity type.
 */
export const chainField = (value: Value, meta: ValueMeta, visibility: Visibility, where: string, problems: Array<string>): string | undefined => {
  const before = problems.length;
  if (value.format === "email") problems.push(`${where}: is an email address, which a public chain would show to everyone: keep it in a database store`);
  const hidden = seen(visibility);
  if (hidden) problems.push(`${where}: ${hidden}: keep it in a database store`);
  const why = noType(meta);
  if (why) problems.push(`${where}: ${why}`);
  if (meta.type === "money" && "currency" in meta.asset) {
    problems.push(`${where}: money of the currency ${meta.asset.currency}: a currency has no chain binding, so a chain store counts a token (a fixed token asset, or money.of a field holding one)`);
  }
  return problems.length > before ? undefined : solidityOf(meta);
};
