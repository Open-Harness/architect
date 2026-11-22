// Scaffolded from abi.json. Yours from now on.
import { Blueprint, Stand } from "orthograph";
import { ERC20InsufficientAllowance, ERC20InsufficientBalance, ERC20InvalidApprover, ERC20InvalidReceiver, ERC20InvalidSender, ERC20InvalidSpender } from "./generated/errors.ts";
import { Approval, Transfer } from "./generated/events.ts";

const declared = [ERC20InsufficientAllowance, ERC20InsufficientBalance, ERC20InvalidApprover, ERC20InvalidReceiver, ERC20InvalidSender, ERC20InvalidSpender];

export default Blueprint.adapter({
  description: "erc20: the contract's functions as calls, its events and its errors, from abi.json.",
  choices: {},
  calls: {
    allowance: Blueprint.call({ mode: "effect", errors: declared }),
    approve: Blueprint.call({ mode: "effect", errors: declared }),
    balanceOf: Blueprint.call({ mode: "effect", errors: declared }),
    decimals: Blueprint.call({ mode: "effect", errors: declared }),
    name: Blueprint.call({ mode: "effect", errors: declared }),
    symbol: Blueprint.call({ mode: "effect", errors: declared }),
    totalSupply: Blueprint.call({ mode: "effect", errors: declared }),
    transfer: Blueprint.call({ mode: "effect", errors: declared }),
    transferFrom: Blueprint.call({ mode: "effect", errors: declared }),
  },
  events: { Approval, Transfer },
  standIn: Stand.process("Anvil, with the erc20 stand-in contract deployed"),
});
