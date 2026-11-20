/**
 * Calldata builders. Each returns plain {to, data, value} calls, so any wallet can send them:
 * a passkey smart account batches them into ONE user operation (one Face ID), an EOA sends them in order.
 */
import { encodeFunctionData, type Address, type Hex } from "viem";
import { boatAbi, factoryAbi } from "./abi.js";

export type Call = { to: Address; data: Hex; value?: bigint };

const approveAbi = [
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;

export const approve = (token: Address, spender: Address, amount: bigint): Call => ({
  to: token,
  data: encodeFunctionData({ abi: approveAbi, functionName: "approve", args: [spender, amount] }),
});

const boatCall = (boat: Address, data: Hex): Call => ({ to: boat, data });

/** Passenger boards: approve exactly `amount`, then board. */
export function buildBoardCalls(boat: Address, usdc: Address, amount: bigint): Call[] {
  return [approve(usdc, boat, amount), boatCall(boat, encodeFunctionData({ abi: boatAbi, functionName: "board", args: [amount] }))];
}

export const buildWithdrawCall = (boat: Address): Call =>
  boatCall(boat, encodeFunctionData({ abi: boatAbi, functionName: "withdraw" }));

/** Captain stakes the first-loss amount (and optionally sails right away). */
export function buildStakeCalls(boat: Address, usdc: Address, amount: bigint, sail = false): Call[] {
  const calls = [approve(usdc, boat, amount), boatCall(boat, encodeFunctionData({ abi: boatAbi, functionName: "stakeCaptain", args: [amount] }))];
  if (sail) calls.push(buildSailCall(boat));
  return calls;
}

export const buildSailCall = (boat: Address): Call => boatCall(boat, encodeFunctionData({ abi: boatAbi, functionName: "sail" }));

export const buildSwapCall = (boat: Address, tokenIn: Address, tokenOut: Address, amountIn: bigint, minOut = 0n): Call =>
  boatCall(boat, encodeFunctionData({ abi: boatAbi, functionName: "swap", args: [tokenIn, tokenOut, amountIn, minOut] }));

export const buildClaimCaptainCall = (boat: Address): Call =>
  boatCall(boat, encodeFunctionData({ abi: boatAbi, functionName: "claimCaptain" }));

/** Public calls anyone can make (keeper, a passenger, a bot). */
export const buildCheckVoyageCall = (boat: Address): Call => boatCall(boat, encodeFunctionData({ abi: boatAbi, functionName: "checkVoyage" }));
export const buildReturnToPortCall = (boat: Address): Call => boatCall(boat, encodeFunctionData({ abi: boatAbi, functionName: "returnToPort" }));

export type BoatConfigInput = {
  name: string;
  captain: Address;
  usdc: Address;
  oracle: Address;
  router: Address;
  assets: Address[];
  maxWeightBps: number[];
  stopLossBps: number;
  takeProfitBps: number;
  endTime: bigint;
  feeBps: number;
  vestingDuration: bigint;
};

export const buildCreateBoatCall = (factory: Address, c: BoatConfigInput): Call => ({
  to: factory,
  data: encodeFunctionData({ abi: factoryAbi, functionName: "createBoat", args: [c] }),
});
