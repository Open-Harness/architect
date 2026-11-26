import type { Effect } from "effect";
import type {
  AbiFunction, Address, ChainError, ChainFault, ChainPort, Hex, RefusalLockEntry,
} from "@orthograph/chain-evm/device";

/** Zodiac's `ModuleProxyFactory`, at its canonical address on every chain (`infrastructure:P/organization-payments.ts:15`). */
export const MODULE_PROXY_FACTORY: Address = "0x000000000000aDdB49795b0f9bA5BC298cDda236";
/** The Zodiac Roles modifier 2.1.1's mastercopy, at its canonical address (`@gnosis-guild/zodiac`'s contract list, roles 2.1.1). */
export const ROLES_MASTERCOPY: Address = "0xF2964CE6161ce0e75964Fe7927cE114cb0B283D5";

/** One call a contract or a Safe makes: its target, its data and the wei it sends. */
export interface ContractCall {
  readonly to: Address;
  readonly data: Hex;
  readonly value: bigint;
}

/** A Roles modifier for one Safe, deployed through the `ModuleProxyFactory`: its owner, avatar and target are all the Safe (`P/roles-module.ts:118-127`). */
export interface RolesDeployment {
  /** Where the factory deploys the modifier, worked out before it is deployed. */
  readonly address: Address;
  /** The factory's `deployModule(ROLES_MASTERCOPY, setUp(abi.encode(safe, safe, safe)), saltNonce)`. Anyone may send it. */
  readonly call: ContractCall;
}

/** A parameter of `fn`: its index in `fn`'s inputs, or `[input, component]` for a field of a tuple input (V3 `send`'s item). */
export type BudgetParam = number | readonly [input: number, component: number];

/**
 * An Org Budget: one role, held by its members, that may call one function of one contract, within an allowance
 * (`P/budget-permissions.ts:113-263`, CX-bridge-rails "Who signs: every payout is on a budget").
 *
 * The amount is a `uint<N>` and the recipient and the token are `address`es, each at a place of its own: two never share
 * one. A place is a top-level input or a field of a tuple input. Every other input or field is passed unchecked; it may be a
 * static type (`address`, `bool`, `uint<N>`, `int<N>`, `bytes<N>`), `bytes` or `string`. A tuple input must hold a scoped
 * field, and only such components. Arrays (of any size) and tuples inside tuples are not supported, scoped or not. The
 * members may be none (the implementation assigns them in a call of its own) but not the same one twice; the recipients
 * must be one or more, each once; a limit must be below 2^256 - 1. Anything else is refused as a `configuration` `ChainFault`.
 */
export interface OrgBudget {
  /** The role's key, a `bytes32`. */
  readonly roleKey: Hex;
  /** The accounts (a member's Safe, or a key) the role is assigned to. */
  readonly members: ReadonlyArray<Address>;
  /** The one contract the role may call. */
  readonly target: Address;
  /** The one function of `target` the role may call. */
  readonly fn: AbiFunction;
  /** The amount: at most `limit` a call and within the allowance, `and(lteUint256(limit), withinAllowance(allowance.key))`; within the allowance alone with no limit. */
  readonly amount: { readonly param: BudgetParam; readonly limit?: bigint };
  /** The recipient: one of these addresses, or `"anyone"` (it passes everything, as `recipientCondition` does). */
  readonly recipients: "anyone" | { readonly param: BudgetParam; readonly anyOf: ReadonlyArray<Address> };
  /** The token, when it is a parameter: exactly this address (`equalAddress`). */
  readonly token?: { readonly param: BudgetParam; readonly address: Address };
  /** The allowance the amount is spent from. `maxRefill`, `refill` and `period` default to 0: no refill. */
  readonly allowance: {
    readonly key: Hex;
    readonly balance: bigint;
    readonly maxRefill?: bigint;
    readonly refill?: bigint;
    /** Seconds. */
    readonly period?: bigint;
  };
}

/** An allowance as the modifier stores it (`allowances(key)`): the balance at `timestamp`, refilled by `refill` each `period` seconds up to `maxRefill`. */
export interface Allowance {
  readonly refill: bigint;
  readonly maxRefill: bigint;
  readonly period: bigint;
  readonly balance: bigint;
  readonly timestamp: bigint;
}

/** `ConditionViolation`'s `status`, Roles 2.1.1's `Status` enum by name (0 is `Ok`). */
export type RolesStatus =
  | "Ok" | "DelegateCallNotAllowed" | "TargetAddressNotAllowed" | "FunctionNotAllowed" | "SendNotAllowed"
  | "OrViolation" | "NorViolation" | "ParameterNotAllowed" | "ParameterLessThanAllowed" | "ParameterGreaterThanAllowed"
  | "ParameterNotAMatch" | "NotEveryArrayElementPasses" | "NoArrayElementPasses" | "ParameterNotSubsetOfAllowed"
  | "BitmaskOverflow" | "BitmaskNotAllowed" | "CustomConditionViolation" | "AllowanceExceeded" | "CallAllowanceExceeded"
  | "EtherAllowanceExceeded";

/** A refusal of the Roles modifier, typed. */
export type RolesRefusal =
  | { readonly _tag: "ConditionViolation"; readonly status: RolesStatus; readonly info: Hex }
  | { readonly _tag: "NoMembership" }
  | { readonly _tag: "NotAuthorized"; readonly sender: Address }
  | { readonly _tag: "ModuleTransactionFailed" }
  | { readonly _tag: "OwnableUnauthorizedAccount"; readonly account: Address };

export interface RolesApi {
  /** Deploy a modifier for `safe` through the factory, with `safe` as its owner, avatar and target. */
  readonly deploy: (input: { readonly safe: Address; readonly saltNonce: bigint }) => Effect.Effect<RolesDeployment, ChainFault>;
  /**
   * The Org Budget compiled to direct calls on `modifier`, for its owner (the Safe) to make in this order, the
   * implementation's: `setAllowance` (timestamp 0, so the modifier takes the block's), `scopeTarget`, `scopeFunction`
   * (its conditions, no value and no delegate call), then `assignRoles` for each member, in the members' order. A budget
   * the rules on `OrgBudget` refuse is a `configuration` `ChainFault`.
   */
  readonly budgetCalls: (modifier: Address, budget: OrgBudget) => Effect.Effect<ReadonlyArray<ContractCall>, ChainFault>;
  /** A member's call through its role: `execTransactionWithRole(to, value, data, 0, roleKey, shouldRevert)` on `modifier`. `value` defaults to 0, `shouldRevert` to true. */
  readonly execTransactionWithRole: (
    modifier: Address,
    input: { readonly to: Address; readonly data: Hex; readonly value?: bigint; readonly roleKey: Hex; readonly shouldRevert?: boolean },
  ) => Effect.Effect<ContractCall, ChainFault>;
  /** The allowance `key` as `modifier` stores it, read over the port. */
  readonly allowance: (port: ChainPort, modifier: Address, key: Hex) => Effect.Effect<Allowance, ChainError>;
  /** The balance accrued so far: what the modifier lets be spent from `allowance` in a block at `now` (unix seconds). */
  readonly accrued: (allowance: Allowance, now: bigint) => bigint;
  /** One refusal lock entry for each `error` of Roles 2.1.1's ABI, for the chain port's `refusals`. */
  readonly refusals: ReadonlyArray<RefusalLockEntry>;
  /** A refusal decoded by the port with `refusals`, typed; anything else (a fault, another contract's refusal) is `undefined`. */
  readonly refusalOf: (error: ChainError) => RolesRefusal | undefined;
}
