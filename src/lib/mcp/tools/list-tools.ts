import { defineTool } from "@lovable.dev/mcp-js";
import { listCatalog } from "../../catalog-output";

export default defineTool({
  name: "list_kali_tools",
  title: "Katalog TOP 10",
  description: "Vypíše veřejný katalog deseti nástrojů Kali Linuxu s identifikátory a kategoriemi.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const tools = listCatalog();
    return { content: [{ type: "text", text: tools.map(t => `${t.rank}. ${t.name} (${t.id}) — ${t.category}`).join("\n") }], structuredContent: { tools } };
  },
});