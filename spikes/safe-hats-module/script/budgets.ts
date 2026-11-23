import assert from "node:assert/strict"
import { formatUnits, type Address } from "viem"
import { budgetSpendData, parseBaseUnits } from "./budget-data.ts"
import { artifact, type Call, type Chain } from "./chain.ts"
import type { proveGoal4 } from "./goal4.ts"
import type { proveHats } from "./hats.ts"
import { createSafe, enable, execute } from "./safe.ts"

type World = Awaited<ReturnType<typeof proveGoal4>>
type HatWorld = Awaited<ReturnType<typeof proveHats>>
type Budget = { token: Address; limit: bigint; spent: bigint; period: bigint }
const period = 3_600n

export async function proveBudgets(chain: Chain, world: World, hatWorld: HatWorld) {
  const { deployer, owners, recipient, token, release, ownerAddresses } = world
  const { hats, hatsAbi, wearer, personHat, safe, create, tokenAbi } = hatWorld
  const to = recipient.address
  const agent = await chain.account()
  const toggle = await chain.deploy(deployer, "HatAdminToggle.sol/HatAdminToggle", [hats])
  const agentHat = await create(wearer, "createHat", [
    personHat, "Agent", 1, wearer.address, toggle, true, "",
  ], "person creates child hat")
  await chain.write(wearer, {
    address: hats, abi: hatsAbi, functionName: "mintHat", args: [agentHat, agent.address],
  }, "person mints child hat to agent")
  assert.equal(await chain.read({
    address: hats, abi: hatsAbi, functionName: "isAdminOfHat", args: [wearer.address, agentHat],
  }), true)
  assert.equal(await chain.read({
    address: hats, abi: hatsAbi, functionName: "isWearerOfHat", args: [agent.address, agentHat],
  }), true)

  const otherSafe = await createSafe(chain, deployer, release, ownerAddresses, 2n, 5n)
  const sixToken = await chain.deploy(deployer, "SafeFixtures.sol/SixDecimalToken")
  const module = await chain.deploy(deployer, "HatBudgetModule.sol/HatBudgetModule", [hats])
  const abi = artifact("HatBudgetModule.sol/HatBudgetModule").abi
  const call = (functionName: string, args: readonly unknown[]): Call => ({
    address: module, abi, functionName, args,
  })
  const budgetOf = async (account: Address, hat: bigint) =>
    await chain.read(call("budgetOf", [account, hat])) as readonly [Budget, bigint]
  const nonce = async (by: Address) => await chain.read(call("nonces", [by])) as bigint
  const tokenCall = (asset: Address, functionName: string, args: readonly unknown[] = []): Call => ({
    address: asset, abi: tokenAbi, functionName, args,
  })
  const balance = async (asset: Address, account: Address) =>
    await chain.read(tokenCall(asset, "balanceOf", [account])) as bigint

  await enable(chain, deployer, safe, owners, module)
  await enable(chain, deployer, otherSafe, owners, module)
  await chain.write(deployer, tokenCall(token, "mint", [safe, 5_000_000_000_000_000_000n]), "fund 18-decimal Safe")
  await chain.write(deployer, tokenCall(sixToken, "mint", [otherSafe, 1_500_000n]), "fund 6-decimal Safe")
  const initialSafe = await balance(token, safe)
  const initialRecipient = await balance(token, to)

  // Start well inside a period so a run starting near the boundary has the same checks.
  const now = (await chain.publicClient.getBlock()).timestamp
  await chain.testClient.setNextBlockTimestamp({ timestamp: (now / period + 1n) * period + 1n })
  await chain.testClient.mine({ blocks: 1 })

  const personLimit = parseBaseUnits("1500000000000000000")
  const agentLimit = parseBaseUnits("20000000000000000")
  const sixLimit = parseBaseUnits("1500000")
  const grant = async (account: Address, hat: bigint, asset: Address, limit: bigint) =>
    call("createBudget", [account, hat, asset, limit, period, await nonce(account)])

  const personGrant = await grant(safe, personHat, token, personLimit)
  const unauthorised = await chain.refuse(wearer, personGrant, "NotAllowed", [])
  console.log(`direct budget grant refused ${unauthorised.name} tx=${unauthorised.hash}`)
  await execute(chain, deployer, safe, owners, personGrant, "Safe creates person budget")
  await execute(chain, deployer, safe, owners, await grant(safe, agentHat, token, agentLimit), "Safe creates smaller agent budget")
  await execute(chain, deployer, otherSafe, owners, await grant(otherSafe, personHat, sixToken, sixLimit), "second Safe creates its own row for the same hat")

  const spend = (account: Address, hat: bigint, amount: bigint, spendNonce: bigint) =>
    call("spend", [account, hat, to, amount, spendNonce])
  const checkRefusal = async (by: typeof wearer, payment: Call, name: string, args: readonly unknown[]) => {
    const refusal = await chain.refuse(by, payment, name, args)
    console.log(`budget refused ${refusal.name}(${args.join(",")}) tx=${refusal.hash}`)
  }

  const amount = parseBaseUnits("1250000000000000001")
  const deadline = (await chain.publicClient.getBlock()).timestamp + 60n
  const signed = budgetSpendData(await chain.publicClient.getChainId(), module, {
    safe, hatId: personHat, to, amount, signer: wearer.address, nonce: 0n, deadline,
  })
  const signature = await wearer.signTypedData(signed)
  await chain.write(deployer, call("spendBySig", [safe, personHat, to, amount, wearer.address, 0n, deadline, signature]),
    "relayed person budget spend")
  await checkRefusal(wearer, spend(safe, personHat, personLimit - amount + 1n, 1n), "BudgetExceeded",
    [personHat, personLimit - amount + 1n, personLimit - amount])
  const [personRow, left] = await budgetOf(safe, personHat)
  assert.equal(left, personLimit - amount)
  assert.equal(await nonce(wearer.address), 1n)

  const sixAmount = parseBaseUnits("1250001")
  await chain.write(wearer, spend(otherSafe, personHat, sixAmount, 1n), "person spends from the second Safe")
  const [sixRow, sixLeft] = await budgetOf(otherSafe, personHat)
  assert.equal(sixLeft, 249_999n)
  assert.equal(await balance(sixToken, otherSafe), sixLeft)
  assert.equal(await balance(sixToken, to), sixAmount)
  assert.equal((await budgetOf(safe, personHat))[1], left)
  await showMoney(chain, tokenCall, personRow, amount, left, "1.250000000000000001 SPIKE")
  await showMoney(chain, tokenCall, sixRow, sixAmount, sixLeft, "1.250001 SPIKE6")
  checkMoneyWire()

  const agentAmount = parseBaseUnits("12000000000000000")
  await chain.write(agent, spend(safe, agentHat, agentAmount, 0n), "agent spends under child hat")
  const agentLeft = agentLimit - agentAmount
  await checkRefusal(agent, spend(safe, agentHat, agentLeft + 1n, 1n), "BudgetExceeded", [agentHat, agentLeft + 1n, agentLeft])
  await chain.write(wearer, {
    address: toggle, abi: artifact("HatAdminToggle.sol/HatAdminToggle").abi,
    functionName: "setStatus", args: [agentHat, false],
  }, "person uses admin hat to turn child hat off")
  await checkRefusal(agent, spend(safe, agentHat, 1n, 1n), "NotAllowed", [])
  assert.equal(await nonce(agent.address), 1n)

  await chain.testClient.increaseTime({ seconds: Number(period) })
  await chain.testClient.mine({ blocks: 1 })
  const [fresh, freshLeft] = await budgetOf(safe, personHat)
  assert(fresh.period > personRow.period)
  assert.equal(fresh.spent, 0n)
  assert.equal(freshLeft, personLimit)
  console.log(`evm_increaseTime seconds=${period} period=${personRow.period}->${fresh.period} remaining=${freshLeft}`)
  await chain.write(wearer, spend(safe, personHat, personLimit, 2n), "person spends full budget after rollover")
  assert.equal((await budgetOf(safe, personHat))[1], 0n)
  const total = amount + agentAmount + personLimit
  assert.equal(await balance(token, safe), initialSafe - total)
  assert.equal(await balance(token, to), initialRecipient + total)
  for (const asset of [token, sixToken]) assert.equal(await balance(asset, module), 0n)
  console.log(`verified net Safe payout=${total} base units and no module custody`)
}

async function showMoney(
  chain: Chain, call: (asset: Address, name: string) => Call, budget: Budget, amount: bigint, remaining: bigint,
  expected: string,
) {
  const { token, limit, spent } = budget
  const decimals = await chain.read(call(token, "decimals")) as number
  const symbol = await chain.read(call(token, "symbol")) as string
  const display = `${formatUnits(amount, decimals)} ${symbol}`
  assert.equal(display, expected)
  const wire = JSON.stringify({ token, limit: limit.toString(), spent: spent.toString(), amount: amount.toString(), remaining: remaining.toString() })
  assert.equal(parseBaseUnits(JSON.parse(wire).amount), amount)
  console.log(`money wire=${wire} display=${display}`)
}

function checkMoneyWire() {
  assert.equal(parseBaseUnits("0"), 0n)
  assert.equal(parseBaseUnits("340282366920938463463374607431768211455"), (1n << 128n) - 1n)
  for (const invalid of ["", "01", "-1", "-0", "+1", "1.25", "1e6", "12\n", " 1", "340282366920938463463374607431768211456", 1]) {
    assert.throws(() => parseBaseUnits(invalid))
  }
}
