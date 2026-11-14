import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ScriptTemplateForm } from "@/components/script-template-form";

const TPL =
  '#!/bin/bash\n# kalicmd-template: v1\n# kalicmd-param: TARGET | type=host | label=Cíl | required\n# kalicmd-end\nTARGET={{TARGET}}\nping -c1 "$TARGET"\n';

describe("ScriptTemplateForm", () => {
  it("shows field errors, blocks download and never calls the network", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(
      <ScriptTemplateForm open title="Ping" script={TPL} onClose={() => {}} onCopy={() => {}} />,
    );
    expect(screen.getByRole("button", { name: /Stáhnout/ })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Cíl/), { target: { value: "a;id" } });
    expect(screen.getByText(/nepovolené znaky/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Cíl/), { target: { value: "10.0.0.5" } });
    expect(screen.getByRole("button", { name: /Stáhnout/ })).toBeEnabled();
    expect(screen.getByLabelText("Náhled skriptu").textContent).toContain("TARGET='10.0.0.5'");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
