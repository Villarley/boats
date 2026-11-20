// Boats UI copy v2 (English, the demo language). Plain words. Never: "crypto", "DeFi", "token", "gas", "wallet", "APY", "you can't lose".
export const copy = {
  brand: { name: "Boats", tagline: "Your money sails. Nobody can take it." , pitch: "The market fell 10%. Grandma lost 1%." },
  terms: { // UI word -> what it means (use the UI word everywhere)
    boat: "a fund with one voyage", captain: "the person or AI who manages it", crew: "everyone who boarded",
    voyage: "the trip: it ends at the floor, the goal or the date", board: "put money in", returnToPort: "back to dollars, ready to withdraw",
    floor: "stop loss", goal: "take profit", captainStake: "the captain's own money, lost first", rules: "the mandate",
    seaworthy: "seaworthiness score, 0-100",
  },
  auth: { title: "Welcome aboard", body: "Sign in with your face. No passwords, no seed phrases.", cta: "Continue with Face ID", done: "You're in." },
  add: { title: "Add dollars", body: "Your money stays in dollars (USDC) until you board a boat.", fee: "No fees to move money", cta: "Add $" },
  market: { title: "Choose a boat", sub: "Every boat has a floor. You see the worst case before you board." },
  score: { calm: "Calm waters", choppy: "Choppy", rough: "Rough seas" },
  card: {
    worstCase: (pct: string) => `Worst case: you lose about ${pct}`,
    captainFirst: (usd: string) => `Captain puts in ${usd} and loses it first`,
    goal: (pct: string) => `Goal: +${pct}`,
    odds: (q: string, p: string) => `Market odds: ${q} ${p}`,
  },
  board: {
    title: (boat: string) => `Board ${boat}`, amount: "How much?",
    summary: (usd: string, worst: string) => `You put in ${usd}. If things go badly, you get back at least about ${worst}.`,
    cta: "Board with Face ID", done: "You're on board. The voyage starts when boarding closes.",
  },
  voyage: {
    sailing: "Sailing", boarding: "Boarding", returned: "Back in port",
    floorLabel: "Floor", goalLabel: "Goal", you: "Your share", captain: "Captain's stake",
    blocked: "Blocked by the boat's rules", blockedBody: (asset: string) => `The captain tried to buy ${asset}. It's not on this boat's list, so the contract said no.`,
    allowed: "Trade inside the rules",
  },
  port: {
    title: "The boat is back in port",
    hero: (market: string, you: string) => `The market fell ${market}. You lost ${you}.`,
    why: (usd: string) => `The captain's ${usd} took the hit first.`,
    cta: "Withdraw to my dollars",
  },
  voice: { hint: "Ask me anything about your boat", example: "\"How is my boat doing?\"" },
  errors: {
    faceId: "Face ID didn't work. Try again, or use your device code.",
    funds: (usd: string) => `You have ${usd}. Add dollars or board with less.`,
    network: "We couldn't reach the network. Your money hasn't moved. Try again.",
  },
} as const;
