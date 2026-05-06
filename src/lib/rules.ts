import type {
  Condition,
  ConditionGroup,
  ConditionNode,
  ConditionalRule,
  ComparatorOp,
  GeneratedTestCase,
  RequestConfig,
  ThenAction,
  FieldSchema,
} from "./types";

let ruleCounter = 0;
export const ruleUid = (p: string) => `${p}_${Date.now().toString(36)}_${(ruleCounter++).toString(36)}`;

export function newCondition(path = ""): Condition {
  return { kind: "condition", id: ruleUid("c"), path, op: "eq", value: "" };
}

export function newGroup(combinator: "and" | "or" = "and", children: ConditionNode[] = []): ConditionGroup {
  return { kind: "group", id: ruleUid("g"), combinator, children: children.length ? children : [newCondition()] };
}

export function newRule(): ConditionalRule {
  return {
    id: ruleUid("r"),
    name: "Untitled rule",
    enabled: true,
    when: newGroup("and"),
    thenPath: "",
    then: { type: "required" },
  };
}

// ---------- Value coercion ----------

function coerceScalar(raw: string): unknown {
  const t = raw.trim();
  if (t === "") return "";
  if (t === "true") return true;
  if (t === "false") return false;
  if (t === "null") return null;
  if (!isNaN(Number(t)) && /^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return raw;
}

function parseList(raw: string): unknown[] {
  // Same parser as enum input — supports quoted entries.
  const out: string[] = [];
  let buf = "";
  let inQuote = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === "," && !inQuote) {
      const v = buf.trim();
      if (v !== "") out.push(v);
      buf = "";
      continue;
    }
    buf += ch;
  }
  const last = buf.trim();
  if (last !== "") out.push(last);
  return out.map(coerceScalar);
}

// ---------- Path access on a payload ----------

function getByPath(obj: unknown, dotPath: string): { found: boolean; value: unknown } {
  if (!dotPath) return { found: false, value: undefined };
  const parts = dotPath.split(".");
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return { found: false, value: undefined };
    if (!(p in cur)) return { found: false, value: undefined };
    cur = cur[p];
  }
  return { found: true, value: cur };
}

// ---------- Evaluation (used to decide whether trigger is satisfied by base payload) ----------

function evalCondition(cond: Condition, payload: unknown): boolean {
  const { found, value } = getByPath(payload, cond.path);
  switch (cond.op) {
    case "present": return found;
    case "absent": return !found;
    case "eq": return found && value === coerceScalar(cond.value);
    case "neq": return !found || value !== coerceScalar(cond.value);
    case "in": return found && parseList(cond.value).includes(value as never);
    case "nin": return !found || !parseList(cond.value).includes(value as never);
    case "gt": return found && typeof value === "number" && value > Number(cond.value);
    case "gte": return found && typeof value === "number" && value >= Number(cond.value);
    case "lt": return found && typeof value === "number" && value < Number(cond.value);
    case "lte": return found && typeof value === "number" && value <= Number(cond.value);
    case "contains": return found && typeof value === "string" && value.includes(cond.value);
    case "ncontains": return !found || (typeof value === "string" && !value.includes(cond.value));
    case "regex": {
      if (!found || typeof value !== "string") return false;
      try { return new RegExp(cond.value).test(value); } catch { return false; }
    }
  }
}

export function evalGroup(group: ConditionGroup, payload: unknown): boolean {
  if (group.children.length === 0) return true;
  const results = group.children.map(c =>
    c.kind === "group" ? evalGroup(c, payload) : evalCondition(c, payload),
  );
  return group.combinator === "and" ? results.every(Boolean) : results.some(Boolean);
}

// ---------- Generating overrides that satisfy / violate the trigger ----------

// Produce a set of payload overrides that make the trigger "when" evaluate to true.
// For a single condition we produce one override entry. For groups: AND -> merge; OR -> pick first.
// Returns null if the condition cannot be made true (e.g. absent/present conflicts with eq).
function overridesToSatisfy(node: ConditionNode): Record<string, unknown> | null {
  if (node.kind === "group") {
    if (node.combinator === "and") {
      const merged: Record<string, unknown> = {};
      for (const child of node.children) {
        const sub = overridesToSatisfy(child);
        if (!sub) return null;
        Object.assign(merged, sub);
      }
      return merged;
    } else {
      for (const child of node.children) {
        const sub = overridesToSatisfy(child);
        if (sub) return sub;
      }
      return null;
    }
  }
  // Single condition
  const c = node;
  switch (c.op) {
    case "eq":
    case "equals" as any:
      return { [c.path]: coerceScalar(c.value) };
    case "in": {
      const list = parseList(c.value);
      return list.length ? { [c.path]: list[0] } : null;
    }
    case "neq":
      return { [c.path]: `__not_${c.value}__` };
    case "nin":
      return { [c.path]: "__not_in_set__" };
    case "gt": return { [c.path]: Number(c.value) + 1 };
    case "gte": return { [c.path]: Number(c.value) };
    case "lt": return { [c.path]: Number(c.value) - 1 };
    case "lte": return { [c.path]: Number(c.value) };
    case "contains": return { [c.path]: `prefix-${c.value}-suffix` };
    case "ncontains": return { [c.path]: "__no_match__" };
    case "present": return { [c.path]: "__present__" };
    case "absent": return null; // handled separately via removePaths below
    case "regex": return null; // hard to synthesize; skip
  }
}

function removePathsToSatisfy(node: ConditionNode): string[] {
  if (node.kind === "group") {
    if (node.combinator !== "and") return [];
    return node.children.flatMap(removePathsToSatisfy);
  }
  return node.op === "absent" ? [node.path] : [];
}

// ---------- Then-action helpers ----------

function validValueForThen(t: ThenAction): unknown | undefined {
  switch (t.type) {
    case "in": return coerceScalar(t.values[0] ?? "");
    case "equals": return coerceScalar(t.value);
    case "includeWith": return coerceScalar(t.value);
    case "between": {
      if (typeof t.min === "number" && typeof t.max === "number") return (t.min + t.max) / 2;
      if (typeof t.min === "number") return t.min;
      if (typeof t.max === "number") return t.max;
      return undefined;
    }
    case "required": return "__valid_required__";
    case "forbidden":
    case "exclude":
    case "nin":
      return undefined;
  }
}

function invalidValuesForThen(t: ThenAction): unknown[] {
  switch (t.type) {
    case "in": return [`__not_in_${t.values.join("_")}__`];
    case "nin": return t.values.length ? [coerceScalar(t.values[0])] : [];
    case "equals": return [`__not_${t.value}__`];
    case "includeWith": return []; // shape-only; violation handled by removing field
    case "exclude": return []; // shape-only
    case "between": {
      const out: unknown[] = [];
      if (typeof t.min === "number") out.push(t.min - 1);
      if (typeof t.max === "number") out.push(t.max + 1);
      return out;
    }
    case "required": return []; // violation = remove the field
    case "forbidden": return ["__should_not_be_present__"];
  }
}

// ---------- Build cases from rules ----------

let caseCounter = 0;
const caseUid = (p: string) => `${p}_${Date.now().toString(36)}_${(caseCounter++).toString(36)}`;

export function generateRuleCases(
  config: RequestConfig,
  fields: FieldSchema[],
  rules: ConditionalRule[],
): GeneratedTestCase[] {
  const out: GeneratedTestCase[] = [];
  let basePayload: unknown = {};
  try { basePayload = JSON.parse(config.bodyJson || "{}"); } catch { /* ignore */ }

  const fieldNames = new Set(fields.map(f => f.path));

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (!rule.thenPath) continue;

    const triggerOverrides = overridesToSatisfy(rule.when) ?? {};
    const triggerRemovals = removePathsToSatisfy(rule.when);
    const triggerActiveByDefault = evalGroup(rule.when, basePayload);

    const buildBaseTrigger = () => {
      // Only carry overrides/removals for fields that aren't already satisfying the trigger,
      // but it's safe to always include them.
      return {
        override: { ...triggerOverrides },
        removePaths: [...triggerRemovals],
      };
    };

    const ruleLabel = rule.name || `Rule on ${rule.thenPath}`;

    // Positive: trigger active + valid dependent value
    const validVal = validValueForThen(rule.then);
    if (rule.then.type !== "forbidden" && validVal !== undefined) {
      const base = buildBaseTrigger();
      out.push({
        id: caseUid("rule"),
        enabled: true,
        name: `${ruleLabel} — valid combination`,
        category: "custom",
        fieldPath: rule.thenPath,
        override: { ...base.override, [rule.thenPath]: validVal },
        removePaths: base.removePaths,
        expectedStatus: config.expectedSuccessStatus,
        risk: "low",
        reason: `When trigger holds, ${rule.thenPath} with a valid value should succeed.`,
      });
    }

    // Forbidden: trigger active should reject any value at thenPath
    if (rule.then.type === "forbidden") {
      const base = buildBaseTrigger();
      out.push({
        id: caseUid("rule"),
        enabled: true,
        name: `${ruleLabel} — forbidden field present`,
        category: "validation",
        fieldPath: rule.thenPath,
        override: { ...base.override, [rule.thenPath]: "__should_not_be_present__" },
        removePaths: base.removePaths,
        expectedStatus: config.expectedValidationStatus,
        risk: "medium",
        reason: `When trigger holds, ${rule.thenPath} must be omitted.`,
      });
    }

    // Exclude (shape-only): trigger active -> emit one positive case with field removed
    if (rule.then.type === "exclude") {
      const base = buildBaseTrigger();
      out.push({
        id: caseUid("rule"),
        enabled: true,
        name: `${ruleLabel} — ${rule.thenPath} excluded`,
        category: "positive",
        fieldPath: rule.thenPath,
        override: base.override,
        removePaths: [...base.removePaths, rule.thenPath],
        expectedStatus: config.expectedSuccessStatus,
        risk: "low",
        reason: `When trigger holds, ${rule.thenPath} should be omitted from the payload.`,
      });
    }

    // Required: trigger active + dependent missing -> validation error
    if (rule.then.type === "required") {
      const base = buildBaseTrigger();
      out.push({
        id: caseUid("rule"),
        enabled: true,
        name: `${ruleLabel} — required field missing`,
        category: "validation",
        fieldPath: rule.thenPath,
        override: base.override,
        removePaths: [...base.removePaths, rule.thenPath],
        expectedStatus: config.expectedValidationStatus,
        risk: "high",
        reason: `When trigger holds, ${rule.thenPath} is required.`,
      });
    }

    // Violations: trigger active + invalid dependent value
    for (const invalid of invalidValuesForThen(rule.then)) {
      const base = buildBaseTrigger();
      out.push({
        id: caseUid("rule"),
        enabled: true,
        name: `${ruleLabel} — invalid dependent value (${String(invalid)})`,
        category: "validation",
        fieldPath: rule.thenPath,
        override: { ...base.override, [rule.thenPath]: invalid },
        removePaths: base.removePaths,
        expectedStatus: config.expectedValidationStatus,
        risk: "medium",
        reason: `When trigger holds, ${rule.thenPath} should reject this value.`,
      });
    }

    // Helpful note if thenPath isn't in detected fields
    if (!fieldNames.has(rule.thenPath)) {
      // No-op: we still generate; user can see in the test name.
    }
    void triggerActiveByDefault;
  }

  return out;
}

export const COMPARATOR_LABELS: Record<ComparatorOp, string> = {
  eq: "equals",
  neq: "not equals",
  in: "in (list)",
  nin: "not in (list)",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  regex: "matches regex",
  contains: "contains",
  ncontains: "does not contain",
  present: "is present",
  absent: "is absent",
};

export const COMPARATORS: ComparatorOp[] = [
  "eq", "neq", "in", "nin", "gt", "gte", "lt", "lte", "regex", "contains", "ncontains", "present", "absent",
];

export function opNeedsValue(op: ComparatorOp): boolean {
  return op !== "present" && op !== "absent";
}
