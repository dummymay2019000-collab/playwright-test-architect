import type {
  FieldSchema,
  GeneratedTestCase,
  RequestConfig,
  VariantBranch,
  VariantSet,
} from "./types";

let vCounter = 0;
const vUid = (p: string) => `${p}_${Date.now().toString(36)}_${(vCounter++).toString(36)}`;

export function newVariantSet(discriminatorPath = ""): VariantSet {
  return {
    id: vUid("vs"),
    enabled: true,
    discriminatorPath,
    branches: [],
  };
}

export function newVariantBranch(value = ""): VariantBranch {
  return { value, addFields: [], removePaths: [] };
}

function coerceScalar(raw: string): unknown {
  const t = raw.trim();
  if (t === "") return "";
  if (t === "true") return true;
  if (t === "false") return false;
  if (t === "null") return null;
  if (!isNaN(Number(t)) && /^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  // Attempt JSON parse for objects/arrays/quoted strings
  try {
    if (t.startsWith("{") || t.startsWith("[") || t.startsWith('"')) return JSON.parse(t);
  } catch {
    /* fall through */
  }
  return raw;
}

function coerceForField(raw: string, field?: FieldSchema): unknown {
  if (!field) return coerceScalar(raw);
  if (field.type === "number" && raw.trim() !== "" && !isNaN(Number(raw))) return Number(raw);
  if (field.type === "boolean" && (raw === "true" || raw === "false")) return raw === "true";
  return coerceScalar(raw);
}

export function generateVariantCases(
  config: RequestConfig,
  fields: FieldSchema[],
  variants: VariantSet[],
): GeneratedTestCase[] {
  const out: GeneratedTestCase[] = [];
  const fieldByPath = new Map(fields.map(f => [f.path, f]));

  for (const vs of variants) {
    if (!vs.enabled) continue;
    if (!vs.discriminatorPath) continue;
    if (vs.branches.length === 0) continue;

    const discField = fieldByPath.get(vs.discriminatorPath);

    for (const branch of vs.branches) {
      const discValue = coerceForField(branch.value, discField);

      // Build base override + removals for this variant
      const override: Record<string, unknown> = {
        [vs.discriminatorPath]: discValue,
      };
      for (const af of branch.addFields) {
        if (!af.path) continue;
        override[af.path] = coerceForField(af.value, fieldByPath.get(af.path));
      }
      const removePaths = branch.removePaths.filter(Boolean);

      // Positive case for this variant
      out.push({
        id: vUid("var"),
        enabled: true,
        name: `Variant — ${vs.discriminatorPath} = ${branch.value}`,
        category: "positive",
        fieldPath: vs.discriminatorPath,
        override,
        removePaths,
        expectedStatus: config.expectedSuccessStatus,
        risk: "low",
        reason:
          branch.note ||
          `Verifies the payload shape required when ${vs.discriminatorPath} is "${branch.value}".`,
      });

      // Negative cases: each addField removed individually -> validation
      for (const af of branch.addFields) {
        if (!af.path) continue;
        out.push({
          id: vUid("var"),
          enabled: true,
          name: `Variant — ${vs.discriminatorPath}=${branch.value}, missing ${af.path}`,
          category: "validation",
          fieldPath: af.path,
          override: { [vs.discriminatorPath]: discValue },
          removePaths: [...removePaths, af.path],
          expectedStatus: config.expectedValidationStatus,
          risk: "high",
          reason: `When ${vs.discriminatorPath} is "${branch.value}", ${af.path} should be required.`,
        });
      }

      // Negative cases: each removePath added back with a dummy value -> validation
      for (const rp of removePaths) {
        out.push({
          id: vUid("var"),
          enabled: true,
          name: `Variant — ${vs.discriminatorPath}=${branch.value}, ${rp} should not be present`,
          category: "validation",
          fieldPath: rp,
          override: { [vs.discriminatorPath]: discValue, [rp]: "__should_not_be_present__" },
          removePaths: removePaths.filter(p => p !== rp),
          expectedStatus: config.expectedValidationStatus,
          risk: "medium",
          reason: `When ${vs.discriminatorPath} is "${branch.value}", ${rp} must be omitted.`,
        });
      }
    }
  }

  return out;
}
