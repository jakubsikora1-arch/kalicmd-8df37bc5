// Shared, browser-safe validators and POSIX quoting used by every parameter generator.
export const quotePosix = (value: string): string => "'" + value.replace(/'/g, "'\\''") + "'";
export const unsafe = /[;|&$`'"\\<>]/;
export const clean = (s: string) =>
  s.length <= 512 &&
  !unsafe.test(s) &&
  [...s].every((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127);
export function validHost(s: string, cidr = false): boolean {
  if (!s || s.length > 253 || !clean(s)) return false;
  const parts = s.split("/");
  const host = parts[0] ?? "";
  if (parts.length > 2 || (parts.length === 2 && !cidr)) return false;
  let ip = false;
  if (host.includes(":")) {
    try {
      ip = new URL(`http://[${host}]/`).hostname.startsWith("[");
    } catch {
      return false;
    }
  } else if (/^[0-9.]+$/.test(host)) {
    ip =
      /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) &&
      host.split(".").every((n) => Number(n) <= 255 && (n === "0" || !n.startsWith("0")));
    if (!ip) return false;
  } else if (
    !host.split(".").every((label) => /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(label))
  )
    return false;
  if (parts.length === 2) {
    const prefix = parts[1] ?? "";
    const ipv6 = host.includes(":");
    return (
      ip &&
      /^\d{1,3}$/.test(prefix) &&
      Number(prefix) >= (ipv6 ? 120 : 24) &&
      Number(prefix) <= (ipv6 ? 128 : 32)
    );
  }
  return true;
}
export function validPorts(s: string): boolean {
  if (!/^\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/.test(s) || s.length > 100) return false;
  return s.split(",").every((range) => {
    const ns = range.split("-").map(Number);
    return (
      ns.every((n) => n >= 1 && n <= 65535) && (ns.length === 1 || (ns[0] ?? 0) <= (ns[1] ?? 0))
    );
  });
}
export function validUrl(s: string): boolean {
  if (!clean(s) || !/^https?:\/\//.test(s) || /\s|#|%/.test(s)) return false;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^\[|\]$/g, "");
    const authority = s.slice(s.indexOf("://") + 3).split(/[/?]/)[0] ?? "";
    const rawHost = authority.startsWith("[")
      ? authority.slice(1, authority.indexOf("]"))
      : (authority.split(":")[0] ?? "");
    return (
      !u.username &&
      !u.password &&
      validHost(rawHost) &&
      validHost(host) &&
      !u.pathname.split("/").includes("..") &&
      !s.split(/[/?]/).includes("..") &&
      (!u.port || (Number(u.port) >= 1 && Number(u.port) <= 65535))
    );
  } catch {
    return false;
  }
}
