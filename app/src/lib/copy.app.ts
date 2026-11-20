// UI strings the app needs that design/boats/copy.en.ts doesn't have yet.
// Same rules: plain language, never boat/captain/crew/wallet/gas/KYC. Move these into the design copy when it's next revised.

export const appCopy = {
  nav: {
    invest: "Invest",
    create: "Create",
    openProfile: "Open profile",
    search: "Search",
    notifications: "Notifications",
    modeSwitch: "Investor or manager",
    signedIn: "Signed in with Face ID",
  },
  home: {
    totalInvested: "Total invested",
    todayDown: (delta: string) => `${delta} today`, // delta already carries the minus sign
    ranges: ["1D", "1W", "1M", "All"],
    rangeShort: "1D",
    dismiss: "Dismiss",
    fundsTable: ["Your funds", "Status", "Value", "Today", "Worst case"],
    worstCasePct: (pct: string) => `≈ ${pct}`,
    joined: (n: number, max: number) => `${n} of ${max} joined`,
    empty: {
      title: "You haven't invested yet",
      body: "Pick a fund. You see the worst case before you invest.",
      cta: "Explore funds",
    },
    noActivity: "Your investments and your managers' trades show here.",
    gift: {
      sending: "Sending you $5 of test dollars",
      sendingSub: "On Arc testnet. A few seconds.",
      sent: (amount: string) => `You got ${amount} of test dollars`,
      sentSub: "Now pick a fund and invest.",
      faucetTitle: "Get free test dollars",
      faucetBody: "Circle gives test dollars on Arc. We copy your account address; pick Arc Testnet and paste it.",
      faucetCta: "Open Circle's faucet",
    },
  },
  activity: {
    moved: (asset: string) => `Moved part to ${asset}`,
    invested: (fund: string) => `Invested in ${fund}`,
    investedSub: "Face ID · no fees",
    withdrew: (fund: string) => `Withdrew from ${fund}`,
    closed: (fund: string) => `${fund} closed`,
    closedSub: "Ready to withdraw",
  },
  notices: {
    notDeployedTitle: "Not deployed yet",
    notDeployedBody: "This network has no Boats funds yet. Run the deploy, then reload.",
    offlineTitle: "Offline",
  },
  example: "Example",
} as const;
