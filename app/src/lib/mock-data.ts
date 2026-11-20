// Example data for the mock screens (/mock). Not on-chain, nothing here moves money.
// Names and numbers follow design/README.md "Demo data"; card and bank are examples.
import type { Manager } from "./fund";

/** Dollars as text: 100 → "$100", 100.5 → "$100.50", with { cents: true } → "$100.00". */
export function dollars(n: number, { cents }: { cents?: boolean } = {}) {
  const showCents = cents || !Number.isInteger(n);
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: showCents ? 2 : 0, maximumFractionDigits: showCents ? 2 : 0 })}`;
}

/** A loss as text with a real minus sign: 1 → "−$1". */
export const minusDollars = (n: number) => `−${dollars(n)}`;

export type Accent = "navy" | "signal" | "slate" | "sky" | "teal" | "indigo";
export type Person = { initial: string; color: Accent };

const person = (name: string, verified = false): Manager => {
  const initials = name.split(/\s+/).map((w) => w[0]!.toUpperCase()).slice(0, 1).join("");
  return { name, first: name.split(" ")[0]!, initials, kind: "person", verified };
};

export type MockInvite = {
  id: string;
  fund: string;
  manager: Manager;
  /** Header-strip color when this invite sits behind the active one. */
  accent: Accent;
  /** Avatar color on the header strip. */
  avatar: Accent;
  stake: number;
  lossLimitPct: number;
  value: number;
  taken: number;
  max: number;
  members: Person[];
  code: string;
  expiresDays: number;
};

export const mockData = {
  /** D1–D4: an investment in Safe Harbor paid with normal money. */
  pay: {
    fund: "Safe Harbor",
    amounts: [50, 100, 250],
    initial: 100,
    /** Safe Harbor: Laura covers the first $1,000, so a −10% drop costs about 1%. */
    worstCaseShare: 0.01,
    balance: 318,
    card: { brand: "Visa", last4: "4821" },
  },
  withdraw: {
    fund: "Safe Harbor",
    amount: 99,
    card: { last4: "4821" },
    bank: { name: "BAC", last4: "0193" },
  },

  /** M2: professional path, application pending. */
  application: { steps: ["identity", "documents", "license", "track"] as const },

  /** P1–P4: María's cousin Carlos invites her to his private fund. */
  privateFund: {
    fund: "Rojas Family Fund",
    manager: person("Carlos Rojas"),
    stake: 500,
    lossLimitPct: -10,
    value: 4800,
    cap: 25000,
    taken: 4,
    max: 10,
    safety: 92,
    invest: 200,
    /** If it falls 10%, Carlos's $500 covers the loss on $5,000, so the investor loses $0. */
    worstCase: 0,
    joiners: [
      { initial: "C", color: "navy" },
      { initial: "A", color: "signal" },
      { initial: "L", color: "slate" },
    ] as Person[],
    moreJoiners: 1,
  },

  /** Invitations, newest last: the last one is in front of the stack. */
  invites: [
    {
      id: "ruiz", fund: "Ruiz Friends Fund", manager: person("Diego Ruiz"), accent: "teal", avatar: "navy",
      stake: 800, lossLimitPct: -8, value: 6200, taken: 6, max: 10,
      members: [{ initial: "M", color: "navy" }, { initial: "J", color: "sky" }, { initial: "P", color: "indigo" }],
      code: "RZF-8K1D", expiresDays: 3,
    },
    {
      id: "gomez", fund: "Gómez Trip Fund", manager: person("Ana Gómez"), accent: "indigo", avatar: "sky",
      stake: 300, lossLimitPct: -10, value: 2100, taken: 3, max: 8,
      members: [{ initial: "R", color: "navy" }, { initial: "T", color: "teal" }, { initial: "E", color: "signal" }],
      code: "GMZ-2T9A", expiresDays: 5,
    },
    {
      id: "rojas", fund: "Rojas Family Fund", manager: person("Carlos Rojas"), accent: "sky", avatar: "slate",
      stake: 500, lossLimitPct: -10, value: 4800, taken: 4, max: 10,
      members: [{ initial: "A", color: "navy" }, { initial: "L", color: "sky" }, { initial: "S", color: "teal" }],
      code: "RJS-4F2K", expiresDays: 7,
    },
  ] as MockInvite[],
};
