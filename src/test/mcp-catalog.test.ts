import { describe, expect, it } from "vitest";
import { getCatalogTool, listCatalog } from "../lib/catalog-output";

describe("public MCP catalog boundary", () => {
  it("exposes only the ten public catalog entries", () => {
    expect(listCatalog()).toHaveLength(10);
    const first = listCatalog()[0];
    if (!first) throw new Error("Missing catalog entry");
    expect(Object.keys(first)).toEqual(["id", "rank", "name", "category"]);
  });
  it("returns exactly five public commands without browser session data", () => {
    const tool = getCatalogTool("burp");
    expect(tool.commands).toHaveLength(5);
    expect(tool.commands.map(c => c.type)).toEqual(["shell", "shell", "shell", "gui", "gui"]);
    expect(Object.keys(tool)).toEqual(["id", "rank", "name", "category", "description", "control", "commands", "example", "exampleType", "exampleDescription"]);
  });
  it("rejects non-catalog targets", () => {
    expect(() => getCatalogTool("saved_scripts")).toThrow();
  });
});