import dns from "node:dns/promises";
import net from "node:net";
import { badRequest } from "../errors";

export async function normalizeSubmissionUrl(value: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw badRequest("A valid URL is required");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw badRequest("Only public HTTP(S) URLs are allowed");
  url.hash = "";
  const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((item) => isPrivateAddress(item.address)))
    throw badRequest("The URL must resolve to a public address");
  return url.toString();
}

function isPrivateAddress(address: string) {
  if (net.isIPv4(address)) {
    const parts = address.split(".").map(Number);
    return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168);
  }
  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized === "::" ||
    normalized.startsWith("fc") || normalized.startsWith("fd") ||
    normalized.startsWith("fe80:");
}
