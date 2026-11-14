import { findTool, toolCatalog } from "./tool-catalog";

export function listCatalog() {
  return toolCatalog.map(({ id, rank, name, category }) => ({ id, rank, name, category }));
}

export function getCatalogTool(id: unknown) {
  const tool = findTool(id);
  if (!tool) throw new Error("Neznámý nástroj katalogu.");
  return {
    id: tool.id, rank: tool.rank, name: tool.name, category: tool.category,
    description: tool.info, control: tool.control,
    commands: tool.commands.map(({ title, command, description, type }) => ({ title, command, description, type })),
    example: tool.example, exampleType: tool.exampleType, exampleDescription: tool.exampleDescription,
  };
}