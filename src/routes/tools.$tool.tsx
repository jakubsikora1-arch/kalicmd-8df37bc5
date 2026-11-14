import { createFileRoute, notFound } from "@tanstack/react-router";
import { CommandWorkspace } from "@/components/command-workspace";
import { findTool } from "@/lib/tool-catalog";

export const Route = createFileRoute("/tools/$tool")({
  loader: ({ params }) => {
    const tool = findTool(params.tool);
    if (!tool) throw notFound();
    return { toolId: tool.id, name: tool.name };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.name} — příkazy a AI | KaliCmd` : "Nástroj nenalezen | KaliCmd";
    const description = loaderData ? `Základní informace, pět praktických příkazů a AI generátor pro ${loaderData.name} v Kali Linuxu.` : "Požadovaný nástroj není v katalogu KaliCmd.";
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] };
  },
  component: ToolPage,
});

function ToolPage() {
  const { toolId } = Route.useLoaderData();
  const tool = findTool(toolId);
  if (!tool) return null;
  return <CommandWorkspace key={tool.id} tool={tool} />;
}