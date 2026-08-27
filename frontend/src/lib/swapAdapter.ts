import { encodeFunctionData } from "viem";
import { erc20Abi } from "./erc20Abi";

// Same Circle Stablecoin Kit adapter EZwallet uses on Arc Testnet — the ABI copied
// verbatim from @circle-fin/adapter-viem-v2 (adapterContractAbi).
export const ADAPTER_ADDRESS = "0xBBD70b01a1CAbc96d5b7b129Ae1AAabdf50dd40b" as const;

const ADAPTER_ABI = [
  {
    type: "function",
    name: "execute",
    stateMutability: "payable",
    outputs: [],
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          {
            name: "instructions",
            type: "tuple[]",
            components: [
              { name: "target", type: "address" },
              { name: "data", type: "bytes" },
              { name: "value", type: "uint256" },
              { name: "tokenIn", type: "address" },
              { name: "amountToApprove", type: "uint256" },
              { name: "tokenOut", type: "address" },
              { name: "minTokenOut", type: "uint256" },
            ],
          },
          {
            name: "tokens",
            type: "tuple[]",
            components: [
              { name: "token", type: "address" },
              { name: "beneficiary", type: "address" },
            ],
          },
          { name: "execId", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "metadata", type: "bytes" },
        ],
      },
      {
        name: "tokenInputs",
        type: "tuple[]",
        components: [
          { name: "permitType", type: "uint8" },
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "permitCalldata", type: "bytes" },
        ],
      },
      { name: "signature", type: "bytes" },
    ],
  },
] as const;

type SwapIntentInstruction = {
  target: `0x${string}`;
  data: `0x${string}`;
  value?: string | number;
  tokenIn: `0x${string}`;
  amountToApprove?: string | number;
  tokenOut: `0x${string}`;
  minTokenOut?: string | number;
};

type SwapIntentToken = { token: `0x${string}`; beneficiary: `0x${string}` };

/** Shape returned by POST /api/swap — see functions/api/_swapCore.js. */
export type SwapIntent = {
  transaction?: {
    executionParams?: {
      instructions: SwapIntentInstruction[];
      tokens: SwapIntentToken[];
      execId: string | number;
      deadline: string | number;
      metadata?: `0x${string}`;
    };
    signature?: `0x${string}`;
  };
  estimatedAmount?: string;
};

/**
 * Builds the two calls (approve, ADAPTER.execute) for one leg of the swap, ready to
 * batch through Multicall3From alongside any other leg for a single signature.
 */
export function buildSwapCalls(intent: SwapIntent, tokenInAddress: `0x${string}`, amountBase: bigint) {
  const ep = intent.transaction?.executionParams;
  const signature = intent.transaction?.signature;
  if (!ep || !signature) throw new Error("swap intent missing executionParams/signature");

  const executeParams = {
    instructions: ep.instructions.map((i) => ({
      target: i.target,
      data: i.data,
      value: BigInt(i.value ?? 0),
      tokenIn: i.tokenIn,
      amountToApprove: BigInt(i.amountToApprove ?? 0),
      tokenOut: i.tokenOut,
      minTokenOut: BigInt(i.minTokenOut ?? 0),
    })),
    tokens: ep.tokens.map((t) => ({ token: t.token, beneficiary: t.beneficiary })),
    execId: BigInt(ep.execId),
    deadline: BigInt(ep.deadline),
    metadata: ep.metadata ?? ("0x" as const),
  };
  const tokenInputs = [{ permitType: 0, token: tokenInAddress, amount: amountBase, permitCalldata: "0x" as const }];

  const approveData = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [ADAPTER_ADDRESS, amountBase],
  });
  const executeData = encodeFunctionData({
    abi: ADAPTER_ABI,
    functionName: "execute",
    args: [executeParams, tokenInputs, signature],
  });

  return [
    { target: tokenInAddress, allowFailure: false, callData: approveData },
    { target: ADAPTER_ADDRESS, allowFailure: false, callData: executeData },
  ];
}
