import { describe, expect, it } from "vitest";
import { boatsToCheck, TRADED_TOPIC } from "./keeper-scope";

const A = "0x00000000000000000000000000000000000000a1";
const B = "0x00000000000000000000000000000000000000b1";
const PRICE = "0xb556fac599c3c70efb9ab1fa725ecace6c81cc48d1455f886607def065f3e0c0";

describe("boatsToCheck", () => {
  it("checks every boat with no payload (cron, button)", () => {
    expect(boatsToCheck([A, B], null)).toEqual([A, B]);
  });
  it("checks only the traded boat for a Traded log", () => {
    expect(boatsToCheck([A, B], { logs: [{ address: B.toUpperCase().replace("0X", "0x"), topics: [TRADED_TOPIC] }] })).toEqual([B]);
  });
  it("checks every boat when a price moved", () => {
    expect(boatsToCheck([A, B], { logs: [{ address: "0xoracle", topics: [PRICE] }, { address: A, topics: [TRADED_TOPIC] }] })).toEqual([A, B]);
  });
});
