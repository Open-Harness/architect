import { SIGNER_NAMES, type SignerName } from "../../signer/types.ts";

/** Whether a payload's `signer` is one of the four a wallet declares. */
export const isSigner = (name: string): name is SignerName => (SIGNER_NAMES as ReadonlyArray<string>).includes(name);
