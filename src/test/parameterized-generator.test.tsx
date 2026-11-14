import { fireEvent, render, screen, cleanup, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ParameterizedCommandGenerator } from "@/components/parameterized-command-generator";

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("parameter generator interaction", () => {
  it("copies the exact generated output and makes no network call", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<ParameterizedCommandGenerator initialTool="nmap" />);
    fireEvent.change(screen.getByLabelText("Vlastní host / IP / CIDR"), {
      target: { value: "192.168.1.20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sestavit výstup" }));
    fireEvent.click(screen.getByRole("button", { name: "Kopírovat sestavený výstup" }));
    await waitFor(() => expect(screen.getByText("Zkopírováno")).toBeInTheDocument());
    expect(writeText).toHaveBeenCalledWith(
      "nmap '-sT' '-p' '22,80,443' '-T2' '--max-retries' '1' '--host-timeout' '60s' '192.168.1.20'",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
  it("clears stale output when input changes and refuses injected input", () => {
    render(<ParameterizedCommandGenerator initialTool="nmap" />);
    fireEvent.click(screen.getByRole("button", { name: "Sestavit výstup" }));
    expect(screen.getByRole("button", { name: "Kopírovat sestavený výstup" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Vlastní host / IP / CIDR"), {
      target: { value: "192.168.1.20;id" },
    });
    expect(
      screen.queryByRole("button", { name: "Kopírovat sestavený výstup" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sestavit výstup" }));
    expect(screen.getByRole("alert")).toHaveTextContent("platný hostname");
    expect(
      screen.queryByRole("button", { name: "Kopírovat sestavený výstup" }),
    ).not.toBeInTheDocument();
  });
});
