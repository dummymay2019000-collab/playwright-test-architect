export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type AuthMode = "none" | "staticBearer" | "envBearer" | "loginApi";

export type FieldType =
  | "string"
  | "email"
  | "number"
  | "boolean"
  | "date"
  | "array"
  | "object"
  | "unknown";

export type Confidence = "high" | "medium" | "low";

export type Category =
  | "positive"
  | "validation"
  | "boundary"
  | "format"
  | "security"
  | "auth"
  | "custom";

export type Risk = "low" | "medium" | "high";

export type TestDepth = "basic" | "standard" | "aggressive";

export interface HeaderRow {
  key: string;
  value: string;
  enabled: boolean;
}

export interface RequestConfig {
  apiName: string;
  method: HttpMethod;
  baseUrl: string;
  endpoint: string;
  headers: HeaderRow[];
  auth: {
    mode: AuthMode;
    token?: string;
    envVarName?: string;
  };
  bodyJson: string;
  expectedSuccessStatus: number;
  expectedValidationStatus: number;
  expectedAuthFailStatus: number;
  expectedForbiddenStatus: number;
  expectedNotFoundStatus: number;
  testDepth: TestDepth;
}

export interface FieldConstraints {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  enumValues?: string[];
  regex?: string;
  precision?: number;
  allowNull?: boolean;
  allowEmpty?: boolean;
  notes?: string;
}

export interface FieldSchema {
  path: string;
  name: string;
  type: FieldType;
  originalValue: unknown;
  confidence: Confidence;
  constraints: FieldConstraints;
}

export interface GeneratedTestCase {
  id: string;
  /** Optional ID from an external test management system (ADO, Jira/Xray, TestRail).
   * Used when syncing back into those systems so updates land on the right work item. */
  externalId?: string;
  name: string;
  enabled: boolean;
  category: Category;
  fieldPath?: string;
  override?: Record<string, unknown>;
  removePaths?: string[];
  headersOverride?: Record<string, string | null>;
  expectedStatus: number;
  risk: Risk;
  reason: string;
}

export type Step = 1 | 2 | 3 | 4 | 5;

// ---------- Conditional rules ----------

export type ComparatorOp =
  | "eq"
  | "neq"
  | "in"
  | "nin"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "regex"
  | "present"
  | "absent";

export interface Condition {
  kind: "condition";
  id: string;
  path: string;
  op: ComparatorOp;
  // Stored as string; coerced to number/array based on op at evaluation/generation time.
  value: string;
}

export interface ConditionGroup {
  kind: "group";
  id: string;
  combinator: "and" | "or";
  children: ConditionNode[];
}

export type ConditionNode = Condition | ConditionGroup;

export type ThenAction =
  | { type: "required" }
  | { type: "forbidden" }
  | { type: "in"; values: string[] }
  | { type: "nin"; values: string[] }
  | { type: "between"; min?: number; max?: number }
  | { type: "equals"; value: string }
  | { type: "includeWith"; value: string }
  | { type: "exclude" };

export interface ConditionalRule {
  id: string;
  name: string;
  enabled: boolean;
  when: ConditionGroup;
  thenPath: string;
  then: ThenAction;
}

// ---------- Variants (enum-driven payload shapes) ----------

export interface VariantBranch {
  /** The discriminator value (string form; coerced at gen-time based on field type). */
  value: string;
  /** Extra fields to add to the payload when discriminator equals this value. path -> JSON-ish string. */
  addFields: { path: string; value: string }[];
  /** Field paths to remove from the payload for this variant. */
  removePaths: string[];
  /** Optional human-readable note. */
  note?: string;
}

export interface VariantSet {
  id: string;
  enabled: boolean;
  /** Discriminator field path (e.g. "type", "paymentMethod"). */
  discriminatorPath: string;
  branches: VariantBranch[];
}

// ---------- Environments ----------

export interface Environment {
  id: string;
  name: string;
  baseUrl: string;
  endpoint: string;
  headers: HeaderRow[];
  auth: RequestConfig["auth"];
  /** JSON string — full payload override for this environment. */
  bodyJson: string;
  note?: string;
}

export interface ProjectState {
  config: RequestConfig;
  fields: FieldSchema[];
  cases: GeneratedTestCase[];
  rules?: ConditionalRule[];
  variants?: VariantSet[];
  environments?: Environment[];
  activeEnvId?: string | null;
  step: Step;
}

/** Versioned, importable/exportable project bundle. */
export interface ProjectExportV1 {
  schema: "api-testforge.project";
  version: 1;
  exportedAt: string;
  config: RequestConfig;
  fields: FieldSchema[];
  cases: GeneratedTestCase[];
  rules: ConditionalRule[];
  variants: VariantSet[];
  environments: Environment[];
  activeEnvId: string | null;
}
