import { keccak256, stringToHex, type Hex } from "viem";
import type { AbiError, AbiParameter } from "../types.ts";

/** A parameter's canonical type: a tuple is its components in parentheses, keeping any array suffix (`tuple[2]` is `(...)[2]`). */
const canonicalType = (parameter: AbiParameter): string =>
  "components" in parameter && parameter.components !== undefined && parameter.type.startsWith("tuple")
    ? `(${parameter.components.map(canonicalType).join(",")})${parameter.type.slice("tuple".length)}`
    : parameter.type;

export const errorSignature = (item: AbiError): string => `${item.name}(${item.inputs.map(canonicalType).join(",")})`;

/** The first 4 bytes of the keccak-256 of the signature. */
export const selectorOf = (signature: string): Hex => keccak256(stringToHex(signature)).slice(0, 10) as Hex;
