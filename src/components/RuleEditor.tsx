import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GitBranch } from "lucide-react";
import type {
  ComparatorOp,
  Condition,
  ConditionGroup,
  ConditionNode,
  ConditionalRule,
  FieldSchema,
  ThenAction,
} from "@/lib/types";
import {
  COMPARATORS,
  COMPARATOR_LABELS,
  newCondition,
  newGroup,
  newRule,
  opNeedsValue,
} from "@/lib/rules";

interface Props {
  rules: ConditionalRule[];
  fields: FieldSchema[];
  onChange: (rules: ConditionalRule[]) => void;
}

export function RuleEditor({ rules, fields, onChange }: Props) {
  const fieldPaths = fields.map(f => f.path);

  const updateRule = (id: string, patch: Partial<ConditionalRule>) => {
    onChange(rules.map(r => (r.id === id ? { ...r, ...patch } : r)));
  };
  const removeRule = (id: string) => onChange(rules.filter(r => r.id !== id));
  const addRule = () => onChange([...rules, newRule()]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-primary" />
              Conditional rules
            </CardTitle>
            <CardDescription>
              Define cross-field business logic — e.g. <em>if status == "premium" then plan must be in [gold, platinum]</em>.
              Each rule emits valid + invalid test cases automatically.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={addRule}>
            <Plus className="w-4 h-4 mr-1" /> Add rule
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No conditional rules yet. Add one to test cross-field constraints.
          </p>
        ) : (
          rules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              fieldPaths={fieldPaths}
              onChange={patch => updateRule(rule.id, patch)}
              onRemove={() => removeRule(rule.id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function RuleCard({
  rule,
  fieldPaths,
  onChange,
  onRemove,
}: {
  rule: ConditionalRule;
  fieldPaths: string[];
  onChange: (patch: Partial<ConditionalRule>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          value={rule.name}
          onChange={e => onChange({ name: e.target.value })}
          className="max-w-xs font-medium"
          placeholder="Rule name"
        />
        <Badge variant={rule.enabled ? "default" : "secondary"} className="text-xs">
          {rule.enabled ? "active" : "disabled"}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Enabled</Label>
          <Switch checked={rule.enabled} onCheckedChange={v => onChange({ enabled: v })} />
          <Button size="sm" variant="ghost" onClick={onRemove}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">When</Label>
        <GroupEditor
          group={rule.when}
          fieldPaths={fieldPaths}
          onChange={g => onChange({ when: g })}
          depth={0}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Then</Label>
        <ThenEditor
          thenPath={rule.thenPath}
          then={rule.then}
          fieldPaths={fieldPaths}
          onChange={(thenPath, then) => onChange({ thenPath, then })}
        />
      </div>
    </div>
  );
}

function GroupEditor({
  group,
  fieldPaths,
  onChange,
  depth,
}: {
  group: ConditionGroup;
  fieldPaths: string[];
  onChange: (g: ConditionGroup) => void;
  depth: number;
}) {
  const updateChild = (idx: number, child: ConditionNode) => {
    onChange({ ...group, children: group.children.map((c, i) => (i === idx ? child : c)) });
  };
  const removeChild = (idx: number) => {
    onChange({ ...group, children: group.children.filter((_, i) => i !== idx) });
  };
  const addCondition = () => onChange({ ...group, children: [...group.children, newCondition()] });
  const addGroup = () => onChange({ ...group, children: [...group.children, newGroup("and")] });

  return (
    <div
      className={`rounded-md border border-dashed p-3 mt-1 space-y-2 ${
        depth > 0 ? "bg-background/40" : "bg-background/60"
      }`}
    >
      <div className="flex items-center gap-2">
        <Select
          value={group.combinator}
          onValueChange={(v: "and" | "or") => onChange({ ...group, combinator: v })}
        >
          <SelectTrigger className="h-8 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">ALL of</SelectItem>
            <SelectItem value="or">ANY of</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">these conditions match</span>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="ghost" onClick={addCondition}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Condition
          </Button>
          {depth < 3 && (
            <Button size="sm" variant="ghost" onClick={addGroup}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Group
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {group.children.map((child, idx) => (
          <div key={child.id} className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              {child.kind === "condition" ? (
                <ConditionEditor
                  cond={child}
                  fieldPaths={fieldPaths}
                  onChange={c => updateChild(idx, c)}
                />
              ) : (
                <GroupEditor
                  group={child}
                  fieldPaths={fieldPaths}
                  onChange={g => updateChild(idx, g)}
                  depth={depth + 1}
                />
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={() => removeChild(idx)} className="mt-1">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConditionEditor({
  cond,
  fieldPaths,
  onChange,
}: {
  cond: Condition;
  fieldPaths: string[];
  onChange: (c: Condition) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-background rounded-md border p-2">
      <div className="md:col-span-5">
        <PathInput
          value={cond.path}
          onChange={v => onChange({ ...cond, path: v })}
          fieldPaths={fieldPaths}
          placeholder="field.path"
        />
      </div>
      <div className="md:col-span-3">
        <Select
          value={cond.op}
          onValueChange={(v: ComparatorOp) => onChange({ ...cond, op: v })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMPARATORS.map(op => (
              <SelectItem key={op} value={op}>
                {COMPARATOR_LABELS[op]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-4">
        {opNeedsValue(cond.op) ? (
          <Input
            value={cond.value}
            onChange={e => onChange({ ...cond, value: e.target.value })}
            placeholder={
              cond.op === "in" || cond.op === "nin"
                ? "1, 2, 3"
                : cond.op === "regex"
                ? "^[A-Z]+$"
                : "value"
            }
            className="font-mono text-sm"
          />
        ) : (
          <span className="text-xs text-muted-foreground italic">no value needed</span>
        )}
      </div>
    </div>
  );
}

function ThenEditor({
  thenPath,
  then,
  fieldPaths,
  onChange,
}: {
  thenPath: string;
  then: ThenAction;
  fieldPaths: string[];
  onChange: (path: string, then: ThenAction) => void;
}) {
  const setType = (type: ThenAction["type"]) => {
    let next: ThenAction;
    switch (type) {
      case "in": next = { type: "in", values: [] }; break;
      case "nin": next = { type: "nin", values: [] }; break;
      case "between": next = { type: "between" }; break;
      case "equals": next = { type: "equals", value: "" }; break;
      case "required": next = { type: "required" }; break;
      case "forbidden": next = { type: "forbidden" }; break;
      case "includeWith": next = { type: "includeWith", value: "" }; break;
      case "exclude": next = { type: "exclude" }; break;
    }
    onChange(thenPath, next);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-background rounded-md border p-2">
      <div className="md:col-span-4">
        <Label className="text-xs">Field</Label>
        <PathInput
          value={thenPath}
          onChange={v => onChange(v, then)}
          fieldPaths={fieldPaths}
          placeholder="field.path"
        />
      </div>
      <div className="md:col-span-3">
        <Label className="text-xs">Action</Label>
        <Select value={then.type} onValueChange={(v: ThenAction["type"]) => setType(v)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in">must be in</SelectItem>
            <SelectItem value="nin">must NOT be in</SelectItem>
            <SelectItem value="equals">must equal</SelectItem>
            <SelectItem value="between">must be between</SelectItem>
            <SelectItem value="required">is required</SelectItem>
            <SelectItem value="forbidden">is forbidden</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-5">
        <Label className="text-xs">Value</Label>
        <ThenValue then={then} onChange={t => onChange(thenPath, t)} />
      </div>
    </div>
  );
}

function ThenValue({ then, onChange }: { then: ThenAction; onChange: (t: ThenAction) => void }) {
  if (then.type === "in" || then.type === "nin") {
    return (
      <Input
        value={then.values.join(", ")}
        onChange={e => {
          // Lightweight parser identical in spirit to enum input; commit on every change is fine
          // because the input value is rebuilt from the same array shape.
          const raw = e.target.value;
          const out: string[] = [];
          let buf = "";
          let inQuote = false;
          for (let i = 0; i < raw.length; i++) {
            const ch = raw[i];
            if (ch === '"') { inQuote = !inQuote; continue; }
            if (ch === "," && !inQuote) { out.push(buf.trim()); buf = ""; continue; }
            buf += ch;
          }
          out.push(buf.trim());
          onChange({ ...then, values: out.filter((v, i) => v !== "" || i === out.length - 1) });
        }}
        onBlur={e => {
          const cleaned = then.values.map(v => v.trim()).filter(Boolean);
          onChange({ ...then, values: cleaned });
          void e;
        }}
        placeholder="6, 7"
        className="font-mono text-sm"
      />
    );
  }
  if (then.type === "equals") {
    return (
      <Input
        value={then.value}
        onChange={e => onChange({ ...then, value: e.target.value })}
        placeholder="expected value"
        className="font-mono text-sm"
      />
    );
  }
  if (then.type === "between") {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={then.min ?? ""}
          onChange={e => onChange({ ...then, min: e.target.value === "" ? undefined : Number(e.target.value) })}
          placeholder="min"
        />
        <span className="text-muted-foreground text-xs">to</span>
        <Input
          type="number"
          value={then.max ?? ""}
          onChange={e => onChange({ ...then, max: e.target.value === "" ? undefined : Number(e.target.value) })}
          placeholder="max"
        />
      </div>
    );
  }
  return <span className="text-xs text-muted-foreground italic">no value needed</span>;
}

function PathInput({
  value,
  onChange,
  fieldPaths,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  fieldPaths: string[];
  placeholder?: string;
}) {
  const listId = `paths-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        list={listId}
        placeholder={placeholder}
        className="font-mono text-sm"
      />
      <datalist id={listId}>
        {fieldPaths.map(p => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </>
  );
}
