/** CAIP-10 on EIP-155: `eip155:<chain id>:<address>`, the chain id a decimal with no leading zero. */
export const CAIP10 = /^eip155:(0|[1-9][0-9]{0,15}):(0x[0-9a-fA-F]{40})$/;
