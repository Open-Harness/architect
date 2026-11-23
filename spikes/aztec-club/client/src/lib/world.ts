// Spike helpers: one wallet (own PXE) per person, an in-process network, a prove step split from the send step.
// Secrets live in memory only (ephemeral stores); nothing here prints or writes a key.
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { EmbeddedWallet } from "@aztec/wallets/embedded";
import type { AztecAddress } from "@aztec/aztec.js/addresses";
import type { ExecutionPayload } from "@aztec/stdlib/tx";

/** Exposes the SDK's protected prove seam, as the earlier Aztec spikes did. */
export class Device extends EmbeddedWallet {
  get engine() { return this.pxe; }
  async prove(payload: ExecutionPayload, from: AztecAddress, club: AztecAddress) {
    const fee = await this.completeFeeOptions({ from, feePayer: payload.feePayer });
    const request = await this.createTxExecutionRequestFromPayloadAndFee(payload, from, fee);
    return this.pxe.proveTx(request, { scopes: this.scopesFrom(from, [club], club), senderForTags: club });
  }
}

export interface Person { readonly name: string; readonly wallet: Device; readonly address: AztecAddress; }

export const now = () => performance.now();
export const root = resolve(import.meta.dirname, "../../..");
export const save = (name: string, value: unknown) =>
  writeFileSync(resolve(root, "evidence", name), JSON.stringify(value, (_, v: unknown) => (typeof v === "bigint" ? v.toString() : v), 2) + "\n");
