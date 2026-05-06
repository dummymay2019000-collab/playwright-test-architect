import type { FieldSchema, FieldType, Confidence } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T.*)?$/;
const IPV4_RE = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const DOMAIN_LABEL = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
export function isValidIpv4(s: string): boolean { return IPV4_RE.test(s); }
/** Domain with exactly 3 labels, e.g. "abc.xyz.com". */
export function isValidDomain3(s: string): boolean {
  const parts = s.split(".");
  if (parts.length !== 3) return false;
  return parts.every(p => DOMAIN_LABEL.test(p));
}
export function isValidHostPort(s: string): boolean {
  const m = s.match(/^(.+):(\d{1,5})$/);
  if (!m) return false;
  const port = Number(m[2]);
  if (port < 1 || port > 65535) return false;
  const host = m[1];
  return isValidIpv4(host) || isValidDomain3(host) || /^[a-zA-Z0-9.-]+$/.test(host);
}
const PEM_CERT_RE = /-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----/;
export function isValidCaCertPem(s: string): boolean {
  return PEM_CERT_RE.test(s.trim());
}

function inferType(value: unknown, key: string): { type: FieldType; confidence: Confidence } {
  if (value === null || value === undefined) return { type: "unknown", confidence: "low" };
  if (Array.isArray(value)) return { type: "array", confidence: "high" };
  const t = typeof value;
  if (t === "boolean") return { type: "boolean", confidence: "high" };
  if (t === "number") return { type: "number", confidence: "high" };
  if (t === "object") return { type: "object", confidence: "high" };
  if (t === "string") {
    const s = value as string;
    const lowerKey = key.toLowerCase();
    // CA certificate (PEM)
    if (PEM_CERT_RE.test(s) || /(^|_)(ca[_-]?cert|certificate|caPem|cacert)($|_)/i.test(key)) {
      return { type: "caCertPem", confidence: PEM_CERT_RE.test(s) ? "high" : "medium" };
    }
    // host:port
    if (isValidHostPort(s) && /:/.test(s) && (lowerKey.includes("host") || lowerKey.includes("address") || lowerKey.includes("endpoint") || lowerKey.includes("server"))) {
      return { type: "hostPort", confidence: "high" };
    }
    // IPv4
    if (IPV4_RE.test(s) || /(^|_)ip(v4)?($|_|Address)/i.test(key)) {
      return { type: "ipv4", confidence: IPV4_RE.test(s) ? "high" : "medium" };
    }
    // Domain (3-label)
    if (isValidDomain3(s) || lowerKey.includes("domain") || lowerKey.includes("hostname")) {
      return { type: "domain", confidence: isValidDomain3(s) ? "high" : "medium" };
    }
    if (EMAIL_RE.test(s) || lowerKey.includes("email")) {
      return { type: "email", confidence: EMAIL_RE.test(s) ? "high" : "medium" };
    }
    if (ISO_DATE_RE.test(s) || /(date|_at|At$)/.test(key) || !isNaN(Date.parse(s)) && /\d{4}/.test(s)) {
      const high = ISO_DATE_RE.test(s);
      return { type: "date", confidence: high ? "high" : "medium" };
    }
    return { type: "string", confidence: "high" };
  }
  return { type: "unknown", confidence: "low" };
}

export function flattenFields(obj: unknown, basePath = ""): FieldSchema[] {
  const out: FieldSchema[] = [];
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return out;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = basePath ? `${basePath}.${key}` : key;
    const { type, confidence } = inferType(value, key);
    out.push({
      path,
      name: key,
      type,
      originalValue: value,
      confidence,
      constraints: {},
    });
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out.push(...flattenFields(value, path));
    }
  }
  return out;
}

export type JsonParseResult =
  | { ok: true; value: unknown; error?: undefined }
  | { ok: false; value?: undefined; error: string };

export function safeParseJson(text: string): JsonParseResult {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function analyzePayload(jsonText: string): { fields: FieldSchema[]; error?: string } {
  const parsed = safeParseJson(jsonText);
  if (parsed.ok === false) {
    return { fields: [], error: parsed.error };
  }
  return { fields: flattenFields(parsed.value) };
}
