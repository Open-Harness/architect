// A2's done-when on Anvil (#1162): `transfer` and `Transfer` are typed, `balanceOf` reads back, and a revert (insufficient
// balance) decodes typed, against the test token. Each expected value is worked out by the check (the supply less what was
// sent) and read back by the check itself (`testing.ts`), never taken from the adapter. Gated as chain-evm's Anvil checks
// are: ORTHO_CHAIN_EVM_ANVIL=1, which CI sets. Written by the checks author; the revert cases follow parked Goal 12's draft
// (#497, `packages/erc20/test/anvil.test.ts`), with credit.
import { Effect } from "effect";
import { Abi, type Address, type Key, type RefusalLockEntry } from "@orthograph/chain-evm";
import { describe, expect, it } from "vitest";
import { Erc20, ERC20InsufficientBalance, ERC20InvalidReceiver, TestToken } from "../../main.ts";
import { anvilOn, deployBytecode, foreignTokenBytecode, inWorld, mined, selector, standard, type World } from "../test-token/testing.ts";

const anvil = it.skipIf(!anvilOn);
const timeout = 60_000;
const USDC = 1_000_000n;
const SUPPLY = 1_000_000n * USDC;
const ZERO: Address = "0x0000000000000000000000000000000000000000";

const balanceRead = (w: World, token: Address, account: Address) =>
  w.call(token, standard.balanceOf, [account]).pipe(Effect.map(([balance]) => balance));

/** The test token deployed by alice, the whole supply hers, reached through a port with these refusals. */
const deployed = (w: World, refusals: ReadonlyArray<RefusalLockEntry> = []) =>
  Effect.gen(function* () {
    const port = yield* w.port(refusals);
    const address = yield* TestToken.deploy(port, w.alice.signer, { supply: SUPPLY });
    return { port, address, token: Erc20.at(port, address) };
  });

/** What a world's refusals.lock holds for the token's two errors, as chain-evm locks them. */
const locked = [
  Abi.refusal(standard.ERC20InsufficientBalance, "TEST-ERC20-1"),
  Abi.refusal(standard.ERC20InvalidReceiver, "TEST-ERC20-2"),
];

/** An error's own fields, without its stack or message, so `toEqual` judges every field and nothing else. */
const fields = (error: unknown) => ({ ...(error as object), _tag: (error as { _tag?: unknown })._tag });

describe("the erc20 adapter on Anvil, against the test token", () => {
  anvil("balanceOf reads back what the chain holds, for each account, and decimals is 6", () =>
    inWorld((w) => Effect.gen(function* () {
      const { address, token } = yield* deployed(w);
      for (const [key, expected] of [[w.alice, SUPPLY], [w.bob, 0n], [w.carol, 0n]] as const) {
        expect(yield* token.balanceOf({ account: key.address })).toBe(expected);
        expect(yield* balanceRead(w, address, key.address)).toBe(expected);
      }
      expect(yield* token.decimals()).toBe(6);
    })), timeout);

  anvil("a typed transfer is sent from its signer, mines one Transfer, and the balances move by its value", () =>
    inWorld((w) => Effect.gen(function* () {
      const { port, address, token } = yield* deployed(w);
      const sends: ReadonlyArray<readonly [Key, Key, bigint]> = [
        [w.alice, w.bob, 5n * USDC], [w.alice, w.carol, 7n], [w.bob, w.carol, 2n * USDC + 1n],
      ];
      const held = new Map<Address, bigint>([[w.alice.address, SUPPLY], [w.bob.address, 0n], [w.carol.address, 0n]]);
      for (const [sender, receiver, value] of sends) {
        const from = (yield* w.head) + 1n;
        const nonce = yield* w.nonce(sender.address);
        const submission = yield* token.transfer({ to: receiver.address, value }, sender.signer);
        expect(submission).toMatchObject({ from: sender.address, to: address, nonce });
        const receipt = yield* mined(port, submission);
        expect(receipt.status).toBe("success");
        expect(receipt.transactionHash).toBe(submission.hash);
        expect(yield* w.nonce(sender.address)).toBe(nonce + 1);
        // The check's own decoding of the chain: one Transfer since the block before, with these three values.
        expect(yield* w.transfers(address, from)).toEqual([{ from: sender.address, to: receiver.address, value }]);
        // The adapter's typed event says the same, from the receipt's one log and through the port's follower.
        expect(receipt.logs).toHaveLength(1);
        const [log] = receipt.logs;
        if (log === undefined) return yield* Effect.die("the transfer left no log");
        const event = yield* token.Transfer(from).decode(log);
        expect(event.args).toEqual({ from: sender.address, to: receiver.address, value });
        expect(event).toMatchObject({ eventName: "Transfer", address, transactionHash: submission.hash, blockNumber: receipt.blockNumber });
        const polled = yield* port.follow(token.Transfer(from), { depth: 1 }).poll();
        const seen = polled.changes.filter((change) => change._tag === "Confirmed").map((change) => change.event.args);
        expect(seen).toEqual([{ from: sender.address, to: receiver.address, value }]);
        held.set(sender.address, (held.get(sender.address) ?? 0n) - value);
        held.set(receiver.address, (held.get(receiver.address) ?? 0n) + value);
        for (const [account, expected] of held) {
          expect(yield* token.balanceOf({ account })).toBe(expected);
          expect(yield* balanceRead(w, address, account)).toBe(expected);
        }
      }
    })), timeout);

  for (const [refusals, label] of [[[], "with nothing locked"], [locked, "with the token's errors in the port's refusals.lock"]] as const) {
    anvil(`a transfer beyond the balance fails typed as ERC20InsufficientBalance, its fields the chain's, and nothing is sent (${label})`, () =>
      inWorld((w) => Effect.gen(function* () {
        const { port, address, token } = yield* deployed(w, refusals);
        yield* mined(port, yield* token.transfer({ to: w.bob.address, value: 3n }, w.alice.signer));
        const cases = [
          { sender: w.alice, balance: SUPPLY - 3n, needed: SUPPLY - 2n },
          { sender: w.bob, balance: 3n, needed: 4n },
          { sender: w.carol, balance: 0n, needed: 1n },
        ];
        for (const { sender, balance, needed } of cases) {
          // The token itself refuses with ERC-6093's error and these fields: read by the check, no adapter.
          const raw = yield* w.revertOf(sender.address, address, standard.transfer, [w.carol.address, needed]);
          expect(raw.slice(0, 10)).toBe(selector("ERC20InsufficientBalance(address,uint256,uint256)"));
          const nonce = yield* w.nonce(sender.address);
          const head = yield* w.head;
          const failure = yield* Effect.flip(token.transfer({ to: w.carol.address, value: needed }, sender.signer));
          expect(failure).toBeInstanceOf(ERC20InsufficientBalance);
          expect(fields(failure)).toEqual({ _tag: "ERC20InsufficientBalance", sender: sender.address, balance, needed });
          expect(yield* w.nonce(sender.address)).toBe(nonce);
          expect(yield* w.head).toBe(head);
          expect(yield* balanceRead(w, address, sender.address)).toBe(balance);
        }
      })), timeout);
  }

  anvil("a transfer to the zero address fails typed as ERC20InvalidReceiver, and nothing is sent", () =>
    inWorld((w) => Effect.gen(function* () {
      const { address, token } = yield* deployed(w);
      const raw = yield* w.revertOf(w.alice.address, address, standard.transfer, [ZERO, 1n]);
      expect(raw.slice(0, 10)).toBe(selector("ERC20InvalidReceiver(address)"));
      const nonce = yield* w.nonce(w.alice.address);
      const failure = yield* Effect.flip(token.transfer({ to: ZERO, value: 1n }, w.alice.signer));
      expect(failure).toBeInstanceOf(ERC20InvalidReceiver);
      expect(fields(failure)).toEqual({ _tag: "ERC20InvalidReceiver", receiver: ZERO });
      expect(yield* w.nonce(w.alice.address)).toBe(nonce);
    })), timeout);
});

describe("the erc20 adapter on Anvil, against a token that is not the test token", () => {
  anvil("reads its balances, reads no decimals it lacks, sends its transfer, and leaves its own revert the port's error", () =>
    inWorld((w) => Effect.gen(function* () {
      const port = yield* w.port();
      const address = yield* deployBytecode(port, w.alice, foreignTokenBytecode);
      const token = Erc20.at(port, address);
      expect(yield* token.balanceOf({ account: w.alice.address })).toBe(100n);
      expect(yield* token.balanceOf({ account: w.bob.address })).toBe(0n);
      expect(yield* Effect.flip(token.decimals())).toMatchObject({ _tag: "ChainFault" });
      const submission = yield* token.transfer({ to: w.bob.address, value: 40n }, w.alice.signer);
      expect((yield* mined(port, submission)).status).toBe("success");
      expect(yield* token.balanceOf({ account: w.bob.address })).toBe(40n);
      expect(yield* balanceRead(w, address, w.bob.address)).toBe(40n);
      const raw = yield* w.revertOf(w.alice.address, address, standard.transfer, [w.bob.address, 61n]);
      expect(raw.slice(0, 10)).toBe(selector("InsufficientBalance(uint256,uint256)"));
      const nonce = yield* w.nonce(w.alice.address);
      const failure = yield* Effect.flip(token.transfer({ to: w.bob.address, value: 61n }, w.alice.signer));
      expect(failure).not.toBeInstanceOf(ERC20InsufficientBalance);
      expect(failure).toMatchObject({ _tag: "ChainFault", kind: "revert" });
      expect(yield* w.nonce(w.alice.address)).toBe(nonce);
    })), timeout);
});
