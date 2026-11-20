// Boats UI copy v2 (English, the demo language). Plain words. Never: "crypto", "DeFi", "token", "gas", "wallet", "APY", "you can't lose".
export const copy = {
  brand: { name: "Boats", tagline: "A fund manager who can't take your money.", pitch: "The market fell 10%. Grandma lost 1%." },
  // Headline rules: sentence case with a period, 8 words max, a number beats an adjective.
  terms: { // UI word -> what it means (use the UI word everywhere)
    boat: "a fund with one voyage", captain: "the person or AI who manages it", crew: "everyone who boarded",
    voyage: "the trip: it ends at the floor, the goal or the date", board: "put money in", returnToPort: "back to dollars, ready to withdraw",
    floor: "stop loss", goal: "take profit", captainStake: "the captain's own money, lost first", rules: "the mandate",
    seaworthy: "seaworthiness score, 0-100",
  },
  auth: { title: "Your money, with a captain.", body: "Someone you trust invests it. Nobody can take it out.", cta: "Continue with Face ID", fine: "No passwords. No seed phrases.", done: "You're in." },
  add: { title: "Add dollars", meta: [{ icon: "Zap", text: "Arrives in seconds" }, { icon: "BadgeCheck", text: "No fees" }], cta: "Add $" },
  // Never join metadata with dots or pipes. Render each piece as an icon + label pair (see icons.md).
  market: { title: "Pick a boat.", sub: "You see the worst case before you board." },
  home: { title: "All my money", inDollars: "In dollars", onBoats: "On boats" },
  invite: { title: "Save Mom a seat.", sub: "She sees the rules and the worst case before she puts in a dollar.", message: "Mamá, te guardé un lugar en mi bote. Lo peor que puede pasar es que pierdas 1%.", cta: "Send on WhatsApp", copy: "Copy link" },
  launch: { title: "Set rules your crew can trust." },
  score: { calm: "Calm waters", choppy: "Choppy", rough: "Rough seas" },
  card: {
    worstCase: (pct: string) => `Worst case: you lose about ${pct}`,
    captainFirst: (usd: string) => `Captain puts in ${usd} and loses it first`,
    goal: (pct: string) => `Goal: +${pct}`,
    odds: (q: string, p: string) => `Market odds: ${q} ${p}`,
  },
  board: {
    title: (boat: string) => `Board ${boat}`, amount: "How much?",
    youPutIn: "You put in", worstLine: "Worst case, you keep", lockLine: "Locked until",
    cta: "Board with Face ID", done: "You're on board. The voyage starts when boarding closes.",
  },
  voyage: {
    sailing: "Sailing", boarding: "Boarding", returned: "Back in port",
    floorLabel: "Floor", goalLabel: "Goal", you: "Your share", captain: "Captain's stake",
    blocked: "The contract said no.", blockedBody: (asset: string) => `Tried to buy ${asset}. Not on this boat's list.`,
    allowed: "Trade inside the rules",
  },
  port: {
    title: "Back in port",
    hero: (market: string) => `The market fell ${market}.`, headline: "That's all you lost.",
    why: (captain: string, usd: string) => `Captain ${captain}'s ${usd} took the hit first.`, again: "Board the next voyage",
    cta: (usd: string) => `Withdraw ${usd}`,
  },
  voice: { hint: "Ask me anything about your boat", example: "\"How is my boat doing?\"" },
  errors: {
    faceId: "Face ID didn't work. Try again, or use your device code.",
    funds: (usd: string) => `You have ${usd}. Add dollars or board with less.`,
    network: "We couldn't reach the network. Your money hasn't moved. Try again.",
  },
} as const;
