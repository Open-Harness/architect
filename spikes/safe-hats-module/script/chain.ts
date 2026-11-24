import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { readFileSync } from "node:fs"
import { createServer } from "node:net"
import { setTimeout as delay } from "node:timers/promises"
import {
  BaseError, ContractFunctionRevertedError, createPublicClient, createTestClient, createWalletClient,
  encodeFunctionData, http, parseEther,
  type Abi, type Address, type Hex,
} from "viem"
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts"
import { foundry } from "viem/chains"

const host = "127.0.0.1"
const gas = 12_000_000n

export const artifact = (name: string) => JSON.parse(readFileSync(
  new URL(`../out/${name}.json`, import.meta.url), "utf8",
)) as { abi: Abi; bytecode: { object: Hex } }

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once("error", reject)
    server.listen(0, host, () => {
      const address = server.address()
      assert(address && typeof address !== "string")
      server.close((error) => error ? reject(error) : resolve(address.port))
    })
  })
}

export async function withAnvil<T>(run: (chain: Chain) => Promise<T>) {
  const port = await freePort()
  const child = spawn("anvil", [
    "--silent", "--host", host, "--port", String(port), "--chain-id", String(foundry.id),
    "--accounts", "0", "--hardfork", "cancun",
  ], { stdio: "ignore" })
  let exited = false
  const closed = new Promise<void>((resolve) => {
    child.once("close", () => { exited = true; resolve() })
    child.once("error", () => {})
  })
  const terminate = () => { if (!exited && !child.killed) child.kill("SIGTERM") }
  const stop = (status: number) => {
    terminate()
    void closed.then(() => process.exit(status))
  }
  const interrupt = () => stop(130)
  const signal = () => stop(143)
  process.once("exit", terminate)
  process.once("SIGINT", interrupt)
  process.once("SIGTERM", signal)
  try {
    const chain = connect(port)
    for (let attempt = 0; attempt < 80 && !exited; attempt++) {
      const id = await chain.publicClient.getChainId().catch(() => undefined)
      if (id === foundry.id) return await run(chain)
      await delay(25)
    }
    throw Error("Anvil did not start")
  } finally {
    terminate()
    await closed
    process.off("exit", terminate)
    process.off("SIGINT", interrupt)
    process.off("SIGTERM", signal)
  }
}

type Tx = { to: Address; data?: Hex; value?: bigint }
export type Call = { address: Address; abi: Abi; functionName: string; args?: readonly unknown[] }

function connect(port: number) {
  const transport = http(`http://${host}:${port}`, { retryCount: 0, timeout: 2_000 })
  const chain = foundry
  const publicClient = createPublicClient({ chain, transport, pollingInterval: 25 })
  const testClient = createTestClient({ chain, transport, mode: "anvil" })
  const wallet = createWalletClient({ chain, transport })

  async function account() {
    const signer = privateKeyToAccount(generatePrivateKey())
    await testClient.setBalance({ address: signer.address, value: parseEther("100") })
    return signer
  }

  async function receipt(hash: Hex) {
    return publicClient.waitForTransactionReceipt({ hash, timeout: 10_000 })
  }

  async function send(from: PrivateKeyAccount, tx: Tx, label: string) {
    const mined = await receipt(await wallet.sendTransaction({ account: from, ...tx, gas }))
    assert.equal(mined.status, "success", label)
    console.log(`${label} tx=${mined.transactionHash} gas=${mined.gasUsed}`)
    return mined
  }

  async function deploy(from: PrivateKeyAccount, name: string, args: readonly unknown[] = []) {
    const { abi, bytecode } = artifact(name)
    const mined = await receipt(await wallet.deployContract({ account: from, abi, bytecode: bytecode.object, args, gas }))
    assert.equal(mined.status, "success", name)
    assert(mined.contractAddress, name)
    console.log(`deploy ${name} at=${mined.contractAddress} tx=${mined.transactionHash}`)
    return mined.contractAddress
  }

  async function write(from: PrivateKeyAccount, call: Call, label: string) {
    const data = encodeFunctionData(call)
    return send(from, { to: call.address, data }, label)
  }

  async function refuse(
    from: PrivateKeyAccount, call: Call, name: string, expected: readonly unknown[] | string,
  ) {
    const data = encodeFunctionData(call)
    let refusal: { name: string; args: unknown }
    try {
      await publicClient.simulateContract({ ...call, account: from.address, gas })
      throw Error(`Expected refusal ${name}`)
    } catch (error) {
      if (!(error instanceof BaseError)) throw error
      const revert = error.walk((cause) => cause instanceof ContractFunctionRevertedError)
      assert(revert instanceof ContractFunctionRevertedError)
      refusal = typeof expected === "string"
        ? { name: "Error", args: revert.reason }
        : { name: revert.data?.errorName ?? "", args: revert.data?.args ?? [] }
      assert.equal(refusal.name, name)
      assert.deepEqual(refusal.args, expected)
    }
    const mined = await receipt(await wallet.sendTransaction({ account: from, to: call.address, data, gas }))
    assert.equal(mined.status, "reverted")
    return { ...refusal, hash: mined.transactionHash }
  }

  return { publicClient, testClient, account, send, write, deploy, refuse, read: publicClient.readContract }
}

export type Chain = ReturnType<typeof connect>
