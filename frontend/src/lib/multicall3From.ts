import { encodeFunctionData } from "viem";

// Arc Testnet predeployed batching contract — preserves the original wallet as
// msg.sender in each subcall via the CallFrom precompile, so approve+deposit
// can be signed in one transaction. Verified pattern reused from the ezwallet
// project's swap flow. https://docs.arc.io/arc/concepts/batched-transactions
export const MULTICALL3_FROM_ADDRESS = "0x522fAf9A91c41c443c66765030741e4AaCe147D0" as const;

const multicall3FromAbi = [
  {
    type: "function",
    name: "aggregate3",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "calls",
        type: "tuple[]",
        components: [
          { name: "target", type: "address" },
          { name: "allowFailure", type: "bool" },
          { name: "callData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      {
        name: "returnData",
        type: "tuple[]",
        components: [
          { name: "success", type: "bool" },
          { name: "returnData", type: "bytes" },
        ],
      },
    ],
  },
] as const;

export function encodeAggregate3(calls: { target: `0x${string}`; allowFailure: boolean; callData: `0x${string}` }[]) {
  return encodeFunctionData({ abi: multicall3FromAbi, functionName: "aggregate3", args: [calls] });
}
