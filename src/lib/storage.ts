import type { RequestConfig } from "./types";

export const DEFAULT_PAYLOAD = `{
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30,
  "amount": 100,
  "status": "active",
  "createdDate": "2026-04-29"
}`;

export const DEFAULT_CONFIG: RequestConfig = {
  apiName: "Create User",
  method: "POST",
  baseUrl: "https://api.example.com",
  endpoint: "/users",
  headers: [
    { key: "Accept", value: "application/json", enabled: true },
  ],
  auth: { mode: "envBearer", envVarName: "API_TOKEN" },
  bodyJson: DEFAULT_PAYLOAD,
  expectedSuccessStatus: 201,
  expectedValidationStatus: 400,
  expectedAuthFailStatus: 401,
  expectedForbiddenStatus: 403,
  expectedNotFoundStatus: 404,
  testDepth: "standard",
};

const STORAGE_KEY = "api-testforge:project:v1";

export function saveProject(state: unknown) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function loadProject<T>(): T | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearProject() {
  localStorage.removeItem(STORAGE_KEY);
}
