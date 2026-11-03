import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
]);

function isPrivateIp(address: string) {
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) return true;

  const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  const ipv4 = mappedIpv4 ?? normalized;
  if (net.isIP(ipv4) !== 4) return false;

  const [a, b] = ipv4.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168);
}

export function assertHttpUrl(value: string) {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error("HTTP(S) URL만 허용됩니다.");
  if (parsed.username || parsed.password) throw new Error("인증 정보가 포함된 URL은 허용되지 않습니다.");
  return parsed;
}

export async function assertSafeHttpUrl(value: string) {
  const parsed = assertHttpUrl(value);
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("내부 호스트는 허용되지 않습니다.");
  }

  const addresses = net.isIP(hostname)
    ? [hostname]
    : (await dns.lookup(hostname, { all: true })).map(({ address }) => address);
  if (addresses.some(isPrivateIp)) throw new Error("내부 네트워크 주소는 허용되지 않습니다.");
  return parsed;
}

export async function fetchPublicUrl(value: string, init: RequestInit = {}) {
  let current = (await assertSafeHttpUrl(value)).href;
  for (let redirect = 0; redirect <= 3; redirect++) {
    const response = await fetch(current, { ...init, redirect: "manual" });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get("location");
    if (!location) return response;
    await response.body?.cancel();
    current = (await assertSafeHttpUrl(new URL(location, current).href)).href;
  }
  throw new Error("리다이렉트가 너무 많습니다.");
}

export async function readTextLimited(response: Response, maxBytes = 2 * 1024 * 1024) {
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > maxBytes) throw new Error("응답이 너무 큽니다.");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("응답이 너무 큽니다.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

export function sanitizeSearchQuery(value: string | null) {
  return (value ?? "")
    .trim()
    .slice(0, 100)
    .replace(/[\\%_,()[\]]/g, " ")
    .replace(/\s+/g, " ");
}
