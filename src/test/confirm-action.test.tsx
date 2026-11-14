import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmAction } from "@/components/confirm-action";

afterEach(cleanup);
describe("Destructive action confirmation", () => {
  it("does not delete when the confirmation is cancelled", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmAction open title="Odstranění" description="Nevratná operace" onCancel={onCancel} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Zrušit" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
  it("deletes only after explicit confirmation", () => {
    const onConfirm = vi.fn();
    render(<ConfirmAction open title="Odstranění" description="Nevratná operace" onCancel={vi.fn()} onConfirm={onConfirm} />);
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Smazat" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
  it("prevents duplicate deletion while a request is pending", () => {
    const onConfirm = vi.fn();
    render(<ConfirmAction open pending title="Odstranění" description="Nevratná operace" onCancel={vi.fn()} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Mažu…" }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});