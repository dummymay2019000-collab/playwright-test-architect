import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Layers, Wand2 } from "lucide-react";
import type { FieldSchema, VariantBranch, VariantSet } from "@/lib/types";
import { newVariantBranch, newVariantSet } from "@/lib/variants";

interface Props {
  variants: VariantSet[];
  fields: FieldSchema[];
  onChange: (v: VariantSet[]) => void;
}

export function VariantsEditor({ variants, fields, onChange }: Props) {
  const fieldPaths = fields.map(f => f.path);
  const enumFields = fields.filter(f => f.constraints.enumValues && f.constraints.enumValues.length > 0);

  const update = (id: string, patch: Partial<VariantSet>) =>
    onChange(variants.map(v => (v.id === id ? { ...v, ...patch } : v)));
  const remove = (id: string) => onChange(variants.filter(v => v.id !== id));
  const add = () => onChange([...variants, newVariantSet()]);

  const seedFromEnum = (path: string) => {
    const f = fields.find(ff => ff.path === path);
    if (!f) return;
    const vs = newVariantSet(path);
    vs.branches = (f.constraints.enumValues ?? []).map(v => newVariantBranch(v));
    onChange([...variants, vs]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Payload variants
            </CardTitle>
            <CardDescription>
              Pick a discriminator field (e.g. <em>type = "1" / "2" / "3"</em>) and define the
              payload shape per value — extra fields to include, or fields to remove. One positive
              case is generated per branch, plus a "missing required" case per added field.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {enumFields.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {enumFields.slice(0, 3).map(f => (
                  <Button
                    key={f.path}
                    size="sm"
                    variant="secondary"
                    onClick={() => seedFromEnum(f.path)}
                    title={`Seed a variant set from enum field ${f.path}`}
                  >
                    <Wand2 className="w-3 h-3 mr-1" /> from {f.path}
                  </Button>
                ))}
              </div>
            )}
            <Button size="sm" variant="outline" onClick={add}>
              <Plus className="w-4 h-4 mr-1" /> Add variant set
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {variants.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No variants yet. Use this when one field decides which other fields should appear in the payload.
          </p>
        ) : (
          variants.map(v => (
            <VariantSetCard
              key={v.id}
              vs={v}
              fieldPaths={fieldPaths}
              onChange={patch => update(v.id, patch)}
              onRemove={() => remove(v.id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function VariantSetCard({
  vs,
  fieldPaths,
  onChange,
  onRemove,
}: {
  vs: VariantSet;
  fieldPaths: string[];
  onChange: (patch: Partial<VariantSet>) => void;
  onRemove: () => void;
}) {
  const updateBranch = (idx: number, patch: Partial<VariantBranch>) => {
    onChange({ branches: vs.branches.map((b, i) => (i === idx ? { ...b, ...patch } : b)) });
  };
  const removeBranch = (idx: number) =>
    onChange({ branches: vs.branches.filter((_, i) => i !== idx) });
  const addBranch = () => onChange({ branches: [...vs.branches, newVariantBranch()] });

  return (
    <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <Label className="text-xs">Discriminator field</Label>
          <PathInput
            value={vs.discriminatorPath}
            onChange={v => onChange({ discriminatorPath: v })}
            fieldPaths={fieldPaths}
            placeholder="type"
          />
        </div>
        <Badge variant={vs.enabled ? "default" : "secondary"} className="text-xs">
          {vs.enabled ? "active" : "disabled"}
        </Badge>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Enabled</Label>
          <Switch checked={vs.enabled} onCheckedChange={v => onChange({ enabled: v })} />
          <Button size="sm" variant="ghost" onClick={onRemove}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {vs.branches.map((b, idx) => (
          <BranchCard
            key={idx}
            branch={b}
            fieldPaths={fieldPaths}
            onChange={patch => updateBranch(idx, patch)}
            onRemove={() => removeBranch(idx)}
          />
        ))}
        <Button size="sm" variant="ghost" onClick={addBranch}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add branch
        </Button>
      </div>
    </div>
  );
}

function BranchCard({
  branch,
  fieldPaths,
  onChange,
  onRemove,
}: {
  branch: VariantBranch;
  fieldPaths: string[];
  onChange: (patch: Partial<VariantBranch>) => void;
  onRemove: () => void;
}) {
  const addInclude = () =>
    onChange({ addFields: [...branch.addFields, { path: "", value: "" }] });
  const updateInclude = (idx: number, patch: Partial<{ path: string; value: string }>) =>
    onChange({
      addFields: branch.addFields.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    });
  const removeInclude = (idx: number) =>
    onChange({ addFields: branch.addFields.filter((_, i) => i !== idx) });

  const addRemove = () => onChange({ removePaths: [...branch.removePaths, ""] });
  const updateRemove = (idx: number, val: string) =>
    onChange({ removePaths: branch.removePaths.map((p, i) => (i === idx ? val : p)) });
  const removeRemove = (idx: number) =>
    onChange({ removePaths: branch.removePaths.filter((_, i) => i !== idx) });

  return (
    <div className="rounded-md border bg-background p-3 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-xs">When discriminator =</Label>
        <Input
          value={branch.value}
          onChange={e => onChange({ value: e.target.value })}
          placeholder="1"
          className="max-w-[160px] font-mono text-sm"
        />
        <Input
          value={branch.note ?? ""}
          onChange={e => onChange({ note: e.target.value })}
          placeholder="optional note"
          className="flex-1 min-w-[160px] text-sm"
        />
        <Button size="sm" variant="ghost" onClick={onRemove}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Include fields</Label>
          <div className="space-y-2 mt-1">
            {branch.addFields.map((f, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <PathInput
                  value={f.path}
                  onChange={v => updateInclude(idx, { path: v })}
                  fieldPaths={fieldPaths}
                  placeholder="extraField"
                />
                <Input
                  value={f.value}
                  onChange={e => updateInclude(idx, { value: e.target.value })}
                  placeholder="value"
                  className="font-mono text-sm"
                />
                <Button size="icon" variant="ghost" onClick={() => removeInclude(idx)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={addInclude}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add field
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Remove fields</Label>
          <div className="space-y-2 mt-1">
            {branch.removePaths.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <PathInput
                  value={p}
                  onChange={v => updateRemove(idx, v)}
                  fieldPaths={fieldPaths}
                  placeholder="fieldToOmit"
                />
                <Button size="icon" variant="ghost" onClick={() => removeRemove(idx)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={addRemove}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add path
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
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
  const listId = `vpaths-${Math.random().toString(36).slice(2, 8)}`;
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
