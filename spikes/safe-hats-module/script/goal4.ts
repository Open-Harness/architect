import assert from "node:assert/strict"
import { decodeEventLog, encodeFunctionData, hashTypedData, isAddressEqual, parseAbi, toFunctionSelector, type Address } from "viem"
import { foundry } from "viem/chains"
import { artifact, type Call, type Chain } from "./chain.ts"
import { budgetSpendData } from "./budget-data.ts"
import { createSafe, deploySafeRelease, enable, execute, handlerAbi, ownerSignatures,
  packSignatures, safeTx, wrapSafeMessage } from "./safe.ts"

export async function proveGoal4(chain: Chain) {
  const deployer = await chain.account()
  const owner1 = await chain.account()
  const owner2 = await chain.account()
  const owner3 = await chain.account()
  const recipient = await chain.account()
  const owners = [owner1, owner2]
  console.log(`A1 Safe 1.5.0 on chain ${foundry.id}`)
  const release = await deploySafeRelease(chain, deployer)
  const single = await createSafe(chain, deployer, release, [owner1.address], 1n, 1n)
  const ownerAddresses = [...owners, owner3].map((o) => o.address)
  const safe = await createSafe(chain, deployer, release, ownerAddresses, 2n, 2n)
  const token = await chain.deploy(deployer, "SafeFixtures.sol/TestToken")
  const probeAbi = artifact("SafeFixtures.sol/SafeRouteProbe").abi
  const tokenAbi = artifact("SafeFixtures.sol/TestToken").abi
  const probe = await chain.deploy(deployer, "SafeFixtures.sol/SafeRouteProbe", [safe, token])
  await enable(chain, deployer, single, [owner1], probe)
  await enable(chain, deployer, safe, owners, probe)
  console.log("A2 both enablements verified by reading isModuleEnabled")

  const balance = (address: Address) => chain.read({
    address: token, abi: tokenAbi, functionName: "balanceOf", args: [address],
  })
  await chain.write(deployer, { address: token, abi: tokenAbi, functionName: "mint", args: [safe, 100n] }, "fund Safe")
  const to = recipient.address
  const direct = (address: Address, nonce: bigint): Call => ({
    address, abi: probeAbi, functionName: "spend", args: [safe, 0n, to, 10n, nonce],
  })
  const probeCall = async (address: Address, asset: string, expected: boolean) => {
    const { receipt } = await execute(chain, deployer, safe, owners, {
      address, abi: probeAbi, functionName: "probeCall", args: [to, 1n],
    }, `A3 execTransactionFromModule ${asset}`)
    const log = receipt.logs.find((event) => isAddressEqual(event.address, address))
    assert(log)
    const result = decodeEventLog({ abi: parseAbi(["event CallResult(bool success)"]), data: log.data, topics: log.topics })
    assert.equal(result.args.success, expected)
    console.log(`A3 Safe returned ${result.args.success} for ${asset}`)
  }
  await probeCall(probe, "ERC-20", true)
  assert.equal(await balance(to), 1n)
  assert.equal(await balance(safe), 99n)
  await execute(chain, deployer, safe, owners, direct(probe, 0n), "A3 ERC-20 transfer with return data")
  assert.equal(await balance(to), 11n)
  assert.equal(await balance(safe), 89n)

  const failures = [
    { asset: "FalseToken", error: "TokenRejectedTransfer", args: [] },
    { asset: "RevertingToken", error: "PaymentReverted", args: [toFunctionSelector("TransferRefused()")] },
  ] as const
  for (const failure of failures) {
    const badToken = await chain.deploy(deployer, `SafeFixtures.sol/${failure.asset}`)
    const badProbe = await chain.deploy(deployer, "SafeFixtures.sol/SafeRouteProbe", [safe, badToken])
    await enable(chain, deployer, safe, owners, badProbe)
    await probeCall(badProbe, failure.asset, failure.asset === "FalseToken")
    const tx = await safeTx(chain, safe, badProbe, encodeFunctionData(direct(badProbe, 0n)))
    const call = tx.call(packSignatures(await ownerSignatures(tx.typed, owners)))
    const refused = await chain.refuse(deployer, { ...call, abi: [...call.abi, ...probeAbi.filter((entry) => entry.type === "error")] }, failure.error, failure.args)
    console.log(`A3 ${failure.asset} refused ${refused.name}(${failure.args.join(",")}) tx=${refused.hash}`)
    assert.equal(await chain.read({ address: badProbe, abi: probeAbi, functionName: "nonces", args: [safe] }), 0n)
  }

  const deadline = (await chain.publicClient.getBlock()).timestamp + 300n
  const typed = budgetSpendData(foundry.id, probe, { safe, hatId: 0n, to, amount: 10n, signer: safe, nonce: 1n, deadline })
  const digest = hashTypedData(typed)
  const wrapping = await wrapSafeMessage(chain, safe, digest)
  const signature = packSignatures(await ownerSignatures(wrapping, owners))
  const valid = await chain.read({
    address: safe, abi: handlerAbi(), functionName: "isValidSignature", args: [digest, signature],
  })
  assert.equal(valid, "0x1626ba7e")
  console.log(`A4 digest=${digest} safeMessageHash=${hashTypedData(wrapping)} ERC1271=${valid}`)
  const bySig = (bytes: typeof signature): Call => ({
    address: probe, abi: probeAbi, functionName: "spendBySig", args: [safe, 0n, to, 10n, safe, 1n, deadline, bytes],
  })
  const tampered = `0x${signature.slice(2, 130)}02${signature.slice(132)}` as const
  const refused = await chain.refuse(deployer, bySig(tampered), "BadSignature", [])
  console.log(`A4 tampered signature refused ${refused.name} tx=${refused.hash}`)
  const sigReceipt = await chain.write(deployer, bySig(signature), "A4 SignatureChecker accepted two Safe owner signatures")
  assert.equal(await balance(to), 21n)
  assert.equal(await balance(safe), 79n)

  // The third owner can relay, but this unrelated account proves ownership is unnecessary.
  assert(![owner1.address, owner2.address, owner3.address].includes(deployer.address))
  const { receipt } = await execute(chain, deployer, safe, owners, direct(probe, 2n), "A5 direct call through Safe")
  const mined = await chain.publicClient.getTransaction({ hash: receipt.transactionHash })
  assert(isAddressEqual(mined.from, deployer.address))
  assert.equal(await balance(to), 31n)
  assert.equal(await balance(safe), 69n)
  console.log(`A5 non-owner relayer=${mined.from}; signed=${sigReceipt.gasUsed} gas; direct=${receipt.gasUsed} gas`)
  return { release, safe, deployer, owners, ownerAddresses, recipient, token }
}
