// Strings the mock screens (/mock) need that copy.ts and copy.app.ts don't have yet.
// Same rules: plain language, people and dollars. Move into the design copy when it's next revised.

export const mockCopy = {
  index: {
    title: "Example screens",
    sub: "Flows that come after the demo, filled with example data. Nothing here moves money.",
    groups: [
      { title: "Money in and out", codes: ["d1", "d2", "d3", "d4"] },
      { title: "Become a manager", codes: ["m2"] },
      { title: "Private fund", codes: ["p1", "p2", "p3", "p4"] },
    ],
    screens: {
      d1: { name: "Pay with", sub: "Choose Apple Pay, card or Boats balance" },
      d2: { name: "Verify it's you", sub: "First time you add money" },
      d3: { name: "Apple Pay", sub: "The system sheet" },
      d4: { name: "Withdraw", sub: "Back to your card or bank" },
      m2: { name: "Under review", sub: "Professional manager application" },
      p1: { name: "Invitations", sub: "Private fund invites, stacked" },
      p2: { name: "Private fund", sub: "Who's in and how much room is left" },
      p3: { name: "Review", sub: "Confirm you know the manager" },
      p4: { name: "Joined", sub: "You're in" },
    } as Record<string, { name: string; sub: string }>,
  },

  pay: {
    worstCase: "Worst case: about",
    other: "Other",
    youPay: "You pay",
    visa: "VISA",
    applePayMark: "Pay",
    amountLabel: "Amount",
  },

  verify: { idCard: "ID card" },

  applePay: {
    mark: "Apple Pay",
    card: "Card",
    cardValue: (brand: string, last4: string) => `${brand} •• ${last4}`,
    payTo: "Pay to",
    payToValue: (fund: string) => `Boats · ${fund}`,
    total: "Total",
    confirm: "Confirm with Side Button",
    close: "Close",
  },

  withdraw: {
    bankValue: (bank: string, last4: string) => `${bank} •• ${last4}`,
  },

  application: {
    title: "Manager application",
    steps: {
      identity: { title: "Identity", sub: "Verified" },
      documents: { title: "Company documents", sub: "Received" },
      license: { title: "License", sub: "Being reviewed", badge: "Pending" },
      track: { title: "Track record", sub: "Add past results", badge: "To do" },
    },
    edit: "Edit",
    done: "Done",
  },

  invites: {
    notNow: "Not now",
    seeFund: "See fund",
    days: (n: number) => `${n} days`,
    showInvite: (fund: string) => `Show ${fund}`,
  },

  privateFund: {
    badge: "Private · invite only",
    statusLine: "Open to join · Low risk",
    amountIn: (v: string) => `${v} in`,
    coversFirstLosses: (n: string) => `${n} covers first losses`,
    holds: "What it holds",
    holdsValue: "Treasuries, euros, dollars",
    invest: "Invest",
    notifications: "Notifications",
    more: (n: number) => `+${n}`,
    joinedCount: (n: number, max: number) => `${n} of ${max}`,
    joinedTail: "people joined",
  },

  review: {
    youInvest: "You invest",
    coversFirst: (n: string) => `${n} covers first`,
    ifFalls: (pct: number) => `If the fund falls ${pct}%`,
    takesTheLoss: (n: string, v: string) => `${n}'s ${v} takes the loss`,
  },

  joined: {
    youInvested: "You invested",
    status: "Status",
    statusSub: (n: number, max: number) => `Open to join · ${n} of ${max} people`,
    tellYou: "We'll tell you",
    tellYouSub: "When it starts and if anything changes",
    goHome: "Go to Home",
  },
} as const;
