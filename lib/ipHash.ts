import { createHmac } from "crypto";
import { headers } from "next/headers";

/**
 * We slaan nooit ruwe IP-adressen op — alleen een gesalte HMAC-hash.
 * Genoeg om misbruik per IP te herkennen (rate limiting), niet genoeg
 * om iemand te herleiden zonder de secret.
 */
export function hashIp(ip: string): string {
  const secret = process.env.IP_HASH_SECRET || "dev-only-insecure-secret";
  return createHmac("sha256", secret).update(ip).digest("hex");
}

export function getRequestIpHash(): string {
  const h = headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : h.get("x-real-ip") || "0.0.0.0";
  return hashIp(ip);
}
