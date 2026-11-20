import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

const client = new Client({ name: "boats-verification", version: "1.0.0" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["--import", "tsx", fileURLToPath(new URL("../src/server.ts", import.meta.url))],
  cwd: fileURLToPath(new URL("../../../", import.meta.url)),
  env: { PATH: process.env.PATH ?? "" },
  stderr: "pipe",
});

beforeAll(async () => { await client.connect(transport); });
afterAll(async () => { await client.close(); });

describe("MCP over stdio (no RPC or private key)", () => {
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
});
