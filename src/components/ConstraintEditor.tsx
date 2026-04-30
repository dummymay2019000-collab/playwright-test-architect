import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import type { FieldSchema, FieldConstraints } from "@/lib/types";

interface Props {
  fields: FieldSchema[];
  onChange: (path: string, constraints: FieldConstraints) => void;
}

export function ConstraintEditor({ fields, onChange }: Props) {
  const editable = fields.filter(f => f.type !== "object");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Optional constraints</CardTitle>
        <CardDescription>
          Define rules per field to unlock smarter boundary, format, and enum tests. Everything here is optional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {editable.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Analyze a payload first to see fields here.</p>
        ) : (
          <Accordion type="multiple" className="w-full">
            {editable.map(f => (
              <AccordionItem key={f.path} value={f.path}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">{f.path}</span>
                    <Badge variant="secondary" className="text-xs">{f.type}</Badge>
                    {countActive(f.constraints) > 0 && (
                      <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                        {countActive(f.constraints)} rule{countActive(f.constraints) > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ConstraintFields field={f} onChange={(c) => onChange(f.path, c)} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

function countActive(c: FieldConstraints): number {
  return Object.values(c).filter(v => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)).length;
}

function ConstraintFields({ field, onChange }: { field: FieldSchema; onChange: (c: FieldConstraints) => void }) {
  const c = field.constraints;
  const upd = (patch: FieldConstraints) => onChange({ ...c, ...patch });
  const isString = field.type === "string" || field.type === "email" || field.type === "date";
  const isNumber = field.type === "number";

  return (
    <div className="grid md:grid-cols-2 gap-4 pt-2">
      <Toggle label="Required" checked={c.required !== false} onChange={v => upd({ required: v })} />
      <Toggle label="Allow null" checked={!!c.allowNull} onChange={v => upd({ allowNull: v })} />
      <Toggle label="Allow empty" checked={!!c.allowEmpty} onChange={v => upd({ allowEmpty: v })} />

      {isNumber && (
        <>
          <NumField label="Min" value={c.min} onChange={v => upd({ min: v })} />
          <NumField label="Max" value={c.max} onChange={v => upd({ max: v })} />
          <NumField label="Precision (decimals)" value={c.precision} onChange={v => upd({ precision: v })} />
        </>
      )}

      {isString && (
        <>
          <NumField label="Min length" value={c.minLength} onChange={v => upd({ minLength: v })} />
          <NumField label="Max length" value={c.maxLength} onChange={v => upd({ maxLength: v })} />
          <div className="md:col-span-2">
            <Label>Regex pattern</Label>
            <Input
              value={c.regex ?? ""}
              onChange={e => upd({ regex: e.target.value || undefined })}
              placeholder="^[A-Z]{2,}$"
              className="font-mono text-sm"
            />
          </div>
        </>
      )}

      <div className="md:col-span-2">
        <Label>Enum values (comma-separated)</Label>
        <Input
          value={(c.enumValues ?? []).join(", ")}
          onChange={e => upd({ enumValues: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
          placeholder="active, inactive, pending"
        />
      </div>

      <div className="md:col-span-2">
        <Label>Notes / business rule</Label>
        <Input
          value={c.notes ?? ""}
          onChange={e => upd({ notes: e.target.value })}
          placeholder="Optional context for reviewers"
        />
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
      <Label className="cursor-pointer">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={e => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      />
    </div>
  );
}
