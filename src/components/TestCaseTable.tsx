import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryBadge, RiskBadge } from "./Badges";
import type { GeneratedTestCase } from "@/lib/types";
import { Pencil, Check, X, Wand2 } from "lucide-react";
import { useState } from "react";

interface Props {
  cases: GeneratedTestCase[];
  onChange: (cases: GeneratedTestCase[]) => void;
  onRegenerate: () => void;
}

export function TestCaseTable({ cases, onChange, onRegenerate }: Props) {
  const [editId, setEditId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftStatus, setDraftStatus] = useState(0);

  const setEnabled = (id: string, enabled: boolean) =>
    onChange(cases.map(c => c.id === id ? { ...c, enabled } : c));

  const bulk = (predicate: (c: GeneratedTestCase) => boolean) =>
    onChange(cases.map(c => ({ ...c, enabled: predicate(c) })));

  const startEdit = (c: GeneratedTestCase) => {
    setEditId(c.id);
    setDraftName(c.name);
    setDraftStatus(c.expectedStatus);
  };
  const saveEdit = () => {
    if (!editId) return;
    onChange(cases.map(c => c.id === editId ? { ...c, name: draftName, expectedStatus: draftStatus } : c));
    setEditId(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>Generated test cases</CardTitle>
            <CardDescription>Review, edit, and select cases to include in the export.</CardDescription>
          </div>
          <Button variant="outline" onClick={onRegenerate}>
            <Wand2 className="w-4 h-4 mr-2" /> Regenerate
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 pt-3">
          <Button size="sm" variant="secondary" onClick={() => bulk(() => true)}>Select all</Button>
          <Button size="sm" variant="secondary" onClick={() => bulk(() => false)}>Deselect all</Button>
          <Button size="sm" variant="secondary" onClick={() => bulk(c => c.risk === "high")}>High risk only</Button>
          <Button size="sm" variant="secondary" onClick={() => bulk(c => c.category === "positive")}>Positive only</Button>
          <Button size="sm" variant="secondary" onClick={() => bulk(c => c.category === "validation")}>Validation</Button>
          <Button size="sm" variant="secondary" onClick={() => bulk(c => c.category === "auth")}>Auth</Button>
        </div>
      </CardHeader>
      <CardContent>
        {cases.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <p className="text-sm text-muted-foreground">No cases yet. Hit “Regenerate” after analyzing your payload.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map(c => (
                  <TableRow key={c.id} data-state={c.enabled ? "selected" : undefined} className={c.enabled ? "" : "opacity-60"}>
                    <TableCell>
                      <Checkbox checked={c.enabled} onCheckedChange={(v) => setEnabled(c.id, !!v)} />
                    </TableCell>
                    <TableCell>
                      {editId === c.id ? (
                        <Input value={draftName} onChange={e => setDraftName(e.target.value)} className="h-8" />
                      ) : (
                        <div>
                          <div className="font-medium text-sm">{c.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 italic">{c.reason}</div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell><CategoryBadge category={c.category} /></TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.fieldPath ?? "—"}</TableCell>
                    <TableCell>
                      {editId === c.id ? (
                        <Input
                          type="number"
                          value={draftStatus}
                          onChange={e => setDraftStatus(Number(e.target.value))}
                          className="h-8 w-20"
                        />
                      ) : (
                        <span className="font-mono text-sm">{c.expectedStatus}</span>
                      )}
                    </TableCell>
                    <TableCell><RiskBadge risk={c.risk} /></TableCell>
                    <TableCell>
                      {editId === c.id ? (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={saveEdit}><Check className="w-4 h-4 text-success" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditId(null)}><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <Button size="icon" variant="ghost" onClick={() => startEdit(c)}>
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      )}
                    </TableCell>
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
