import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

const client = new Client({ name: "boats-verification", version: "1.0.0" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["--import", "tsx", fileURLToPath(new URL("../src/server.ts", import.meta.url))],
  cwd: fileURLToPath(new URL("../../../", import.meta.url)),
  env: { PATH: process.env.PATH ?? "", BOATS_RPC_URL: "https://rpc.example/private-endpoint-token" },
  stderr: "pipe",
});

beforeAll(async () => { await client.connect(transport); });
afterAll(async () => { await client.close(); });

describe("MCP over stdio (no RPC or private key)", () => {
  it("does not disclose a configured credential-bearing RPC URL", async () => {
    const result = await client.callTool({ name: "boats_deployment", arguments: {} });
    expect(result.structuredContent).toMatchObject({ chainId: 5042002, rpcUrl: "https://rpc.testnet.arc.io", customRpcConfigured: true, signer: null });
    expect(JSON.stringify(result)).not.toContain("private-endpoint-token");
  });
  it("discovers all 14 tools with explicit read/write annotations", async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(14);
    for (const tool of tools) expect(tool.annotations?.readOnlyHint).toBe(!["boats_act", "boats_create"].includes(tool.name));
    const act = tools.find(t => t.name === "boats_act")!;
    expect(JSON.stringify(act.inputSchema)).toContain('"stake"');
    expect(JSON.stringify(act.inputSchema)).toContain('"sail"');
  });
  it("returns matching structured data and readable text for an unsigned create", async () => {
    const result = await client.callTool({ name: "boats_create", arguments: { name: "Agent voyage", captain: "0x0000000000000000000000000000000000000001", assets: [{ token: "treasuries", maxWeightPct: 70 }], stopLossPct: 10, takeProfitPct: 15, captainFeePct: 20, days: 7, dryRun: true } });
    expect(result.structuredContent).toMatchObject({ ok: true, signed: false });
    const content = result.content as { type: string; text: string }[];
    expect(JSON.parse(content[0]!.text)).toEqual(result.structuredContent);
  });
  it("discovers and reads evidence and playbook without RPC or keys", async () => {
    const { resources } = await client.listResources();
    expect(resources.map(r => r.uri).sort()).toEqual(["boats://evidence", "boats://playbook", "boats://proof-report"]);
    const evidence = await client.readResource({ uri: "boats://evidence" });
    const evidenceContent = evidence.contents[0]!;
    if (!("text" in evidenceContent)) throw new Error("Expected a text resource");
    const manifest = JSON.parse(evidenceContent.text);
    expect(manifest).toMatchObject({ schemaVersion: "1.0", chainId: 5042002 });
    const playbook = await client.readResource({ uri: "boats://playbook" });
    const playbookContent = playbook.contents[0]!;
    if (!("text" in playbookContent)) throw new Error("Expected a text resource");
    expect(playbookContent.text).toContain("Never blindly repeat");
  });
  it("provides a review prompt that requires explicit intent before unsigned planning", async () => {
    expect((await client.listPrompts()).prompts.map(p => p.name)).toContain("review_voyage");
    const prompt = await client.getPrompt({ name: "review_voyage", arguments: { boat: "0x0000000000000000000000000000000000000001", amountUsd: "5" } });
    expect(JSON.stringify(prompt)).toContain("dryRun:true");
    expect(JSON.stringify(prompt)).toContain("Do not infer permission");
  });
});
