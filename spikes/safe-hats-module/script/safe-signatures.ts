import assert from "node:assert/strict"
import { concatHex, hexToNumber, numberToHex, padHex, size, slice, type Address, type Hex } from "viem"
import type { Chain } from "./chain.ts"
import type { proveGoal4 } from "./goal4.ts"
import { createSafe, ownerSignatures, packSignatures, safeAbi, safeTx, wrapSafeMessage } from "./safe.ts"

type World = Awaited<ReturnType<typeof proveGoal4>>
const signatureLength = 65
const v = (signature: Hex) => hexToNumber(slice(signature, signatureLength - 1, signatureLength))
const withV = (signature: Hex, value: number) =>
  concatHex([slice(signature, 0, signatureLength - 1), numberToHex(value, { size: 1 })])

export async function proveSafeSignatures(chain: Chain, world: World, safe: Address) {
  const { release, deployer, owners, ownerAddresses, recipient } = world
  const initial = await chain.publicClient.getBalance({ address: recipient.address })
  const nextTx = (from = safe) => safeTx(chain, from, recipient.address, "0x", 1n)

  const typedTx = await nextTx()
  const sorted = packSignatures(await ownerSignatures(typedTx.typed, owners))
  const first = slice(sorted, 0, signatureLength)
  const second = slice(sorted, signatureLength)
  const orderedOwners = owners.map(({ address }) => address.toLowerCase()).sort()
  console.log(`SafeTx domain chainId=${typedTx.typed.domain.chainId} verifyingContract=${safe}`)
  console.log(`SafeTx nonce=${typedTx.typed.message.nonce} digest=${typedTx.hash} owners=${orderedOwners.join(",")} v=${v(first)},${v(second)}`)
  assert([v(first), v(second)].every((value) => value === 27 || value === 28))
  const refuse = async (label: string, signatures: Hex) => {
    const refusal = await chain.refuse(deployer, typedTx.call(signatures), "Error", "GS026")
    console.log(`SafeTx ${label} refused ${refusal.args} tx=${refusal.hash}`)
  }
  await refuse("wrong order", concatHex([second, first]))
  await refuse("wrong v=2", concatHex([withV(first, 2), second]))
  assert.equal((await nextTx()).typed.message.nonce, typedTx.typed.message.nonce)
  await chain.write(deployer, typedTx.call(sorted), "SafeTx typed-data ECDSA")
  const prefixedTx = await nextTx()
  assert.equal(prefixedTx.typed.message.nonce, typedTx.typed.message.nonce + 1n)
  await refuse("replayed nonce", sorted)

  const prefixed = packSignatures(await Promise.all(owners.map(async (owner) => {
    const signature = await owner.signMessage({ message: { raw: prefixedTx.hash } })
    return { owner: owner.address, bytes: withV(signature, v(signature) + 4) }
  })))
  const prefixedValues = [v(slice(prefixed, 0, signatureLength)), v(slice(prefixed, signatureLength))]
  assert(prefixedValues.every((value) => value === 31 || value === 32))
  await chain.write(deployer, prefixedTx.call(prefixed), `SafeTx EIP-191 byte digest v=${prefixedValues.join(",")}`)

  const approvalTx = await nextTx()
  const [approver, cosigner] = owners
  await chain.write(approver, {
    address: safe, abi: safeAbi(), functionName: "approveHash", args: [approvalTx.hash],
  }, "SafeTx approveHash")
  const approvedHeader = concatHex([padHex(approver.address, { size: 32 }), numberToHex(0, { size: 32 }), "0x01"])
  const approved = packSignatures([
    { owner: approver.address, bytes: approvedHeader },
    ...await ownerSignatures(approvalTx.typed, [cosigner]),
  ])
  await chain.write(deployer, approvalTx.call(approved), "SafeTx approved hash v=1 from non-owner relayer")

  const outer = await createSafe(chain, deployer, release, [safe, ownerAddresses[0], ownerAddresses[2]], 2n, 4n)
  await chain.send(deployer, { to: outer, value: 1n }, "fund Safe with contract owner")
  const contractTx = await nextTx(outer)
  const wrapped = await wrapSafeMessage(chain, safe, contractTx.hash)
  const contractBytes = packSignatures(await ownerSignatures(wrapped, owners))
  const offset = 2 * signatureLength
  const header = concatHex([padHex(safe, { size: 32 }), numberToHex(offset, { size: 32 }), "0x00"])
  const staticPart = packSignatures([
    { owner: safe, bytes: header },
    ...await ownerSignatures(contractTx.typed, [approver]),
  ])
  assert.equal(size(staticPart), offset)
  const packed = concatHex([staticPart, numberToHex(size(contractBytes), { size: 32 }), contractBytes])
  await chain.write(deployer, contractTx.call(packed),
    `SafeTx ERC-1271 owner v=0 offset=${offset} payloadBytes=${size(contractBytes)}`)
  assert.equal(await chain.publicClient.getBalance({ address: recipient.address }), initial + 4n)
  console.log("SafeTx four payouts verified against recipient balance")
}
