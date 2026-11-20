/**
 * @boats/sdk: the protocol layer for Boats.
 * Contracts hold the money and enforce the mandate; this SDK is everything an app, a bot or a keeper
 * needs to read boats, check a trade before sending it, and build the calls to send.
 */
export * from "./abi.js";
export * from "./addresses.js";
export * from "./calls.js";
export * from "./chain.js";
export * from "./gemini.js";
export * from "./keeper.js";
export * from "./mandate.js";
export * from "./reads.js";
export * from "./score.js";
export * from "./wallet.js";
export * from "./waterfall.js";
