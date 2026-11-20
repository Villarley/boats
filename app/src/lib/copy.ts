// Boats UI copy — v9. Plain language in flows; nautical words only in the brand and fund names.
// The UI never says: boat, captain, crew, board, voyage, back in port, crypto, DeFi, wallet, gas, KYC, USDC (outside "technical details").
// Contracts keep their names (Boat, board(), checkVoyage()); only the UI text changes.

export const terms = {
  fund: "fund", funds: "funds",
  invest: "Invest", withdraw: "Withdraw",
  investor: "Investor", manager: "Manager",
  lossLimit: "Loss limit", profitTarget: "Profit target",
  safety: "Safety",
  status: { open: "Open to join", active: "Active", closing: "Closing", closed: "Closed" },
  risk: { low: "Low risk", medium: "Medium risk", high: "Higher risk" },
} as const;

export const copy = {
  tabs: { home: "Home", explore: "Explore", activity: "Activity" },
  managerTabs: { dashboard: "Dashboard", trade: "Trade", activity: "Activity" },

  home: {
    welcome: (name: string) => `Welcome back, ${name}`,
    // FolderCard (mobile + web)
    folderTabs: ["Overview", "My funds"],
    youHave: (name: string) => `Hi ${name}, you have`,
    today: (delta: string) => `+${delta} today`,
    chartLabel: "Last 7 days",
    chartAxis: ["Mon", "Today"],
    protectionStrip: (manager: string, amount: string) => `${manager} covers the first ${amount} of losses`,
    invite: "Invite family",
    promoTitle: "Know your worst case first",
    promoBody: "Every fund shows what you could lose before you invest.",
    promoRow: (fund: string) => `${fund}, if it falls 10%`,
    promoTag: (manager: string, amount: string) => `${manager} covers ${amount}`,
    familyTitle: "Invest together with family",
    familyBody: "Invite them to Safe Harbor or start a private fund.",
    familyPot: "Family fund",
    yourFunds: "Your funds", seeAll: "See all",
    recent: "Recent activity",
  },

  explore: {
    title: "Explore", search: "Search funds",
    filters: ["All", "Safe", "Balanced", "Bold", "AI managers"],
    allFunds: "All funds",
    heroSub: (manager: string) => `${manager}, verified · covers first losses`,
  },

  fund: {
    value: "Fund value",
    // CushionCard
    cushionTitle: "If the fund falls",
    cushion: (manager: string, stake: string) => `${manager} loses ${stake} before you lose $1`,
    cushionBar: (manager: string) => `${manager}'s money`,
    cushionAxis: ["0%", "−5%", "−10% closes"],
    holds: "What it holds",
    oddsSource: "Gemini market",
    oddsQuestion: "Will the Fed cut rates in December?",
    oddsHint: "When odds rise, the manager can move more into Treasuries.",
    managerActivity: "Manager activity",
    worstCase: (amount: string) => `Worst case: about ${amount}`,
  },

  invest: {
    title: (fund: string) => `Invest in ${fund}`,
    balance: "USDC balance", // demo only (testnet). Production uses payWith.
    available: (v: string) => `${v} available`,
    quick: ["MAX", "50%", "25%", "Clear"],
    review: "Review",
    sheetTitle: "Review",
    youInvestIn: (fund: string) => `You invest in ${fund}`,
    // WorstCaseGauge
    worstCaseLabel: "Worst case, if it falls 10%",
    youKeep: (amount: string) => `You keep about ${amount}`,
    // LabelRows (Apple Pay style)
    rows: { shares: "Shares", coveredBy: "Covered by", coveredByNote: (m: string) => `${m}, first`, fee: "Network fee", feeNote: "Boats pays it", free: "Free" },
    disclaimer: "Not a guarantee: the fund closes itself at −10%, the exact exit price can vary.",
    cta: "Invest with Face ID",
  },

  // D: production money in/out (not in the hackathon demo)
  payWith: {
    label: "Pay with",
    quick: ["$50", "$100", "$250", "Other"],
    methods: { applePay: "Apple Pay", card: "Debit card", balance: "Boats balance" },
    instant: "Instant", alreadyHere: "Already here",
    youPay: (amount: string) => `${amount} · no fees`,
    cta: "Continue",
  },
  verify: {
    title: "Verify it's you",
    body: "Only the first time you add money. It keeps your account safe.",
    steps: [
      ["Photo of your ID", "Cédula, passport or driver's license"],
      ["Quick selfie", "To match it with your ID"],
      ["Done in about 2 minutes", "Then you can pay with Apple Pay or card"],
    ],
    privacy: "Checked by our payments partner. Boats never sees your card.",
    cta: "Start",
  },
  withdrawMoney: {
    title: "Withdraw",
    from: (fund: string) => `From ${fund} · all of it`,
    sendTo: "Send it to",
    card: (last4: string) => `Debit card •• ${last4}`, cardNote: "The one you paid with", minutes: "Minutes",
    bank: "Bank account", days: "1–2 days",
    receive: "You'll receive", fee: "Fee",
    cta: "Withdraw with Face ID",
  },

  blocked: {
    title: "Your money is safe",
    body: "The manager tried to buy Bitcoin. Safe Harbor doesn't allow it, so the fund's rules stopped it on their own.",
    rows: [
      { title: (amt: string) => `Your ${amt}`, sub: "Still invested, nothing moved" },
      { title: "Manager's trade", sub: "Cancelled, not in the fund's rules" },
      { title: "Can the manager take it?", sub: "No. Only you can withdraw" },
    ],
    ok: "Got it", details: "See technical details",
  },

  closed: {
    title: "Your fund closed",
    getBack: "You get back",
    putIn: (amt: string) => `You put in ${amt}`,
    // Timeline (time stamps in mono caps)
    events: [
      { title: "The market fell 10%", sub: "The fund reached its loss limit and closed itself" },
      { title: (m: string) => `${m}'s money paid first`, sub: "All of it went to cover the loss" },
      { title: "You lost only 1%", sub: (from: string, to: string) => `Your ${from} is now ${to}, ready to withdraw` },
    ],
    now: "Now",
    cta: (amt: string) => `Withdraw ${amt}`,
  },

  profile: {
    title: "Profile",
    manageOthers: "Manage money for others",
    manageOthersSub: "For your family, or as a professional.",
    rows: ["Face ID passkey", "Money accounts", "Notifications", "Invite family", "Help"],
    signOut: "Sign out",
    verified: "Verified manager",
  },

  becomeManager: {
    title: "Who will you manage money for?",
    sub: "Either way, you put in your own money first and cover the first losses.",
    family: { title: "Family and friends", desc: "A private fund for people you know.",
      facts: [["Who can join", "People with your link"], ["Approval", "Not needed"], ["Limit", "10 people · $25,000"]] },
    pro: { title: "Professional or firm", desc: "A public fund anyone can find in Explore.",
      facts: [["Who can join", "Anyone"], ["Approval", "License, track record"], ["Limit", "None · Verified badge"]] },
    review: { badge: "Under review", title: "We're checking your application",
      body: "You can keep investing as usual. We'll let you know when you can create a public fund." },
  },

  privateJoin: {
    // Ticket + WalletStack
    stackTitle: (n: number) => `Invitations · ${n}`,
    from: (name: string) => `From ${name}`,
    ticketKicker: "Private fund · invite",
    invitedYou: (n: string) => `${n} invited you`,
    familyManager: "Family manager · not verified",
    covers: (n: string) => `${n} covers`,
    fundValue: "Fund value",
    spots: (n: number, max: number) => `${n} of ${max} spots taken`,
    inviteCode: "Invite code", expires: "Expires",
    cantWithdraw: (n: string) => `${n} can trade, but he can't withdraw your money.`,
    joined: (n: number, max: number) => `${n} of ${max} people joined`,
    roomLeft: (v: string) => `${v} room left`,
    confirm: (n: string) => `I know ${n} personally. This fund isn't reviewed by Boats.`,
    success: (fund: string) => `You're in the ${fund}`,
    successBody: (n: string) => `${n} gets a notification. Your money starts working when he closes joining.`,
  },

  manager: {
    atRisk: "Your money at risk",
    stackYou: (v: string) => `You ${v} · lose first`,
    stackInvestors: (v: string) => `Investors ${v}`,
    trade: "Trade", create: "Create",
    rules: "Your rules", fee: "Your fee", feeSub: "20% of investors' profit, paid out over time",
    tradeTitle: (fund: string) => `Trade · ${fund}`,
    sell: "Sell", buy: "Buy",
    weightAfter: (a: string) => `${a} after this trade`,
    weightHint: "The red mark is the fund's limit. A trade past it won't go through.",
    noWithdraw: "You can't withdraw investors' money",
    noWithdrawSub: "Managers can only trade inside the rules",
    reviewTrade: "Review trade",
  },

  createFund: {
    title: "Create a fund",
    step: (n: number) => `Step ${n} of 4`,
    assetsTitle: "What can the fund hold?",
    assetsSub: "You can only trade into what you pick here. It can't change after launch.",
    search: "Search assets on Arc",
    filters: ["All", "Stablecoins", "Yield", "Crypto"],
    always: "Always",
    limitsTitle: "Set the limits",
    lossLimitHint: "Fund closes itself at this drop",
    profitHint: "Fund closes and pays out",
    maxHint: "No asset can pass this share",
    maxLabel: "Max in one asset",
    score: "Safety score", scoreSub: "What investors will see",
    factors: ["Loss limit", "Asset risk", "Max in one asset", "Track record", "Your stake"],
    nextStep: "Next step",
  },
} as const;
