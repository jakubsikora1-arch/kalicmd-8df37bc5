import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getCatalogTool } from "../../catalog-output";

export default defineTool({
  name: "get_kali_tool",
  title: "Detail nástroje Kali",
  description: "Vrátí veřejný popis, ovládání, pět příkazů nebo funkcí a laboratorní příklad vybraného nástroje.",
  inputSchema: { tool_id: z.enum(["nmap", "wireshark", "metasploit", "burp", "aircrack-ng", "john", "hashcat", "sqlmap", "gobuster", "nikto"]).describe("Identifikátor nástroje z list_kali_tools.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ tool_id }) => {
    const tool = getCatalogTool(tool_id);
    return { content: [{ type: "text", text: `${tool.name}\n${tool.description}\n${tool.control}\n\n${tool.commands.map(c => `${c.type}: ${c.command}\n${c.description}`).join("\n\n")}\n\nPříklad (${tool.exampleType}):\n${tool.example}\n${tool.exampleDescription}` }], structuredContent: { tool } };
  },
});