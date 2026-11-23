import type { SignersApi } from "../types.ts";
import { locked } from "./keyed.ts";

export const absent: SignersApi["absent"] = (name, chain, why) => {
  const refuse = () => locked(`the ${name} signer is not here: ${why}`);
  return { name, chain, create: refuse, import: refuse, keys: refuse(), sign: refuse, send: refuse };
};
