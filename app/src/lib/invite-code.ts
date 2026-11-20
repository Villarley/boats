/** The short code shown on an invite ticket, derived from the fund address ("9BD0-88B5"). */
export const inviteCode = (fund: string) => `${fund.slice(2, 6)}-${fund.slice(-4)}`.toUpperCase();
