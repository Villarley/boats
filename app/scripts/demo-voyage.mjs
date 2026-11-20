// Runs one complete voyage on Arc testnet as on-chain proof: create, stake, board, sail, swap,
// price move (+25% BTC), checkVoyage (take profit), returnToPort, withdraw, claimCaptain.
// Keys from contracts/.env. Run with NODE_USE_ENV_PROXY=1 behind a proxy.
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { createPublicClient, createWalletClient, http, parseAbi, defineChain, formatUnits } = require("viem"); const { privateKeyToAccount } = require("viem/accounts"); const fs=require("fs"); const solc=require("solc");
const env=Object.fromEntries(fs.readFileSync(join(root, "contracts", ".env"),"utf8").split("\n").filter(l=>l.includes("=")).map(l=>[l.slice(0,l.indexOf("=")),l.slice(l.indexOf("=")+1)]));
const d=JSON.parse(fs.readFileSync(join(root, "app", "src", "config", "arc-deployment.json"),"utf8"));
const RPC="https://rpc.testnet.arc.io"; const ch=defineChain({id:5042002,name:"Arc",nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18},rpcUrls:{default:{http:[RPC]}}});
const pc=createPublicClient({chain:ch,transport:http(RPC)});
const A={dep:privateKeyToAccount(env.DEPLOYER_KEY),cap:privateKeyToAccount(env.CAPTAIN_PRIVATE_KEY),crew:privateKeyToAccount(env.CREW_PRIVATE_KEY)};
const W=(a)=>createWalletClient({chain:ch,transport:http(RPC),account:a});
const dir=join(root, "contracts", "src"); const sources=Object.fromEntries(fs.readdirSync(dir).filter(f=>f.endsWith(".sol")).map(f=>[`src/${f}`,{content:fs.readFileSync(`${dir}/${f}`,"utf8")}]));
const out=JSON.parse(solc.compile(JSON.stringify({language:"Solidity",sources,settings:{optimizer:{enabled:true,runs:200},outputSelection:{"*":{"*":["abi"]}}}})));
const boatAbi=out.contracts["src/Boat.sol"].Boat.abi, facAbi=out.contracts["src/BoatFactory.sol"].BoatFactory.abi, orAbi=out.contracts["src/PriceOracle.sol"].PriceOracle.abi;
const erc=parseAbi(["function approve(address,uint256) returns (bool)","function balanceOf(address) view returns (uint256)"]);
const log=[];
async function send(a,address,abi,functionName,args=[]){ const h=await W(a).writeContract({address,abi,functionName,args}); const r=await pc.waitForTransactionReceipt({hash:h}); if(r.status!=="success") throw new Error(functionName+" reverted "+h); console.log(functionName,h); log.push([functionName,h]); return h; }
const U=(n)=>BigInt(Math.round(n*1e6));
const blk=await pc.getBlock();
const cfg={name:"Trade Winds",captain:A.cap.address,usdc:d.tokens.USDC,oracle:d.oracle,router:d.adapter,assets:[d.tokens.USYC,d.tokens.cirBTC],maxWeightBps:[5000,5000],stopLossBps:1000,takeProfitBps:1000,endTime:blk.timestamp+7n*86400n,feeBps:2000,vestingDuration:0n,inviteOnly:false};
const {result:boat}=await pc.simulateContract({account:A.dep,address:d.factory,abi:facAbi,functionName:"createBoat",args:[cfg]});
await send(A.dep,d.factory,facAbi,"createBoat",[cfg]); console.log("boat",boat);
await send(A.cap,d.tokens.USDC,erc,"approve",[boat,U(1)]); await send(A.cap,boat,boatAbi,"stakeCaptain",[U(1)]);
await send(A.crew,d.tokens.USDC,erc,"approve",[boat,U(2)]); await send(A.crew,boat,boatAbi,"board",[U(2)]);
await send(A.cap,boat,boatAbi,"sail");
await send(A.cap,boat,boatAbi,"swap",[d.tokens.USDC,d.tokens.cirBTC,U(1.5),0n]);
const p=await pc.readContract({address:d.oracle,abi:orAbi,functionName:"price",args:[d.tokens.cirBTC]});
await send(A.dep,d.oracle,orAbi,"setPrice",[d.tokens.cirBTC,p*125n/100n]);
await send(A.dep,boat,boatAbi,"checkVoyage");
await send(A.dep,boat,boatAbi,"returnToPort");
const before=await pc.readContract({address:d.tokens.USDC,abi:erc,functionName:"balanceOf",args:[A.crew.address]});
await send(A.crew,boat,boatAbi,"withdraw");
const after=await pc.readContract({address:d.tokens.USDC,abi:erc,functionName:"balanceOf",args:[A.crew.address]});
console.log("crew got", formatUnits(after-before,6));
await send(A.cap,boat,boatAbi,"claimCaptain");
console.log(JSON.stringify({ boat, log, crewGot: formatUnits(after - before, 6) }, null, 2));
