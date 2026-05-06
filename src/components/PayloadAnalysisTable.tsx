import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfidenceBadge } from "./Badges";
import type { FieldSchema, FieldType } from "@/lib/types";
import { Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const TYPES: FieldType[] = ["string", "email", "number", "boolean", "date", "ipv4", "domain", "hostPort", "caCertPem", "array", "object", "unknown"];

interface Props {
  fields: FieldSchema[];
  jsonError?: string | null;
  onChangeType: (path: string, type: FieldType) => void;
  onAnalyze: () => void;
}

export function PayloadAnalysisTable({ fields, jsonError, onChangeType, onAnalyze }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Payload analysis
            </CardTitle>
            <CardDescription>
              Detected fields, inferred types, and confidence. Override types if the inference looks wrong.
            </CardDescription>
          </div>
          <Button onClick={onAnalyze}>Re-analyze</Button>
        </div>
      </CardHeader>
      <CardContent>
        {jsonError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Invalid JSON</AlertTitle>
            <AlertDescription className="font-mono text-xs">{jsonError}</AlertDescription>
          </Alert>
        )}

        {fields.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <p className="text-sm text-muted-foreground">No fields detected yet. Make sure your payload is a valid JSON object.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Field path</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Sample value</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map(f => (
                  <TableRow key={f.path}>
                    <TableCell className="font-mono text-sm">{f.path}</TableCell>
                    <TableCell>
                      <Select value={f.type} onValueChange={(v: FieldType) => onChangeType(f.path, v)}>
                        <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground max-w-[280px] truncate">
                      {formatSample(f.originalValue)}
                    </TableCell>
                    <TableCell><ConfidenceBadge confidence={f.confidence} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatSample(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "—";
  if (typeof v === "object") return Array.isArray(v) ? `[${v.length} items]` : "{ ... }";
  return String(v);
}
