// Generated from abi.json. Do not edit.
import type { Address } from "@orthograph/chain-evm/device";
import { AbiEvents } from "@orthograph/adapters-abi";
import type { AbiEventItem } from "@orthograph/adapters-abi";
import type { ApprovalEventArgs, TransferEventArgs } from "./types.ts";

const ApprovalItem: AbiEventItem = {
  "type": "event",
  "name": "Approval",
  "inputs": [
    {
      "name": "owner",
      "type": "address",
      "indexed": true
    },
    {
      "name": "spender",
      "type": "address",
      "indexed": true
    },
    {
      "name": "value",
      "type": "uint256",
      "indexed": false
    }
  ],
  "anonymous": false
};
export const Approval = (address: Address, fromBlock: bigint) =>
  AbiEvents.source<"Approval", ApprovalEventArgs>(ApprovalItem, address, fromBlock);

const TransferItem: AbiEventItem = {
  "type": "event",
  "name": "Transfer",
  "inputs": [
    {
      "name": "from",
      "type": "address",
      "indexed": true
    },
    {
      "name": "to",
      "type": "address",
      "indexed": true
    },
    {
      "name": "value",
      "type": "uint256",
      "indexed": false
    }
  ],
  "anonymous": false
};
export const Transfer = (address: Address, fromBlock: bigint) =>
  AbiEvents.source<"Transfer", TransferEventArgs>(TransferItem, address, fromBlock);
