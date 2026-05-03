import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Plus, Trash2, Copy, CheckCircle2, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import type { Environment, RequestConfig } from "@/lib/types";
import { safeParseJson } from "@/lib/analyzer";

interface Props {
  config: RequestConfig;
  environments: Environment[];
  activeEnvId: string | null;
  onChangeEnvironments: (e: Environment[]) => void;
  onActivate: (id: string | null) => void;
  /** Apply the environment values onto the live config (baseUrl, endpoint, headers, auth, payload). */
  onApply: (env: Environment) => void;
  onExportProject: () => void;
  onImportProject: (file: File) => void;
}

const uid = () => `env_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export function EnvironmentManager({
  config,
  environments,
  activeEnvId,
  onChangeEnvironments,
  onActivate,
  onApply,
  onExportProject,
  onImportProject,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const editing = environments.find(e => e.id === editingId) ?? null;

  const addFromCurrent = () => {
    const env: Environment = {
      id: uid(),
      name: `Environment ${environments.length + 1}`,
      baseUrl: config.baseUrl,
      endpoint: config.endpoint,
      headers: config.headers.map(h => ({ ...h })),
      auth: { ...config.auth },
      bodyJson: config.bodyJson,
    };
    onChangeEnvironments([...environments, env]);
    setEditingId(env.id);
    toast.success("Environment created from current setup");
  };

  const update = (id: string, patch: Partial<Environment>) => {
    onChangeEnvironments(environments.map(e => (e.id === id ? { ...e, ...patch } : e)));
  };

  const duplicate = (env: Environment) => {
    const copy: Environment = { ...env, id: uid(), name: `${env.name} (copy)` };
    onChangeEnvironments([...environments, copy]);
  };

  const remove = (id: string) => {
    onChangeEnvironments(environments.filter(e => e.id !== id));
    if (editingId === id) setEditingId(null);
    if (activeEnvId === id) onActivate(null);
  };

  return (
    <Card className="shadow-elev-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <div>
              <CardTitle className="text-base">Environments</CardTitle>
              <CardDescription>
                Save named presets (base URL, headers, auth, payload) and switch between dev/staging/prod.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) onImportProject(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
              <Upload className="w-4 h-4 mr-1.5" /> Import config
            </Button>
            <Button variant="outline" size="sm" onClick={onExportProject}>
              <Download className="w-4 h-4 mr-1.5" /> Export config
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Active</Label>
          <Select
            value={activeEnvId ?? "__none"}
            onValueChange={v => onActivate(v === "__none" ? null : v)}
          >
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">— None (use form values) —</SelectItem>
              {environments.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeEnvId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const e = environments.find(x => x.id === activeEnvId);
                if (e) {
                  onApply(e);
                  toast.success(`Applied "${e.name}" to current setup`);
                }
              }}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Apply to form
            </Button>
          )}
          <Button size="sm" onClick={addFromCurrent}>
            <Plus className="w-4 h-4 mr-1" /> Add from current
          </Button>
        </div>

        {environments.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No environments yet. Click <strong>Add from current</strong> to snapshot your current setup as the first environment.
          </p>
        ) : (
          <div className="border border-border rounded-lg divide-y divide-border">
            {environments.map(e => (
              <div key={e.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{e.name}</span>
                    {activeEnvId === e.id && (
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {e.baseUrl}{e.endpoint}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(editingId === e.id ? null : e.id)}>
                    {editingId === e.id ? "Close" : "Edit"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => duplicate(e)} aria-label="Duplicate">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(e.id)} aria-label="Delete">
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {editing && (
          <EnvironmentEditor env={editing} onChange={p => update(editing.id, p)} />
        )}
      </CardContent>
    </Card>
  );
}

function EnvironmentEditor({ env, onChange }: { env: Environment; onChange: (p: Partial<Environment>) => void }) {
  const jsonError = (() => {
    if (!env.bodyJson.trim()) return null;
    const r = safeParseJson(env.bodyJson);
    return r.ok ? null : r.error;
  })();
  return (
    <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label>Name</Label>
          <Input value={env.name} onChange={e => onChange({ name: e.target.value })} />
        </div>
        <div>
          <Label>Note (optional)</Label>
          <Input value={env.note ?? ""} onChange={e => onChange({ note: e.target.value })} placeholder="e.g. Internal staging" />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label>Base URL</Label>
          <Input value={env.baseUrl} onChange={e => onChange({ baseUrl: e.target.value })} className="font-mono text-sm" />
        </div>
        <div>
          <Label>Endpoint</Label>
          <Input value={env.endpoint} onChange={e => onChange({ endpoint: e.target.value })} className="font-mono text-sm" />
        </div>
      </div>
      <div>
        <Label>Auth env variable</Label>
        <Input
          value={env.auth.envVarName ?? ""}
          onChange={e => onChange({ auth: { ...env.auth, envVarName: e.target.value } })}
          placeholder="API_TOKEN_STAGING"
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Lets each env reference its own token (e.g. <code className="font-mono">API_TOKEN_PROD</code>).
        </p>
      </div>
      <div>
        <Label>Payload override (JSON)</Label>
        <Textarea
          value={env.bodyJson}
          onChange={e => onChange({ bodyJson: e.target.value })}
          rows={8}
          spellCheck={false}
          className="font-mono text-sm bg-background"
        />
        {jsonError && <p className="mt-1 text-xs text-destructive font-mono">JSON error: {jsonError}</p>}
        <p className="text-xs text-muted-foreground mt-1">
          When this environment is applied, this payload replaces the form's body JSON.
        </p>
      </div>
    </div>
  );
}
