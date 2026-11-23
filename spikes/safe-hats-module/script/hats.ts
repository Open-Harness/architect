import assert from "node:assert/strict"
import { zeroAddress, type Address } from "viem"
import type { PrivateKeyAccount } from "viem/accounts"
import { artifact, type Chain } from "./chain.ts"
import type { proveGoal4 } from "./goal4.ts"
import { createSafe, enable, execute, safeAbi } from "./safe.ts"

type World = Awaited<ReturnType<typeof proveGoal4>>

export async function proveHats(chain: Chain, world: World) {
  const { release, deployer, owners, recipient, token } = world
  const wearer = await chain.account()
  const outsider = await chain.account()
  const hats = await chain.deploy(deployer, "Hats.sol/Hats", ["Spike hats", ""])
  const hatsAbi = artifact("Hats.sol/Hats").abi
  const create = async (by: PrivateKeyAccount, functionName: string, args: readonly unknown[], label: string) => {
    const call = { address: hats, abi: hatsAbi, functionName, args }
    const { result } = await chain.publicClient.simulateContract({ ...call, account: by.address })
    await chain.write(by, call, label)
    return result as bigint
  }
  const topHat = await create(deployer, "mintTopHat", [deployer.address, "Workshop", ""], "mint top hat")
  const personHat = await create(deployer, "createHat", [
    topHat, "Person", 1, deployer.address, deployer.address, true, "",
  ], "create person hat")
  await chain.write(deployer, {
    address: hats, abi: hatsAbi, functionName: "mintHat", args: [personHat, wearer.address],
  }, "mint person hat")
  assert.equal(await chain.read({
    address: hats, abi: hatsAbi, functionName: "isWearerOfHat", args: [wearer.address, personHat],
  }), true)

  // The unbudgeted proof has its own Safe. It cannot bypass the later budget module.
  const safe = await createSafe(chain, deployer, release, world.ownerAddresses, 2n, 3n)
  const module = await chain.deploy(deployer, "HatSpendModule.sol/HatSpendModule", [safe, hats, personHat, token])
  const abi = artifact("HatSpendModule.sol/HatSpendModule").abi
  const to = recipient.address
  const spend = (asset: Address, amount: bigint) => ({
    address: module, abi, functionName: "spend", args: [asset, to, amount],
  })
  await chain.send(deployer, { to: safe, value: 100n }, "fund Hats Safe with ETH")
  const tokenAbi = artifact("SafeFixtures.sol/TestToken").abi
  await chain.write(deployer, { address: token, abi: tokenAbi, functionName: "mint", args: [safe, 100n] }, "fund Hats Safe with token")

  const disabled = await chain.refuse(wearer, spend(zeroAddress, 10n), "Error", "GS104")
  console.log(`Hats module disabled ${disabled.args} tx=${disabled.hash}`)
  await enable(chain, deployer, safe, owners, module)
  const recipientEth = await chain.publicClient.getBalance({ address: to })
  const recipientToken = await chain.read({ address: token, abi: tokenAbi, functionName: "balanceOf", args: [to] }) as bigint
  await chain.write(wearer, spend(zeroAddress, 10n), "hat wearer pays ETH")
  await chain.write(wearer, spend(token, 10n), "hat wearer pays token")
  assert.equal(await chain.publicClient.getBalance({ address: to }), recipientEth + 10n)
  assert.equal(await chain.publicClient.getBalance({ address: safe }), 90n)
  assert.equal(await chain.read({ address: token, abi: tokenAbi, functionName: "balanceOf", args: [to] }), recipientToken + 10n)
  assert.equal(await chain.read({ address: token, abi: tokenAbi, functionName: "balanceOf", args: [safe] }), 90n)

  const refused = await chain.refuse(outsider, spend(token, 10n), "NotHatWearer", [outsider.address, personHat])
  console.log(`hat outsider refused ${refused.name}(${outsider.address},${personHat}) tx=${refused.hash}`)
  await chain.write(deployer, {
    address: hats, abi: hatsAbi, functionName: "setHatStatus", args: [personHat, false],
  }, "turn person hat off")
  const inactive = await chain.refuse(wearer, spend(zeroAddress, 10n), "NotHatWearer", [wearer.address, personHat])
  console.log(`inactive hat refused ${inactive.name} tx=${inactive.hash}`)
  await chain.write(deployer, {
    address: hats, abi: hatsAbi, functionName: "setHatStatus", args: [personHat, true],
  }, "restore person hat")
  const setWearerStatus = (eligible: boolean) => ({
    address: hats, abi: hatsAbi, functionName: "setHatWearerStatus",
    args: [personHat, wearer.address, eligible, eligible],
  })
  await chain.write(deployer, setWearerStatus(false), "make wearer ineligible")
  assert.equal(await chain.read({
    address: hats, abi: hatsAbi, functionName: "isEligible", args: [wearer.address, personHat],
  }), false)
  const ineligible = await chain.refuse(wearer, spend(zeroAddress, 10n), "NotHatWearer", [wearer.address, personHat])
  console.log(`ineligible wearer refused ${ineligible.name} tx=${ineligible.hash}`)
  await chain.write(deployer, setWearerStatus(true), "restore wearer eligibility")
  await chain.write(deployer, {
    address: hats, abi: hatsAbi, functionName: "mintHat", args: [personHat, wearer.address],
  }, "remint person hat")
  assert.equal(await chain.read({
    address: hats, abi: hatsAbi, functionName: "isWearerOfHat", args: [wearer.address, personHat],
  }), true)
  assert.equal(await chain.publicClient.getBalance({ address: safe }), 90n)
  assert.equal(await chain.read({ address: token, abi: tokenAbi, functionName: "balanceOf", args: [safe] }), 90n)

  await execute(chain, deployer, safe, owners, {
    address: safe, abi: safeAbi(), functionName: "disableModule",
    args: ["0x0000000000000000000000000000000000000001", module],
  }, "disable unbudgeted module")
  assert.equal(await chain.read({ address: safe, abi: safeAbi(), functionName: "isModuleEnabled", args: [module] }), false)
  return { hats, hatsAbi, personHat, create, wearer, outsider, safe, tokenAbi }
}
