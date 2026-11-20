/**
 * Decision memos: an AI captain's reasoning, written into the swap transaction itself.
 *
 * Solidity ignores calldata after the encoded arguments, so a memo can ride at the end of a
 * `swap()` call with no contract change. Anyone can read it back from the transaction input on
 * the explorer and check that the trade matched the odds the captain says it saw.
 */
import { bytesToString, concatHex, hexToBytes, size, slice, stringToHex, type Hex } from "viem";

/** "BOATS1" marks a memo and its version. */
export const MEMO_MAGIC = stringToHex("BOATS1");
/** selector (4 bytes) + tokenIn, tokenOut, amountIn, minOut (4 x 32 bytes) */
export const SWAP_CALLDATA_BYTES = 4 + 4 * 32;

export type DecisionMemo = {
  /** plain-words rule or reason, e.g. "Hike 25bps at 91% (above 70%): move half to Treasuries" */
  why: string;
  /** signal the decision used, e.g. Gemini odds */
  signal?: { source: string; event?: string; contract?: string; probability?: number; at?: string };
  [k: string]: unknown;
};

export function encodeMemo(m: DecisionMemo): Hex {
  return concatHex([MEMO_MAGIC, stringToHex(JSON.stringify(m))]);
}

/** Appends a memo to a swap's calldata. */
export function withMemo(data: Hex, m: DecisionMemo): Hex {
  return concatHex([data, encodeMemo(m)]);
}

/** Reads a memo back from a swap transaction's input, or null if it has none. */
export function decodeSwapMemo(input: Hex): DecisionMemo | null {
  if (size(input) <= SWAP_CALLDATA_BYTES) return null;
  const tail = slice(input, SWAP_CALLDATA_BYTES);
  const magicLen = size(MEMO_MAGIC);
  if (size(tail) <= magicLen || slice(tail, 0, magicLen).toLowerCase() !== MEMO_MAGIC.toLowerCase()) return null;
  try {
    return JSON.parse(bytesToString(hexToBytes(slice(tail, magicLen)))) as DecisionMemo;
  } catch {
    return null;
  }
}
