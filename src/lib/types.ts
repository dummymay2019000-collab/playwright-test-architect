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

export interface ProjectState {
  config: RequestConfig;
  fields: FieldSchema[];
  cases: GeneratedTestCase[];
  step: Step;
}
