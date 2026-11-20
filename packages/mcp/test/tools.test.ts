import { describe, expect, it } from "vitest";
import { deployment, parseUsd, resolveToken, usd } from "../src/tools.js";

describe("mcp tool helpers", () => {
  it("parses dollar amounts into USDC base units", () => {
    expect(parseUsd("5")).toBe(5_000_000n);
    expect(parseUsd("$12.50")).toBe(12_500_000n);
    expect(parseUsd(0.25)).toBe(250_000n);
    expect(() => parseUsd("-1")).toThrow();
    expect(() => parseUsd("abc")).toThrow();
  });
  it("formats dollars", () => {
    expect(usd(5_500_000n)).toBe("$5.50");
  });
  it("resolves symbols and plain-words names to deployment tokens", () => {
    expect(resolveToken(deployment, "USDC")).toBe(deployment.tokens.USDC);
    expect(resolveToken(deployment, "treasuries")).toBe(deployment.tokens.USYC);
    expect(resolveToken(deployment, "Bitcoin")).toBe(deployment.tokens.cirBTC);
    expect(() => resolveToken(deployment, "DOGE")).toThrow(/Unknown token/);
  });
  it("points at the live Arc deployment, not zero addresses", () => {
    expect(deployment.chainId).toBe(5042002);
    expect(deployment.factory).not.toMatch(/^0x0{40}$/);
  });
});
