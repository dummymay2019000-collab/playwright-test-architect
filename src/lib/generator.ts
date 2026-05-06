import type { FieldSchema, GeneratedTestCase, RequestConfig, TestDepth, Category, Risk } from "./types";

let counter = 0;
const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

function mkCase(partial: Omit<GeneratedTestCase, "id" | "enabled">): GeneratedTestCase {
  return { id: uid("tc"), enabled: true, ...partial };
}

const LONG_STRING = "x".repeat(2048);
const SPECIAL_CHARS = `<script>alert('xss')</script> 𝓤𝓷𝓲𝓬𝓸𝓭𝓮 \\n\\t\"';--`;
const INJECTION = `' OR 1=1 --`;
const INVALID_EMAILS = ["not-an-email", "missing@tld", "@nodomain.com", "spaces in@email.com"];
const INVALID_DATES = ["2026-13-40", "not-a-date", "31/12/2026"];
const INVALID_IPV4 = ["999.1.1.1", "1.2.3", "1.2.3.4.5", "abc.def.ghi.jkl", "256.256.256.256", " 1.1.1.1"];
const INVALID_DOMAINS_3 = ["abc", "abc.com", "a.b.c.d", "abc..com", "-abc.xyz.com", "abc.xyz.com.", "abc.xyz", ".abc.xyz.com"];
const INVALID_HOST_PORT = ["abc.xyz.com", "abc.xyz.com:", "abc.xyz.com:abc", "abc.xyz.com:99999", "abc.xyz.com:0", ":8080", "abc.xyz.com:80:80"];
const INVALID_CA_PEM = [
  "not a certificate",
  "MIID...justbase64withoutheaders==",
  "-----BEGIN CERTIFICATE-----\nMIID...\n", // missing END
  "-----BEGIN PRIVATE KEY-----\nMIID...\n-----END PRIVATE KEY-----", // wrong type
];

interface DepthFlags {
  boundary: boolean;
  wrongType: boolean;
  extraField: boolean;
  longString: boolean;
  injection: boolean;
  enumVariations: boolean;
  precision: boolean;
}

function depthFlags(d: TestDepth): DepthFlags {
  if (d === "basic") return { boundary: false, wrongType: false, extraField: false, longString: false, injection: false, enumVariations: false, precision: false };
  if (d === "standard") return { boundary: true, wrongType: true, extraField: true, longString: false, injection: false, enumVariations: true, precision: false };
  return { boundary: true, wrongType: true, extraField: true, longString: true, injection: true, enumVariations: true, precision: true };
}

function wrongTypeValue(type: FieldSchema["type"]): unknown {
  switch (type) {
    case "string":
    case "email":
    case "date":
    case "ipv4":
    case "domain":
    case "hostPort":
    case "caCertPem":
      return 12345;
    case "number":
      return "not-a-number";
    case "boolean":
      return "yes";
    case "array":
      return { not: "array" };
    case "object":
      return "not-an-object";
    default:
      return null;
  }
}

export function generateTestCases(config: RequestConfig, fields: FieldSchema[]): GeneratedTestCase[] {
  const cases: GeneratedTestCase[] = [];
  const flags = depthFlags(config.testDepth);
  const success = config.expectedSuccessStatus;
  const validation = config.expectedValidationStatus;

  // Happy path
  cases.push(mkCase({
    name: "Happy path — baseline valid request",
    category: "positive",
    expectedStatus: success,
    risk: "low",
    reason: "Verifies that the documented sample request returns the expected success status.",
  }));

  // Per-field cases (skip object/array containers — handled via children/elements)
  const leafFields = fields.filter(f => f.type !== "object");

  for (const f of leafFields) {
    const c = f.constraints;
    const isRequired = c.required !== false; // default true unless explicitly false

    // Missing required
    if (isRequired) {
      cases.push(mkCase({
        name: `Missing required field: ${f.path}`,
        category: "validation",
        fieldPath: f.path,
        removePaths: [f.path],
        expectedStatus: validation,
        risk: "high",
        reason: `Field "${f.path}" is treated as required; API should reject when omitted.`,
      }));
    }

    // Null value
    if (!c.allowNull) {
      cases.push(mkCase({
        name: `Null value for ${f.path}`,
        category: "validation",
        fieldPath: f.path,
        override: { [f.path]: null },
        expectedStatus: validation,
        risk: "medium",
        reason: `Field does not allow null; verify validation triggers.`,
      }));
    }

    // Empty string
    if (
      (f.type === "string" || f.type === "email" || f.type === "date" ||
        f.type === "ipv4" || f.type === "domain" || f.type === "hostPort" || f.type === "caCertPem") &&
      !c.allowEmpty
    ) {
      cases.push(mkCase({
        name: `Empty string for ${f.path}`,
        category: "validation",
        fieldPath: f.path,
        override: { [f.path]: "" },
        expectedStatus: validation,
        risk: "medium",
        reason: `Empty strings are a common validation gap for "${f.type}" fields.`,
      }));
    }

    // Wrong type
    if (flags.wrongType) {
      cases.push(mkCase({
        name: `Wrong type for ${f.path}`,
        category: "validation",
        fieldPath: f.path,
        override: { [f.path]: wrongTypeValue(f.type) },
        expectedStatus: validation,
        risk: "medium",
        reason: `API should reject values that don't match expected type "${f.type}".`,
      }));
    }

    if (f.type === "string") {
      if (flags.longString) {
        cases.push(mkCase({
          name: `Very long string in ${f.path}`,
          category: "boundary",
          fieldPath: f.path,
          override: { [f.path]: LONG_STRING },
          expectedStatus: validation,
          risk: "medium",
          reason: "Tests upper-bound length handling and potential buffer issues.",
        }));
      }
      if (flags.injection) {
        cases.push(mkCase({
          name: `Special / injection chars in ${f.path}`,
          category: "security",
          fieldPath: f.path,
          override: { [f.path]: SPECIAL_CHARS },
          expectedStatus: validation,
          risk: "high",
          reason: "Probes XSS / unicode / escape handling.",
        }));
        cases.push(mkCase({
          name: `SQL-style injection in ${f.path}`,
          category: "security",
          fieldPath: f.path,
          override: { [f.path]: INJECTION },
          expectedStatus: validation,
          risk: "high",
          reason: "Verifies the API rejects or safely handles classic injection patterns.",
        }));
      }
    }

    if (f.type === "email") {
      for (const inv of INVALID_EMAILS) {
        cases.push(mkCase({
          name: `Invalid email format in ${f.path}: "${inv}"`,
          category: "format",
          fieldPath: f.path,
          override: { [f.path]: inv },
          expectedStatus: validation,
          risk: "medium",
          reason: "Email format validation is frequently inconsistent across services.",
        }));
      }
    }

    if (f.type === "date") {
      for (const inv of INVALID_DATES) {
        cases.push(mkCase({
          name: `Invalid date format in ${f.path}: "${inv}"`,
          category: "format",
          fieldPath: f.path,
          override: { [f.path]: inv },
          expectedStatus: validation,
          risk: "medium",
          reason: "Verifies date parsing rejects malformed values.",
        }));
      }
    }

    if (f.type === "ipv4") {
      for (const inv of INVALID_IPV4) {
        cases.push(mkCase({
          name: `Invalid IPv4 in ${f.path}: "${inv}"`,
          category: "format",
          fieldPath: f.path,
          override: { [f.path]: inv },
          expectedStatus: validation,
          risk: "medium",
          reason: "IPv4 must be four 0–255 octets separated by dots.",
        }));
      }
    }

    if (f.type === "domain") {
      for (const inv of INVALID_DOMAINS_3) {
        cases.push(mkCase({
          name: `Invalid 3-label domain in ${f.path}: "${inv}"`,
          category: "format",
          fieldPath: f.path,
          override: { [f.path]: inv },
          expectedStatus: validation,
          risk: "medium",
          reason: "Domain must have exactly 3 labels (e.g. abc.xyz.com); fewer or more dots are invalid.",
        }));
      }
    }

    if (f.type === "hostPort") {
      for (const inv of INVALID_HOST_PORT) {
        cases.push(mkCase({
          name: `Invalid host:port in ${f.path}: "${inv}"`,
          category: "format",
          fieldPath: f.path,
          override: { [f.path]: inv },
          expectedStatus: validation,
          risk: "medium",
          reason: "Value must follow domain:port (port 1–65535).",
        }));
      }
    }

    if (f.type === "caCertPem") {
      for (const inv of INVALID_CA_PEM) {
        cases.push(mkCase({
          name: `Invalid CA certificate (PEM) in ${f.path}`,
          category: "format",
          fieldPath: f.path,
          override: { [f.path]: inv },
          expectedStatus: validation,
          risk: "medium",
          reason: "CA cert must be Base64 PEM wrapped with BEGIN/END CERTIFICATE headers.",
        }));
      }
    }

    if (flags.boundary && typeof c.min === "number") {
      cases.push(mkCase({
        name: `Below min for ${f.path} (${c.min - 1})`,
        category: "boundary",
        fieldPath: f.path,
        override: { [f.path]: c.min - 1 },
        expectedStatus: validation,
        risk: "medium",
        reason: `Constraint min=${c.min}; values below should be rejected.`,
      }));
    }
    if (flags.boundary && typeof c.max === "number") {
      cases.push(mkCase({
        name: `Above max for ${f.path} (${c.max + 1})`,
        category: "boundary",
        fieldPath: f.path,
        override: { [f.path]: c.max + 1 },
        expectedStatus: validation,
        risk: "medium",
        reason: `Constraint max=${c.max}; values above should be rejected.`,
      }));
    }
    if (flags.boundary && typeof c.minLength === "number" && c.minLength > 0) {
      cases.push(mkCase({
        name: `Below minLength for ${f.path}`,
        category: "boundary",
        fieldPath: f.path,
        override: { [f.path]: "x".repeat(Math.max(0, c.minLength - 1)) },
        expectedStatus: validation,
        risk: "medium",
        reason: `Constraint minLength=${c.minLength}; shorter strings should be rejected.`,
      }));
    }
    if (flags.boundary && typeof c.maxLength === "number") {
      cases.push(mkCase({
        name: `Above maxLength for ${f.path}`,
        category: "boundary",
        fieldPath: f.path,
        override: { [f.path]: "x".repeat(c.maxLength + 1) },
        expectedStatus: validation,
        risk: "medium",
        reason: `Constraint maxLength=${c.maxLength}; longer strings should be rejected.`,
      }));
    }

    if (c.enumValues && c.enumValues.length > 0) {
      // Coverage: one positive case per allowed enum value
      for (const ev of c.enumValues) {
        // Coerce to number/boolean if the field type suggests it
        let coerced: unknown = ev;
        if (f.type === "number" && ev.trim() !== "" && !isNaN(Number(ev))) coerced = Number(ev);
        else if (f.type === "boolean" && (ev === "true" || ev === "false")) coerced = ev === "true";
        cases.push(mkCase({
          name: `Enum coverage — ${f.path} = ${ev}`,
          category: "positive",
          fieldPath: f.path,
          override: { [f.path]: coerced },
          expectedStatus: success,
          risk: "low",
          reason: `Verifies API accepts allowed enum value "${ev}" for ${f.path}.`,
        }));
      }
      if (flags.enumVariations) {
        cases.push(mkCase({
          name: `Invalid enum value for ${f.path}`,
          category: "validation",
          fieldPath: f.path,
          override: { [f.path]: "__not_in_enum__" },
          expectedStatus: validation,
          risk: "medium",
          reason: `Allowed values: ${c.enumValues.join(", ")}.`,
        }));
      }
    }

    if (flags.precision && typeof c.precision === "number" && f.type === "number") {
      const bad = Number((1).toFixed(c.precision + 2));
      cases.push(mkCase({
        name: `Precision violation in ${f.path}`,
        category: "boundary",
        fieldPath: f.path,
        override: { [f.path]: 1 + 1 / Math.pow(10, c.precision + 2) },
        expectedStatus: validation,
        risk: "low",
        reason: `Constraint precision=${c.precision}; extra decimals should be rejected.`,
      }));
    }
  }

  // Extra unknown field
  if (flags.extraField) {
    cases.push(mkCase({
      name: "Extra unknown field added to body",
      category: "validation",
      override: { __unknown_field__: "should be ignored or rejected" },
      expectedStatus: success, // depends on API; common behavior is to ignore
      risk: "low",
      reason: "Confirms how API handles unknown payload keys (ignore vs reject).",
    }));
  }

  // Auth cases
  if (config.auth.mode !== "none") {
    cases.push(mkCase({
      name: "Missing auth token",
      category: "auth",
      headersOverride: { Authorization: null },
      expectedStatus: config.expectedAuthFailStatus,
      risk: "high",
      reason: "Endpoint requires authentication; missing token must be rejected.",
    }));
    cases.push(mkCase({
      name: "Invalid auth token",
      category: "auth",
      headersOverride: { Authorization: "Bearer invalid.token.value" },
      expectedStatus: config.expectedAuthFailStatus,
      risk: "high",
      reason: "Verifies the API rejects malformed/invalid bearer tokens.",
    }));
  }

  return cases;
}

export const CATEGORIES: Category[] = ["positive", "validation", "boundary", "format", "security", "auth", "custom"];
export const RISKS: Risk[] = ["low", "medium", "high"];
