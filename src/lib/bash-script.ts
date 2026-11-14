export const SCRIPT_FILENAME = "kalicmd-script.sh";

export function extractBashScript(text: string): string | null {
  const blocks = text.matchAll(/```(?:bash|sh|shell)\r?\n([\s\S]*?)\r?\n```/g);
  for (const block of blocks) {
    const script = block[1]?.replace(/\r\n/g, "\n").trim();
    if (script?.startsWith("#!/usr/bin/env bash\n") || script?.startsWith("#!/bin/bash\n")) {
      return `${script}\n`;
    }
  }
  return null;
}

export function downloadScript(script: string, filename: string = SCRIPT_FILENAME) {
  downloadFile(script, filename, "text/x-shellscript;charset=utf-8");
}

export function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
