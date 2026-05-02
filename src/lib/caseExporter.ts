import * as XLSX from "xlsx";
import type { GeneratedTestCase, RequestConfig } from "./types";

export type CaseExportFormat = "ado" | "jira";

// ---------------- Payload building (mirrors specBuilder logic) ----------------

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function setByPath(obj: Record<string, unknown>, dotPath: string, value: unknown): void {
  const parts = dotPath.split(".");
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const next = cur[k];
    if (next == null || typeof next !== "object" || Array.isArray(next)) cur[k] = {};
    cur = cur[k] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

function deleteByPath(obj: Record<string, unknown>, dotPath: string): void {
  const parts = dotPath.split(".");
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const next = cur[k];
    if (next == null || typeof next !== "object") return;
    cur = next as Record<string, unknown>;
  }
  delete cur[parts[parts.length - 1]];
}

function buildPayloadForCase(basePayload: unknown, tc: GeneratedTestCase): unknown {
  if (basePayload == null || typeof basePayload !== "object") return basePayload;
  const payload = deepClone(basePayload) as Record<string, unknown>;
  for (const p of tc.removePaths ?? []) deleteByPath(payload, p);
  if (tc.override) {
    for (const [k, v] of Object.entries(tc.override)) {
      if (k.includes(".")) setByPath(payload, k, v);
      else payload[k] = v;
    }
  }
  return payload;
}

// ---------------- Naming + step building ----------------

const CATEGORY_PREFIX: Record<string, string> = {
  positive: "Positive",
  validation: "Validation",
  boundary: "Boundary",
  format: "Format",
  security: "Security",
  auth: "Auth",
  custom: "Business rule",
};

const PRIORITY_BY_RISK: Record<string, { ado: 1 | 2 | 3 | 4; jira: "Highest" | "High" | "Medium" }> = {
  high: { ado: 1, jira: "Highest" },
  medium: { ado: 2, jira: "High" },
  low: { ado: 3, jira: "Medium" },
};

export function buildTestCaseTitle(config: RequestConfig, tc: GeneratedTestCase): string {
  const route = `${config.method} ${config.endpoint || "/"}`;
  const prefix = CATEGORY_PREFIX[tc.category] ?? "Test";
  return `[${route}] ${prefix}: ${tc.name}`;
}

interface StructuredStep {
  action: string;
  expected: string;
}

function buildSteps(
  config: RequestConfig,
  tc: GeneratedTestCase,
  payload: unknown,
): StructuredStep[] {
  const fullUrl = `${config.baseUrl}${config.endpoint}`;
  const headerSummary = config.headers
    .filter(h => h.enabled && h.key.trim())
    .map(h => `${h.key}: ${h.value}`)
    .join("\n");
  const authNote =
    config.auth.mode === "none"
      ? "No authentication required."
      : tc.headersOverride && "Authorization" in tc.headersOverride
      ? tc.headersOverride.Authorization === null
        ? "Send the request WITHOUT the Authorization header."
        : `Send Authorization header: ${tc.headersOverride.Authorization}`
      : `Send valid bearer token via ${config.auth.envVarName || "API_TOKEN"} env variable.`;

  const overrideSummary = (tc.override && Object.keys(tc.override).length > 0)
    ? Object.entries(tc.override).map(([k, v]) => `• ${k} = ${JSON.stringify(v)}`).join("\n")
    : "(none)";
  const removalSummary = tc.removePaths && tc.removePaths.length > 0
    ? tc.removePaths.map(p => `• remove ${p}`).join("\n")
    : "(none)";

  const payloadStr = config.method === "GET"
    ? "(no body — GET request)"
    : JSON.stringify(payload, null, 2);

  return [
    {
      action: `Open API client / test runner pointing at:\n${fullUrl}`,
      expected: "Endpoint is reachable; environment variables (BASE_URL, auth token) are loaded.",
    },
    {
      action: `Configure request headers:\n${headerSummary || "(defaults)"}\n\nAuth: ${authNote}`,
      expected: "Headers and auth are correctly applied to the request.",
    },
    {
      action:
        `Prepare request body — start from baseline payload, then apply this case's modifications:\n` +
        `Field overrides:\n${overrideSummary}\n\n` +
        `Field removals:\n${removalSummary}\n\n` +
        `Final payload:\n${payloadStr}`,
      expected: "Payload reflects the modifications described above.",
    },
    {
      action: `Send ${config.method} ${config.endpoint}`,
      expected: `Server responds with HTTP ${tc.expectedStatus}.`,
    },
    {
      action: "Inspect response body and headers.",
      expected:
        tc.category === "positive"
          ? "Response body matches the API contract; no error fields present."
          : "Response body contains a clear error / validation message identifying the offending field.",
    },
  ];
}

function buildPreconditions(config: RequestConfig, tc: GeneratedTestCase): string {
  const lines: string[] = [];
  lines.push(`API base URL: ${config.baseUrl}`);
  lines.push(`Endpoint: ${config.method} ${config.endpoint}`);
  if (config.auth.mode !== "none") {
    lines.push(
      `Authentication: ${config.auth.mode === "loginApi" ? "Login API" : "Bearer token"} (env var: ${config.auth.envVarName || "API_TOKEN"})`,
    );
  } else {
    lines.push("Authentication: none");
  }
  if (tc.fieldPath) lines.push(`Target field: ${tc.fieldPath}`);
  lines.push(`Test data set: API TestForge — ${tc.category} / ${tc.risk} risk`);
  return lines.join("\n");
}

// ---------------- Row shapes for ADO and Jira ----------------

interface AdoRow {
  ID: string;
  "Work Item Type": "Test Case";
  Title: string;
  "Test Step": number | "";
  "Step Action": string;
  "Step Expected": string;
  Priority: 1 | 2 | 3 | 4 | "";
  State: "Design";
  Tags: string;
  "Assigned To": "";
  "Area Path": "";
  "Iteration Path": "";
}

interface JiraRow {
  "Test Case ID": string;
  Summary: string;
  Description: string;
  Preconditions: string;
  "Test Steps": string;
  "Test Data": string;
  "Expected Result": string;
  Priority: "Highest" | "High" | "Medium";
  Labels: string;
  Component: string;
  Status: "Draft";
}

// ---------------- ADO export ----------------
// Microsoft's "Bulk import test cases via CSV" expects one row per step,
// repeating the Title+ID on the first row only and the Test Step number incrementing.
// Reference: docs.microsoft.com/azure/devops/boards/queries/import-work-items-from-csv

export function buildAdoRows(
  config: RequestConfig,
  cases: GeneratedTestCase[],
): AdoRow[] {
  const rows: AdoRow[] = [];
  let basePayload: unknown = {};
  try { basePayload = JSON.parse(config.bodyJson || "{}"); } catch { /* ignore */ }

  for (const tc of cases) {
    const payload = buildPayloadForCase(basePayload, tc);
    const title = buildTestCaseTitle(config, tc);
    const steps = buildSteps(config, tc, payload);
    const tags = [
      "API",
      "API-TestForge",
      tc.category,
      `risk-${tc.risk}`,
      `${config.method.toLowerCase()}-${(config.endpoint || "").replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "")}`,
    ].filter(Boolean).join("; ");
    const priority = PRIORITY_BY_RISK[tc.risk]?.ado ?? 3;

    steps.forEach((step, i) => {
      rows.push({
        ID: i === 0 ? tc.id : "",
        "Work Item Type": "Test Case",
        Title: i === 0 ? title : "",
        "Test Step": i + 1,
        "Step Action": step.action,
        "Step Expected": step.expected,
        Priority: i === 0 ? priority : "",
        State: "Design",
        Tags: i === 0 ? tags : "",
        "Assigned To": "",
        "Area Path": "",
        "Iteration Path": "",
      });
    });
  }
  return rows;
}

// ---------------- Jira / Xray / generic export ----------------
// One row per test case. Steps + data inlined in cells for max compatibility
// with Jira CSV import, Xray's "Cucumber/Generic" template, and TestRail.

export function buildJiraRows(
  config: RequestConfig,
  cases: GeneratedTestCase[],
): JiraRow[] {
  let basePayload: unknown = {};
  try { basePayload = JSON.parse(config.bodyJson || "{}"); } catch { /* ignore */ }

  return cases.map(tc => {
    const payload = buildPayloadForCase(basePayload, tc);
    const steps = buildSteps(config, tc, payload);
    const stepsStr = steps
      .map((s, i) => `${i + 1}. ${s.action}\n   ➜ Expected: ${s.expected}`)
      .join("\n\n");

    const testData =
      config.method === "GET"
        ? "(no body)"
        : `Final payload sent:\n${JSON.stringify(payload, null, 2)}`;

    const expectedResult = `HTTP ${tc.expectedStatus} — ${
      tc.category === "positive"
        ? "successful response with valid body."
        : "error response with a descriptive message."
    }`;

    const labels = [
      "api",
      "api-testforge",
      tc.category,
      `risk-${tc.risk}`,
    ].join(" ");

    return {
      "Test Case ID": tc.id,
      Summary: buildTestCaseTitle(config, tc),
      Description: tc.reason,
      Preconditions: buildPreconditions(config, tc),
      "Test Steps": stepsStr,
      "Test Data": testData,
      "Expected Result": expectedResult,
      Priority: PRIORITY_BY_RISK[tc.risk]?.jira ?? "Medium",
      Labels: labels,
      Component: config.apiName || "API",
      Status: "Draft",
    };
  });
}

// ---------------- Encoding ----------------

export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const sheet = XLSX.utils.json_to_sheet(rows);
  return XLSX.utils.sheet_to_csv(sheet);
}

export function rowsToXlsx(
  rows: Record<string, unknown>[],
  sheetName: string,
  meta?: Record<string, unknown>[],
): Uint8Array {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  // Reasonable column widths for readability
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  ws["!cols"] = headers.map(h => {
    if (/title|summary|action|step|payload|preconditions|description|expected/i.test(h)) {
      return { wch: 60 };
    }
    if (/tags|labels|component|priority|state|status|id/i.test(h)) {
      return { wch: 18 };
    }
    return { wch: 24 };
  });
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  if (meta && meta.length > 0) {
    const metaWs = XLSX.utils.json_to_sheet(meta);
    metaWs["!cols"] = [{ wch: 24 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, metaWs, "Metadata");
  }
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new Uint8Array(out);
}

export function buildMetaSheet(config: RequestConfig, count: number): Record<string, string>[] {
  return [
    { Field: "API name", Value: config.apiName || "" },
    { Field: "Method", Value: config.method },
    { Field: "Base URL", Value: config.baseUrl },
    { Field: "Endpoint", Value: config.endpoint },
    { Field: "Auth mode", Value: config.auth.mode },
    { Field: "Expected success status", Value: String(config.expectedSuccessStatus) },
    { Field: "Expected validation status", Value: String(config.expectedValidationStatus) },
    { Field: "Test depth", Value: config.testDepth },
    { Field: "Test cases included", Value: String(count) },
    { Field: "Generated at", Value: new Date().toISOString() },
    { Field: "Generated by", Value: "API TestForge" },
  ];
}

// ---------------- Public download helpers ----------------

export function downloadCasesAsCsv(
  config: RequestConfig,
  cases: GeneratedTestCase[],
  format: CaseExportFormat,
  filenameBase: string,
): void {
  const rows: Record<string, unknown>[] =
    format === "ado" ? (buildAdoRows(config, cases) as unknown as Record<string, unknown>[])
      : (buildJiraRows(config, cases) as unknown as Record<string, unknown>[]);
  const csv = rowsToCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, `${filenameBase}-${format}.csv`);
}

export function downloadCasesAsXlsx(
  config: RequestConfig,
  cases: GeneratedTestCase[],
  format: CaseExportFormat,
  filenameBase: string,
): void {
  const rows: Record<string, unknown>[] =
    format === "ado" ? (buildAdoRows(config, cases) as unknown as Record<string, unknown>[])
      : (buildJiraRows(config, cases) as unknown as Record<string, unknown>[]);
  const sheetName = format === "ado" ? "Test Cases (ADO)" : "Test Cases";
  const meta = buildMetaSheet(config, cases.length);
  const bytes = rowsToXlsx(rows, sheetName, meta);
  const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  triggerDownload(blob, `${filenameBase}-${format}.xlsx`);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
