import type { FieldSchema, FieldType, Confidence } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T.*)?$/;

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
