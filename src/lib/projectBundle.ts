import type {
  ConditionalRule,
  Environment,
  FieldSchema,
  GeneratedTestCase,
  ProjectExportV1,
  RequestConfig,
  VariantSet,
} from "./types";

export interface BundleInput {
  config: RequestConfig;
  fields: FieldSchema[];
  cases: GeneratedTestCase[];
  rules: ConditionalRule[];
  variants: VariantSet[];
  environments: Environment[];
  activeEnvId: string | null;
}

export function buildProjectExport(input: BundleInput): ProjectExportV1 {
  return {
    schema: "api-testforge.project",
    version: 1,
    exportedAt: new Date().toISOString(),
    ...input,
  };
}

export interface ParseResult {
  ok: boolean;
  data?: ProjectExportV1;
  error?: string;
}

export function parseProjectExport(text: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${(e as Error).message}` };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "File is not an object" };
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.schema !== "api-testforge.project") {
    return { ok: false, error: "Not an API TestForge project file" };
  }
  if (obj.version !== 1) {
    return { ok: false, error: `Unsupported version: ${String(obj.version)}` };
  }
  if (!obj.config || typeof obj.config !== "object") {
    return { ok: false, error: "Missing config" };
  }
  return { ok: true, data: obj as unknown as ProjectExportV1 };
}

export function suggestFilename(apiName: string): string {
  const slug = (apiName || "project")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50) || "project";
  const date = new Date().toISOString().slice(0, 10);
  return `testforge-${slug}-${date}.json`;
}
