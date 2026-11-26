// A2's done-when on Anvil (#1162): `transfer` and `Transfer` are typed, `balanceOf` reads back, and a revert (insufficient
// balance) decodes typed, against the test token, the contract's stand-in (`ERC20.deploy`). Each expected value is worked out by the check (the supply less what was
// sent) and read back by the check itself (`testing.ts`), never taken from the adapter. Gated as chain-evm's Anvil checks
// are: ORTHO_CHAIN_EVM_ANVIL=1, which CI sets. Written by the checks author; the revert cases follow parked Goal 12's draft
// (#497, `packages/erc20/test/anvil.test.ts`), with credit.
import { Effect } from "effect";
import { Abi, Keys, type Address, type Key, type RefusalLockEntry } from "@orthograph/chain-evm";
import { describe, expect, it } from "vitest";
import { ERC20 } from "../src/index.ts";
import { anvilOn, deployBytecode, foreignTokenBytecode, inWorld, liarBytecode, mined, selector, standard, type World } from "./testing.ts";

const { ERC20InsufficientAllowance, ERC20InsufficientBalance, ERC20InvalidReceiver, ERC20InvalidSpender } = ERC20;

const anvil = it.skipIf(!anvilOn);
const timeout = 60_000;
const USDC = 1_000_000n;
// A billion USDC: large enough that a send of most of it is a real amount, not a small one a token could treat apart.
const SUPPLY = 1_000_000_000n * USDC;
const ZERO: Address = "0x0000000000000000000000000000000000000000";

const balanceRead = (w: World, token: Address, account: Address) =>
  w.call(token, standard.balanceOf, [account]).pipe(Effect.map(([balance]) => balance));

/** The test token deployed by alice, the whole supply hers, reached through a port with these refusals. */
const deployed = (w: World, refusals: ReadonlyArray<RefusalLockEntry> = []) =>
  Effect.gen(function* () {
    const port = yield* w.port(refusals);
    const address = yield* ERC20.deploy(port, w.alice.signer, { supply: SUPPLY });
    return { port, address, token: ERC20.at({ port, address }) };
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
      expect(yield* token.decimals()).toBe(6n);
      // A chain read from an account of its own still reads the account asked, not its reader.
      const fromBob = ERC20.at({ port: yield* w.port(), address, from: w.bob.address });
      expect(yield* fromBob.balanceOf({ account: w.alice.address })).toBe(SUPPLY);
      expect(yield* fromBob.balanceOf({ account: w.carol.address })).toBe(0n);
      expect(yield* fromBob.decimals()).toBe(6n);
    })), timeout);

  anvil("a typed transfer is sent from its signer, mines one Transfer, and the balances move by its value", () =>
    inWorld((w) => Effect.gen(function* () {
      const { port, address, token } = yield* deployed(w);
      const sends: ReadonlyArray<readonly [Key, Key, bigint]> = [
        [w.alice, w.bob, 5n * USDC], [w.alice, w.alice, 3n * USDC], [w.alice, w.carol, SUPPLY - 6n * USDC],
        [w.bob, w.carol, 2n * USDC + 1n], [w.carol, w.bob, 1n],
      ];
      const held = new Map<Address, bigint>([[w.alice.address, SUPPLY], [w.bob.address, 0n], [w.carol.address, 0n]]);
      for (const [sender, receiver, value] of sends) {
        const from = (yield* w.head) + 1n;
        const nonce = yield* w.nonce(sender.address);
        // The token answers `true` for this transfer: the check's own eth_call, before anything is sent.
        expect(yield* w.call(address, standard.transfer, [receiver.address, value], sender.address)).toEqual([true]);
        const head = yield* w.head;
        const submission = yield* token.transfer({ to: receiver.address, value }, sender.signer);
        const data = yield* Abi.encodeCall(standard.transfer, [receiver.address, value]);
        expect(submission).toMatchObject({ from: sender.address, to: address, nonce, data });
        expect(submission.value ?? 0n).toBe(0n);
        expect(submission.fromBlock).toBeGreaterThanOrEqual(head);
        const receipt = yield* mined(port, submission);
        expect(receipt.status).toBe("success");
        expect(receipt.transactionHash).toBe(submission.hash);
        expect(receipt.blockNumber).toBeGreaterThanOrEqual(submission.fromBlock);
        expect(yield* w.nonce(sender.address)).toBe(nonce + 1);
        // The check's own decoding of the chain: one Transfer since the block before, with these three values.
        expect(yield* w.transfers(address, from)).toEqual([{ from: sender.address, to: receiver.address, value }]);
        // The adapter's typed event says the same, from the receipt's one log and through the port's follower.
        expect(receipt.logs).toHaveLength(1);
        const [log] = receipt.logs;
        if (log === undefined) return yield* Effect.die("the transfer left no log");
        const event = yield* ERC20.events.Transfer(address, from).decode(log);
        expect(event.args).toEqual({ from: sender.address, to: receiver.address, value });
        expect(event).toMatchObject({ eventName: "Transfer", address, transactionHash: submission.hash, blockNumber: receipt.blockNumber });
        const polled = yield* port.follow(ERC20.events.Transfer(address, from), { depth: 1 }).poll();
        const seen = polled.changes.filter((change) => change._tag === "Confirmed").map((change) => change.event.args);
        expect(seen).toEqual([{ from: sender.address, to: receiver.address, value }]);
        // Nothing is made or burned by a move: the supply stays the supply.
        expect(yield* w.call(address, standard.totalSupply, [])).toEqual([SUPPLY]);
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

  anvil("a transferFrom beyond the owner's balance fails typed with the owner as the sender, not the signer", () =>
    inWorld((w) => Effect.gen(function* () {
      const { port, address, token } = yield* deployed(w);
      yield* mined(port, yield* token.approve({ spender: w.bob.address, value: SUPPLY + 10n }, w.alice.signer));
      const raw = yield* w.revertOf(w.bob.address, address, standard.transferFrom, [w.alice.address, w.carol.address, SUPPLY + 1n]);
      expect(raw.slice(0, 10)).toBe(selector("ERC20InsufficientBalance(address,uint256,uint256)"));
      const nonce = yield* w.nonce(w.bob.address);
      const failure = yield* Effect.flip(token.transferFrom({ from: w.alice.address, to: w.carol.address, value: SUPPLY + 1n }, w.bob.signer));
      expect(failure).toBeInstanceOf(ERC20InsufficientBalance);
      expect(fields(failure)).toEqual({ _tag: "ERC20InsufficientBalance", sender: w.alice.address, balance: SUPPLY, needed: SUPPLY + 1n });
      expect(yield* w.nonce(w.bob.address)).toBe(nonce);
    })), timeout);

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

  anvil("approve sets an allowance, transferFrom spends it, and spending past it or approving the zero address fails typed", () =>
    inWorld((w) => Effect.gen(function* () {
      const { port, address, token } = yield* deployed(w);
      yield* mined(port, yield* token.approve({ spender: w.bob.address, value: 8n }, w.alice.signer));
      expect(yield* token.allowance({ owner: w.alice.address, spender: w.bob.address })).toBe(8n);
      expect(yield* w.call(address, standard.allowance, [w.alice.address, w.bob.address])).toEqual([8n]);
      yield* mined(port, yield* token.transferFrom({ from: w.alice.address, to: w.carol.address, value: 5n }, w.bob.signer));
      expect(yield* balanceRead(w, address, w.carol.address)).toBe(5n);
      expect(yield* w.call(address, standard.allowance, [w.alice.address, w.bob.address])).toEqual([3n]);
      const nonce = yield* w.nonce(w.bob.address);
      const over = yield* Effect.flip(token.transferFrom({ from: w.alice.address, to: w.carol.address, value: 4n }, w.bob.signer));
      expect(over).toBeInstanceOf(ERC20InsufficientAllowance);
      expect(fields(over)).toEqual({ _tag: "ERC20InsufficientAllowance", spender: w.bob.address, allowance: 3n, needed: 4n });
      const zero = yield* Effect.flip(token.approve({ spender: ZERO, value: 1n }, w.bob.signer));
      expect(zero).toBeInstanceOf(ERC20InvalidSpender);
      expect(fields(zero)).toEqual({ _tag: "ERC20InvalidSpender", spender: ZERO });
      expect(yield* w.nonce(w.bob.address)).toBe(nonce);
    })), timeout);
});

describe("the test token, the contract's stand-in, in a world", () => {
  anvil("deploys with 6 decimals and the whole supply its deployer's, for any supply and deployer", () =>
    inWorld((w) => Effect.gen(function* () {
      const port = yield* w.port();
      const cases = [{ deployer: w.alice, supply: 1_000_000_000_000n }, { deployer: w.bob, supply: 7n }];
      const addresses = new Set<string>();
      for (const { deployer, supply } of cases) {
        const from = (yield* w.head) + 1n;
        const nonce = yield* w.nonce(deployer.address);
        const address = yield* ERC20.deploy(port, deployer.signer, { supply });
        addresses.add(address.toLowerCase());
        // Answered once mined: the code is there now. One transaction, the deployment, and nothing after it.
        expect(yield* w.code(address)).toMatch(/^0x(?:[0-9a-f]{2})+$/);
        expect(yield* w.nonce(deployer.address)).toBe(nonce + 1);
        // No one mints after the deployment: the supply is all there is.
        expect(yield* w.refuses(w.carol.address, address, standard.mint, [w.carol.address, 1n])).toBe(true);
        expect(yield* w.call(address, standard.decimals, [])).toEqual([6]);
        expect(yield* w.call(address, standard.totalSupply, [])).toEqual([supply]);
        for (const key of [w.alice, w.bob, w.carol]) {
          expect(yield* w.call(address, standard.balanceOf, [key.address])).toEqual([key === deployer ? supply : 0n]);
        }
        expect(yield* w.transfers(address, from)).toEqual([{ from: ZERO, to: deployer.address, value: supply }]);
        // The rest of OpenZeppelin's reads answer, through the adapter as through the check's own call.
        const token = ERC20.at({ port, address });
        const name = yield* token.name();
        const symbol = yield* token.symbol();
        expect(name.length).toBeGreaterThan(0);
        expect(symbol.length).toBeGreaterThan(0);
        expect(yield* token.totalSupply()).toBe(supply);
        expect(yield* token.allowance({ owner: deployer.address, spender: w.carol.address })).toBe(0n);
      }
      expect(addresses.size).toBe(cases.length);
    })), timeout);
});

describe("the erc20 adapter on Anvil, against a token that is not the test token", () => {
  anvil("reads its balances, reads no decimals it lacks, sends its transfer, and leaves its own revert the port's error", () =>
    inWorld((w) => Effect.gen(function* () {
      const port = yield* w.port();
      const address = yield* deployBytecode(port, w.alice, foreignTokenBytecode);
      const token = ERC20.at({ port, address });
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

describe("the erc20 adapter on Anvil, against a liar: an ERC-20's shape whose answers never follow from the request", () => {
  anvil("reads what the contract answers, takes the fields of its refusals as they come, and types only the errors it knows", () =>
    inWorld((w) => Effect.gen(function* () {
      const port = yield* w.port();
      const address = yield* deployBytecode(port, w.alice, liarBytecode);
      const token = ERC20.at({ port, address });
      // 77 for every account and 9 decimals, though no Transfer was ever emitted.
      expect(yield* token.balanceOf({ account: w.bob.address })).toBe(77n);
      expect(yield* token.balanceOf({ account: ZERO })).toBe(77n);
      expect(yield* token.decimals()).toBe(9n);
      const nonce = yield* w.nonce(w.alice.address);
      // value 1: ERC20InsufficientBalance with fields that are none of the request's.
      const short = yield* Effect.flip(token.transfer({ to: w.bob.address, value: 1n }, w.alice.signer));
      expect(short).toBeInstanceOf(ERC20InsufficientBalance);
      expect(fields(short)).toEqual({ _tag: "ERC20InsufficientBalance", sender: Keys.checksum("0x000000000000000000000000000000000000dEaD"), balance: 42n, needed: 43n });
      // value 2: the same shape with another selector stays the port's error.
      const other = yield* Effect.flip(token.transfer({ to: w.bob.address, value: 2n }, w.alice.signer));
      expect(other).not.toBeInstanceOf(ERC20InsufficientBalance);
      expect(other).toMatchObject({ _tag: "ChainFault", kind: "revert" });
      expect((other as { raw?: string }).raw?.slice(0, 10)).toBe(selector("Short(address,uint256,uint256)"));
      // value 3: ERC20InvalidReceiver naming a receiver that is not the one asked.
      const receiver = yield* Effect.flip(token.transfer({ to: w.bob.address, value: 3n }, w.alice.signer));
      expect(receiver).toBeInstanceOf(ERC20InvalidReceiver);
      expect(fields(receiver)).toEqual({ _tag: "ERC20InvalidReceiver", receiver: Keys.checksum("0x000000000000000000000000000000000000CAFE") });
      expect(yield* w.nonce(w.alice.address)).toBe(nonce);
      // The liar takes a transfer to the zero address: whether it is refused is the contract's to say.
      const submission = yield* token.transfer({ to: ZERO, value: 5n }, w.alice.signer);
      expect((yield* mined(port, submission)).status).toBe("success");
      expect(yield* w.nonce(w.alice.address)).toBe(nonce + 1);
    })), timeout);
});
