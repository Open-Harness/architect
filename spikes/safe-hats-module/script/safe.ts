import assert from "node:assert/strict"
import {
  concatHex, decodeEventLog, encodeFunctionData, hashTypedData, isAddressEqual, parseAbi, zeroAddress,
  type Address, type Hex,
} from "viem"
import type { PrivateKeyAccount } from "viem/accounts"
import { artifact, type Call, type Chain } from "./chain.ts"

export const safeAbi = () => artifact("Safe.sol/Safe").abi
const factoryAbi = () => artifact("SafeProxyFactory.sol/SafeProxyFactory").abi
export const handlerAbi = () => artifact("CompatibilityFallbackHandler.sol/CompatibilityFallbackHandler").abi

export async function deploySafeRelease(chain: Chain, deployer: PrivateKeyAccount) {
  const singleton = await chain.deploy(deployer, "Safe.sol/Safe")
  const factory = await chain.deploy(deployer, "SafeProxyFactory.sol/SafeProxyFactory")
  const handler = await chain.deploy(deployer, "CompatibilityFallbackHandler.sol/CompatibilityFallbackHandler")
  return { singleton, factory, handler }
}

export async function createSafe(
  chain: Chain, deployer: PrivateKeyAccount, release: Awaited<ReturnType<typeof deploySafeRelease>>,
  owners: Address[], threshold: bigint, salt: bigint,
) {
  const initializer = encodeFunctionData({
    abi: safeAbi(), functionName: "setup",
    args: [owners, threshold, zeroAddress, "0x", release.handler, zeroAddress, 0n, zeroAddress],
  })
  const mined = await chain.write(deployer, {
    address: release.factory, abi: factoryAbi(), functionName: "createProxyWithNonce",
    args: [release.singleton, initializer, salt],
  }, `create ${threshold}-of-${owners.length} Safe`)
  const log = mined.logs.find((event) => isAddressEqual(event.address, release.factory))
  assert(log, "ProxyCreation log missing")
  const decoded = decodeEventLog({
    abi: parseAbi(["event ProxyCreation(address indexed proxy, address singleton)"]),
    data: log.data, topics: log.topics,
  })
  const { proxy, singleton } = decoded.args
  assert(isAddressEqual(singleton, release.singleton))
  assert.equal(await chain.read({ address: proxy, abi: safeAbi(), functionName: "VERSION" }), "1.5.0")
  assert.equal(await chain.read({ address: proxy, abi: safeAbi(), functionName: "getThreshold" }), threshold)
  console.log(`Safe proxy=${proxy}`)
  return proxy
}

export const safeTxTypes = {
  SafeTx: [
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "data", type: "bytes" },
    { name: "operation", type: "uint8" },
    { name: "safeTxGas", type: "uint256" },
    { name: "baseGas", type: "uint256" },
    { name: "gasPrice", type: "uint256" },
    { name: "gasToken", type: "address" },
    { name: "refundReceiver", type: "address" },
    { name: "nonce", type: "uint256" },
  ],
} as const

export async function safeTx(chain: Chain, safe: Address, to: Address, data: Hex, value = 0n) {
  const nonce = await chain.read({ address: safe, abi: safeAbi(), functionName: "nonce" }) as bigint
  const message = {
    to, value, data, operation: 0, safeTxGas: 0n, baseGas: 0n, gasPrice: 0n,
    gasToken: zeroAddress, refundReceiver: zeroAddress, nonce,
  } as const
  const domain = { chainId: await chain.publicClient.getChainId(), verifyingContract: safe }
  const typed = { domain, types: safeTxTypes, primaryType: "SafeTx", message } as const
  const args = [
    to, value, data, message.operation, message.safeTxGas, message.baseGas, message.gasPrice,
    message.gasToken, message.refundReceiver,
  ] as const
  const hash = hashTypedData(typed)
  assert.equal(hash, await chain.read({
    address: safe, abi: safeAbi(), functionName: "getTransactionHash", args: [...args, nonce],
  }))
  const call = (signatures: Hex): Call => ({
    address: safe, abi: safeAbi(), functionName: "execTransaction", args: [...args, signatures],
  })
  return { typed, hash, call }
}

export type OwnerSignature = { owner: Address; bytes: Hex }

export function packSignatures(signatures: readonly OwnerSignature[]) {
  return concatHex([...signatures]
    .sort((a, b) => a.owner.toLowerCase().localeCompare(b.owner.toLowerCase()))
    .map(({ bytes }) => bytes))
}

export async function ownerSignatures(
  typed: Parameters<PrivateKeyAccount["signTypedData"]>[0], owners: PrivateKeyAccount[],
) {
  return Promise.all(owners.map(async (owner) => ({ owner: owner.address, bytes: await owner.signTypedData(typed) })))
}

export async function execute(
  chain: Chain, relayer: PrivateKeyAccount, safe: Address, owners: PrivateKeyAccount[],
  target: Call, label: string,
) {
  const tx = await safeTx(chain, safe, target.address, encodeFunctionData(target))
  const signatures = packSignatures(await ownerSignatures(tx.typed, owners))
  const receipt = await chain.write(relayer, tx.call(signatures), label)
  assert(receipt.logs.some((log) => {
    if (!isAddressEqual(log.address, safe)) return false
    try {
      return decodeEventLog({ abi: safeAbi(), data: log.data, topics: log.topics }).eventName === "ExecutionSuccess"
    } catch {
      return false
    }
  }), "Expected Safe ExecutionSuccess")
  return { receipt, tx, signatures }
}

export async function enable(
  chain: Chain, relayer: PrivateKeyAccount, safe: Address, owners: PrivateKeyAccount[], module: Address,
) {
  const result = await execute(chain, relayer, safe, owners, {
    address: safe, abi: safeAbi(), functionName: "enableModule", args: [module],
  }, `enable module with ${owners.length} owner signatures`)
  assert.equal(await chain.read({
    address: safe, abi: safeAbi(), functionName: "isModuleEnabled", args: [module],
  }), true)
  return result
}

export async function wrapSafeMessage(chain: Chain, safe: Address, digest: Hex) {
  const typed = {
    domain: { chainId: await chain.publicClient.getChainId(), verifyingContract: safe },
    types: { SafeMessage: [{ name: "message", type: "bytes" }] },
    primaryType: "SafeMessage",
    message: { message: digest },
  } as const
  assert.equal(hashTypedData(typed), await chain.read({
    address: safe, abi: handlerAbi(), functionName: "getMessageHash", args: [digest],
  }))
  return typed
}
